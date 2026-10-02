"use client";

import React, { useState } from "react";
import { formatINR, formatDate, formatDateTime, numberToIndianWords } from "@/lib/formatters";
import { Button } from "./Button";
import { Printer, FileText, Smartphone, Share2, IceCream } from "lucide-react";
import { toast } from "sonner";

interface BillPrintData {
  id: string;
  billNo: string;
  date: string | Date;
  subtotal: number;
  discount: number;
  gst: number;
  roundOff: number;
  total: number;
  paidAmount: number;
  paymentMode: string;
  customer: {
    shopName: string;
    ownerName: string;
    phone: string;
    address?: string | null;
    area?: string | null;
    gstin?: string | null;
  };
  createdBy?: {
    name: string;
  };
  items: Array<{
    id?: string;
    qty: number;
    rate: number;
    amount: number;
    product: {
      name: string;
      flavor: string;
      unit: string;
      company: {
        name: string;
      };
    };
  }>;
  customerCurrentOutstanding?: number;
  companyBreakdown?: Array<{
    companyName: string;
    totalQty: number;
    subtotal: number;
  }>;
}

interface InvoicePrintViewProps {
  bill: BillPrintData;
  onClose?: () => void;
}

export function InvoicePrintView({ bill, onClose }: InvoicePrintViewProps) {
  const [printFormat, setPrintFormat] = useState<"A4" | "THERMAL">("A4");

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = bill.customer.phone.replace(/[^0-9]/g, "");
    const itemsText = bill.items
      .slice(0, 5)
      .map((i) => `• ${i.product.name} (${i.qty} ${i.product.unit}) - ₹${i.amount}`)
      .join("\n");
    const moreText = bill.items.length > 5 ? `\n...and ${bill.items.length - 5} more items` : "";

    const text = encodeURIComponent(
      `🍦 *FROSTBITE ICE CREAM WHOLESALE*\n` +
      `--------------------------------\n` +
      `📄 *Tax Invoice #:* ${bill.billNo}\n` +
      `🏪 *Retailer:* ${bill.customer.shopName}\n` +
      `📅 *Date:* ${formatDate(bill.date)}\n` +
      `--------------------------------\n` +
      `*Items Summary:*\n${itemsText}${moreText}\n` +
      `--------------------------------\n` +
      `💰 *Grand Total:* ₹${bill.total}\n` +
      `💵 *Paid (${bill.paymentMode}):* ₹${bill.paidAmount}\n` +
      `⚠️ *Current Balance:* ₹${Math.max(0, bill.total - bill.paidAmount)}\n\n` +
      `_Keep ice cream maintained at -18°C. Thank you for your business!_`
    );

    const waUrl = phone.length === 10 ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp invoice preview...");
  };

  const balanceDue = Math.max(0, bill.total - bill.paidAmount);

  return (
    <div className="flex flex-col space-y-4">
      {/* Top Format Selector and Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Format:</span>
          <div className="inline-flex p-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setPrintFormat("A4")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                printFormat === "A4"
                  ? "bg-teal-600 text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Standard A4 Invoice
            </button>
            <button
              onClick={() => setPrintFormat("THERMAL")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                printFormat === "THERMAL"
                  ? "bg-teal-600 text-white shadow-sm font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              80mm Thermal Receipt
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp Invoice
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Print Now
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Printable Paper Canvas */}
      <div className="flex justify-center bg-slate-200/60 dark:bg-slate-950/80 p-4 rounded-xl overflow-x-auto border border-slate-200 dark:border-slate-800">
        {printFormat === "A4" ? (
          /* ========================================================================= */
          /* A4 INVOICE FORMAT                                                         */
          /* ========================================================================= */
          <div className="w-[210mm] min-h-[297mm] bg-white p-8 text-slate-900 shadow-md printable-area mx-auto flex flex-col justify-between text-xs leading-normal">
            <div>
              {/* Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                        <IceCream className="w-5 h-5 text-white" />
                      </div>
                      <h1 className="text-xl font-black tracking-tight text-slate-900">
                        FROSTBITE ICE CREAM DISTRIBUTORS
                      </h1>
                    </div>
                    <p className="text-slate-600 mt-1">
                      Authorised Wholesale Distributor: Amul • Kwality Wall&apos;s • Vadilal • Mother Dairy • Havmor
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Cold Storage Complex, Ring Road Industrial Area, Delhi - 110033
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-700">GSTIN:</span> 07AAAAF1234F1Z8 | <span className="font-semibold text-slate-700">Phone:</span> +91 98765 43210
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="inline-block bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1 rounded font-bold text-sm uppercase tracking-wider mb-2">
                      TAX INVOICE / BILL
                    </div>
                    <p className="text-slate-800 font-bold text-sm">Invoice #: {bill.billNo}</p>
                    <p className="text-slate-600 text-xs">Date: {formatDateTime(bill.date)}</p>
                    <p className="text-slate-600 text-xs">
                      Payment Mode: <span className="font-semibold uppercase">{bill.paymentMode}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Billed To (Retailer) Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    BILLED TO (RETAILER):
                  </span>
                  <p className="text-sm font-bold text-slate-900">{bill.customer.shopName}</p>
                  <p className="text-slate-700 font-medium">Prop: {bill.customer.ownerName}</p>
                  <p className="text-slate-600">{bill.customer.address || bill.customer.area || "Local Market"}</p>
                  <p className="text-slate-600">Phone: +91 {bill.customer.phone}</p>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    {bill.customer.gstin && (
                      <p className="text-slate-700">
                        <span className="font-semibold">Retailer GSTIN:</span> {bill.customer.gstin}
                      </p>
                    )}
                    {bill.createdBy && (
                      <p className="text-slate-500 text-[11px]">Billed By: {bill.createdBy.name}</p>
                    )}
                  </div>
                  {bill.customerCurrentOutstanding !== undefined && (
                    <div className="bg-amber-50 border border-amber-200 p-1.5 rounded inline-block self-end text-left">
                      <p className="text-[10px] text-amber-800 font-semibold uppercase">Total Outstanding Balance:</p>
                      <p className="text-xs font-bold text-amber-900">{formatINR(bill.customerCurrentOutstanding)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-slate-300 mb-4">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-semibold text-[11px]">
                    <th className="border border-slate-300 p-2 text-center w-10">#</th>
                    <th className="border border-slate-300 p-2 text-left">Brand / Company</th>
                    <th className="border border-slate-300 p-2 text-left">Item Description & Flavor</th>
                    <th className="border border-slate-300 p-2 text-center w-24">Pack Size</th>
                    <th className="border border-slate-300 p-2 text-right w-16">Qty</th>
                    <th className="border border-slate-300 p-2 text-right w-20">Rate (₹)</th>
                    <th className="border border-slate-300 p-2 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="border border-slate-300 p-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-semibold text-slate-700">
                        {item.product.company.name}
                      </td>
                      <td className="border border-slate-300 p-2">
                        <span className="font-medium text-slate-900">{item.product.name}</span>
                        <span className="text-slate-500 text-[11px] block">{item.product.flavor}</span>
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-600">{item.product.unit}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-slate-900">{item.qty}</td>
                      <td className="border border-slate-300 p-2 text-right text-slate-700">{formatINR(item.rate)}</td>
                      <td className="border border-slate-300 p-2 text-right font-semibold text-slate-900">
                        {formatINR(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Company-wise Summary breakdown if multiple brands */}
              {bill.companyBreakdown && bill.companyBreakdown.length > 1 && (
                <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Brand-Wise Subtotal Summary:
                  </span>
                  <div className="flex flex-wrap gap-4 text-xs">
                    {bill.companyBreakdown.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">{c.companyName}:</span>
                        <span className="font-bold text-slate-900">{formatINR(c.subtotal)}</span>
                        <span className="text-slate-400 text-[10px]">({c.totalQty} units)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals and Calculation Box */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <p className="text-[11px] font-bold text-slate-700">Amount in Words:</p>
                    <p className="text-xs font-semibold text-teal-800 italic">
                      {numberToIndianWords(bill.total)}
                    </p>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
                    <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                    <p>1. Goods once sold will not be taken back or replaced after delivery.</p>
                    <p>2. Keep ice cream strictly maintained at -18°C deep freezer temperature.</p>
                    <p>3. Outstanding balance payable within 7 business days.</p>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg overflow-hidden">
                  <div className="flex justify-between p-2 border-b border-slate-200 text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">{formatINR(bill.subtotal)}</span>
                  </div>
                  {bill.discount > 0 && (
                    <div className="flex justify-between p-2 border-b border-slate-200 text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-semibold">-{formatINR(bill.discount)}</span>
                    </div>
                  )}
                  {bill.gst > 0 && (
                    <div className="flex justify-between p-2 border-b border-slate-200 text-slate-600">
                      <span>GST (5%):</span>
                      <span className="font-semibold text-slate-800">{formatINR(bill.gst)}</span>
                    </div>
                  )}
                  {bill.roundOff !== 0 && (
                    <div className="flex justify-between p-2 border-b border-slate-200 text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span>{formatINR(bill.roundOff)}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-2.5 bg-slate-900 text-white font-bold text-sm">
                    <span>Grand Total:</span>
                    <span>{formatINR(bill.total)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-emerald-50 text-emerald-800 font-semibold border-t border-emerald-100">
                    <span>Paid Amount ({bill.paymentMode}):</span>
                    <span>{formatINR(bill.paidAmount)}</span>
                  </div>
                  {balanceDue > 0 && (
                    <div className="flex justify-between p-2 bg-rose-50 text-rose-800 font-bold border-t border-rose-100">
                      <span>Balance Added to Ledger:</span>
                      <span>{formatINR(balanceDue)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer & Signatures */}
            <div className="border-t border-slate-300 pt-6 mt-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-slate-500">Receiver&apos;s Signature / Stamp</p>
                  <div className="w-40 border-b border-dashed border-slate-400 mt-8"></div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800">For FROSTBITE ICE CREAM DISTRIBUTORS</p>
                  <div className="w-48 border-b border-dashed border-slate-400 mt-8 mb-1"></div>
                  <p className="text-[10px] text-slate-500">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 80mm THERMAL RECEIPT FORMAT                                               */
          /* ========================================================================= */
          <div className="w-[80mm] bg-white p-4 text-slate-900 shadow-md font-mono text-[11px] leading-tight printable-area thermal-receipt mx-auto">
            <div className="text-center border-b border-dashed border-slate-400 pb-2 mb-2">
              <p className="text-sm font-black">FROSTBITE DISTRIBUTORS</p>
              <p className="text-[9px] text-slate-600">Ice Cream Wholesale & Logistics</p>
              <p className="text-[9px] text-slate-600">Ph: +91 98765 43210 | Delhi</p>
              <p className="text-[9px] font-bold mt-1">*** CASH / CREDIT BILL ***</p>
            </div>

            <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-[10px]">
              <div className="flex justify-between">
                <span>Bill: {bill.billNo}</span>
                <span>{formatDate(bill.date)}</span>
              </div>
              <p className="font-bold text-slate-900 mt-1">Shop: {bill.customer.shopName}</p>
              <p>Ph: {bill.customer.phone}</p>
            </div>

            <table className="w-full text-[10px] mb-2 border-b border-dashed border-slate-400 pb-2">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-1">Item</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Rate</th>
                  <th className="text-right py-1">Amt</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-0.5">
                      <div className="font-bold">{item.product.name}</div>
                      <div className="text-[8px] text-slate-500">{item.product.unit}</div>
                    </td>
                    <td className="text-right align-top font-bold">{item.qty}</td>
                    <td className="text-right align-top">{item.rate}</td>
                    <td className="text-right align-top font-bold">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2 mb-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatINR(bill.subtotal)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatINR(bill.discount)}</span>
                </div>
              )}
              {bill.gst > 0 && (
                <div className="flex justify-between">
                  <span>GST:</span>
                  <span>{formatINR(bill.gst)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span>{formatINR(bill.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid ({bill.paymentMode}):</span>
                <span>{formatINR(bill.paidAmount)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between font-bold text-rose-700">
                  <span>Balance Due:</span>
                  <span>{formatINR(balanceDue)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-[9px] text-slate-600 mt-3">
              <p>Keep frozen at -18°C.</p>
              <p>Thank You For Your Business!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
