"use client";

import { useAuth } from "@/lib/auth-context";

/* ═══════════════════════════════════════════════════════════
   Dashboard Layout — Minimal shell. The canvas IS the app.
   No nav, no headers, no chrome. Just children.
   ═══════════════════════════════════════════════════════════ */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuth(); // Ensure auth context is active

  return (
    <div className="h-dvh w-dvw overflow-hidden">
      {children}
    </div>
  );
}
