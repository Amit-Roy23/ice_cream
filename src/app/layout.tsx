import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/ThemeContext";

export const metadata: Metadata = {
  title: "FrostBite Logistics - Ice Cream Distribution & Fast Billing",
  description: "High-speed multi-brand ice cream distribution billing, inventory and field order management system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased transition-colors duration-200">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" duration={3500} />
        </ThemeProvider>
      </body>
    </html>
  );
}
