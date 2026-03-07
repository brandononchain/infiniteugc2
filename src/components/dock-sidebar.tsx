"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
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
  Package,
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
interface CreateHubEntry {
  type: "create-hub";
}
interface AssetsHubEntry {
  type: "assets-hub";
}
type DockEntry = ItemEntry | SeparatorEntry | CreateHubEntry | AssetsHubEntry;

const DOCK_ENTRIES: DockEntry[] = NAV_GROUPS.flatMap((group, i) => {
  const items: DockEntry[] =
    group.label === "Create"
      ? [{ type: "create-hub" as const }]
      : group.label === "Assets"
        ? [{ type: "assets-hub" as const }]
        : group.items.map((item) => ({
            type: "item" as const,
            ...item,
          }));
  return i < NAV_GROUPS.length - 1
    ? [...items, { type: "separator" as const }]
    : items;
});

const CREATE_MODES = [
  {
    label: "Standard",
    desc: "Quick single video from a script and avatar",
    href: "/create",
    image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop&q=80",
  },
  {
    label: "Mass",
    desc: "Batch-generate dozens of variations at once",
    href: "/create-mass",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=300&fit=crop&q=80",
  },
  {
    label: "Premium",
    desc: "Cinematic quality with advanced controls",
    href: "/create-premium",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop&q=80",
  },
];

