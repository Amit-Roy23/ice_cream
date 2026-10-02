"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  ClipboardList,
  Package,
  ShoppingBag,
  Store,
  IceCream,
  Building2,
  FileSpreadsheet,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { QuickTourModal } from "@/components/ui/QuickTourModal";
import { toast } from "sonner";
import { HelpCircle } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "STAFF";
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const quickSwitchRole = async (email: string) => {
    setIsSwitchingRole(true);
    setRoleSwitcherOpen(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Demo@123" }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        toast.success(`Switched role to ${data.user.role} (${data.user.name})`);
        setUser(data.user);
        if (data.user.role === "STAFF") {
          router.push("/orders");
        } else if (pathname === "/orders" || pathname === "/billing") {
          window.location.reload();
        } else {
          router.push("/dashboard");
        }
      }
    } catch (e) {
      toast.error("Role switch failed");
    } finally {
      setIsSwitchingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center animate-pulse">
            <IceCream className="w-6 h-6 text-teal-400" />
          </div>
          <p className="text-sm font-medium text-slate-400">Loading FrostBite System...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    ...(user.role === "ADMIN" || user.role === "MANAGER"
      ? [
          {
            label: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
            badge: null,
          },
          {
            label: "Fast Billing",
            href: "/billing",
            icon: Zap,
            badge: "Fast",
          },
        ]
      : []),
    {
      label: user.role === "STAFF" ? "Order Entry" : "Orders",
      href: "/orders",
      icon: ClipboardList,
      badge: null,
    },
    ...(user.role === "ADMIN" || user.role === "MANAGER"
      ? [
          {
            label: "Invoices / Bills",
            href: "/bills",
            icon: FileSpreadsheet,
            badge: null,
          },
          {
            label: "Stock & Ledger",
            href: "/stock",
            icon: Package,
            badge: null,
          },
          {
            label: "Retailers",
            href: "/customers",
            icon: Store,
            badge: null,
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [
          {
            label: "Purchase Entry",
            href: "/purchases",
            icon: ShoppingBag,
            badge: "Admin",
          },
          {
            label: "Products Catalog",
            href: "/products",
            icon: IceCream,
            badge: null,
          },
          {
            label: "Companies & Margins",
            href: "/companies",
            icon: Building2,
            badge: null,
          },
          {
            label: "Business Reports",
            href: "/reports",
            icon: BarChart3,
            badge: "CSV",
          },
          {
            label: "User Management",
            href: "/users",
            icon: Users,
            badge: null,
          },
        ]
      : []),
  ];

  const roleBadges = {
    ADMIN: (
      <Badge variant="warning" className="border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 font-bold inline-flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        OWNER (ADMIN)
      </Badge>
    ),
    MANAGER: (
      <Badge variant="info" className="border-cyan-400 bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-700 font-bold inline-flex items-center gap-1">
        <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
        MANAGER
      </Badge>
    ),
    STAFF: (
      <Badge variant="success" className="border-emerald-400 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 font-bold inline-flex items-center gap-1">
        <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        FIELD STAFF
      </Badge>
    ),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR                                                           */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 border-r border-slate-800 dark:border-slate-800/80 shrink-0 no-print">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-bold">
            <IceCream className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight leading-tight">
              FrostBite
            </h2>
            <p className="text-[11px] text-teal-400 font-medium">Ice Cream Distribution</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Main Menu
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold shadow-sm shadow-teal-600/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-teal-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 text-teal-400 border border-teal-500/30"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Current User Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between mb-3">
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            {roleBadges[user.role]}
            <span className="text-[10px] text-slate-500 font-mono">v1.0 Demo</span>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between gap-4 no-print transition-colors">
          {/* Mobile menu toggle & Brand */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <IceCream className="w-5 h-5 text-teal-600" />
              <span className="font-black text-slate-900 dark:text-white tracking-tight">FrostBite</span>
            </div>
          </div>

          {/* Quick Shortcuts / Title */}
          <div className="hidden md:flex items-center gap-3">
            <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              FrostBite Logistics
            </h1>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Multi-Brand Distribution & Fast POS
            </span>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Tour / Help Button */}
            <button
              onClick={() => setTourOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:text-teal-300 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition-colors shadow-xs"
              title="System Guide & Shortcuts"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Guide & Shortcuts</span>
            </button>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
                disabled={isSwitchingRole}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span className="hidden sm:inline">Role Switcher:</span>
                <span className="text-teal-700 dark:text-teal-400 font-bold">{user.role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </button>

              {roleSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Demo User:
                  </div>
                  <button
                    onClick={() => quickSwitchRole("admin@demo.com")}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      user.role === "ADMIN" ? "bg-teal-50/70 dark:bg-teal-950/50 font-semibold text-teal-900 dark:text-teal-300" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        Rajesh (ADMIN / Owner)
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Full purchase, margin, reports & config</p>
                    </div>
                    {user.role === "ADMIN" && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                  </button>

                  <button
                    onClick={() => quickSwitchRole("manager@demo.com")}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      user.role === "MANAGER" ? "bg-teal-50/70 dark:bg-teal-950/50 font-semibold text-teal-900 dark:text-teal-300" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-500" />
                        Vikram (MANAGER)
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Billing & Orders (No purchase cost)</p>
                    </div>
                    {user.role === "MANAGER" && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                  </button>

                  <button
                    onClick={() => quickSwitchRole("staff1@demo.com")}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      user.email === "staff1@demo.com" ? "bg-teal-50/70 dark:bg-teal-950/50 font-semibold text-teal-900 dark:text-teal-300" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Ramesh (STAFF 1)
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Field Order Entry Only</p>
                    </div>
                    {user.email === "staff1@demo.com" && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Current user role badge */}
            <div className="hidden sm:block">
              {roleBadges[user.role]}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 dark:bg-slate-950 text-slate-200 border-b border-slate-800 p-4 space-y-2 no-print">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${
                    isActive ? "bg-teal-600 text-white font-bold" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-teal-400">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Quick Tour Modal */}
      <QuickTourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        currentRole={user.role}
        onSwitchRole={quickSwitchRole}
      />
    </div>
  );
}
