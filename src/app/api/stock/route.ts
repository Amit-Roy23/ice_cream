import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProductsStockMap } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search");
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";

    const where: any = { active: true };
    if (companyId && companyId !== "ALL") {
      where.companyId = companyId;
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
          select: { id: true, name: true },
        },
      },
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
    });

    const stockMap = await getProductsStockMap(products.map((p) => p.id));

    let stockItems = products.map((p) => {
      const currentStock = stockMap.get(p.id) || 0;
      const isLowStock = currentStock <= p.lowStockThreshold;

      const item: any = {
        id: p.id,
        name: p.name,
        flavor: p.flavor,
        unit: p.unit,
        mrp: p.mrp,
        salePrice: p.salePrice,
        lowStockThreshold: p.lowStockThreshold,
        company: p.company,
        currentStock,
        isLowStock,
      };

      // Strict role check: Only ADMIN sees purchase cost and cost valuation
      if (user.role === "ADMIN") {
        item.purchasePrice = p.purchasePrice;
        item.stockValueAtCost = currentStock * p.purchasePrice;
        item.stockValueAtSale = currentStock * p.salePrice;
      }

      return item;
    });

    if (lowStockOnly) {
      stockItems = stockItems.filter((item) => item.isLowStock);
    }

    return NextResponse.json({ stock: stockItems });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
  }
}
