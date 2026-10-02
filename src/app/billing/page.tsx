"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { InvoicePrintView } from "@/components/ui/InvoicePrintView";
import { formatINR } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Zap,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  IceCream,
  Clock,
  RotateCcw,
  Flame,
  ShoppingCart,
  Keyboard,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  flavor: string;
  unit: string;
  mrp: number;
  salePrice: number;
  currentStock: number;
  isLowStock: boolean;
  company: {
    id: string;
    name: string;
  };
}

interface Customer {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  area: string;
  outstandingBalance: number;
}

interface BillRow {
  productId: string;
  product: Product;
  qty: number;
  rate: number;
  amount: number;
}

function FastBillingTerminalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderIdParam = searchParams.get("orderId");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Billing line items
  const [rows, setRows] = useState<BillRow[]>([]);

  // Product quick search picker state
  const [productSearch, setProductSearch] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("ALL");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState<string>("1");
  const [inputRate, setInputRate] = useState<string>("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Financials
  const [discount, setDiscount] = useState<string>("0");
  const [gstEnabled, setGstEnabled] = useState<boolean>(true);
  const [gstPercent, setGstPercent] = useState<number>(5);
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [customDate, setCustomDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Loading & submission state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<any>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(orderIdParam);

  const productInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (orderIdParam && products.length > 0 && customers.length > 0) {
      loadOrderForBilling(orderIdParam);
    }
  }, [orderIdParam, products, customers]);

  const loadInitialData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products?active=true"),
      ]);
      const custData = await custRes.json();
      const prodData = await prodRes.json();

      if (custData.customers) setCustomers(custData.customers);
      if (prodData.products) setProducts(prodData.products);
    } catch (e) {
      toast.error("Failed to load customer and product catalogs");
    } finally {
      setLoading(false);
    }
  };

  const loadOrderForBilling = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (res.ok && data.order) {
        const order = data.order;
        setSelectedCustomerId(order.customerId);
        setLinkedOrderId(order.id);

        const newRows: BillRow[] = [];
        for (const item of order.items) {
          const matchProd = products.find((p) => p.id === item.productId);
          if (matchProd) {
            newRows.push({
              productId: matchProd.id,
              product: matchProd,
              qty: item.qty,
              rate: item.rate,
              amount: item.qty * item.rate,
            });
          }
        }
        setRows(newRows);
        toast.info(`Pre-filled items from Order #${order.orderNo}`);
      }
    } catch (e) {
      console.error("Order pre-fill failed:", e);
    }
  };

  // Calculations
  const subtotal = rows.reduce((sum, r) => sum + r.amount, 0);
  const numDiscount = Math.max(0, parseFloat(discount) || 0);
  const taxableAmount = Math.max(0, subtotal - numDiscount);
  const gstAmount = gstEnabled ? Math.round(((taxableAmount * gstPercent) / 100) * 100) / 100 : 0;
  const netAmount = taxableAmount + gstAmount;
  const grandTotal = Math.round(netAmount);
  const roundOff = Math.round((grandTotal - netAmount) * 100) / 100;

  useEffect(() => {
    if (paymentMode === "CREDIT") {
      setPaidAmount("0");
    } else {
      setPaidAmount(String(grandTotal));
    }
  }, [grandTotal, paymentMode]);

  const companySubtotals: Record<string, { name: string; qty: number; total: number }> = {};
  for (const r of rows) {
    const compId = r.product.company.id;
    if (!companySubtotals[compId]) {
      companySubtotals[compId] = {
        name: r.product.company.name,
        qty: 0,
        total: 0,
      };
    }
    companySubtotals[compId].qty += r.qty;
    companySubtotals[compId].total += r.amount;
  }

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setProductSearch(`${prod.name} (${prod.unit}) - ${prod.company.name}`);
    setInputRate(String(prod.salePrice));
    setProductDropdownOpen(false);

    setTimeout(() => {
      qtyInputRef.current?.focus();
      qtyInputRef.current?.select();
    }, 50);
  };

  const handleAddRow = () => {
    if (!selectedProduct) {
      toast.error("Please pick a product first");
      productInputRef.current?.focus();
      return;
    }

    const qty = parseInt(inputQty);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const rate = parseFloat(inputRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid selling rate");
      return;
    }

    const existingIndex = rows.findIndex((r) => r.productId === selectedProduct.id);
    if (existingIndex > -1) {
      const updated = [...rows];
      const newQty = updated[existingIndex].qty + qty;
      updated[existingIndex].qty = newQty;
      updated[existingIndex].rate = rate;
      updated[existingIndex].amount = newQty * rate;
      setRows(updated);
    } else {
      setRows([
        ...rows,
        {
          productId: selectedProduct.id,
          product: selectedProduct,
          qty,
          rate,
          amount: qty * rate,
        },
      ]);
    }

    setSelectedProduct(null);
    setProductSearch("");
    setInputQty("1");
    setInputRate("");
    productInputRef.current?.focus();
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleStepQty = (index: number, delta: number) => {
    const updated = [...rows];
    const newQty = Math.max(1, updated[index].qty + delta);
    updated[index].qty = newQty;
    updated[index].amount = newQty * updated[index].rate;
    setRows(updated);
  };

  const handleQuickAddProduct = (prod: Product, qtyToAdd: number = 10) => {
    const existingIndex = rows.findIndex((r) => r.productId === prod.id);
    if (existingIndex > -1) {
      handleStepQty(existingIndex, qtyToAdd);
      toast.success(`Added +${qtyToAdd} units to ${prod.name}`);
    } else {
      setRows([
        ...rows,
        {
          productId: prod.id,
          product: prod,
          qty: qtyToAdd,
          rate: prod.salePrice,
          amount: qtyToAdd * prod.salePrice,
        },
      ]);
      toast.success(`Added ${prod.name} (${qtyToAdd} units)`);
    }
  };

  const handleRowQtyChange = (index: number, newQtyVal: string) => {
    const qty = parseInt(newQtyVal) || 0;
    const updated = [...rows];
    updated[index].qty = qty;
    updated[index].amount = qty * updated[index].rate;
    setRows(updated);
  };

  const handleRowRateChange = (index: number, newRateVal: string) => {
    const rate = parseFloat(newRateVal) || 0;
    const updated = [...rows];
    updated[index].rate = rate;
    updated[index].amount = updated[index].qty * rate;
    setRows(updated);
  };

  const handleSubmitBill = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a Retailer / Customer");
      return;
    }

    if (rows.length === 0) {
      toast.error("Please add at least one product row to the bill");
      return;
    }

    const stockIssues: string[] = [];
    for (const r of rows) {
      if (r.qty > r.product.currentStock) {
        stockIssues.push(
          `"${r.product.name}": requested ${r.qty} units, only ${r.product.currentStock} in stock.`
        );
      }
    }

    if (stockIssues.length > 0) {
      toast.error(`Stock Error: ${stockIssues.join(" ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        orderId: linkedOrderId || null,
        date: customDate,
        items: rows.map((r) => ({
          productId: r.productId,
          qty: r.qty,
          rate: r.rate,
        })),
        discount: numDiscount,
        gstPercent: gstEnabled ? gstPercent : 0,
        paymentMode,
        paidAmount: parseFloat(paidAmount) || 0,
      };

      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          toast.error(`Cannot generate bill:\n${data.details.join("\n")}`);
        } else {
          toast.error(data.error || "Failed to generate bill");
        }
        return;
      }

      toast.success(data.message || "Bill created successfully!");

      const billDetailRes = await fetch(`/api/bills/${data.bill.id}`);
      const billDetailData = await billDetailRes.json();

      setGeneratedBill(billDetailData.bill);
      setPrintModalOpen(true);

      setRows([]);
      setSelectedCustomerId("");
      setCustomerSearch("");
      setDiscount("0");
      setLinkedOrderId(null);
    } catch (e: any) {
      toast.error("Network error while generating bill");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(
    (c) =>
      c.shopName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch) ||
      c.area?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const brandList = Array.from(new Set(products.map((p) => p.company.name)));

  const filteredProducts = products.filter((p) => {
    const matchesBrand =
      selectedBrandFilter === "ALL" || p.company.name === selectedBrandFilter;
    const matchesQuery =
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.flavor.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.company.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.unit.toLowerCase().includes(productSearch.toLowerCase());
    return matchesBrand && matchesQuery;
  });

  const popularProducts = products.slice(0, 6);

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Terminal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 dark:bg-slate-900/90 text-white p-4 sm:p-5 rounded-3xl shadow-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Fast Billing Terminal</h1>
              <p className="text-xs text-slate-400">
                Keyboard-optimised multi-brand billing • Real-time stock deduction
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {linkedOrderId && (
              <Badge variant="warning" className="text-xs font-bold gap-1">
                <Clock className="w-3.5 h-3.5" /> Order Pre-filled
              </Badge>
            )}
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>

        {/* 2-Column Grid: Left (Builder) vs Right (Summary & Checkout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT: Customer Picker + Product Item Entry + Table */}
          <div className="lg:col-span-2 space-y-4">
            {/* 1. Retailer Selection Box */}
            <Card className="border-teal-500/30 dark:border-teal-500/20 shadow-xs">
              <CardContent className="p-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Retailer / Customer
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Type shop name, owner, phone or area..."
                        value={
                          selectedCustomerObj
                            ? `${selectedCustomerObj.shopName} (${selectedCustomerObj.ownerName} - ${selectedCustomerObj.area})`
                            : customerSearch
                        }
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setSelectedCustomerId("");
                          setCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl pl-9 pr-8 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                      />
                      {selectedCustomerObj && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId("");
                            setCustomerSearch("");
                          }}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Customer Dropdown Results */}
                  {customerDropdownOpen && !selectedCustomerId && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                          No matching retailers found
                        </div>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <div
                            key={cust.id}
                            onClick={() => {
                              setSelectedCustomerId(cust.id);
                              setCustomerDropdownOpen(false);
                            }}
                            className="p-3.5 hover:bg-teal-50/60 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{cust.shopName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Prop: {cust.ownerName} • Ph: {cust.phone} • Area: {cust.area}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                                Bal: {formatINR(cust.outstandingBalance)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Customer Quick Snapshot */}
                {selectedCustomerObj && (
                  <div className="mt-3 p-3 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/50 rounded-2xl flex flex-wrap items-center justify-between text-xs gap-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedCustomerObj.shopName}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">({selectedCustomerObj.phone})</span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">{selectedCustomerObj.area}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Outstanding Balance:</span>
                      <span className="font-black text-rose-700 dark:text-rose-400 ml-1.5 text-sm">
                        {formatINR(selectedCustomerObj.outstandingBalance)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Keyboard-Friendly Item Adder Bar */}
            <Card className="bg-slate-50/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <IceCream className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Fast Item Search & Add
                  </span>

                  {/* Brand Filter Chips */}
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedBrandFilter("ALL")}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                        selectedBrandFilter === "ALL"
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      All Brands
                    </button>
                    {brandList.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBrandFilter(b)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                          selectedBrandFilter === b
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Bestseller Flavors Quick-Add Bar */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" /> Quick Add:
                  </span>
                  {popularProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQuickAddProduct(p, 10)}
                      className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 border border-slate-200 dark:border-slate-700 hover:border-teal-400 rounded-lg text-[10px] font-medium text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1 shadow-2xs"
                      title={`Click to add +10 units of ${p.name}`}
                    >
                      <span>+10 {p.name}</span>
                      <span className="text-teal-700 dark:text-teal-400 font-bold">₹{p.salePrice}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  {/* Product Search Input (6 cols) */}
                  <div className="relative sm:col-span-6">
                    <input
                      ref={productInputRef}
                      type="text"
                      placeholder="Type flavor or brand (e.g. Magnum, Cornetto, Vanilla)..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setSelectedProduct(null);
                        setProductDropdownOpen(true);
                      }}
                      onFocus={() => setProductDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && filteredProducts.length > 0 && !selectedProduct) {
                          handleSelectProduct(filteredProducts[0]);
                          e.preventDefault();
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />

                    {/* Product Dropdown Results */}
                    {productDropdownOpen && !selectedProduct && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredProducts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            No matching ice cream products found
                          </div>
                        ) : (
                          filteredProducts.map((prod) => (
                            <div
                              key={prod.id}
                              onClick={() => handleSelectProduct(prod)}
                              className="p-3 hover:bg-teal-50/70 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">{prod.name}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                    {prod.unit}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Brand: <span className="font-bold text-slate-700 dark:text-slate-200">{prod.company.name}</span> • Flavor: {prod.flavor}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="font-bold text-teal-700 dark:text-teal-400 text-xs block">
                                  {formatINR(prod.salePrice)}
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    prod.isLowStock
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-emerald-700 dark:text-emerald-400"
                                  }`}
                                >
                                  Stock: {prod.currentStock}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity Input (2 cols) */}
                  <div className="sm:col-span-2">
                    <input
                      ref={qtyInputRef}
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={inputQty}
                      onChange={(e) => setInputQty(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddRow();
                          e.preventDefault();
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                    />
                  </div>

                  {/* Rate Input (2 cols) */}
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Rate ₹"
                      value={inputRate}
                      onChange={(e) => setInputRate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddRow();
                          e.preventDefault();
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-right"
                    />
                  </div>

                  {/* Add Button (2 cols) */}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddRow}
                      className="w-full h-full text-xs font-bold gap-1 shadow-xs rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Line Items Table */}
            <Card>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm">Bill Line Items ({rows.length})</CardTitle>
                {rows.length > 0 && (
                  <button
                    onClick={() => setRows([])}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-800 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear All
                  </button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {rows.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                    <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <span>No items added yet. Search a product above or pick an order to populate.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3 w-8 text-center">#</th>
                          <th className="p-3">Brand & Product</th>
                          <th className="p-3 w-20 text-center">Pack Size</th>
                          <th className="p-3 w-20 text-center">Stock</th>
                          <th className="p-3 w-32 text-center">Qty (Units)</th>
                          <th className="p-3 w-24 text-right">Rate (₹)</th>
                          <th className="p-3 w-24 text-right">Total (₹)</th>
                          <th className="p-3 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white">{row.product.name}</span>
                                <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full">
                                  {row.product.company.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.product.flavor}</p>
                            </td>
                            <td className="p-3 text-center text-slate-600 dark:text-slate-300">{row.product.unit}</td>
                            <td className="p-3 text-center font-bold">
                              <span
                                className={
                                  row.qty > row.product.currentStock
                                    ? "text-rose-600 dark:text-rose-400 font-black"
                                    : "text-emerald-700 dark:text-emerald-400"
                                }
                              >
                                {row.product.currentStock}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleStepQty(idx, -1)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold transition-colors"
                                  title="Decrease quantity by 1"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={row.qty}
                                  onChange={(e) => handleRowQtyChange(idx, e.target.value)}
                                  className="w-12 text-center bg-transparent border-0 px-1 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepQty(idx, 1)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold transition-colors"
                                  title="Increase quantity by 1"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step="0.5"
                                value={row.rate}
                                onChange={(e) => handleRowRateChange(idx, e.target.value)}
                                className="w-20 text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-1 text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                              {formatINR(row.amount)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleRemoveRow(idx)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Breakdown Summary if multiple brands */}
            {Object.keys(companySubtotals).length > 1 && (
              <Card className="bg-gradient-to-r from-slate-50 to-teal-50/30 dark:from-slate-900 dark:to-teal-950/20 border-teal-200/60 dark:border-teal-800/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Multi-Brand Invoice Subtotals
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    {Object.values(companySubtotals).map((c, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{c.name}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-slate-400 text-[11px]">{c.qty} units</span>
                          <span className="font-black text-slate-900 dark:text-teal-400">{formatINR(c.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Financials, Discount, GST, Payment, Grand Total */}
          <div className="space-y-4">
            <Card className="border-2 border-teal-600/30 dark:border-teal-500/30 shadow-md">
              <CardHeader className="bg-slate-900 dark:bg-slate-950 text-white rounded-t-2xl py-3 px-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Bill Summary & Checkout</span>
                  <Badge variant="warning" className="text-[10px] font-bold">
                    {rows.reduce((s, r) => s + r.qty, 0)} Units
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Financial Row Items */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatINR(subtotal)}</span>
                  </div>

                  {/* Flat Discount */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* GST Toggle */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">
                      <input
                        type="checkbox"
                        checked={gstEnabled}
                        onChange={(e) => setGstEnabled(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>Apply GST ({gstPercent}%)</span>
                    </label>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatINR(gstAmount)}</span>
                  </div>

                  {/* Round Off */}
                  {roundOff !== 0 && (
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Round Off:</span>
                      <span>{formatINR(roundOff)}</span>
                    </div>
                  )}

                  {/* Grand Total Highlight */}
                  <div className="p-3.5 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex justify-between items-center text-slate-900 dark:text-white">
                    <span className="font-bold text-sm uppercase tracking-wider">Grand Total:</span>
                    <span className="text-2xl font-black text-teal-900 dark:text-teal-300">{formatINR(grandTotal)}</span>
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["CASH", "UPI", "CREDIT"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setPaymentMode(mode);
                          if (mode === "CREDIT") {
                            setPaidAmount("0");
                          } else {
                            setPaidAmount(String(grandTotal));
                          }
                        }}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          paymentMode === mode
                            ? "bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-600 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Paid */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Amount Paid (₹)
                    </label>
                    <div className="flex gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setPaidAmount(String(grandTotal))}
                        className="text-teal-700 dark:text-teal-400 font-bold hover:underline"
                      >
                        Full
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setPaidAmount("0")}
                        className="text-rose-700 dark:text-rose-400 font-bold hover:underline"
                      >
                        Zero (Credit)
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                  {grandTotal - (parseFloat(paidAmount) || 0) > 0 && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold mt-1">
                      Balance Due: {formatINR(grandTotal - (parseFloat(paidAmount) || 0))} (Adds to retailer ledger)
                    </p>
                  )}
                </div>

                {/* Submit & Generate Invoice Button */}
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  isLoading={submitting}
                  onClick={handleSubmitBill}
                  className="w-full bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white dark:text-slate-950 font-black shadow-lg shadow-teal-700/25 h-12 text-sm uppercase tracking-wider gap-2 rounded-2xl"
                >
                  <Zap className="w-4 h-4" /> Save & Print Invoice (Ctrl+Enter)
                </Button>
              </CardContent>
            </Card>

            {/* Quick Keyboard Shortcuts Helper Card */}
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Active POS Hotkeys (Click to trigger):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => productInputRef.current?.focus()}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
                >
                  [F2] Add Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("CASH");
                    setPaidAmount(String(grandTotal));
                    toast.info("Switched to CASH payment");
                  }}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
                >
                  [F4] Cash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode("UPI");
                    setPaidAmount(String(grandTotal));
                    toast.info("Switched to UPI payment");
                  }}
                  className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400"
                >
                  [F8] UPI
                </button>
                <button
                  type="button"
                  onClick={handleSubmitBill}
                  className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 rounded font-mono font-bold text-teal-700 dark:text-teal-300"
                >
                  [Ctrl+Enter] Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Print & Share Modal */}
      {printModalOpen && generatedBill && (
        <Modal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          size="xl"
          title={
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Invoice #{generatedBill.billNo} Generated Successfully!</span>
            </div>
          }
          description="Ready for printing or downloading in A4 format or 80mm thermal slip"
        >
          <InvoicePrintView
            bill={generatedBill}
            onClose={() => {
              setPrintModalOpen(false);
              router.push("/bills");
            }}
          />
        </Modal>
      )}
    </AppLayout>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse">
            Loading Fast Billing Terminal...
          </div>
        </AppLayout>
      }
    >
      <FastBillingTerminalContent />
    </Suspense>
  );
}
