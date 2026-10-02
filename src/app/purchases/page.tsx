"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatINR, formatDate, formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Printer,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  commissionPercent: number;
}

interface Product {
  id: string;
  name: string;
  flavor: string;
  unit: string;
  purchasePrice: number;
  companyId: string;
}

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");

  // New Purchase Inward Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [commissionPercent, setCommissionPercent] = useState<string>("0");
  const [purchaseItems, setPurchaseItems] = useState<Array<{ productId: string; qty: number; rate: number; product: Product }>>([]);

  // Line item adder state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQty, setItemQty] = useState("50");
  const [itemRate, setItemRate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Voucher print view
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [companyFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [compRes, prodRes, purRes] = await Promise.all([
        fetch("/api/companies"),
        fetch("/api/products?active=true"),
        fetch(`/api/purchases?${companyFilter !== "ALL" ? `companyId=${companyFilter}` : ""}`),
      ]);

      if (purRes.status === 403) {
        toast.error("Access restricted to Owner (Admin)");
        router.push("/dashboard");
        return;
      }

      const compData = await compRes.json();
      const prodData = await prodRes.json();
      const purData = await purRes.json();

      if (compData.companies) setCompanies(compData.companies);
      if (prodData.products) setProducts(prodData.products);
      if (purData.purchases) setPurchases(purData.purchases);
    } catch (e) {
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = (compId: string) => {
    setSelectedCompanyId(compId);
    const comp = companies.find((c) => c.id === compId);
    if (comp) {
      setCommissionPercent(String(comp.commissionPercent));
    }
    setPurchaseItems([]);
    setSelectedProductId("");
    setItemRate("");
  };

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setItemRate(String(prod.purchasePrice || 0));
    }
  };

  const handleAddLineItem = () => {
    if (!selectedProductId) {
      toast.error("Please pick a product");
      return;
    }
    const qty = parseInt(itemQty);
    if (!qty || qty <= 0) {
      toast.error("Enter valid quantity");
      return;
    }
    const rate = parseFloat(itemRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Enter valid purchase rate");
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIdx = purchaseItems.findIndex((i) => i.productId === selectedProductId);
    if (existingIdx > -1) {
      const updated = [...purchaseItems];
      updated[existingIdx].qty += qty;
      updated[existingIdx].rate = rate;
      setPurchaseItems(updated);
    } else {
      setPurchaseItems([
        ...purchaseItems,
        { productId: prod.id, qty, rate, product: prod },
      ]);
    }

    setSelectedProductId("");
    setItemRate("");
    setItemQty("50");
  };

  const calculateSubtotal = () => {
    return purchaseItems.reduce((s, i) => s + i.qty * i.rate, 0);
  };

  const subtotal = calculateSubtotal();
  const numComm = parseFloat(commissionPercent) || 0;
  const commissionAmt = Math.round(((subtotal * numComm) / 100) * 100) / 100;
  const netPayable = Math.round((subtotal - commissionAmt) * 100) / 100;

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) {
      toast.error("Please select a brand / company");
      return;
    }
    if (!invoiceNo.trim()) {
      toast.error("Please enter brand's Invoice Number");
      return;
    }
    if (purchaseItems.length === 0) {
      toast.error("Please add at least one line item to inward");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          invoiceNo: invoiceNo.trim(),
          date: purchaseDate,
          commissionPercent: numComm,
          items: purchaseItems.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            rate: i.rate,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record purchase");
        return;
      }

      toast.success(data.message || "Purchase recorded and stock added!");
      setIsModalOpen(false);
      setSelectedCompanyId("");
      setInvoiceNo("");
      setPurchaseItems([]);
      fetchInitialData();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = async (id: string, invNo: string) => {
    if (!confirm(`Are you sure you want to delete purchase #${invNo}? This will automatically reverse stock movements.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setPurchases(purchases.filter((p) => p.id !== id));
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Failed to delete purchase");
    }
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      p.company.name.toLowerCase().includes(search.toLowerCase())
  );

  const availableCompanyProducts = products.filter(
    (p) => p.companyId === selectedCompanyId
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>Purchase Entry (Inward Stock)</span>
              <Badge variant="warning" className="text-[10px] font-bold">
                Owner Only
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inward bulk stock from Amul, Kwality Wall&apos;s, Vadilal, Mother Dairy & Havmor with commission discounts
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 shadow-md shadow-teal-700/20"
          >
            <Plus className="w-4 h-4" />
            + New Bulk Purchase
          </Button>
        </div>

        {/* Filter Bar */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Invoice # or Company..."
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
                <option value="ALL">All 5 Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.commissionPercent}%)
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Purchases Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading purchase records...
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No purchase records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Brand / Company</th>
                      <th className="p-3 text-center">Items Inward</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Margin %</th>
                      <th className="p-3 text-right">Commission (₹)</th>
                      <th className="p-3 text-right">Net Payable</th>
                      <th className="p-3 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-teal-900 dark:text-teal-400">
                          {purchase.invoiceNo}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{formatDate(purchase.date)}</td>
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white">{purchase.company.name}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            {purchase.items.length} items ({purchase.items.reduce((s: any, i: any) => s + i.qty, 0)} units)
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300 font-medium">
                          {formatINR(purchase.subtotal)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                            {purchase.commissionPercent}%
                          </span>
                        </td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                          {formatINR(purchase.commissionAmount)}
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">
                          {formatINR(purchase.netAmount)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedVoucher(purchase);
                                setVoucherModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded"
                              title="View Voucher"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePurchase(purchase.id, purchase.invoiceNo)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded"
                              title="Delete & Reverse Stock"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* NEW BULK PURCHASE INWARD MODAL                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="xl"
        title="Record Brand Purchase (Inward Stock)"
        description="Select brand manufacturer, invoice no., and add bulk product cases"
      >
        <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Company */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Ice Cream Brand *
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => handleCompanySelect(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-teal-500"
                required
              >
                <option value="">-- Choose Brand --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.commissionPercent}% Margin)
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice No */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Company Invoice # *
              </label>
              <input
                type="text"
                placeholder="e.g. PUR-AMUL-2026-099"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          {/* Commission % adjustment */}
          <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 dark:text-teal-300">
              Company Commission / Margin Rate:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={commissionPercent}
                onChange={(e) => setCommissionPercent(e.target.value)}
                className="w-20 text-center bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg px-2 py-1 text-xs font-black text-teal-900 dark:text-teal-300"
              />
              <span className="text-xs font-bold text-teal-900 dark:text-teal-300">%</span>
            </div>
          </div>

          {/* Line Item Adder */}
          {selectedCompanyId ? (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Add Products to Inward
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <select
                    value={selectedProductId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Choose Product --</option>
                    {availableCompanyProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) - Cost: ₹{p.purchasePrice}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2 py-1.5 text-xs font-bold text-center"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Cost ₹"
                    value={itemRate}
                    onChange={(e) => setItemRate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2 py-1.5 text-xs font-semibold text-right"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddLineItem}
                    className="w-full text-xs font-bold rounded-xl"
                  >
                    + Add
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
              Please choose a brand manufacturer above first to see associated products.
            </div>
          )}

          {/* Line items table */}
          {purchaseItems.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Product & Flavor</th>
                    <th className="p-2.5 text-center">Pack</th>
                    <th className="p-2.5 text-center">Inward Qty</th>
                    <th className="p-2.5 text-right">Cost Rate</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {purchaseItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <span className="font-bold text-slate-900 dark:text-white">{item.product.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{item.product.flavor}</span>
                      </td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-300">{item.product.unit}</td>
                      <td className="p-2.5 text-center font-black text-slate-900 dark:text-white">{item.qty}</td>
                      <td className="p-2.5 text-right">{formatINR(item.rate)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                        {formatINR(item.qty * item.rate)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Subtotal Cost:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Company Commission ({commissionPercent}%):</span>
                  <span className="font-bold">-{formatINR(commissionAmt)}</span>
                </div>
                <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>Net Payable to Brand:</span>
                  <span className="text-teal-900 dark:text-teal-300">{formatINR(netPayable)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Inward Stock & Save Purchase
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Voucher Modal */}
      {voucherModalOpen && selectedVoucher && (
        <Modal
          isOpen={voucherModalOpen}
          onClose={() => setVoucherModalOpen(false)}
          size="lg"
          title={`Purchase Voucher #${selectedVoucher.invoiceNo}`}
          description={`From ${selectedVoucher.company.name} on ${formatDate(selectedVoucher.date)}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Supplier Company:</p>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{selectedVoucher.company.name}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Inward Date:</p>
                <p className="font-bold text-slate-900 dark:text-white">{formatDate(selectedVoucher.date)}</p>
              </div>
            </div>

            <table className="w-full border border-slate-200 dark:border-slate-700 rounded-xl text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                <tr>
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5 text-center">Pack</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedVoucher.items.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{it.product.name}</td>
                    <td className="p-2.5 text-center text-slate-500 dark:text-slate-400">{it.product.unit}</td>
                    <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white">{it.qty}</td>
                    <td className="p-2.5 text-right">{formatINR(it.rate)}</td>
                    <td className="p-2.5 text-right font-bold">{formatINR(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-3.5 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatINR(selectedVoucher.subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Commission ({selectedVoucher.commissionPercent}%):</span>
                <span>-{formatINR(selectedVoucher.commissionAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-teal-300 pt-1 border-t border-slate-800">
                <span>Net Payable:</span>
                <span>{formatINR(selectedVoucher.netAmount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Voucher
              </Button>
              <Button variant="primary" size="sm" onClick={() => setVoucherModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
