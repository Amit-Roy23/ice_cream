import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
          orderBy: { date: "asc" },
          select: {
            id: true,
            billNo: true,
            date: true,
            total: true,
            paymentMode: true,
            paidAmount: true,
          },
        },
        payments: {
          orderBy: { date: "asc" },
          select: {
            id: true,
            billId: true,
            amount: true,
            mode: true,
            notes: true,
            date: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Build unified chronological timeline
    type StatementItem = {
      id: string;
      date: Date;
      type: "OPENING_BALANCE" | "BILL" | "PAYMENT";
      refNo: string;
      description: string;
      debit: number; // Bill amount
      credit: number; // Payment amount
      balance: number;
    };

    const entries: StatementItem[] = [];
    let runningBalance = customer.openingBalance;

    if (customer.openingBalance > 0) {
      entries.push({
        id: "opening-bal",
        date: customer.createdAt,
        type: "OPENING_BALANCE",
        refNo: "OB",
        description: "Opening Balance",
        debit: customer.openingBalance,
        credit: 0,
        balance: runningBalance,
      });
    }

    // Merge bills and independent payments
    const bills = customer.bills.map((b) => ({ ...b, itemType: "BILL" as const }));
    const payments = customer.payments.map((p) => ({ ...p, itemType: "PAYMENT" as const }));

    const combined = [...bills, ...payments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const item of combined) {
      if (item.itemType === "BILL") {
        runningBalance += item.total;
        entries.push({
          id: item.id,
          date: item.date,
          type: "BILL",
          refNo: item.billNo,
          description: `Bill generated (${item.paymentMode})`,
          debit: item.total,
          credit: 0,
          balance: runningBalance,
        });
      } else {
        runningBalance -= item.amount;
        entries.push({
          id: item.id,
          date: item.date,
          type: "PAYMENT",
          refNo: item.mode,
          description: item.notes || `Payment received via ${item.mode}`,
          debit: 0,
          credit: item.amount,
          balance: runningBalance,
        });
      }
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        shopName: customer.shopName,
        ownerName: customer.ownerName,
        phone: customer.phone,
        address: customer.address,
        area: customer.area,
        gstin: customer.gstin,
        openingBalance: customer.openingBalance,
        currentBalance: runningBalance,
      },
      statement: entries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate customer ledger" }, { status: 500 });
  }
}
