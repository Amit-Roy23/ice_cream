import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "info" | "outline" | "amul" | "kwality" | "vadilal" | "motherdairy" | "havmor";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
    secondary: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
    info: "bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800",
    outline: "text-slate-700 border border-slate-200 dark:text-slate-300 dark:border-slate-700",
    amul: "bg-blue-50 text-blue-700 border border-blue-200 font-bold dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    kwality: "bg-red-50 text-red-700 border border-red-200 font-bold dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
    vadilal: "bg-green-50 text-green-700 border border-green-200 font-bold dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
    motherdairy: "bg-sky-50 text-sky-700 border border-sky-200 font-bold dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    havmor: "bg-orange-50 text-orange-700 border border-orange-200 font-bold dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
