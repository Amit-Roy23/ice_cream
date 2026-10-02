import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateProductSchema = z.object({
  companyId: z.string().optional(),
  name: z.string().min(1).optional(),
  flavor: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  mrp: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  gstPercent: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"], req);
    const { id } = await params;
    const body = await req.json();

    const parseResult = updateProductSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const data = parseResult.data;
    const updateData: any = {};
    if (data.companyId !== undefined) updateData.companyId = data.companyId;
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.flavor !== undefined) updateData.flavor = data.flavor.trim();
    if (data.unit !== undefined) updateData.unit = data.unit.trim();
    if (data.mrp !== undefined) updateData.mrp = data.mrp;
    if (data.salePrice !== undefined) updateData.salePrice = data.salePrice;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice;
    if (data.gstPercent !== undefined) updateData.gstPercent = data.gstPercent;
    if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
    if (data.active !== undefined) updateData.active = Boolean(data.active);

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { company: true },
    });

    return NextResponse.json({ product: updated, message: "Product updated successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"], req);
    const { id } = await params;

    const [billsCount, ordersCount] = await Promise.all([
      prisma.billItem.count({ where: { productId: id } }),
      prisma.orderItem.count({ where: { productId: id } }),
    ]);

    if (billsCount > 0 || ordersCount > 0) {
      // Soft deactivate instead of crashing foreign keys
      await prisma.product.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        message: "Product deactivated (has existing billing/order records)",
      });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
