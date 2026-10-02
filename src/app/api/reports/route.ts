import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getProductsStockMap } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["ADMIN"], req);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "SALES"; // SALES, PURCHASES, STOCK, OUTSTANDING
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const companyId = searchParams.get("companyId");
    const format = searchParams.get("format"); // 'csv' or json

    const dateFilter: any = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    if (type === "SALES") {
      const bills = await prisma.bill.findMany({
        where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
        include: {
          customer: true,
          createdBy: { select: { name: true } },
          items: {
            include: {
              product: {
                include: { company: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      });

      // Filter by company if requested
      const filtered = companyId && companyId !== "ALL"
        ? bills.filter((b) => b.items.some((i) => i.product.companyId === companyId))
        : bills;

      if (format === "csv") {
        let csv = "Invoice No,Date,Customer Shop,Owner Name,Area,Payment Mode,Subtotal,Discount,GST,Total,Paid Amount,Created By\n";
        for (const b of filtered) {
          const d = new Date(b.date).toLocaleDateString("en-IN");
          csv += `"${b.billNo}","${d}","${b.customer.shopName}","${b.customer.ownerName}","${b.customer.area || ""}","${b.paymentMode}",${b.subtotal},${b.discount},${b.gst},${b.total},${b.paidAmount},"${b.createdBy.name}"\n`;
        }
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=sales-report-${Date.now()}.csv`,
          },
        });
      }

      return NextResponse.json({ type: "SALES", data: filtered });
    }

    if (type === "PURCHASES") {
      const where: any = {};
      if (Object.keys(dateFilter).length) where.date = dateFilter;
      if (companyId && companyId !== "ALL") where.companyId = companyId;

      const purchases = await prisma.purchase.findMany({
        where,
        include: {
          company: true,
          createdBy: { select: { name: true } },
          items: {
            include: { product: true },
          },
        },
        orderBy: { date: "desc" },
      });

      if (format === "csv") {
        let csv = "Invoice No,Date,Company,Subtotal,Commission %,Commission Amount,Net Payable,Items Count,Created By\n";
        for (const p of purchases) {
          const d = new Date(p.date).toLocaleDateString("en-IN");
          csv += `"${p.invoiceNo}","${d}","${p.company.name}",${p.subtotal},${p.commissionPercent}%,${p.commissionAmount},${p.netAmount},${p.items.length},"${p.createdBy.name}"\n`;
        }
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=purchase-report-${Date.now()}.csv`,
          },
        });
      }

      return NextResponse.json({ type: "PURCHASES", data: purchases });
    }

    if (type === "STOCK") {
      const where: any = { active: true };
      if (companyId && companyId !== "ALL") where.companyId = companyId;

      const products = await prisma.product.findMany({
        where,
        include: { company: true },
        orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
      });

      const stockMap = await getProductsStockMap(products.map((p) => p.id));
      const stockReport = products.map((p) => {
        const qty = stockMap.get(p.id) || 0;
        return {
          id: p.id,
          companyName: p.company.name,
          productName: p.name,
          flavor: p.flavor,
          unit: p.unit,
          mrp: p.mrp,
          salePrice: p.salePrice,
          purchasePrice: p.purchasePrice,
          currentStock: qty,
          lowStockThreshold: p.lowStockThreshold,
          stockValueCost: qty * p.purchasePrice,
          stockValueSale: qty * p.salePrice,
        };
      });

      if (format === "csv") {
        let csv = "Company,Product Name,Flavor,Pack Size,MRP,Purchase Rate,Sale Rate,Current Stock,Threshold,Stock Value (Cost),Stock Value (Sale)\n";
        for (const s of stockReport) {
          csv += `"${s.companyName}","${s.productName}","${s.flavor}","${s.unit}",${s.mrp},${s.purchasePrice},${s.salePrice},${s.currentStock},${s.lowStockThreshold},${s.stockValueCost},${s.stockValueSale}\n`;
        }
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=stock-report-${Date.now()}.csv`,
          },
        });
      }

      return NextResponse.json({ type: "STOCK", data: stockReport });
    }

    if (type === "OUTSTANDING") {
      const customers = await prisma.customer.findMany({
        include: {
          bills: { select: { total: true } },
          payments: { select: { amount: true } },
        },
        orderBy: { shopName: "asc" },
      });

      const outstandingList = customers
        .map((c) => {
          const totalBilled = c.bills.reduce((sum, b) => sum + b.total, 0);
          const totalPaid = c.payments.reduce((sum, p) => sum + p.amount, 0);
          const balance = Math.round((c.openingBalance + totalBilled - totalPaid) * 100) / 100;
          return {
            id: c.id,
            shopName: c.shopName,
            ownerName: c.ownerName,
            phone: c.phone,
            area: c.area,
            gstin: c.gstin,
            openingBalance: c.openingBalance,
            totalBilled,
            totalPaid,
            outstandingBalance: balance,
          };
        })
        .filter((c) => c.outstandingBalance > 0)
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

      if (format === "csv") {
        let csv = "Shop Name,Owner Name,Phone,Area,GSTIN,Opening Balance,Total Billed,Total Paid,Outstanding Balance\n";
        for (const o of outstandingList) {
          csv += `"${o.shopName}","${o.ownerName}","${o.phone}","${o.area || ""}","${o.gstin || ""}",${o.openingBalance},${o.totalBilled},${o.totalPaid},${o.outstandingBalance}\n`;
        }
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename=outstanding-report-${Date.now()}.csv`,
          },
        });
      }

      return NextResponse.json({ type: "OUTSTANDING", data: outstandingList });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Admin only." }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
