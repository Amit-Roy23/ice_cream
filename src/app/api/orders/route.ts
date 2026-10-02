import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const orderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  qty: z.coerce.number().int().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate must be non-negative"),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  deliveryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one product is required"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const staffId = searchParams.get("staffId");
    const customerId = searchParams.get("customerId");
    const date = searchParams.get("date");

    const where: any = {};

    // Staff can only see their own orders
    if (user.role === "STAFF") {
      where.createdById = user.id;
    } else {
      // Manager/Admin can filter by staff
      if (staffId && staffId !== "ALL") {
        where.createdById = staffId;
      }
    }

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (customerId && customerId !== "ALL") {
      where.customerId = customerId;
    }
    if (date) {
      const targetDate = new Date(date);
      const start = new Date(targetDate.setHours(0, 0, 0, 0));
      const end = new Date(targetDate.setHours(23, 59, 59, 999));
      where.deliveryDate = { gte: start, lte: end };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            shopName: true,
            ownerName: true,
            phone: true,
            area: true,
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
        bill: {
          select: { id: true, billNo: true, total: true, paymentMode: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = orders.map((o) => {
      const totalAmount = o.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
      const totalItemsCount = o.items.reduce((sum, item) => sum + item.qty, 0);

      return {
        ...o,
        totalAmount,
        totalItemsCount,
      };
    });

    return NextResponse.json({ orders: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parseResult = createOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customerId, deliveryDate, notes, items } = parseResult.data;

    // Auto-generate order number
    const count = await prisma.order.count();
    const orderNo = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const delDate = deliveryDate ? new Date(deliveryDate) : new Date();

    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId,
        createdById: user.id,
        deliveryDate: delDate,
        status: "PENDING",
        notes: notes ? notes.trim() : null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            rate: item.rate,
          })),
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

    return NextResponse.json({
      order,
      message: `Order #${orderNo} placed successfully for ${order.customer.shopName}`,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
