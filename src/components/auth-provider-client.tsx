"use client";

import { AuthProvider } from "@/lib/auth-context";

export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
