import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { validateStockAvailability } from "@/lib/stock";

export const dynamic = "force-dynamic";

const createBillItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  qty: z.coerce.number().int().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate must be non-negative"),
});

const createBillSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderId: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  items: z.array(createBillItemSchema).min(1, "At least one item is required"),
  discount: z.coerce.number().min(0).default(0),
  gstPercent: z.coerce.number().min(0).default(0),
  paymentMode: z.enum(["CASH", "UPI", "CREDIT", "CHEQUE"]).default("CASH"),
  paidAmount: z.coerce.number().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "MANAGER"], req);

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const paymentMode = searchParams.get("paymentMode");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: any = {};
    if (customerId && customerId !== "ALL") {
      where.customerId = customerId;
    }
    if (paymentMode && paymentMode !== "ALL") {
      where.paymentMode = paymentMode;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }
    if (search) {
      where.OR = [
        { billNo: { contains: search, mode: "insensitive" } },
        { customer: { shopName: { contains: search, mode: "insensitive" } } },
        { customer: { ownerName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            shopName: true,
            ownerName: true,
            phone: true,
            area: true,
            gstin: true,
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
          select: { id: true, orderNo: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ bills });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Manager or Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["ADMIN", "MANAGER"], req);
    const body = await req.json();

    const parseResult = createBillSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      customerId,
      orderId,
      date,
      items,
      discount,
      gstPercent,
      paymentMode,
      paidAmount,
    } = parseResult.data;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Stock availability check before billing
    const stockCheck = await validateStockAvailability(items);
    if (!stockCheck.valid) {
      return NextResponse.json(
        {
          error: "Stock validation failed",
          details: stockCheck.errors,
        },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    const billItemsData = items.map((item) => {
      const amount = Math.round(item.qty * item.rate * 100) / 100;
      subtotal += amount;
      return {
        productId: item.productId,
        qty: item.qty,
        rate: item.rate,
        amount,
      };
    });

    const numDiscount = Math.max(0, discount || 0);
    const taxableAmount = Math.max(0, subtotal - numDiscount);
    const numGst = Math.round(((taxableAmount * (gstPercent || 0)) / 100) * 100) / 100;
    const netAmount = taxableAmount + numGst;
    const grandTotal = Math.round(netAmount);
    const roundOff = Math.round((grandTotal - netAmount) * 100) / 100;

    const numPaid = Math.min(grandTotal, Math.max(0, paidAmount || 0));
    const billDate = date ? new Date(date) : new Date();

    // Auto-generate Bill Number
    const count = await prisma.bill.count();
    const billNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Execute in DB Transaction
    const newBill = await prisma.$transaction(async (tx) => {
      // 1. Create Bill
      const bill = await tx.bill.create({
        data: {
          billNo,
          customerId,
          orderId: orderId || null,
          date: billDate,
          subtotal,
          discount: numDiscount,
          gst: numGst,
          roundOff,
          total: grandTotal,
          paidAmount: numPaid,
          paymentMode,
          createdById: user.id,
          items: {
            create: billItemsData,
          },
        },
        include: {
          customer: true,
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
      });

      // 2. Reduce Stock via StockLedger (-)
      for (const item of billItemsData) {
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            type: "SALE",
            qty: -item.qty, // Negative quantity for sales
            refType: "BILL",
            refId: bill.id,
            notes: `Invoice #${billNo} to ${customer.shopName}`,
            date: billDate,
            userId: user.id,
          },
        });
      }

      // 3. Mark linked order as BILLED
      if (orderId) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "BILLED" },
        });
      }

      // 4. Record payment if paidAmount > 0
      if (numPaid > 0) {
        await tx.payment.create({
          data: {
            customerId,
            billId: bill.id,
            amount: numPaid,
            mode: paymentMode,
            notes: `Payment for Invoice #${billNo}`,
            date: billDate,
          },
        });
      }

      return bill;
    });

    return NextResponse.json(
      {
        bill: newBill,
        message: `Invoice #${billNo} generated successfully for ${customer.shopName}!`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Billing access required." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to generate bill" }, { status: 500 });
  }
}
