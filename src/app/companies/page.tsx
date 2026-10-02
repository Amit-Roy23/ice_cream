"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Edit2,
  Phone,
  Layers,
} from "lucide-react";

interface CompanyItem {
  id: string;
  name: string;
  commissionPercent?: number;
  contact?: string | null;
  active: boolean;
  _count?: {
    products: number;
    purchases: number;
  };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [name, setName] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("20");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [userRes, compRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/companies"),
      ]);
      const userData = await userRes.json();
      const compData = await compRes.json();

      if (userData.user) setCurrentUser(userData.user);
      if (compData.companies) setCompanies(compData.companies);
    } catch (e) {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setName("");
    setCommissionPercent("20");
    setContact("");
    setModalOpen(true);
  };

  const handleOpenEdit = (c: CompanyItem) => {
    setEditingCompany(c);
    setName(c.name);
    setCommissionPercent(String(c.commissionPercent || 0));
    setContact(c.contact || "");
    setModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : "/api/companies";
      const method = editingCompany ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          commissionPercent: parseFloat(commissionPercent) || 0,
          contact: contact.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save company");
        return;
      }

      toast.success(data.message || "Company saved successfully");
      setModalOpen(false);
      fetchInitialData();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>Ice Cream Brands & Commission Margins</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage manufacturer company profiles, distributor contract margin % rates & supplier contacts
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
              + Add Brand / Company
            </Button>
          )}
        </div>

        {/* Company Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((comp) => (
            <Card key={comp.id} className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 bg-slate-50 dark:bg-slate-800 font-bold">
                    Brand Partner
                  </Badge>
                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white">{comp.name}</CardTitle>
                </div>

                {currentUser?.role === "ADMIN" && (
                  <button
                    onClick={() => handleOpenEdit(comp)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                {/* Commission Margin % */}
                {comp.commissionPercent !== undefined && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">
                        Contract Commission Margin
                      </span>
                      <span className="text-xl font-black text-emerald-900 dark:text-emerald-300">
                        {comp.commissionPercent}%
                      </span>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black">
                      %
                    </div>
                  </div>
                )}

                {/* Contact */}
                <div className="text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{comp.contact || "No contact info recorded"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {comp._count?.products || 0} active catalog items
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="md"
        title={editingCompany ? "Edit Brand Profile" : "Add Brand Manufacturer"}
        description="Configure brand name and purchase commission margin %"
      >
        <form onSubmit={handleSaveCompany} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Company / Brand Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Amul (GCMMF)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Distributor Commission / Margin % on Inward Purchases *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 font-black text-emerald-800 dark:text-emerald-400 focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Supplier Contact & Representative Info
            </label>
            <input
              type="text"
              placeholder="e.g. sales@company.com | +91 98250 11223"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Save Brand Profile
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
