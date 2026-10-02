import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  commissionPercent: z.coerce.number().min(0).optional(),
  contact: z.string().optional().nullable(),
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

    const parseResult = updateCompanySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const data = parseResult.data;
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.commissionPercent !== undefined) updateData.commissionPercent = data.commissionPercent;
    if (data.contact !== undefined) updateData.contact = data.contact ? data.contact.trim() : null;
    if (data.active !== undefined) updateData.active = Boolean(data.active);

    const updated = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ company: updated, message: "Company updated successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN"], req);
    const { id } = await params;

    const productsCount = await prisma.product.count({ where: { companyId: id } });
    if (productsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete company. It has ${productsCount} associated products.` },
        { status: 400 }
      );
    }

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
  }
}
