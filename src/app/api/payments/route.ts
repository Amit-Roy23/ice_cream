import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  billId: z.string().optional().nullable(),
  amount: z.coerce.number().positive("Payment amount must be greater than 0"),
  mode: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]).default("CASH"),
  notes: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = createPaymentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customerId, billId, amount, mode, notes, date } = parseResult.data;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const paymentDate = date ? new Date(date) : new Date();

    const payment = await prisma.payment.create({
      data: {
        customerId,
        billId: billId || null,
        amount,
        mode,
        notes: notes ? notes.trim() : null,
        date: paymentDate,
      },
    });

    return NextResponse.json({
      payment,
      message: `Payment of ₹${amount} recorded successfully for ${customer.shopName}`,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
