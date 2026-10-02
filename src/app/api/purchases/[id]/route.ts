import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"], req);
    const { id } = await params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        company: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json({ purchase });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch purchase" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"], req);
    const { id } = await params;

    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Execute within database transaction: delete stock ledger then purchase
    await prisma.$transaction(async (tx) => {
      await tx.stockLedger.deleteMany({
        where: {
          refType: "PURCHASE",
          refId: id,
        },
      });

      await tx.purchase.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Purchase deleted and stock reversed successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 });
  }
}
