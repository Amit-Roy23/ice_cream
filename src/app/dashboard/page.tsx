"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatINR, formatDate } from "@/lib/formatters";
import { useTheme } from "@/components/theme/ThemeContext";
import {
  TrendingUp,
  Zap,
  ClipboardList,
  AlertTriangle,
  Truck,
  IndianRupee,
  Store,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { actualTheme } = useTheme();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </AppLayout>
    );
  }

  const kpis = data?.kpis || {};
  const adminAnalytics = data?.adminAnalytics;
  const pendingOrders = data?.pendingOrders || [];
  const lowStockItems = data?.lowStockItems || [];
  const chartTrend = data?.chartTrend || [];

  const isDark = actualTheme === "dark";
  const gridStroke = isDark ? "#334155" : "#f1f5f9";
  const axisStroke = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#0f172a" : "#1e293b";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header & Fast Action shortcuts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Operations Dashboard</span>
              {adminAnalytics && (
                <Badge variant="warning" className="text-[11px] font-bold inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Executive View
                </Badge>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live multi-brand distribution metrics, pending fulfillment & billing pipeline
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/billing">
              <Button variant="primary" size="md" className="gap-1.5 shadow-md shadow-teal-700/20">
                <Zap className="w-4 h-4" />
                Fast Billing
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline" size="md" className="gap-1.5">
                <ClipboardList className="w-4 h-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Top KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Today's Sales */}
          <Card className="border-l-4 border-l-teal-500 bg-gradient-to-br from-white to-teal-50/30 dark:from-slate-900 dark:to-teal-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Today&apos;s Sales
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatINR(kpis.todaySales)}
                </p>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                  Across {kpis.todayBillsCount} invoices today
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Today's Collections */}
          <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Today&apos;s Collection
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatINR(kpis.todayCollection)}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                  Cash & UPI receipts
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Today's Field Orders */}
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Today&apos;s Orders
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.todayOrdersCount}
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium mt-0.5">
                  Logged by field sales team
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Generated */}
          <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Bills Generated
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.todayBillsCount}
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
                  Processed & dispatched
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Retailer Outstanding */}
          <Card className="border-l-4 border-l-rose-500 bg-gradient-to-br from-white to-rose-50/30 dark:from-slate-900 dark:to-rose-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Outstanding
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-black text-rose-700 dark:text-rose-400">
                  {formatINR(kpis.totalOutstanding)}
                </p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                  Market receivables
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* ADMIN ONLY: PROFIT & COMPANY MARGIN ANALYTICS                             */}
        {/* ========================================================================= */}
        {adminAnalytics && (
          <div className="space-y-4 p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 text-white shadow-xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    Owner Eyes Only
                  </span>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Estimated Profit & Company Margin Performance
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated using individual brand commission margins & wholesale purchase rates
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Estimated Profit
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    {formatINR(adminAnalytics.totalEstimatedProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Overall Margin %
                  </span>
                  <span className="text-2xl font-black text-teal-300">
                    {adminAnalytics.overallMarginPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Company Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {adminAnalytics.companyPerformance.map((comp: any) => (
                <div
                  key={comp.companyId}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-400/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate">{comp.companyName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                      {comp.commissionPercent}%
                    </span>
                  </div>
                  <div className="space-y-1 mt-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Sales:</span>
                      <span className="text-slate-200 font-bold">{formatINR(comp.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Cost:</span>
                      <span className="text-slate-300">{formatINR(comp.cost)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-black pt-1 border-t border-white/10">
                      <span>Profit:</span>
                      <span>{formatINR(comp.profit)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts & Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Revenue Trend (2 cols) */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">7-Day Sales & Dispatch Trend</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">Daily billed revenue (₹) across the past week</p>
              </div>
              <Badge variant="info">Live Feed</Badge>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="label" stroke={axisStroke} fontSize={11} tickLine={false} />
                    <YAxis
                      stroke={axisStroke}
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatINR(Number(val)), "Sales Revenue"]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ backgroundColor: tooltipBg, color: "#fff", borderRadius: "12px", border: "1px solid #334155", fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Orders Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weekly Orders vs Invoices</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daily count comparison</p>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="label" stroke={axisStroke} fontSize={10} tickLine={false} />
                    <YAxis stroke={axisStroke} fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: tooltipBg, color: "#fff", borderRadius: "12px", border: "1px solid #334155", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="bills" name="Bills" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2-Column: Pending Orders to Deliver + Low Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Orders to Deliver Today / Tomorrow */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Pending Deliveries Queue
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled for delivery today or tomorrow</p>
              </div>
              <Link href="/orders" className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {pendingOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No pending orders for today/tomorrow! All up to date.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {order.customer.shopName}
                          </span>
                          <Badge
                            variant={order.status === "CONFIRMED" ? "info" : "warning"}
                            className="text-[10px]"
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {order.items.length} items ({order.items.reduce((s: any, i: any) => s + i.qty, 0)} units) • Due:{" "}
                          <span className="font-bold text-slate-700 dark:text-slate-200">{formatDate(order.deliveryDate)}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Staff: {order.createdBy.name} • {order.customer.area}
                        </p>
                      </div>

                      <Link href={`/billing?orderId=${order.id}`}>
                        <Button variant="primary" size="sm" className="gap-1 shadow-xs">
                          <Zap className="w-3.5 h-3.5" />
                          Bill
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">Items at or below minimum threshold</p>
              </div>
              <Link href="/stock" className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center">
                Inventory <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {lowStockItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>All ice cream items are well-stocked above thresholds!</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lowStockItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {item.unit}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Brand: <span className="font-bold text-slate-700 dark:text-slate-200">{item.companyName}</span> • Flavor: {item.flavor}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-black text-xs">
                          {item.currentStock} left (Min: {item.lowStockThreshold})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
