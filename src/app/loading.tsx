import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
          Loading FrostBite Logistics...
        </p>
      </div>
    </div>
  );
}
