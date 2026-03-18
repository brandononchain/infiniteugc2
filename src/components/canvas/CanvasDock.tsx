"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas, type ActivePanel } from "@/lib/canvas/context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Package,
  Plus,
  Zap,
  LogOut,
  RotateCcw,
  Layout,
  Settings,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CanvasDock — Slim tool dock on the left side of the canvas
   This is NOT navigation. Every icon is a tool that acts on
   the canvas or opens a floating panel.
   ═══════════════════════════════════════════════════════════ */

interface DockTool {
  id: ActivePanel | "template" | "clear" | "signout";
  icon: typeof Sparkles;
  label: string;
  panel?: ActivePanel;
  action?: () => void;
  accent?: boolean;
  danger?: boolean;
}

export function CanvasDock() {
  const { activePanel, togglePanel, loadDefaultWorkflow, clearCanvas, state } = useCanvas();
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const topTools: DockTool[] = [
    { id: "copilot", icon: Sparkles, label: "CoPilot", panel: "copilot", accent: true },
  ];

  const middleTools: DockTool[] = [
    { id: "template", icon: Layout, label: "Load Template", action: loadDefaultWorkflow },
    { id: "assets", icon: Package, label: "Assets", panel: "assets" },
    { id: "generate", icon: Zap, label: "Generate", panel: "generate" },
  ];

  const bottomTools: DockTool[] = [
    { id: "clear", icon: RotateCcw, label: "Clear Canvas", action: clearCanvas, danger: true },
  ];

  return (
    <div className="flex flex-col items-center w-[56px] shrink-0 py-3 z-50">
      <div className="dock-glass flex flex-col items-center rounded-2xl h-full w-[48px]">
        {/* ─── Brand ─── */}
        <div className="pt-3 pb-1 px-1.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-700 flex items-center justify-center shadow-lg shadow-accent-400/25">
            <svg width="18" height="10" viewBox="0 0 32 16" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8c3.5 0 5.5-2 8-5.5C18.5 14 20.5 16 24 16c4.4 0 8-3.6 8-8s-3.6-8-8-8c-3.5 0-5.5 2-8 5.5C13.5 2 11.5 0 8 0zm0 4c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.5 0 2.8-1 4.5-3.2L13.2 8l-.7-.8C10.8 5 9.5 4 8 4zm16 0c-1.5 0-2.8 1-4.5 3.2L18.8 8l.7.8C21.2 11 22.5 12 24 12c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
            </svg>
          </div>
        </div>

        <Separator />

        {/* ─── Top tools (CoPilot) ─── */}
        <div className="flex flex-col items-center gap-1 px-1">
          {topTools.map((tool) => (
            <DockButton
              key={tool.id}
              tool={tool}
              active={activePanel === tool.panel}
              onClick={() => tool.panel ? togglePanel(tool.panel) : tool.action?.()}
            />
          ))}
        </div>

        <Separator />

        {/* ─── Middle tools ─── */}
        <div className="flex-1 flex flex-col items-center gap-1 px-1">
          {middleTools.map((tool) => (
            <DockButton
              key={tool.id}
              tool={tool}
              active={activePanel === tool.panel}
              onClick={() => tool.panel ? togglePanel(tool.panel) : tool.action?.()}
            />
          ))}
        </div>

        <Separator />

        {/* ─── Bottom tools ─── */}
        <div className="flex flex-col items-center gap-1 px-1 pb-1">
          {bottomTools.map((tool) => (
            <DockButton
              key={tool.id}
              tool={tool}
              active={false}
              onClick={() => tool.action?.()}
            />
          ))}
        </div>

        <Separator />

        {/* ─── User ─── */}
        <div className="pb-3 px-1">
          <button
            onClick={handleSignOut}
            className="w-9 h-9 rounded-full dock-icon-user flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-200 group relative"
            title={`${displayName} — Sign out`}
          >
            {initials}
            <DockTooltip label={displayName} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Dock button ─── */
function DockButton({
  tool,
  active,
  onClick,
}: {
  tool: DockTool;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = tool.icon;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className={`
          w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
          ${active
            ? "dock-icon-active"
            : tool.accent
              ? "text-accent-400/70 hover:text-accent-400 hover:bg-accent-400/10"
              : tool.danger
                ? "text-white/30 hover:text-red-400 hover:bg-red-500/10"
                : "text-white/40 hover:text-white/80 hover:bg-white/6"
          }
        `}
      >
        <Icon size={17} strokeWidth={active ? 2 : 1.5} />
      </button>

      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="dock-active"
          className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[3px] h-3 rounded-full bg-accent-400"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <DockTooltip label={tool.label} show={hovered} />
    </div>
  );
}

function DockTooltip({ label, show }: { label: string; show?: boolean }) {
  if (show === undefined) return null; // Used inline for user avatar
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.1 }}
          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 dock-tooltip text-white text-[11px] font-medium rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-[100]"
        >
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[rgba(15,15,18,0.92)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Separator() {
  return <div className="w-6 my-1.5 border-t border-white/[0.04]" />;
}
