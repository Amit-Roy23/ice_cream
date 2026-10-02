"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatINR } from "@/lib/formatters";
import { toast } from "sonner";
import {
  IceCream,
  Plus,
  Search,
  Edit2,
  Trash2,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface ProductItem {
  id: string;
  name: string;
  flavor: string;
  unit: string;
  mrp: number;
  salePrice: number;
  purchasePrice?: number;
  gstPercent: number;
  lowStockThreshold: number;
  active: boolean;
  currentStock: number;
  isLowStock: boolean;
  companyId: string;
  company: Company;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("");
  const [flavor, setFlavor] = useState("");
  const [unit, setUnit] = useState("100ml Cup");
  const [mrp, setMrp] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [gstPercent, setGstPercent] = useState("5");
  const [lowStockThreshold, setLowStockThreshold] = useState("15");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [companyFilter]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [userRes, compRes, prodRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/companies"),
        fetch(`/api/products?${companyFilter !== "ALL" ? `companyId=${companyFilter}` : ""}`),
      ]);

      const userData = await userRes.json();
      const compData = await compRes.json();
      const prodData = await prodRes.json();

      if (userData.user) setCurrentUser(userData.user);
      if (compData.companies) setCompanies(compData.companies);
      if (prodData.products) setProducts(prodData.products);
    } catch (e) {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setCompanyId(companies[0]?.id || "");
    setName("");
    setFlavor("");
    setUnit("100ml Cup");
    setMrp("");
    setSalePrice("");
    setPurchasePrice("");
    setGstPercent("5");
    setLowStockThreshold("15");
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProductItem) => {
    setEditingProduct(p);
    setCompanyId(p.companyId);
    setName(p.name);
    setFlavor(p.flavor);
    setUnit(p.unit);
    setMrp(String(p.mrp));
    setSalePrice(String(p.salePrice));
    setPurchasePrice(p.purchasePrice !== undefined ? String(p.purchasePrice) : "");
    setGstPercent(String(p.gstPercent));
    setLowStockThreshold(String(p.lowStockThreshold));
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !name.trim() || !flavor.trim() || !unit.trim()) {
      toast.error("Please fill all required product fields");
      return;
    }

    setSaving(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: name.trim(),
          flavor: flavor.trim(),
          unit: unit.trim(),
          mrp: parseFloat(mrp) || 0,
          salePrice: parseFloat(salePrice) || 0,
          purchasePrice: parseFloat(purchasePrice) || 0,
          gstPercent: parseFloat(gstPercent) || 0,
          lowStockThreshold: parseInt(lowStockThreshold) || 15,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save product");
        return;
      }

      toast.success(data.message || "Product saved successfully");
      setModalOpen(false);
      fetchInitialData();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${prodName}"?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchInitialData();
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Failed to delete product");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.flavor.toLowerCase().includes(search.toLowerCase()) ||
      p.unit.toLowerCase().includes(search.toLowerCase()) ||
      p.company.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <IceCream className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>Products & Flavors Catalog</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Master catalog with pack sizes, MRPs, wholesale rates, and live stock tracking
            </p>
          </div>

          {currentUser?.role === "ADMIN" && (
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreate}
              className="gap-1.5 shadow-md shadow-teal-700/20"
            >
              <Plus className="w-4 h-4" />
              + Add Product
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <Card className="shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search flavor, product name, or pack size..."
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
                <option value="ALL">All 5 Brands ({products.length})</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
                Loading product catalog...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No products found matching filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Brand</th>
                      <th className="p-3">Product Name & Flavor</th>
                      <th className="p-3 text-center">Pack Size / Unit</th>
                      <th className="p-3 text-right">MRP (₹)</th>
                      <th className="p-3 text-right">Wholesale Rate (₹)</th>
                      {currentUser?.role === "ADMIN" && (
                        <th className="p-3 text-right">Purchase Cost (₹)</th>
                      )}
                      <th className="p-3 text-center">GST %</th>
                      <th className="p-3 text-center">Live Stock</th>
                      {currentUser?.role === "ADMIN" && (
                        <th className="p-3 text-center w-24">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {prod.company.name}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{prod.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{prod.flavor}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium text-[11px] text-slate-700 dark:text-slate-300">
                            {prod.unit}
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400">{formatINR(prod.mrp)}</td>
                        <td className="p-3 text-right font-black text-teal-800 dark:text-teal-400 text-sm">
                          {formatINR(prod.salePrice)}
                        </td>
                        {currentUser?.role === "ADMIN" && (
                          <td className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                            {prod.purchasePrice !== undefined ? formatINR(prod.purchasePrice) : "-"}
                          </td>
                        )}
                        <td className="p-3 text-center font-mono text-slate-500 dark:text-slate-400">{prod.gstPercent}%</td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-black text-xs px-2.5 py-0.5 rounded-full ${
                              prod.isLowStock
                                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {prod.currentStock} units
                          </span>
                        </td>
                        {currentUser?.role === "ADMIN" && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(prod)}
                                className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id, prod.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="md"
        title={editingProduct ? "Edit Product" : "Add New Product"}
        description="Configure brand, pack size, MRP, wholesale price, and purchase cost"
      >
        <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Brand / Manufacturer *
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-semibold focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">-- Select Brand --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Cornetto Double Choco"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Flavor / Variant *
              </label>
              <input
                type="text"
                placeholder="e.g. Double Chocolate"
                value={flavor}
                onChange={(e) => setFlavor(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Pack Size / Unit *
              </label>
              <input
                type="text"
                placeholder="e.g. 100ml Cup, 500ml Tub, 1L Pack"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                MRP (₹) *
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 45"
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-semibold focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Wholesale Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 38"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-black text-teal-800 dark:text-teal-400 focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Purchase Cost Rate (₹) *
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 31.5"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-semibold focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                GST Rate (%)
              </label>
              <input
                type="number"
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Save Product
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
