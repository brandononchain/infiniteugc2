"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Plus,
  Layers,
  Sparkles,
  Play,
  Download,
  Mic,
  UserCircle,
  FileText,
  Image,
  PenTool,
  Zap,
  Clapperboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

/* ─── Navigation Data (exported for mobile drawer reuse) ─── */
export const NAV_GROUPS = [
  {
    label: "Main",
    items: [{ label: "Home", href: "/dashboard", icon: Home }],
  },
  {
    label: "Create",
    items: [
      { label: "Create", href: "/create", icon: Plus },
      { label: "Create Mass", href: "/create-mass", icon: Layers },
      { label: "Create Premium", href: "/create-premium", icon: Sparkles },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Running", href: "/running", icon: Play },
      { label: "Exports", href: "/exports", icon: Download },
    ],
  },
  {
    label: "Assets",
    items: [
      { label: "Voices", href: "/voices", icon: Mic },
      { label: "Avatars", href: "/avatars", icon: UserCircle },
      { label: "Scripts", href: "/scripts", icon: FileText },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Image Gen", href: "/image-generation", icon: Image },
      { label: "Script Gen", href: "/script-generation", icon: PenTool },
      { label: "Hooks", href: "/hooks", icon: Zap },
      { label: "Editor", href: "/editor", icon: Clapperboard },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/* Flatten groups into dock entries with separators between groups */
interface ItemEntry {
  type: "item";
  label: string;
  href: string;
  icon: LucideIcon;
}
interface SeparatorEntry {
  type: "separator";
}
type DockEntry = ItemEntry | SeparatorEntry;

const DOCK_ENTRIES: DockEntry[] = NAV_GROUPS.flatMap((group, i) => {
  const items: DockEntry[] = group.items.map((item) => ({
    type: "item" as const,
    ...item,
  }));
  return i < NAV_GROUPS.length - 1
    ? [...items, { type: "separator" as const }]
    : items;
});

/* ═══════════════════════════════════════════════════════════
   DockSidebar — Liquid glass vertical dock (no magnification)
   ═══════════════════════════════════════════════════════════ */
export function DockSidebar({
  onSignOut,
  userInitials,
  userName,
}: {
  onSignOut: () => void;
  userInitials: string;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex items-center pl-3 py-3 shrink-0 z-40">
      <div className="dock-glass flex flex-col items-center max-h-[calc(100dvh-24px)] rounded-2xl">
        {/* ─── Brand (pinned top) ─── */}
        <div className="flex flex-col items-center pt-3 px-2 shrink-0">
          <Link
            href="/dashboard"
            className="dock-icon-brand w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
            title="InfiniteUGC"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
            </svg>
          </Link>
          <DockSeparator />
        </div>

        {/* ─── Scrollable dock items ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto dock-scroll px-2">
          <div className="flex flex-col items-center gap-1 py-0.5">
            {DOCK_ENTRIES.map((entry, i) =>
              entry.type === "separator" ? (
                <DockSeparator key={`sep-${i}`} />
              ) : (
                <DockIcon
                  key={entry.href}
                  href={entry.href}
                  icon={entry.icon}
                  label={entry.label}
                  active={pathname === entry.href}
                />
              )
            )}
          </div>
        </div>

        {/* ─── User (pinned bottom) ─── */}
        <div className="flex flex-col items-center pb-3 px-2 shrink-0">
          <DockSeparator />
          <button
            onClick={onSignOut}
            className="relative w-10 h-10 rounded-full dock-icon-user flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200 group"
            title={`${userName} — Sign out`}
          >
            {userInitials}
            {/* Hover tooltip */}
            <span className="absolute left-full ml-3 px-2.5 py-1.5 dock-tooltip text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {userName}
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[rgba(15,15,18,0.92)]" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Separator ─── */
function DockSeparator() {
  return <div className="w-7 my-1 border-t border-white/4" />;
}

/* ═══════════════════════════════════════════════════════
   DockIcon — individual icon (no magnification, clean hover)
   ═══════════════════════════════════════════════════════ */
function DockIcon({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-center shrink-0 w-10 h-10"
    >
      <Link
        href={href}
        className={`
          w-full h-full flex items-center justify-center rounded-xl transition-all duration-200
          ${
            active
              ? "dock-icon-active"
              : "text-white/50 hover:text-white/90 hover:bg-white/6"
          }
        `}
      >
        <Icon
          size={19}
          strokeWidth={active ? 2 : 1.5}
          className="transition-all duration-200"
        />
      </Link>

      {/* Active indicator — animated dot */}
      {active && (
        <motion.div
          layoutId="dock-active-indicator"
          className="absolute -right-1 w-1 h-1 rounded-full bg-accent-400 shadow-[0_0_6px_1px_rgba(56,189,248,0.4)]"
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -4, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-full ml-3 px-2.5 py-1.5 dock-tooltip text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-60"
          >
            {label}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[rgba(15,15,18,0.92)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
