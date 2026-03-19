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
  RotateCcw,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CanvasDock — Ultra-slim tool dock, vertically centered.
   No logo. '+' at top opens node picker.
   ═══════════════════════════════════════════════════════════ */

interface DockTool {
  id: string;
  icon: typeof Sparkles;
  label: string;
  panel?: ActivePanel;
  action?: () => void;
  accent?: boolean;
  danger?: boolean;
  primary?: boolean;
}

export function CanvasDock({ onOpenNodePicker }: { onOpenNodePicker: () => void }) {
  const { activePanel, togglePanel, clearCanvas } = useCanvas();
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

  const tools: DockTool[] = [
    { id: "add", icon: Plus, label: "Add Node", action: onOpenNodePicker, primary: true },
    { id: "copilot", icon: Sparkles, label: "CoPilot", panel: "copilot", accent: true },
    { id: "assets", icon: Package, label: "Assets", panel: "assets" },
    { id: "generate", icon: Zap, label: "Generate", panel: "generate" },
    { id: "clear", icon: RotateCcw, label: "Clear", action: clearCanvas, danger: true },
  ];

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center">
      <div className="dock-glass flex flex-col items-center gap-1 rounded-2xl py-2 px-[5px]">
        {tools.map((tool, i) => (
          <DockButton
            key={tool.id}
            tool={tool}
            active={activePanel === tool.panel}
            onClick={() => {
              if (tool.panel) togglePanel(tool.panel);
              else tool.action?.();
            }}
            first={i === 0}
          />
        ))}

        <div className="w-5 my-0.5 border-t border-white/[0.04]" />

        {/* User */}
        <div className="relative group">
          <button
            onClick={handleSignOut}
            className="w-8 h-8 rounded-full dock-icon-user flex items-center justify-center text-[9px] font-bold transition-all duration-200"
            title={`${displayName} — Sign out`}
          >
            {initials}
          </button>
          <Tooltip label={displayName} />
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
  first,
}: {
  tool: DockTool;
  active: boolean;
  onClick: () => void;
  first?: boolean;
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
          w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200
          ${tool.primary
            ? "bg-accent-400/15 text-accent-400 hover:bg-accent-400/25 border border-accent-400/20"
            : active
              ? "dock-icon-active"
              : tool.accent
                ? "text-accent-400/60 hover:text-accent-400 hover:bg-accent-400/10"
                : tool.danger
                  ? "text-white/25 hover:text-red-400 hover:bg-red-500/10"
                  : "text-white/35 hover:text-white/70 hover:bg-white/6"
          }
        `}
      >
        <Icon size={15} strokeWidth={active || tool.primary ? 2 : 1.5} />
      </button>

      {active && !tool.primary && (
        <motion.div
          layoutId="dock-active"
          className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-2.5 rounded-full bg-accent-400"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}

      <Tooltip label={tool.label} show={hovered} />
    </div>
  );
}

function Tooltip({ label, show }: { label: string; show?: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.08 }}
          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 dock-tooltip text-white text-[10px] font-medium rounded-md whitespace-nowrap pointer-events-none shadow-lg z-[100]"
        >
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-r-[rgba(15,15,18,0.92)]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
