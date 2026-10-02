"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatINR, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Search,
  Zap,
  Trash2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Share2,
  Calendar,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  flavor: string;
  unit: string;
  salePrice: number;
  currentStock: number;
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
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");

  // New Order Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [deliveryDateOption, setDeliveryDateOption] = useState<"TODAY" | "TOMORROW" | "CUSTOM">("TODAY");
  const [customDeliveryDate, setCustomDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [orderNotes, setOrderNotes] = useState("");

  // Items in Order
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; qty: number; rate: number; product: Product }>>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inputQty, setInputQty] = useState("6");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [statusFilter, staffFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [userRes, custRes, prodRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/customers"),
        fetch("/api/products?active=true"),
      ]);

      const userData = await userRes.json();
      const custData = await custRes.json();
      const prodData = await prodRes.json();

      if (userData.user) setCurrentUser(userData.user);
      if (custData.customers) setCustomers(custData.customers);
      if (prodData.products) setProducts(prodData.products);

      let ordersUrl = "/api/orders?";
      if (statusFilter !== "ALL") ordersUrl += `status=${statusFilter}&`;
      if (staffFilter !== "ALL") ordersUrl += `staffId=${staffFilter}&`;

      const ordersRes = await fetch(ordersUrl);
      const ordersData = await ordersRes.json();
      if (ordersData.orders) setOrders(ordersData.orders);
    } catch (e) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Order status updated to ${newStatus}`);
        setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleStepOrderItem = (index: number, delta: number) => {
    const updated = [...orderItems];
    const newQty = Math.max(1, updated[index].qty + delta);
    updated[index].qty = newQty;
    setOrderItems(updated);
  };

  const handleDuplicateOrder = (order: any) => {
    setSelectedCustomerId(order.customerId);
    setOrderNotes(`Repeat of Order #${order.orderNo}`);
    const items = order.items.map((i: any) => ({
      productId: i.productId,
      qty: i.qty,
      rate: i.rate,
      product: i.product,
    }));
    setOrderItems(items);
    setIsModalOpen(true);
    toast.info(`Pre-filled ${items.length} items from Order #${order.orderNo}`);
  };

  const handleShareOrderWhatsApp = (order: any) => {
    const phone = order.customer.phone.replace(/[^0-9]/g, "");
    const itemsText = order.items
      .map((i: any) => `• ${i.product.name} (${i.qty} ${i.product.unit}) - ₹${i.qty * i.rate}`)
      .join("\n");

    const text = encodeURIComponent(
      `🍦 *FROSTBITE ICE CREAM ORDER CONFIRMATION*\n` +
      `--------------------------------\n` +
      `📋 *Order #:* ${order.orderNo}\n` +
      `🏪 *Retailer:* ${order.customer.shopName}\n` +
      `🚚 *Delivery Date:* ${formatDate(order.deliveryDate)}\n` +
      `--------------------------------\n` +
      `*Ordered Items:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `💰 *Estimated Total:* ₹${order.totalAmount}\n\n` +
      `_Our delivery van will reach your store as scheduled._`
    );

    const waUrl = phone.length === 10 ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp order preview...");
  };

  const handleAddProductToOrder = () => {
    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }
    const qty = parseInt(inputQty) || 1;
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const existingIndex = orderItems.findIndex((i) => i.productId === selectedProduct.id);
    if (existingIndex > -1) {
      const updated = [...orderItems];
      updated[existingIndex].qty += qty;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: selectedProduct.id,
          qty,
          rate: selectedProduct.salePrice,
          product: selectedProduct,
        },
      ]);
    }

    setSelectedProduct(null);
    setItemSearch("");
    setInputQty("6");
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      toast.error("Please pick a retailer");
      return;
    }
    if (orderItems.length === 0) {
      toast.error("Please add at least one ice cream product");
      return;
    }

    let delDate = new Date();
    if (deliveryDateOption === "TOMORROW") {
      delDate.setDate(delDate.getDate() + 1);
    } else if (deliveryDateOption === "CUSTOM") {
      delDate = new Date(customDeliveryDate);
    }

    setCreating(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          deliveryDate: delDate.toISOString(),
          notes: orderNotes,
          items: orderItems.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            rate: i.rate,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create order");
        return;
      }

      toast.success(data.message || "Order created successfully!");
      setIsModalOpen(false);
      setSelectedCustomerId("");
      setOrderItems([]);
      setOrderNotes("");
      fetchInitialData();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.shopName.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.area?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      p.flavor.toLowerCase().includes(itemSearch.toLowerCase()) ||
      p.company.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> CONFIRMED
          </Badge>
        );
      case "BILLED":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <Zap className="w-3 h-3" /> BILLED
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="default" className="bg-emerald-800 text-white dark:bg-emerald-700 flex items-center gap-1">
            <Truck className="w-3 h-3" /> DELIVERED
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> CANCELLED
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>{currentUser?.role === "STAFF" ? "Field Order Entry" : "Order Management"}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentUser?.role === "STAFF"
                ? "Collect retailer orders on the field for same-day/next-day dispatch"
                : "Manage incoming field orders, review pipeline, and convert to bills in one click"}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 shadow-md shadow-teal-700/20"
          >
            <Plus className="w-4 h-4" />
            + New Field Order
          </Button>
        </div>

        {/* Filter Bar */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Order #, Retailer, Area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {["ALL", "PENDING", "CONFIRMED", "BILLED", "DELIVERED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      statusFilter === st
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No orders found matching the filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Retailer & Area</th>
                      <th className="p-3">Delivery Date</th>
                      <th className="p-3">Items Summary</th>
                      <th className="p-3 text-right">Est. Amount</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Staff</th>
                      <th className="p-3 text-center w-36">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-teal-400">
                          {order.orderNo}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white">{order.customer.shopName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {order.customer.ownerName} • {order.customer.phone}
                          </p>
                          <p className="text-[11px] text-slate-400">{order.customer.area}</p>
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(order.deliveryDate)}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {order.items.length} items ({order.totalItemsCount} units)
                          </p>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {order.items.map((i: any) => `${i.product.name} (${i.qty})`).join(", ")}
                          </div>
                        </td>
                        <td className="p-3 text-right font-black text-slate-900 dark:text-white text-sm">
                          {formatINR(order.totalAmount)}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                          {order.createdBy.name}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {currentUser?.role !== "STAFF" && order.status !== "BILLED" && order.status !== "CANCELLED" && (
                              <button
                                onClick={() => router.push(`/billing?orderId=${order.id}`)}
                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <Zap className="w-3 h-3" />
                                Bill Now
                              </button>
                            )}

                            <button
                              onClick={() => handleDuplicateOrder(order)}
                              className="p-1 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Duplicate / Repeat this Order"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleShareOrderWhatsApp(order)}
                              className="p-1 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                              title="Share on WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {currentUser?.role !== "STAFF" && order.status === "PENDING" && (
                              <button
                                onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                                className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-[10px]"
                                title="Mark Confirmed"
                              >
                                Confirm
                              </button>
                            )}

                            {order.status === "BILLED" && (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                                ✓ Billed
                              </span>
                            )}
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
      {/* NEW ORDER ENTRY MODAL                                                     */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="xl"
        title="Create New Field Order"
        description="Pick retailer, choose delivery date, and add ice cream items"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          {/* Retailer Selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Retailer / Customer *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">-- Choose Retailer / Shop --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shopName} ({c.ownerName} - {c.area}) - Ph: {c.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Date Quick Buttons */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Delivery Schedule *
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDeliveryDateOption("TODAY")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 ${
                  deliveryDateOption === "TODAY"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Today (Urgent)</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryDateOption("TOMORROW")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 ${
                  deliveryDateOption === "TOMORROW"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Tomorrow Morning</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryDateOption("CUSTOM")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors ${
                  deliveryDateOption === "CUSTOM"
                    ? "bg-teal-600 text-white border-teal-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50"
                }`}
              >
                Custom Date
              </button>

              {deliveryDateOption === "CUSTOM" && (
                <input
                  type="date"
                  value={customDeliveryDate}
                  onChange={(e) => setCustomDeliveryDate(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2.5 py-1 text-xs"
                />
              )}
            </div>
          </div>

          {/* Product Adder */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Add Products to Order
              </span>
              <div className="flex flex-wrap gap-1">
                {["ALL", "Amul", "Kwality Wall's", "Vadilal", "Mother Dairy", "Havmor"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBrandFilter(b)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedBrandFilter === b
                        ? "bg-teal-600 text-white"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8 relative">
                <input
                  type="text"
                  placeholder="Search ice cream by name or brand..."
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setSelectedProduct(null);
                    setProductDropdownOpen(true);
                  }}
                  onFocus={() => setProductDropdownOpen(true)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
                />

                {productDropdownOpen && !selectedProduct && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {products
                      .filter((p) => {
                        const matchBrand = selectedBrandFilter === "ALL" || p.company.name === selectedBrandFilter;
                        const matchQ =
                          p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          p.flavor.toLowerCase().includes(itemSearch.toLowerCase()) ||
                          p.company.name.toLowerCase().includes(itemSearch.toLowerCase());
                        return matchBrand && matchQ;
                      })
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setItemSearch(`${p.name} (${p.unit}) - ${p.company.name}`);
                            setProductDropdownOpen(false);
                          }}
                          className="p-2.5 hover:bg-teal-50 dark:hover:bg-slate-800 cursor-pointer text-xs flex justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>{" "}
                            <span className="text-slate-500 dark:text-slate-400 text-[10px]">({p.unit} - {p.company.name})</span>
                          </div>
                          <span className="font-bold text-teal-700 dark:text-teal-400">{formatINR(p.salePrice)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-2 py-1.5 text-xs font-bold text-center"
                />
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddProductToOrder}
                  className="w-full text-xs font-bold rounded-xl"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Selected Items List with Stepper Buttons */}
          {orderItems.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 flex justify-between">
                <span>Selected Ice Cream Items ({orderItems.length})</span>
                <span className="font-bold">{orderItems.reduce((s, i) => s + i.qty, 0)} Units</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{item.product.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-1.5">({item.product.unit} - {item.product.company.name})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleStepOrderItem(idx, -1)}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 font-bold hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleStepOrderItem(idx, 1)}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 font-bold hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-black text-slate-900 dark:text-white">{formatINR(item.qty * item.rate)}</span>
                      <button
                        type="button"
                        onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <span className="text-slate-700 dark:text-slate-300">Estimated Order Total:</span>
                <span className="text-sm font-black text-teal-700 dark:text-teal-300">
                  {formatINR(orderItems.reduce((s, i) => s + i.qty * i.rate, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Delivery Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Deliver before 2 PM, require dry ice insulation pack..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={creating}>
              Confirm & Save Order
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
