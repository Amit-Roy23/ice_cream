import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  qty: z.coerce.number().int().positive("Quantity must be positive"),
  rate: z.coerce.number().min(0, "Rate must be non-negative"),
});

const createPurchaseSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  invoiceNo: z.string().min(1, "Invoice number is required"),
  date: z.string().optional().nullable(),
  commissionPercent: z.coerce.number().min(0).optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN"], req);

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (companyId && companyId !== "ALL") {
      where.companyId = companyId;
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

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, commissionPercent: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, flavor: true, unit: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ purchases });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole(["ADMIN"], req);
    const body = await req.json();

    const parseResult = createPurchaseSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      companyId,
      invoiceNo,
      date,
      commissionPercent,
      items,
    } = parseResult.data;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    let subtotal = 0;
    const sanitizedItems = items.map((item) => {
      const amount = item.qty * item.rate;
      subtotal += amount;
      return {
        productId: item.productId,
        qty: item.qty,
        rate: item.rate,
        amount,
      };
    });

    const commPercent = commissionPercent !== undefined ? commissionPercent : company.commissionPercent;
    const commissionAmount = Math.round((subtotal * commPercent) / 100 * 100) / 100;
    const netAmount = Math.round((subtotal - commissionAmount) * 100) / 100;
    const purchaseDate = date ? new Date(date) : new Date();

    // Execute within database transaction
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          companyId,
          invoiceNo: invoiceNo.trim(),
          date: purchaseDate,
          subtotal,
          commissionPercent: commPercent,
          commissionAmount,
          netAmount,
          createdById: adminUser.id,
          items: {
            create: sanitizedItems,
          },
        },
        include: {
          company: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Add stock ledger entries for each item
      for (const item of sanitizedItems) {
        await tx.stockLedger.create({
          data: {
            productId: item.productId,
            type: "PURCHASE",
            qty: item.qty, // positive
            refType: "PURCHASE",
            refId: purchase.id,
            notes: `Purchase Inward: ${company.name} (Inv #${invoiceNo})`,
            date: purchaseDate,
            userId: adminUser.id,
          },
        });
      }

      return purchase;
    });

    return NextResponse.json(
      { purchase: result, message: "Purchase recorded and stock added successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 });
  }
}
