"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from "framer-motion";
import {
  Infinity as InfinityIcon,
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
} from "@phosphor-icons/react";

/* ─── Types ─── */
type PhosphorIcon = React.ComponentType<{
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

interface NavItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
}

interface SeparatorEntry {
  type: "separator";
}

interface ItemEntry extends NavItem {
  type: "item";
}

type DockEntry = ItemEntry | SeparatorEntry;

/* ─── Navigation Data (exported for mobile drawer reuse) ─── */
export const NAV_GROUPS = [
  {
    label: "Main",
    items: [{ label: "Home", href: "/dashboard", icon: House }],
  },
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
      { label: "Image Gen", href: "/image-generation", icon: ImageSquare },
      { label: "Script Gen", href: "/script-generation", icon: FileText },
      { label: "Hooks", href: "/hooks", icon: Lightning },
      { label: "Editor", href: "/editor", icon: FilmSlate },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/settings", icon: Gear }],
  },
];

/* Flatten groups into dock entries with separators between groups */
const DOCK_ENTRIES: DockEntry[] = NAV_GROUPS.flatMap((group, i) => {
  const items: DockEntry[] = group.items.map((item) => ({
    type: "item" as const,
    ...item,
  }));
  return i < NAV_GROUPS.length - 1
    ? [...items, { type: "separator" as const }]
    : items;
});

/* ─── Magnification Constants ─── */
const BASE_SIZE = 40;
const MAX_SIZE = 60;
const DISTANCE = 140;
const SPRING_CONFIG = { mass: 0.1, stiffness: 170, damping: 12 };

/* ═══════════════════════════════════════════════════════════
   DockSidebar — macOS-style vertical dock with magnification
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
  const mouseY = useMotionValue(Infinity);

  return (
    <div className="hidden lg:flex items-center pl-3 py-3 shrink-0 z-40">
      <motion.div
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Infinity)}
        className="dock-glass flex flex-col items-center max-h-[calc(100dvh-24px)] rounded-2xl"
      >
        {/* ─── Brand (pinned top) ─── */}
        <div className="flex flex-col items-center pt-3 px-1.75 shrink-0">
          <Link
            href="/dashboard"
            className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center shrink-0 hover:brightness-110 transition-all"
            title="InfiniteUGC"
          >
            <InfinityIcon size={18} weight="bold" className="text-white" />
          </Link>
          <DockSeparator />
        </div>

        {/* ─── Scrollable dock items ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto dock-scroll px-1.75">
          <div className="flex flex-col items-center gap-0.75 py-0.5">
            {DOCK_ENTRIES.map((entry, i) =>
              entry.type === "separator" ? (
                <DockSeparator key={`sep-${i}`} />
              ) : (
                <DockIcon
                  key={entry.href}
                  mouseY={mouseY}
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
        <div className="flex flex-col items-center pb-3 px-1.75 shrink-0">
          <DockSeparator />
          <button
            onClick={onSignOut}
            className="relative w-10 h-10 rounded-full bg-accent-500/20 text-accent-400 flex items-center justify-center text-[11px] font-bold shrink-0 hover:bg-accent-500/30 transition-colors group"
            title={`${userName} — Sign out`}
          >
            {userInitials}
            {/* Hover tooltip */}
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900/95 backdrop-blur-sm text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-white/5 z-50">
              {userName}
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-zinc-900/95" />
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Separator ─── */
function DockSeparator() {
  return <div className="w-7 my-0.75 border-t border-white/6" />;
}

/* ═══════════════════════════════════════════════════════
   DockIcon — individual icon with magnification effect
   ═══════════════════════════════════════════════════════ */
function DockIcon({
  mouseY,
  href,
  icon: Icon,
  label,
  active,
}: {
  mouseY: MotionValue<number>;
  href: string;
  icon: PhosphorIcon;
  label: string;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  /* Distance from cursor to this icon's center */
  const distance = useTransform(mouseY, (val) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Infinity;
    return val - (bounds.y + bounds.height / 2);
  });

  /* Container size — magnifies as cursor approaches */
  const sizeRaw = useTransform(
    distance,
    [-DISTANCE, 0, DISTANCE],
    [BASE_SIZE, MAX_SIZE, BASE_SIZE]
  );
  const size = useSpring(sizeRaw, SPRING_CONFIG);

  /* Icon scale — matches container growth */
  const scaleRaw = useTransform(
    distance,
    [-DISTANCE, 0, DISTANCE],
    [1, MAX_SIZE / BASE_SIZE, 1]
  );
  const iconScale = useSpring(scaleRaw, SPRING_CONFIG);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-center shrink-0"
    >
      <Link
        href={href}
        className={`
          w-full h-full flex items-center justify-center rounded-xl transition-colors duration-150
          ${
            active
              ? "bg-white/12 text-accent-400 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
              : "text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"
          }
        `}
      >
        <motion.div
          style={{ scale: iconScale }}
          className="flex items-center justify-center"
        >
          <Icon size={18} weight={active ? "fill" : "regular"} />
        </motion.div>
      </Link>

      {/* Active indicator — animated dot */}
      {active && (
        <motion.div
          layoutId="dock-active-indicator"
          className="absolute -right-1.25 w-1 h-1 rounded-full bg-accent-400"
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
            className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900/95 backdrop-blur-sm text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-60 border border-white/5"
          >
            {label}
            {/* Left arrow */}
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-zinc-900/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
