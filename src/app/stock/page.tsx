"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatINR, formatDate, formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Package,
  Search,
  History,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface StockItem {
  id: string;
  name: string;
  flavor: string;
  unit: string;
  mrp: number;
  salePrice: number;
  purchasePrice?: number;
  lowStockThreshold: number;
  currentStock: number;
  isLowStock: boolean;
  stockValueAtCost?: number;
  stockValueAtSale?: number;
  company: {
    id: string;
    name: string;
  };
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"STOCK" | "LEDGER">("STOCK");

  // Filters
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Manual Stock Adjustment Modal (Admin Only)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>("0");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [lowStockOnly, companyFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [userRes, stockRes, ledgerRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/stock?companyId=${companyFilter}&lowStockOnly=${lowStockOnly}`),
        fetch("/api/stock/ledger?limit=100"),
      ]);

      const userData = await userRes.json();
      const stockData = await stockRes.json();
      const ledgerData = await ledgerRes.json();

      if (userData.user) setCurrentUser(userData.user);
      if (stockData.stock) setStock(stockData.stock);
      if (ledgerData.movements) setLedger(ledgerData.movements);
    } catch (e) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjust = (item: StockItem) => {
    setSelectedProductForAdjust(item);
    setAdjustQty("0");
    setAdjustReason("");
    setAdjustModalOpen(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;
    const qty = parseInt(adjustQty);
    if (!qty || qty === 0) {
      toast.error("Adjustment quantity cannot be 0");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("Please enter a reason (e.g. Expired batch, Deep-freezer damage, Physical audit recount)");
      return;
    }

    setSubmittingAdjust(true);
    try {
      const res = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForAdjust.id,
          qty,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Adjustment failed");
        return;
      }

      toast.success(data.message || "Stock adjusted successfully");
      setAdjustModalOpen(false);
      fetchInitialData();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const filteredStock = stock.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.flavor.toLowerCase().includes(search.toLowerCase()) ||
      s.company.name.toLowerCase().includes(search.toLowerCase()) ||
      s.unit.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = filteredStock.reduce((acc, s) => acc + s.currentStock, 0);
  const totalValuationCost = filteredStock.reduce((acc, s) => acc + (s.stockValueAtCost || 0), 0);
  const totalValuationSale = filteredStock.reduce((acc, s) => acc + (s.stockValueAtSale || s.currentStock * s.salePrice), 0);
  const lowStockCount = stock.filter((s) => s.isLowStock).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>Cold Storage Inventory & Stock Ledger</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time multi-brand warehouse inventory with audit movement tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl">
              <button
                onClick={() => setActiveTab("STOCK")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                  activeTab === "STOCK"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Current Inventory ({stock.length})
              </button>
              <button
                onClick={() => setActiveTab("LEDGER")}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 ${
                  activeTab === "LEDGER"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Movement Audit Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Top Inventory Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Units in Deep Freezer
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {totalUnits} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">units</span>
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Low Stock Warnings
                </span>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
                  {lowStockCount} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">items</span>
                </p>
              </div>
              <Button
                variant={lowStockOnly ? "primary" : "outline"}
                size="sm"
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className="text-xs"
              >
                {lowStockOnly ? "Show All" : "Filter Low Stock"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardContent className="p-4">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Stock Valuation (Wholesale)
              </span>
              <p className="text-2xl font-black text-indigo-900 dark:text-indigo-300 mt-1">
                {formatINR(totalValuationSale)}
              </p>
              {currentUser?.role === "ADMIN" && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Cost Valuation: <span className="font-bold text-slate-700 dark:text-slate-200">{formatINR(totalValuationCost)}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {activeTab === "STOCK" ? (
          <>
            {/* Filter Bar */}
            <Card className="shadow-xs">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search ice cream name, flavor or brand..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Brand:</span>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="ALL">All Brands</option>
                    <option value="Amul (GCMMF)">Amul</option>
                    <option value="Kwality Wall's (HUL)">Kwality Wall&apos;s</option>
                    <option value="Vadilal Ice Creams">Vadilal</option>
                    <option value="Mother Dairy">Mother Dairy</option>
                    <option value="Havmor Ice Cream">Havmor</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Current Stock Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                    Loading stock inventory...
                  </div>
                ) : filteredStock.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    No products found matching filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3">Brand</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Flavor</th>
                          <th className="p-3 text-center">Pack Size</th>
                          <th className="p-3 text-right">MRP (₹)</th>
                          <th className="p-3 text-right">Wholesale Rate</th>
                          {currentUser?.role === "ADMIN" && (
                            <th className="p-3 text-right">Cost Rate</th>
                          )}
                          <th className="p-3 text-center">Current Stock</th>
                          <th className="p-3 text-center">Threshold</th>
                          <th className="p-3 text-center">Status</th>
                          {currentUser?.role === "ADMIN" && (
                            <th className="p-3 text-center w-24">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredStock.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              {item.company.name}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{item.name}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{item.flavor}</td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-[11px] text-slate-700 dark:text-slate-300">
                                {item.unit}
                              </span>
                            </td>
                            <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(item.mrp)}</td>
                            <td className="p-3 text-right font-bold text-teal-800 dark:text-teal-400">
                              {formatINR(item.salePrice)}
                            </td>
                            {currentUser?.role === "ADMIN" && (
                              <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                                {item.purchasePrice !== undefined ? formatINR(item.purchasePrice) : "-"}
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <span
                                className={`font-black text-sm ${
                                  item.isLowStock ? "text-rose-700 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-400"
                                }`}
                              >
                                {item.currentStock}
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-400 font-mono">
                              {item.lowStockThreshold}
                            </td>
                            <td className="p-3 text-center">
                              {item.isLowStock ? (
                                <Badge variant="danger" className="text-[10px] font-bold flex items-center justify-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Low Stock
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[10px] flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> In Stock
                                </Badge>
                              )}
                            </td>
                            {currentUser?.role === "ADMIN" && (
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleOpenAdjust(item)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg border border-teal-200 dark:border-teal-800 transition-colors"
                                >
                                  Adjust
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* STOCK MOVEMENT AUDIT LEDGER */
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Stock Movements Audit Ledger</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">Every inward purchase (+), bill dispatch (-), and manual correction (+/-)</p>
              </div>
              <Badge variant="info">Immutable Ledger</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {ledger.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No stock movements recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Product & Flavor</th>
                        <th className="p-3">Brand</th>
                        <th className="p-3 text-center">Movement Type</th>
                        <th className="p-3 text-center">Quantity</th>
                        <th className="p-3">Movement Reference / Reason</th>
                        <th className="p-3">Logged By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {ledger.map((mov) => (
                        <tr key={mov.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                            {formatDateTime(mov.date)}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {mov.product.name} ({mov.product.unit})
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{mov.product.company.name}</td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                mov.type === "PURCHASE"
                                  ? "success"
                                  : mov.type === "SALE"
                                  ? "info"
                                  : "warning"
                              }
                              className="font-bold text-[10px]"
                            >
                              {mov.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`font-black text-sm ${
                                mov.qty > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                              }`}
                            >
                              {mov.qty > 0 ? `+${mov.qty}` : mov.qty}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{mov.notes || mov.refType || "-"}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                            {mov.user.name} ({mov.user.role})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manual Stock Adjustment Modal (Admin Only) */}
      {adjustModalOpen && selectedProductForAdjust && (
        <Modal
          isOpen={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          size="md"
          title="Manual Stock Adjustment"
          description={`Update inventory quantity for ${selectedProductForAdjust.name} (${selectedProductForAdjust.unit})`}
        >
          <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between mb-1">
                <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedProductForAdjust.currentStock} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Brand:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedProductForAdjust.company.name}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Quantity Change (+ to add, - to reduce) *
              </label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="e.g. +10 or -5"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                New resulting stock will be:{" "}
                <span className="font-bold text-teal-800 dark:text-teal-400">
                  {selectedProductForAdjust.currentStock + (parseInt(adjustQty) || 0)} units
                </span>
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Reason / Audit Note *
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Physical audit recount, freezer leakage damage, sample box"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submittingAdjust}>
                Save Adjustment & Ledger Movement
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}
