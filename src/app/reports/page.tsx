"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatINR, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  ShoppingBag,
  Package,
  Store,
  Filter,
} from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<"SALES" | "PURCHASES" | "STOCK" | "OUTSTANDING">("SALES");
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);

  // Filter params
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchInitial();
  }, [reportType, companyFilter, startDate, endDate]);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      // Fetch companies for dropdown if not loaded
      if (companies.length === 0) {
        const compRes = await fetch("/api/companies");
        const compData = await compRes.json();
        if (compData.companies) setCompanies(compData.companies);
      }

      let url = `/api/reports?type=${reportType}&`;
      if (companyFilter !== "ALL") url += `companyId=${companyFilter}&`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;

      const res = await fetch(url);
      if (res.status === 403) {
        toast.error("Reports restricted to Admin only");
        router.push("/dashboard");
        return;
      }

      const json = await res.json();
      if (res.ok && json.data) {
        setReportData(json.data);
      }
    } catch (e) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    let url = `/api/reports?type=${reportType}&format=csv&`;
    if (companyFilter !== "ALL") url += `companyId=${companyFilter}&`;
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;

    window.open(url, "_blank");
    toast.success(`Exporting ${reportType} report to CSV...`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>Business Intelligence & Audit Reports</span>
              <Badge variant="warning" className="text-[10px] font-bold">
                Admin Only
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Generate comprehensive statements and export CSV sheets for sales, brand purchases, inventory, and receivables
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleExportCSV}
            className="gap-1.5 shadow-md shadow-emerald-700/20 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4" />
            Export CSV Spreadsheet
          </Button>
        </div>

        {/* Report Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          {[
            { id: "SALES", label: "Sales & Invoicing Report", icon: TrendingUp },
            { id: "PURCHASES", label: "Brand Purchase Inwards", icon: ShoppingBag },
            { id: "STOCK", label: "Stock Valuation & Inventory", icon: Package },
            { id: "OUTSTANDING", label: "Market Outstanding Balances", icon: Store },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-slate-900 dark:bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-400 dark:text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {reportType !== "OUTSTANDING" && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Brand:</span>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2.5 py-1.5 font-medium outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="ALL">All Brands</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(reportType === "SALES" || reportType === "PURCHASES") && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Date Range:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>

            <div className="font-semibold text-slate-700 dark:text-slate-300">
              Total Records: <span className="font-bold text-teal-800 dark:text-teal-400">{reportData.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Report Output Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">
                Generating report table...
              </div>
            ) : reportData.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No records found for specified parameters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* 1. SALES REPORT TABLE */}
                {reportType === "SALES" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Retailer Store</th>
                        <th className="p-3">Area</th>
                        <th className="p-3 text-center">Payment</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-right">Discount</th>
                        <th className="p-3 text-right">GST</th>
                        <th className="p-3 text-right font-bold">Total (₹)</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3">Created By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-teal-900 dark:text-teal-400">{b.billNo}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{formatDate(b.date)}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">{b.customer.shopName}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{b.customer.area}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{b.paymentMode}</Badge>
                          </td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(b.subtotal)}</td>
                          <td className="p-3 text-right text-emerald-700 dark:text-emerald-400">{formatINR(b.discount)}</td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(b.gst)}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-white">{formatINR(b.total)}</td>
                          <td className="p-3 text-right text-slate-800 dark:text-slate-300">{formatINR(b.paidAmount)}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">{b.createdBy.name}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 dark:bg-slate-950 text-white font-bold border-t border-slate-800">
                      <tr>
                        <td colSpan={5} className="p-3">Total Sales Summary:</td>
                        <td className="p-3 text-right">
                          {formatINR(reportData.reduce((s, b) => s + b.subtotal, 0))}
                        </td>
                        <td className="p-3 text-right text-emerald-300">
                          {formatINR(reportData.reduce((s, b) => s + b.discount, 0))}
                        </td>
                        <td className="p-3 text-right">
                          {formatINR(reportData.reduce((s, b) => s + b.gst, 0))}
                        </td>
                        <td className="p-3 text-right font-black text-teal-300 text-sm">
                          {formatINR(reportData.reduce((s, b) => s + b.total, 0))}
                        </td>
                        <td className="p-3 text-right text-emerald-400">
                          {formatINR(reportData.reduce((s, b) => s + b.paidAmount, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {/* 2. PURCHASES REPORT TABLE */}
                {reportType === "PURCHASES" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Brand / Supplier</th>
                        <th className="p-3 text-center">Items Inward</th>
                        <th className="p-3 text-right">Subtotal Cost</th>
                        <th className="p-3 text-center">Commission %</th>
                        <th className="p-3 text-right">Commission Amt</th>
                        <th className="p-3 text-right font-bold">Net Payable (₹)</th>
                        <th className="p-3">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-teal-900 dark:text-teal-400">{p.invoiceNo}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{formatDate(p.date)}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{p.company.name}</td>
                          <td className="p-3 text-center font-semibold text-slate-800 dark:text-slate-200">{p.items.length}</td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(p.subtotal)}</td>
                          <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400">{p.commissionPercent}%</td>
                          <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">{formatINR(p.commissionAmount)}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">{formatINR(p.netAmount)}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">{p.createdBy.name}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 dark:bg-slate-950 text-white font-bold">
                      <tr>
                        <td colSpan={4} className="p-3">Total Purchases Summary:</td>
                        <td className="p-3 text-right">{formatINR(reportData.reduce((s, p) => s + p.subtotal, 0))}</td>
                        <td></td>
                        <td className="p-3 text-right text-emerald-300">{formatINR(reportData.reduce((s, p) => s + p.commissionAmount, 0))}</td>
                        <td className="p-3 text-right font-black text-teal-300 text-sm">{formatINR(reportData.reduce((s, p) => s + p.netAmount, 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {/* 3. STOCK VALUATION REPORT TABLE */}
                {reportType === "STOCK" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Brand</th>
                        <th className="p-3">Product Name & Flavor</th>
                        <th className="p-3 text-center">Pack Size</th>
                        <th className="p-3 text-right">MRP (₹)</th>
                        <th className="p-3 text-right">Purchase Rate</th>
                        <th className="p-3 text-right">Wholesale Rate</th>
                        <th className="p-3 text-center">Stock Units</th>
                        <th className="p-3 text-right">Value (at Cost)</th>
                        <th className="p-3 text-right font-bold">Value (at Sale)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{s.companyName}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{s.productName} ({s.flavor})</td>
                          <td className="p-3 text-center text-slate-500 dark:text-slate-400">{s.unit}</td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(s.mrp)}</td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(s.purchasePrice)}</td>
                          <td className="p-3 text-right font-bold text-teal-800 dark:text-teal-400">{formatINR(s.salePrice)}</td>
                          <td className="p-3 text-center font-black text-slate-900 dark:text-white">{s.currentStock}</td>
                          <td className="p-3 text-right text-slate-700 dark:text-slate-300">{formatINR(s.stockValueCost)}</td>
                          <td className="p-3 text-right font-black text-slate-900 dark:text-white">{formatINR(s.stockValueSale)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 dark:bg-slate-950 text-white font-bold">
                      <tr>
                        <td colSpan={6} className="p-3">Total Warehouse Inventory Valuation:</td>
                        <td className="p-3 text-center font-black">{reportData.reduce((acc, s) => acc + s.currentStock, 0)} units</td>
                        <td className="p-3 text-right text-emerald-300">{formatINR(reportData.reduce((acc, s) => acc + s.stockValueCost, 0))}</td>
                        <td className="p-3 text-right font-black text-teal-300 text-sm">{formatINR(reportData.reduce((acc, s) => acc + s.stockValueSale, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {/* 4. OUTSTANDING RECEIVABLES REPORT TABLE */}
                {reportType === "OUTSTANDING" && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Retailer Shop</th>
                        <th className="p-3">Owner & Mobile</th>
                        <th className="p-3">Area / Market</th>
                        <th className="p-3 text-right">Opening Bal</th>
                        <th className="p-3 text-right">Total Billed</th>
                        <th className="p-3 text-right">Total Paid</th>
                        <th className="p-3 text-right font-bold text-rose-700 dark:text-rose-400">Outstanding Due (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-bold text-slate-400 dark:text-slate-500 text-center w-12 font-mono">#{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{c.shopName}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{c.ownerName} • +91 {c.phone}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{c.area || "-"}</td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(c.openingBalance)}</td>
                          <td className="p-3 text-right text-slate-800 dark:text-slate-200">{formatINR(c.totalBilled)}</td>
                          <td className="p-3 text-right text-emerald-700 dark:text-emerald-400">{formatINR(c.totalPaid)}</td>
                          <td className="p-3 text-right font-black text-rose-800 dark:text-rose-400 text-sm">
                            {formatINR(c.outstandingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 dark:bg-slate-950 text-white font-bold">
                      <tr>
                        <td colSpan={7} className="p-3">Total Market Outstanding Receivables:</td>
                        <td className="p-3 text-right font-black text-rose-400 text-sm">
                          {formatINR(reportData.reduce((acc, c) => acc + c.outstandingBalance, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
