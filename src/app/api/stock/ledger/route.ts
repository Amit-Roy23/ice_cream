import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = {};
    if (productId && productId !== "ALL") {
      where.productId = productId;
    }
    if (type && type !== "ALL") {
      where.type = type;
    }

    const movements = await prisma.stockLedger.findMany({
      where,
      include: {
        product: {
          include: {
            company: {
              select: { id: true, name: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { date: "desc" },
      take: Math.min(limit, 500),
    });

    return NextResponse.json({ movements });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch stock ledger" }, { status: 500 });
  }
}
