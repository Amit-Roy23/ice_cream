import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProductsStockMap } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Staff does not access central dashboard (they get directed to orders)
    if (user.role === "STAFF") {
      return NextResponse.json({ error: "Access restricted to staff" }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // 1. Today's KPI Metrics
    const [
      todayOrdersCount,
      todayBills,
      todayPayments,
      allCustomers,
      allBills,
      allPayments,
      pendingOrders,
      allProducts,
    ] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.bill.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        select: { total: true, paidAmount: true },
      }),
      prisma.payment.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        select: { amount: true },
      }),
      prisma.customer.findMany({
        select: { openingBalance: true },
      }),
      prisma.bill.findMany({
        select: { total: true },
      }),
      prisma.payment.findMany({
        select: { amount: true },
      }),
      prisma.order.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          deliveryDate: { lte: tomorrowEnd },
        },
        include: {
          customer: { select: { shopName: true, phone: true, area: true } },
          createdBy: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, flavor: true, unit: true } },
            },
          },
        },
        orderBy: { deliveryDate: "asc" },
        take: 10,
      }),
      prisma.product.findMany({
        where: { active: true },
        include: {
          company: { select: { id: true, name: true, commissionPercent: user.role === "ADMIN" } },
        },
      }),
    ]);

    const todaySales = todayBills.reduce((acc, b) => acc + b.total, 0);
    const todayCollection = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    const totalOpening = allCustomers.reduce((acc, c) => acc + c.openingBalance, 0);
    const totalBilledAllTime = allBills.reduce((acc, b) => acc + b.total, 0);
    const totalPaidAllTime = allPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalOutstanding = Math.max(0, Math.round((totalOpening + totalBilledAllTime - totalPaidAllTime) * 100) / 100);

    // 2. Low Stock Alerts
    const stockMap = await getProductsStockMap(allProducts.map((p) => p.id));
    const lowStockItems = allProducts
      .map((p) => {
        const currentStock = stockMap.get(p.id) || 0;
        return {
          id: p.id,
          name: p.name,
          flavor: p.flavor,
          unit: p.unit,
          companyName: p.company.name,
          currentStock,
          lowStockThreshold: p.lowStockThreshold,
          isLowStock: currentStock <= p.lowStockThreshold,
        };
      })
      .filter((p) => p.isLowStock)
      .slice(0, 8);

    // 3. 7-Day Trend Chart Data
    const last7Days: { date: string; label: string; sales: number; bills: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      const dayKey = d.toISOString().split("T")[0];

      last7Days.push({
        date: dayKey,
        label: dayLabel,
        sales: 0,
        bills: 0,
        orders: 0,
      });
    }

    // Fetch past 7 days bills & orders
    const past7Start = new Date();
    past7Start.setDate(past7Start.getDate() - 6);
    past7Start.setHours(0, 0, 0, 0);

    const [recentBills, recentOrders] = await Promise.all([
      prisma.bill.findMany({
        where: { date: { gte: past7Start } },
        select: { date: true, total: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: past7Start } },
        select: { createdAt: true },
      }),
    ]);

    for (const b of recentBills) {
      const dateKey = new Date(b.date).toISOString().split("T")[0];
      const match = last7Days.find((day) => day.date === dateKey);
      if (match) {
        match.sales += b.total;
        match.bills += 1;
      }
    }

    for (const o of recentOrders) {
      const dateKey = new Date(o.createdAt).toISOString().split("T")[0];
      const match = last7Days.find((day) => day.date === dateKey);
      if (match) {
        match.orders += 1;
      }
    }

    // 4. Admin Only: Profit, Company Breakdown & Margins
    let companyPerformance: any[] = [];
    let totalEstimatedProfit = 0;
    let totalEstimatedCost = 0;

    if (user.role === "ADMIN") {
      const allBillItems = await prisma.billItem.findMany({
        include: {
          product: {
            include: { company: true },
          },
        },
      });

      const compMap: Record<
        string,
        {
          companyId: string;
          companyName: string;
          commissionPercent: number;
          revenue: number;
          cost: number;
          profit: number;
          unitsSold: number;
        }
      > = {};

      for (const item of allBillItems) {
        const comp = item.product.company;
        if (!compMap[comp.id]) {
          compMap[comp.id] = {
            companyId: comp.id,
            companyName: comp.name,
            commissionPercent: comp.commissionPercent,
            revenue: 0,
            cost: 0,
            profit: 0,
            unitsSold: 0,
          };
        }

        const saleRevenue = item.amount;
        // Cost based on product purchase rate
        const purchaseCost = item.qty * item.product.purchasePrice;
        const profit = saleRevenue - purchaseCost;

        compMap[comp.id].revenue += saleRevenue;
        compMap[comp.id].cost += purchaseCost;
        compMap[comp.id].profit += profit;
        compMap[comp.id].unitsSold += item.qty;

        totalEstimatedCost += purchaseCost;
        totalEstimatedProfit += profit;
      }

      companyPerformance = Object.values(compMap).map((c) => ({
        ...c,
        marginPercent: c.revenue > 0 ? Math.round((c.profit / c.revenue) * 1000) / 10 : 0,
      }));
    }

    const responseData: any = {
      kpis: {
        todayOrdersCount,
        todayBillsCount: todayBills.length,
        todaySales,
        todayCollection,
        totalOutstanding,
      },
      pendingOrders,
      lowStockItems,
      chartTrend: last7Days,
    };

    if (user.role === "ADMIN") {
      responseData.adminAnalytics = {
        totalRevenue: totalBilledAllTime,
        totalEstimatedCost,
        totalEstimatedProfit,
        overallMarginPercent:
          totalBilledAllTime > 0
            ? Math.round((totalEstimatedProfit / totalBilledAllTime) * 1000) / 10
            : 0,
        companyPerformance,
      };
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
