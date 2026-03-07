"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { DockSidebar, NAV_GROUPS } from "@/components/dock-sidebar";
import { Infinity, Menu, X, LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* ─── Desktop: macOS Dock Side Nav ─── */}
      <DockSidebar
        onSignOut={handleSignOut}
        userInitials={initials}
        userName={displayName}
      />

      {/* ─── Mobile overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Mobile drawer ─── */}
      <aside
        className={`
          fixed z-50 inset-y-0 left-0 w-64 flex flex-col brutal-sidebar
          transition-transform duration-300 ease-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#00BCFF] to-[#0069A8] rounded-lg flex items-center justify-center">
              <Infinity size={14} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">InfiniteUGC</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Drawer nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-2 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        group flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors
                        ${isActive
                          ? "nav-active text-accent-400"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                        }
                      `}
                    >
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2 : 1.5}
                        className="shrink-0"
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-zinc-800 px-3 py-3">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <div className="w-7 h-7 rounded-full bg-[#00BCFF]/100/20 text-accent-400 flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate">{displayName}</p>
              <p className="text-[10px] text-accent-400 font-medium">
                {profile ? `${profile.credits} credits` : "Loading..."}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300"
              title="Sign out"
            >
              <LogOut size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center h-14 px-4 shrink-0 border-b border-white/[0.06]">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-6 h-6 bg-gradient-to-br from-[#00BCFF] to-[#0069A8] rounded-lg flex items-center justify-center">
              <Infinity size={13} strokeWidth={2.5} className="text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-100">InfiniteUGC</span>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