const ASSET_ITEMS = [
  {
    label: "Voice Hyper-Realism",
    desc: "Create the most realistic voices using our realism technology",
    href: "/voices",
    image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=400&fit=crop&q=80",
  },
  {
    label: "Avatars",
    desc: "Choose from our library or create your own custom avatar",
    href: "/avatars",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&h=400&fit=crop&q=80",
  },
  {
    label: "Scripts",
    desc: "Bulk upload scripts, handwrite 1 by 1, or AI generate w/ our trained models",
    href: "/scripts",
    image: "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=500&h=400&fit=crop&q=80",
  },
];

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
            <svg width="20" height="12" viewBox="0 0 32 16" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8c3.5 0 5.5-2 8-5.5C18.5 14 20.5 16 24 16c4.4 0 8-3.6 8-8s-3.6-8-8-8c-3.5 0-5.5 2-8 5.5C13.5 2 11.5 0 8 0zm0 4c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.5 0 2.8-1 4.5-3.2L13.2 8l-.7-.8C10.8 5 9.5 4 8 4zm16 0c-1.5 0-2.8 1-4.5 3.2L18.8 8l.7.8C21.2 11 22.5 12 24 12c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
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
              ) : entry.type === "create-hub" ? (
                <DockCreateHub key="create-hub" pathname={pathname} />
              ) : entry.type === "assets-hub" ? (
                <DockAssetsHub key="assets-hub" pathname={pathname} />
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
   DockCreateHub — ghost pop-out panel for Create modes
   Uses a portal so the panel escapes the dock's overflow clipping.
   Comic-book speech-bubble tail connects icon to panel.
   ═══════════════════════════════════════════════════════ */
function DockCreateHub({ pathname }: { pathname: string }) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const active = ["/create", "/create-mass", "/create-premium"].includes(pathname);

  useEffect(() => {
    setMounted(true);
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    if (iconRef.current) setRect(iconRef.current.getBoundingClientRect());
    setHovered(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 150);
  };

  return (
    <div
      ref={iconRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative flex items-center justify-center shrink-0 w-10 h-10"
    >
      <div
        className={`
          w-full h-full flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer
          ${
            active
              ? "dock-icon-active"
              : "text-white/50 hover:text-white/90 hover:bg-white/6"
          }
        `}
      >
        <Plus
          size={19}
          strokeWidth={active ? 2 : 1.5}
          className="transition-all duration-200"
        />
      </div>

      {/* Active indicator — animated dot */}
      {active && (
        <motion.div
          layoutId="dock-active-indicator"
          className="absolute -right-1 w-1 h-1 rounded-full bg-accent-400 shadow-[0_0_6px_1px_rgba(56,189,248,0.4)]"
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      )}

      {/* Pop-out panel — rendered via portal to escape overflow clipping */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {hovered && rect && (
              <motion.div
                key="create-hub-popout"
                initial={{ opacity: 0, y: "-50%" }}
                animate={{ opacity: 1, y: "-50%" }}
                exit={{ opacity: 0, y: "-50%" }}
                transition={{ duration: 0.18 }}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
                style={{
                  position: "fixed",
                  top: rect.top + rect.height / 2,
                  left: rect.right + 28,
                  zIndex: 9999,
                }}
              >
                {/* Hover bridge — covers gap from icon to panel */}
                <div
                  style={{
                    position: "absolute",
                    right: "100%",
                    top: "-20%",
                    width: 36,
                    height: "140%",
                  }}
                />

                {/* Speech bubble tail — tapered SVG connector */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 28,
                  }}
                  style={{
                    position: "absolute",
                    right: "100%",
                    top: 0,
                    bottom: 0,
                    width: 20,
                    marginRight: -1,
                    transformOrigin: "right center",
                  }}
                >
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 20 100"
                    preserveAspectRatio="none"
                    style={{ display: "block" }}
                  >
                    <path
                      d="M20,0 C8,2 0,38 0,50 C0,62 8,98 20,100 Z"
                      fill="rgba(15,15,18,0.92)"
                    />
                  </svg>
                </motion.div>

                {/* Panel body */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 26,
                    delay: 0.04,
                  }}
                  style={{
                    transformOrigin: "left center",
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderLeft: "none",
                  }}
                  className="dock-tooltip rounded-xl py-2.5 px-2.5 shadow-2xl flex flex-col gap-2"
                >
                  {CREATE_MODES.map((mode, i) => (
                    <motion.div
                      key={mode.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.1 + i * 0.07,
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                    >
                      <Link
                        href={mode.href}
                        className="relative w-[260px] h-[110px] rounded-xl overflow-hidden block hover:scale-[1.03] hover:brightness-110 transition-all duration-200"
                      >
                        <img
                          src={mode.image}
                          alt={mode.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        <div className="absolute bottom-2.5 left-3 right-3">
                          <span className="text-white text-sm font-semibold">
                            {mode.label}
                          </span>
                          <p className="text-white/60 text-[11px] leading-tight mt-0.5">
                            {mode.desc}
                          </p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DockAssetsHub — horizontal pop-out for Voices / Avatars / Scripts
   ═══════════════════════════════════════════════════════ */
function DockAssetsHub({ pathname }: { pathname: string }) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const active = ["/voices", "/avatars", "/scripts"].includes(pathname);

  useEffect(() => {
    setMounted(true);
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    if (iconRef.current) setRect(iconRef.current.getBoundingClientRect());
    setHovered(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 150);
  };

  return (
    <div
      ref={iconRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative flex items-center justify-center shrink-0 w-10 h-10"
    >
      <div
        className={`
          w-full h-full flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer
          ${
            active
              ? "dock-icon-active"
              : "text-white/50 hover:text-white/90 hover:bg-white/6"
          }
        `}
      >
        <Package
          size={19}
          strokeWidth={active ? 2 : 1.5}
          className="transition-all duration-200"
        />
      </div>

      {/* Active indicator — animated dot */}
      {active && (
        <motion.div
          layoutId="dock-active-indicator"
          className="absolute -right-1 w-1 h-1 rounded-full bg-accent-400 shadow-[0_0_6px_1px_rgba(56,189,248,0.4)]"
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      )}

      {/* Pop-out panel — portal */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {hovered && rect && (
              <motion.div
                key="assets-hub-popout"
                initial={{ opacity: 0, y: "-50%" }}
                animate={{ opacity: 1, y: "-50%" }}
                exit={{ opacity: 0, y: "-50%" }}
                transition={{ duration: 0.18 }}
                onMouseEnter={handleEnter}
                onMouseLeave={handleLeave}
                style={{
                  position: "fixed",
                  top: rect.top + rect.height / 2,
                  left: rect.right + 28,
                  zIndex: 9999,
                }}
              >
                {/* Hover bridge */}
                <div
                  style={{
                    position: "absolute",
                    right: "100%",
                    top: "-20%",
                    width: 36,
                    height: "140%",
                  }}
                />

                {/* Speech bubble tail */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 28,
                  }}
                  style={{
                    position: "absolute",
                    right: "100%",
                    top: 0,
                    bottom: 0,
                    width: 20,
                    marginRight: -1,
                    transformOrigin: "right center",
                  }}
                >
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 20 100"
                    preserveAspectRatio="none"
                    style={{ display: "block" }}
                  >
                    <path
                      d="M20,0 C8,2 0,38 0,50 C0,62 8,98 20,100 Z"
                      fill="rgba(15,15,18,0.92)"
                    />
                  </svg>
                </motion.div>

                {/* Panel body */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 26,
                    delay: 0.04,
                  }}
                  style={{
                    transformOrigin: "left center",
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderLeft: "none",
                  }}
                  className="dock-tooltip rounded-xl pt-4 pb-4 px-4 shadow-2xl"
                >
                  {/* Header */}
                  <div className="mb-3.5 px-0.5">
                    <h3 className="text-white text-base font-bold tracking-tight">
                      Create Custom Assets
                    </h3>
                    <p className="text-white/45 text-xs leading-snug mt-1">
                      Create your own or choose from our huge selection
                    </p>
                  </div>

                  {/* Vertical cards */}
                  <div className="flex flex-col gap-2">
                    {ASSET_ITEMS.map((item, i) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.1 + i * 0.07,
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        <Link
                          href={item.href}
                          className="relative w-[280px] h-[80px] rounded-xl overflow-hidden block hover:scale-[1.03] hover:brightness-110 transition-all duration-200"
                        >
                          <img
                            src={item.image}
                            alt={item.label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          <div className="absolute bottom-2.5 left-3 right-3">
                            <span className="text-white text-sm font-semibold">
                              {item.label}
                            </span>
                            <p className="text-white/60 text-[11px] leading-tight mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
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
