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
  Store,
  Plus,
  Search,
  MapPin,
  Edit2,
  Share2,
} from "lucide-react";

interface CustomerItem {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address?: string | null;
  area?: string | null;
  gstin?: string | null;
  openingBalance: number;
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  ordersCount: number;
  billsCount: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState("ALL");

  // Create / Edit Modal State
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [gstin, setGstin] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [saving, setSaving] = useState(false);

  // Payment Collection Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<CustomerItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Account Statement / Ledger Modal
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<any>(null);
  const [statementData, setStatementData] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (res.ok && data.customers) {
        setCustomers(data.customers);
      }
    } catch (e) {
      toast.error("Failed to load retailers");
    } finally {
      setLoading(false);
    }
  };

  const handleShareLedgerWhatsApp = (c: CustomerItem) => {
    const cleanPhone = c.phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `🍦 *FROSTBITE ICE CREAM DISTRIBUTORS*\n` +
      `--------------------------------\n` +
      `🏪 *Account Statement:* ${c.shopName}\n` +
      `👤 *Proprietor:* ${c.ownerName}\n` +
      `📍 *Area:* ${c.area || "Local Market"}\n` +
      `--------------------------------\n` +
      `📦 *Total Invoiced:* ₹${c.totalBilled}\n` +
      `💵 *Total Paid:* ₹${c.totalPaid}\n` +
      `⚠️ *Current Outstanding Balance:* ₹${c.outstandingBalance}\n` +
      `--------------------------------\n` +
      `_Please settle outstanding dues via Cash or UPI at your earliest convenience._`
    );

    const waUrl = cleanPhone.length === 10 ? `https://wa.me/91${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp statement preview...");
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setShopName("");
    setOwnerName("");
    setPhone("");
    setAddress("");
    setArea("");
    setGstin("");
    setOpeningBalance("0");
    setCustomerModalOpen(true);
  };

  const handleOpenEdit = (c: CustomerItem) => {
    setEditingCustomer(c);
    setShopName(c.shopName);
    setOwnerName(c.ownerName);
    setPhone(c.phone);
    setAddress(c.address || "");
    setArea(c.area || "");
    setGstin(c.gstin || "");
    setOpeningBalance(String(c.openingBalance));
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !phone.trim()) {
      toast.error("Shop name, owner name, and phone are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          area: area.trim(),
          gstin: gstin.trim(),
          openingBalance: parseFloat(openingBalance) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save retailer");
        return;
      }

      toast.success(data.message || "Retailer saved successfully");
      setCustomerModalOpen(false);
      fetchCustomers();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPayment = (c: CustomerItem) => {
    setSelectedCustomerForPayment(c);
    setPaymentAmount(c.outstandingBalance > 0 ? String(c.outstandingBalance) : "0");
    setPaymentMode("UPI");
    setPaymentNotes("");
    setPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPayment) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerForPayment.id,
          amount,
          mode: paymentMode,
          notes: paymentNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record payment");
        return;
      }

      toast.success(data.message || "Payment recorded!");
      setPaymentModalOpen(false);
      fetchCustomers();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenLedger = async (customerId: string) => {
    setLoadingLedger(true);
    setLedgerModalOpen(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/ledger`);
      const data = await res.json();
      if (res.ok) {
        setLedgerCustomer(data.customer);
        setStatementData(data.statement);
      }
    } catch (e) {
      toast.error("Failed to load customer statement");
    } finally {
      setLoadingLedger(false);
    }
  };

  const uniqueAreas = Array.from(new Set(customers.map((c) => c.area).filter(Boolean))) as string[];

  const filteredCustomers = customers.filter((c) => {
    const matchArea = selectedAreaFilter === "ALL" || c.area === selectedAreaFilter;
    const matchSearch =
      c.shopName.toLowerCase().includes(search.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.area?.toLowerCase().includes(search.toLowerCase());
    return matchArea && matchSearch;
  });

  const totalMarketOutstanding = customers.reduce((s, c) => s + c.outstandingBalance, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>Retailers & Customer Directory</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage retailer stores, track outstanding market balances & record payment collections
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right pr-3 border-r border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block">
                Total Market Outstanding
              </span>
              <span className="text-base font-black text-rose-700 dark:text-rose-400">
                {formatINR(totalMarketOutstanding)}
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreate}
              className="gap-1.5 shadow-md shadow-teal-700/20"
            >
              <Plus className="w-4 h-4" />
              + Add Retailer
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Shop, Owner, Phone or Area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Area Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Area:</span>
              <button
                type="button"
                onClick={() => setSelectedAreaFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedAreaFilter === "ALL"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                All Areas
              </button>
              {uniqueAreas.map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setSelectedAreaFilter(ar)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedAreaFilter === ar
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold shrink-0">
              {filteredCustomers.length} Retailers
            </span>
          </CardContent>
        </Card>

        {/* Retailers Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading retailers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No retailers found matching search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Shop & Owner</th>
                      <th className="p-3">Contact & Area</th>
                      <th className="p-3">GSTIN</th>
                      <th className="p-3 text-right">Opening Bal</th>
                      <th className="p-3 text-right">Total Billed</th>
                      <th className="p-3 text-right">Total Paid</th>
                      <th className="p-3 text-right">Current Outstanding</th>
                      <th className="p-3 text-center w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{cust.shopName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Prop: {cust.ownerName}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">Ph: +91 {cust.phone}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {cust.area || cust.address || "-"}
                          </p>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {cust.gstin || <span className="text-slate-400">-</span>}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(cust.openingBalance)}</td>
                        <td className="p-3 text-right font-medium text-slate-800 dark:text-slate-200">{formatINR(cust.totalBilled)}</td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">{formatINR(cust.totalPaid)}</td>
                        <td className="p-3 text-right">
                          <span
                            className={`font-black text-sm ${
                              cust.outstandingBalance > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-400"
                            }`}
                          >
                            {formatINR(cust.outstandingBalance)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenPayment(cust)}
                              className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold rounded-lg text-[11px] transition-colors"
                              title="Collect Payment"
                            >
                              Collect ₹
                            </button>
                            <button
                              onClick={() => handleOpenLedger(cust.id)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] transition-colors"
                              title="View Ledger Statement"
                            >
                              Statement
                            </button>
                            <button
                              onClick={() => handleShareLedgerWhatsApp(cust)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded"
                              title="Share Statement on WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(cust)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                              title="Edit Shop"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
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
      {/* CREATE / EDIT RETAILER MODAL                                              */}
      {/* ========================================================================= */}
      <Modal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        size="md"
        title={editingCustomer ? "Edit Retailer Store" : "Add New Retailer Store"}
        description="Fill shop owner contact details and opening balance"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Shop Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sharma General Store"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Owner / Contact Person *
              </label>
              <input
                type="text"
                placeholder="e.g. Rakesh Sharma"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 9810123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Area / Market Location
              </label>
              <input
                type="text"
                placeholder="e.g. Laxmi Nagar, Delhi"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Full Shop Address
            </label>
            <input
              type="text"
              placeholder="e.g. Shop #14, Main Market Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Opening Balance (₹)
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Save Retailer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* COLLECT PAYMENT MODAL                                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        size="md"
        title="Collect Retailer Payment"
        description={`Record Cash, UPI or Cheque receipt from ${selectedCustomerForPayment?.shopName}`}
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex justify-between items-center">
            <span className="text-rose-900 dark:text-rose-300 font-bold">Current Outstanding Balance:</span>
            <span className="text-lg font-black text-rose-900 dark:text-rose-300">
              {formatINR(selectedCustomerForPayment?.outstandingBalance)}
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              step="1"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              required
            />
            {/* Quick Amount Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Select:</span>
              {[500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPaymentAmount(String(amt))}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[11px] font-bold transition-colors"
                >
                  ₹{amt}
                </button>
              ))}
              {selectedCustomerForPayment && selectedCustomerForPayment.outstandingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(selectedCustomerForPayment.outstandingBalance))}
                  className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-[11px] font-bold border border-teal-200 dark:border-teal-800"
                >
                  Full Due (₹{selectedCustomerForPayment.outstandingBalance})
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Payment Mode *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["UPI", "CASH", "BANK_TRANSFER"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                    paymentMode === mode
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes / Transaction Ref #
            </label>
            <input
              type="text"
              placeholder="e.g. GPay UPI Ref 9283746198, Cash collected by Ramesh"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submittingPayment}>
              Record Payment Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* ACCOUNT STATEMENT / LEDGER MODAL                                          */}
      {/* ========================================================================= */}
      {ledgerModalOpen && (
        <Modal
          isOpen={ledgerModalOpen}
          onClose={() => setLedgerModalOpen(false)}
          size="xl"
          title={`Account Ledger Statement - ${ledgerCustomer?.shopName}`}
          description={`Proprietor: ${ledgerCustomer?.ownerName} | Ph: ${ledgerCustomer?.phone} | Area: ${ledgerCustomer?.area}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap justify-between items-center p-3.5 bg-slate-900 dark:bg-slate-950 text-white rounded-2xl gap-3">
              <div>
                <span className="text-slate-400 text-[11px] block">Current Running Balance:</span>
                <span className="text-xl font-black text-rose-400">
                  {formatINR(ledgerCustomer?.currentBalance)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ledgerCustomer && handleShareLedgerWhatsApp(ledgerCustomer)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" /> WhatsApp Statement
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-xl">
                  Print Statement
                </Button>
              </div>
            </div>

            {loadingLedger ? (
              <div className="p-8 text-center text-slate-400 animate-pulse">
                Generating chronological account statement...
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Ref #</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right text-slate-800 dark:text-slate-200">Debit (+)</th>
                      <th className="p-2.5 text-right text-emerald-700 dark:text-emerald-400">Credit (-)</th>
                      <th className="p-2.5 text-right font-black">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {statementData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">{formatDate(row.date)}</td>
                        <td className="p-2.5">
                          <Badge
                            variant={
                              row.type === "BILL"
                                ? "warning"
                                : row.type === "PAYMENT"
                                ? "success"
                                : "info"
                            }
                            className="text-[10px]"
                          >
                            {row.type}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">{row.refNo}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{row.description}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                          {row.debit > 0 ? formatINR(row.debit) : "-"}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {row.credit > 0 ? formatINR(row.credit) : "-"}
                        </td>
                        <td className="p-2.5 text-right font-black text-slate-900 dark:text-white">
                          {formatINR(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
