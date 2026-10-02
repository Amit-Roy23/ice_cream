"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Badge } from "./Badge";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Keyboard,
  IceCream,
  Users,
} from "lucide-react";

interface QuickTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: string;
  onSwitchRole?: (email: string) => void;
}

export function QuickTourModal({
  isOpen,
  onClose,
  onSwitchRole,
}: QuickTourModalProps) {
  const [activeTab, setActiveTab] = useState<"WORKFLOW" | "SHORTCUTS" | "ROLES">("WORKFLOW");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <IceCream className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>FrostBite System Guide & Quick Help</span>
        </div>
      }
      description="Learn the distribution billing workflow, role permissions, and keyboard shortcuts"
    >
      <div className="space-y-4 text-xs">
        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
          <button
            onClick={() => setActiveTab("WORKFLOW")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === "WORKFLOW"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3-Step Business Flow</span>
          </button>
          <button
            onClick={() => setActiveTab("SHORTCUTS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === "SHORTCUTS"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keyboard Shortcuts</span>
          </button>
          <button
            onClick={() => setActiveTab("ROLES")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === "ROLES"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>User Roles & Scope</span>
          </button>
        </div>

        {/* 1. WORKFLOW TAB */}
        {activeTab === "WORKFLOW" && (
          <div className="space-y-3">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-xl">
              <h4 className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5 text-sm mb-1">
                <span>Ice Cream Distribution Lifecycle</span>
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                How stock flows from 5 manufacturing brands to 100+ local retailers through field sales & fast billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">Brand Bulk Inward</h5>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Admin records purchase invoices from Amul, Kwality, Vadilal with automatic commission discounts.
                </p>
                <Badge variant="warning" className="text-[10px]">Admin Only</Badge>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">Field Order Collection</h5>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Sales staff visit retailers and log daily delivery orders on mobile with 1-tap item pickers.
                </p>
                <Badge variant="success" className="text-[10px]">Staff & Manager</Badge>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="w-7 h-7 rounded-lg bg-teal-500 text-white flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white">1-Click Fast Billing</h5>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Manager converts order to invoice in 1 click, deducts live inventory, and prints A4 or 80mm POS receipt.
                </p>
                <Badge variant="info" className="text-[10px]">Manager & Admin</Badge>
              </div>
            </div>
          </div>
        )}

        {/* 2. SHORTCUTS TAB */}
        {activeTab === "SHORTCUTS" && (
          <div className="space-y-3">
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Use these keyboard shortcuts on the <strong>Fast Billing Terminal</strong> for ultra-fast checkout:
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-teal-600 dark:text-teal-400">
                    F2
                  </kbd>
                  <span className="font-medium text-slate-800 dark:text-slate-200">Add New Item Row</span>
                </div>
                <span className="text-[11px] text-slate-400">Appends fresh product selector row</span>
              </div>

              <div className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-teal-600 dark:text-teal-400">
                    F4
                  </kbd>
                  <span className="font-medium text-slate-800 dark:text-slate-200">Switch to CASH Payment</span>
                </div>
                <span className="text-[11px] text-slate-400">Sets mode to Cash with full amount</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-teal-600 dark:text-teal-400">
                    F8
                  </kbd>
                  <span className="font-medium text-slate-800 dark:text-slate-200">Switch to UPI Payment</span>
                </div>
                <span className="text-[11px] text-slate-400">Sets mode to UPI / QR code</span>
              </div>

              <div className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-teal-600 dark:text-teal-400">
                    Ctrl + Enter
                  </kbd>
                  <span className="font-medium text-slate-800 dark:text-slate-200">Save Bill & Open Print</span>
                </div>
                <span className="text-[11px] text-slate-400">Finalizes bill and displays invoice</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-teal-600 dark:text-teal-400">
                    Esc
                  </kbd>
                  <span className="font-medium text-slate-800 dark:text-slate-200">Clear Form / Reset</span>
                </div>
                <span className="text-[11px] text-slate-400">Clears current terminal items</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. ROLES TAB */}
        {activeTab === "ROLES" && (
          <div className="space-y-3">
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Switch demo roles instantly to test role-based restrictions:
            </p>
            <div className="space-y-2">
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>Admin / Owner</span>
                    <span className="text-slate-400 font-normal">(Rajesh Singhania)</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Has full visibility into company purchase costs, profit margin breakdown, and audit reports.
                  </p>
                </div>
                {onSwitchRole && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSwitchRole("admin@demo.com")}
                    className="text-xs shrink-0"
                  >
                    Switch to Admin
                  </Button>
                )}
              </div>

              <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-cyan-500" />
                    <span>Manager</span>
                    <span className="text-slate-400 font-normal">(Vikram Mehta)</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Handles billing, order conversion, and stock adjustments. Purchase costs are hidden & blocked.
                  </p>
                </div>
                {onSwitchRole && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSwitchRole("manager@demo.com")}
                    className="text-xs shrink-0"
                  >
                    Switch to Manager
                  </Button>
                )}
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>Field Staff</span>
                    <span className="text-slate-400 font-normal">(Ramesh Kumar)</span>
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                    Dedicated field sales screen for fast order taking on phones and tablets.
                  </p>
                </div>
                {onSwitchRole && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSwitchRole("staff1@demo.com")}
                    className="text-xs shrink-0"
                  >
                    Switch to Staff
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="primary" size="sm" onClick={onClose}>
            Got it, Let&apos;s Go!
          </Button>
        </div>
      </div>
    </Modal>
  );
}
