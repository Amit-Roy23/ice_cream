"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Edit2,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  User,
  Zap,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
  active: boolean;
  createdAt: string;
  _count?: {
    orders: number;
    bills: number;
    purchases: number;
  };
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.status === 403) {
        toast.error("Access denied. Admin only.");
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword("");
    setRole(u.role);
    setActive(u.active);
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    if (!editingUser && !password) {
      toast.error("Password is required for new users");
      return;
    }

    setSaving(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        role,
        active,
      };
      if (password) payload.password = password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save user");
        return;
      }

      toast.success(data.message || "User updated successfully");
      setModalOpen(false);
      fetchUsers();
    } catch (e) {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "ADMIN":
        return (
          <Badge variant="warning" className="font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> ADMIN (OWNER)
          </Badge>
        );
      case "MANAGER":
        return (
          <Badge variant="info" className="font-bold flex items-center gap-1">
            <Zap className="w-3 h-3" /> MANAGER
          </Badge>
        );
      case "STAFF":
        return (
          <Badge variant="success" className="font-bold flex items-center gap-1">
            <Users className="w-3 h-3" /> FIELD SALES STAFF
          </Badge>
        );
      default:
        return <Badge>{r}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              <span>User & Role Permissions Management</span>
              <Badge variant="warning" className="text-[10px] font-bold">
                Owner Only
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Control access for Admin (Full), Manager (Billing & Orders) and Field Staff (Order Entry Only)
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            className="gap-1.5 shadow-md shadow-teal-700/20"
          >
            <Plus className="w-4 h-4" />
            + Add New User
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 animate-pulse">
                Loading users...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Assigned Role</th>
                      <th className="p-3">Permissions Scope</th>
                      <th className="p-3 text-center">Activity Logged</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{u.email}</td>
                        <td className="p-3">{getRoleBadge(u.role)}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {u.role === "ADMIN" && "Full system access, profit margin reports, purchase cost"}
                          {u.role === "MANAGER" && "Orders & Billing, inventory oversight (No purchase cost access)"}
                          {u.role === "STAFF" && "Field order taking only for retail stores"}
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {u._count?.orders || 0} Orders • {u._count?.bills || 0} Bills
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {u.active ? (
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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
      </div>

      {/* CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="md"
        title={editingUser ? "Edit User Profile" : "Create New User"}
        description="Configure login email, credentials, and access role"
      >
        <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar (Field Sales)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              placeholder="e.g. staff1@demo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-teal-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              {editingUser ? "Change Password (Leave blank to keep current)" : "Password *"}
            </label>
            <input
              type="password"
              placeholder={editingUser ? "••••••••" : "Enter password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-teal-500 outline-none"
              required={!editingUser}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              User Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="STAFF">STAFF (Field Order Taking Only)</option>
              <option value="MANAGER">MANAGER (Billing, Orders & Stock Oversight)</option>
              <option value="ADMIN">ADMIN (Full Access / Owner)</option>
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Account Active (Can log in)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              Save User
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
