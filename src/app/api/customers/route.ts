import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createCustomerSchema = z.object({
  shopName: z.string().min(1, "Shop name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  openingBalance: z.coerce.number().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const area = searchParams.get("area");

    const where: any = {};
    if (area && area !== "ALL") {
      where.area = { contains: area, mode: "insensitive" };
    }
    if (search) {
      where.OR = [
        { shopName: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { area: { contains: search, mode: "insensitive" } },
        { gstin: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        bills: {
          select: { total: true },
        },
        payments: {
          select: { amount: true },
        },
        _count: {
          select: {
            orders: true,
            bills: true,
          },
        },
      },
      orderBy: { shopName: "asc" },
    });

    const enriched = customers.map((c) => {
      const totalBilled = c.bills.reduce((acc, b) => acc + b.total, 0);
      const totalPaid = c.payments.reduce((acc, p) => acc + p.amount, 0);
      const outstandingBalance = Math.round((c.openingBalance + totalBilled - totalPaid) * 100) / 100;

      return {
        id: c.id,
        shopName: c.shopName,
        ownerName: c.ownerName,
        phone: c.phone,
        address: c.address,
        area: c.area,
        gstin: c.gstin,
        openingBalance: c.openingBalance,
        totalBilled,
        totalPaid,
        outstandingBalance,
        ordersCount: c._count.orders,
        billsCount: c._count.bills,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json({ customers: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = createCustomerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { shopName, ownerName, phone, address, area, gstin, openingBalance } = parseResult.data;

    const customer = await prisma.customer.create({
      data: {
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        address: address ? address.trim() : null,
        area: area ? area.trim() : null,
        gstin: gstin ? gstin.trim().toUpperCase() : null,
        openingBalance: openingBalance || 0,
      },
    });

    return NextResponse.json({ customer, message: "Customer created successfully" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
