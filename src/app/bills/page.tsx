"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InvoicePrintView } from "@/components/ui/InvoicePrintView";
import { formatINR, formatDate, formatDateTime } from "@/lib/formatters";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Search,
  Zap,
  Printer,
} from "lucide-react";

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentMode, setPaymentMode] = useState("ALL");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchBills();
  }, [paymentMode]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      let url = "/api/bills?";
      if (paymentMode !== "ALL") url += `paymentMode=${paymentMode}&`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.bills) {
        setBills(data.bills);
      }
    } catch (e) {
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBillView = async (billId: string) => {
    try {
      const res = await fetch(`/api/bills/${billId}`);
      const data = await res.json();
      if (res.ok && data.bill) {
        setSelectedBill(data.bill);
        setViewModalOpen(true);
      }
    } catch (e) {
      toast.error("Failed to load invoice details");
    }
  };

  const filteredBills = bills.filter(
    (b) =>
      b.billNo.toLowerCase().includes(search.toLowerCase()) ||
      b.customer.shopName.toLowerCase().includes(search.toLowerCase()) ||
      b.customer.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      b.customer.area?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSalesVolume = filteredBills.reduce((acc, b) => acc + b.total, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>Invoices & Bill History</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              View, reprint, or export issued tax invoices and wholesale delivery bills
            </p>
          </div>

          <Link href="/billing">
            <Button variant="primary" size="md" className="gap-1.5 shadow-md shadow-teal-700/20">
              <Zap className="w-4 h-4" />
              Create New Bill
            </Button>
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Invoice #, Shop, Owner or Area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Payment:</span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {["ALL", "CASH", "UPI", "CREDIT"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      paymentMode === mode
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="text-right ml-auto sm:ml-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">Total Filtered:</span>
                <span className="text-sm font-black text-teal-900 dark:text-teal-300">{formatINR(totalSalesVolume)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bills Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading invoices...
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No invoices found matching current criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Retailer & Area</th>
                      <th className="p-3 text-center">Items</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3 text-center">Mode</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3">Billed By</th>
                      <th className="p-3 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-teal-800 dark:text-teal-400">
                          {bill.billNo}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{formatDate(bill.date)}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white">{bill.customer.shopName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {bill.customer.ownerName} • {bill.customer.area}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            {bill.items.length} ({bill.items.reduce((s: any, i: any) => s + i.qty, 0)})
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">{formatINR(bill.subtotal)}</td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">
                          {formatINR(bill.total)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              bill.paymentMode === "CASH"
                                ? "success"
                                : bill.paymentMode === "UPI"
                                ? "info"
                                : "danger"
                            }
                            className="font-bold text-[10px]"
                          >
                            {bill.paymentMode}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                          {formatINR(bill.paidAmount)}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">{bill.createdBy.name}</td>
                        <td className="p-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenBillView(bill.id)}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            Print
                          </Button>
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

      {/* View & Print Modal */}
      {viewModalOpen && selectedBill && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          size="xl"
          title={`Invoice #${selectedBill.billNo}`}
          description={`Issued to ${selectedBill.customer.shopName} on ${formatDateTime(selectedBill.date)}`}
        >
          <InvoicePrintView bill={selectedBill} onClose={() => setViewModalOpen(false)} />
        </Modal>
      )}
    </AppLayout>
  );
}
