"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight, Sparkles, IceCream, ShieldCheck, Zap, Users } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      toast.success(`Welcome back, ${data.user.name}!`);

      if (data.user.role === "STAFF") {
        router.push("/orders");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAndLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Demo@123");
    handleLogin(undefined, demoEmail, "Demo@123");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-white relative">
      {/* Top corner Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle className="bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700" />
      </div>

      {/* Background ambient decorative shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-cyan-400 shadow-xl shadow-teal-500/30 mb-3 text-white">
            <IceCream className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            FrostBite Logistics
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Indian Multi-Brand Ice Cream Distribution & High-Speed Billing Terminal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-7 rounded-3xl shadow-2xl text-white">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-400" /> Account Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sign in with credentials or choose a 1-click demo role below
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="admin@demo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold shadow-lg shadow-teal-500/25 mt-2"
            >
              Sign In to System <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* 1-Click Demo Profiles */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-400 uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Demo Logins (Password: Demo@123)
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAndLogin("admin@demo.com")}
                className="p-2.5 rounded-2xl bg-slate-800/70 hover:bg-teal-500/20 border border-slate-700 hover:border-teal-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-teal-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Owner (Admin)
                  </span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                    Full
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">admin@demo.com</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAndLogin("manager@demo.com")}
                className="p-2.5 rounded-2xl bg-slate-800/70 hover:bg-teal-500/20 border border-slate-700 hover:border-teal-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-teal-300 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" /> Manager
                  </span>
                  <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-bold">
                    Billing
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">manager@demo.com</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAndLogin("staff1@demo.com")}
                className="p-2.5 rounded-2xl bg-slate-800/70 hover:bg-teal-500/20 border border-slate-700 hover:border-teal-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-teal-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Staff (Ramesh)
                  </span>
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                    Orders
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">staff1@demo.com</p>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAndLogin("staff2@demo.com")}
                className="p-2.5 rounded-2xl bg-slate-800/70 hover:bg-teal-500/20 border border-slate-700 hover:border-teal-500/50 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-teal-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Staff (Suresh)
                  </span>
                  <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                    Orders
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">staff2@demo.com</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-5">
          Amul • Kwality Wall&apos;s • Vadilal • Mother Dairy • Havmor
        </p>
      </div>
    </div>
  );
}
