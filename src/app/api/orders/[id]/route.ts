import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "BILLED", "DELIVERED", "CANCELLED"]).optional(),
  notes: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, role: true } },
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
        bill: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (user.role === "STAFF" && order.createdById !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
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

    const parseResult = updateOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Staff can only edit their own pending orders
    if (user.role === "STAFF" && (order.createdById !== user.id || order.status !== "PENDING")) {
      return NextResponse.json({ error: "Cannot edit this order" }, { status: 403 });
    }

    const data = parseResult.data;
    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes ? data.notes.trim() : null;
    if (data.deliveryDate !== undefined && data.deliveryDate !== null) updateData.deliveryDate = new Date(data.deliveryDate);

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ order: updated, message: "Order updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
