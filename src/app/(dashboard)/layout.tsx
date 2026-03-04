"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Infinity,
  House,
  Plus,
  Stack,
  Sparkle,
  Play,
  Microphone,
  UserCircle,
  FileText,
  ImageSquare,
  Lightning,
  DownloadSimple,
  FilmSlate,
  Gear,
  CaretLeft,
  List,
} from "@phosphor-icons/react";

type NavIcon = React.ComponentType<{
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

/* ─── Nav Structure ─── */
const NAV_GROUPS = [
  {
    label: "Create",
    items: [
      { label: "Create", href: "/create", icon: Plus },
      { label: "Create Mass", href: "/create-mass", icon: Stack },
      { label: "Create Premium", href: "/create-premium", icon: Sparkle },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Running", href: "/running", icon: Play },
      { label: "Exports", href: "/exports", icon: DownloadSimple },
    ],
  },
  {
    label: "Assets",
    items: [
      { label: "Voices", href: "/voices", icon: Microphone },
      { label: "Avatars", href: "/avatars", icon: UserCircle },
      { label: "Scripts", href: "/scripts", icon: FileText },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Image Generation", href: "/image-generation", icon: ImageSquare },
      { label: "Hooks", href: "/hooks", icon: Lightning },
      { label: "Editor", href: "/editor", icon: FilmSlate },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-zinc-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`
          fixed z-50 lg:static inset-y-0 left-0
          flex flex-col border-r border-zinc-200/60 bg-white
          transition-all duration-300 ease-out
          ${collapsed ? "w-17" : "w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className={`flex items-center h-16 border-b border-zinc-100 shrink-0 ${collapsed ? "justify-center px-0" : "gap-2.5 px-4"}`}>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors group"
              title="Expand sidebar"
            >
              <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Infinity size={17} weight="bold" className="text-white" />
              </div>
            </button>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 min-w-0"
              >
                <div className="w-8 h-8 bg-zinc-950 rounded-xl flex items-center justify-center shrink-0">
                  <Infinity size={17} weight="bold" className="text-white" />
                </div>
                <span className="text-sm font-bold tracking-tight text-zinc-950 truncate">
                  InfiniteUGC
                </span>
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="ml-auto hidden lg:flex w-6 h-6 items-center justify-center rounded-md hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
            </>
          )}
        </div>

        {/* Home link */}
        <div className="px-2 pt-3 pb-1">
          <NavItem
            href="/dashboard"
            icon={House}
            label="Home"
            active={pathname === "/dashboard"}
            collapsed={collapsed}
          />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="border-t border-zinc-100 mx-2 mb-2" />}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={pathname === item.href}
                    collapsed={collapsed}
                    accent={item.href === "/create-premium"}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-zinc-100 px-2 py-3 space-y-0.5">
          <NavItem
            href="/settings"
            icon={Gear}
            label="Settings"
            active={pathname === "/settings"}
            collapsed={collapsed}
          />

          {/* User */}
          <div
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-bold shrink-0">
              SC
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-900 truncate">Sarah Creator</p>
                <p className="text-[10px] text-accent-600 font-medium">Pro Member</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b border-zinc-200/60 bg-white shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600"
          >
            <List size={20} weight="bold" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-6 h-6 bg-zinc-950 rounded-lg flex items-center justify-center">
              <Infinity size={13} weight="bold" className="text-white" />
            </div>
            <span className="text-sm font-bold text-zinc-950">InfiniteUGC</span>
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

/* ─── Nav Item Component ─── */
function NavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  accent,
}: {
  href: string;
  icon: NavIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
        ${collapsed ? "justify-center px-0" : ""}
        ${
          active
            ? "bg-accent-50 text-accent-700"
            : accent
            ? "text-rose-500 hover:bg-rose-50/60"
            : "text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-900"
        }
      `}
      title={collapsed ? label : undefined}
    >
      <Icon
        size={18}
        weight={active ? "fill" : "regular"}
        className={`shrink-0 ${
          active ? "text-accent-600" : accent ? "text-rose-500" : "text-zinc-400 group-hover:text-zinc-600"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
