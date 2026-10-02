import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["ADMIN", "MANAGER"], req);
    const { id } = await params;

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            bills: { select: { total: true } },
            payments: { select: { amount: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, role: true },
        },
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
        order: {
          select: { id: true, orderNo: true, deliveryDate: true },
        },
        payments: true,
      },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Calculate customer outstanding balance up to now
    const totalBilled = bill.customer.bills.reduce((sum, b) => sum + b.total, 0);
    const totalPaid = bill.customer.payments.reduce((sum, p) => sum + p.amount, 0);
    const currentOutstanding = Math.round((bill.customer.openingBalance + totalBilled - totalPaid) * 100) / 100;

    // Group items by company for company-wise breakdown
    const companySubtotals: Record<string, { companyName: string; totalQty: number; subtotal: number }> = {};
    for (const item of bill.items) {
      const compId = item.product.company.id;
      const compName = item.product.company.name;
      if (!companySubtotals[compId]) {
        companySubtotals[compId] = { companyName: compName, totalQty: 0, subtotal: 0 };
      }
      companySubtotals[compId].totalQty += item.qty;
      companySubtotals[compId].subtotal += item.amount;
    }

    return NextResponse.json({
      bill: {
        ...bill,
        customerCurrentOutstanding: currentOutstanding,
        companyBreakdown: Object.values(companySubtotals),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 });
  }
}
