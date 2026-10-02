import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const adjustStockSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  qty: z.coerce.number().int().refine((val) => val !== 0, "Adjustment quantity must be non-zero"),
  reason: z.string().min(1, "Reason is required"),
});

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole(["ADMIN"], req);
    const body = await req.json();

    const parseResult = adjustStockSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, qty, reason } = parseResult.data;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { company: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ledgerEntry = await prisma.stockLedger.create({
      data: {
        productId,
        type: "ADJUSTMENT",
        qty,
        refType: "MANUAL",
        notes: reason.trim(),
        userId: adminUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      ledgerEntry,
      message: `Stock adjusted by ${qty > 0 ? "+" : ""}${qty} units for ${product.name}`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to adjust stock" }, { status: 500 });
  }
}
