import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { getProductsStockMap } from "@/lib/stock";

export const dynamic = "force-dynamic";

const createProductSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  name: z.string().min(1, "Product name is required"),
  flavor: z.string().min(1, "Flavor is required"),
  unit: z.string().min(1, "Unit/Pack size is required"),
  mrp: z.coerce.number().min(0, "MRP must be positive"),
  salePrice: z.coerce.number().min(0, "Sale price must be positive"),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be positive"),
  gstPercent: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(15),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search");
    const activeOnly = searchParams.get("active") === "true";

    const where: any = {};
    if (companyId && companyId !== "ALL") {
      where.companyId = companyId;
    }
    if (activeOnly) {
      where.active = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { flavor: { contains: search, mode: "insensitive" } },
        { unit: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            commissionPercent: user.role === "ADMIN", // Only send commission % to ADMIN
          },
        },
      },
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
    });

    // Get current stock for all products
    const productIds = products.map((p) => p.id);
    const stockMap = await getProductsStockMap(productIds);

    const enriched = products.map((p) => {
      const currentStock = stockMap.get(p.id) || 0;
      const isLowStock = currentStock <= p.lowStockThreshold;

      const productData: any = {
        ...p,
        currentStock,
        isLowStock,
      };

      // Strict role sanitization: Never return purchasePrice to non-admin
      if (user.role !== "ADMIN") {
        delete productData.purchasePrice;
      }

      return productData;
    });

    return NextResponse.json({ products: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"], req);
    const body = await req.json();

    const parseResult = createProductSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      companyId,
      name,
      flavor,
      unit,
      mrp,
      salePrice,
      purchasePrice,
      gstPercent,
      lowStockThreshold,
      active,
    } = parseResult.data;

    const product = await prisma.product.create({
      data: {
        companyId,
        name: name.trim(),
        flavor: flavor.trim(),
        unit: unit.trim(),
        mrp,
        salePrice,
        purchasePrice,
        gstPercent,
        lowStockThreshold,
        active,
      },
      include: {
        company: true,
      },
    });

    return NextResponse.json({ product, message: "Product created successfully" }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
