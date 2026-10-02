import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateCustomerSchema = z.object({
  shopName: z.string().min(1).optional(),
  ownerName: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  openingBalance: z.coerce.number().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        bills: {
          orderBy: { date: "desc" },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    flavor: true,
                    unit: true,
                    company: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const totalBilled = customer.bills.reduce((sum, b) => sum + b.total, 0);
    const totalPaid = customer.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = Math.round((customer.openingBalance + totalBilled - totalPaid) * 100) / 100;

    return NextResponse.json({
      customer: {
        ...customer,
        totalBilled,
        totalPaid,
        outstandingBalance,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const parseResult = updateCustomerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const updateData: any = {};
    if (data.shopName !== undefined) updateData.shopName = data.shopName.trim();
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.address !== undefined) updateData.address = data.address ? data.address.trim() : null;
    if (data.area !== undefined) updateData.area = data.area ? data.area.trim() : null;
    if (data.gstin !== undefined) updateData.gstin = data.gstin ? data.gstin.trim().toUpperCase() : null;
    if (data.openingBalance !== undefined) updateData.openingBalance = data.openingBalance;

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ customer: updated, message: "Customer updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
