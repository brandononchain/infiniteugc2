"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import {
  NODE_METADATA,
  type WorkflowNode,
  type ProductNodeData,
  type AvatarNodeData,
  type ScriptNodeData,
  type VoiceNodeData,
  type ProviderNodeData,
  type CaptionsNodeData,
  type OutputNodeData,
  VIDEO_PROVIDERS,
} from "@/lib/canvas/types";
import {
  Package,
  UserCircle,
  FileText,
  Mic,
  Cpu,
  Subtitles,
  Play,
  Check,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

const ICON_MAP = {
  Package,
  UserCircle,
  FileText,
  Mic,
  Cpu,
  Subtitles,
  Play,
} as const;

/* ═══════════════════════════════════════════════════════════
   WorkflowNodeCard — Individual draggable node on canvas
   ═══════════════════════════════════════════════════════════ */

export function WorkflowNodeCard({ node }: { node: WorkflowNode }) {
  const { state, dispatch, selectNode, removeNode } = useCanvas();
  const meta = NODE_METADATA[node.type];
  const isSelected = state.selectedNodeId === node.id;
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const Icon = ICON_MAP[meta.icon as keyof typeof ICON_MAP] || Package;

  /* ─── Dragging ─── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDragging.current = true;
      // Account for both zoom and pan when calculating drag offset
      dragStart.current = {
        x: (e.clientX - state.pan.x) / state.zoom - node.position.x,
        y: (e.clientY - state.pan.y) / state.zoom - node.position.y,
      };

      const handleMove = (me: MouseEvent) => {
        if (!isDragging.current) return;
        dispatch({
          type: "MOVE_NODE",
          payload: {
            nodeId: node.id,
            position: {
              x: (me.clientX - state.pan.x) / state.zoom - dragStart.current.x,
              y: (me.clientY - state.pan.y) / state.zoom - dragStart.current.y,
            },
          },
        });
      };

      const handleUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [node.id, node.position, state.zoom, state.pan, dispatch]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(node.id);
    },
    [node.id, selectNode]
  );

  /* ─── Status indicator ─── */
  const StatusIcon = () => {
    switch (node.status) {
      case "configured":
        return <Check size={10} className="text-emerald-400" />;
      case "processing":
        return <Loader2 size={10} className="text-accent-400 animate-spin" />;
      case "complete":
        return <Check size={10} className="text-emerald-400" />;
      case "error":
        return <AlertCircle size={10} className="text-red-400" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-white/20" />;
    }
  };

  /* ─── Node summary text ─── */
  const getSummary = (): string => {
    switch (node.type) {
      case "product": {
        const d = node.data as ProductNodeData;
        return d.name || "Not configured";
      }
      case "avatar": {
        const d = node.data as AvatarNodeData;
        return d.avatar?.name || (d.avatarId ? "Selected" : "Not selected");
      }
      case "script": {
        const d = node.data as ScriptNodeData;
        if (d.generatedContent) return d.generatedContent.slice(0, 40) + "...";
        if (d.content) return d.content.slice(0, 40) + "...";
        if (d.script?.name) return d.script.name;
        return "Not configured";
      }
      case "voice": {
        const d = node.data as VoiceNodeData;
        return d.voice?.name || (d.voiceId ? "Selected" : "Not selected");
      }
      case "provider": {
        const d = node.data as ProviderNodeData;
        return VIDEO_PROVIDERS[d.provider]?.label || "Not selected";
      }
      case "captions": {
        const d = node.data as CaptionsNodeData;
        return d.enabled ? "Enabled" : "Disabled";
      }
      case "output": {
        const d = node.data as OutputNodeData;
        return d.campaignName || "Ready to generate";
      }
      default:
        return "Not configured";
    }
  };

  return (
    <motion.div
      data-workflow-node
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute select-none pointer-events-auto"
      style={{
        left: node.position.x,
        top: node.position.y,
        width: 220,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Node card */}
      <div
        className="relative rounded-xl p-3 transition-all duration-200 cursor-grab active:cursor-grabbing"
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${meta.color}15 0%, rgba(30,30,34,0.95) 100%)`
            : "rgba(30, 30, 34, 0.9)",
          border: `1px solid ${isSelected ? `${meta.color}40` : "rgba(255,255,255,0.08)"}`,
          boxShadow: isSelected
            ? `0 0 20px ${meta.glowColor}, 0 4px 16px rgba(0,0,0,0.3)`
            : "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Remove button */}
        {hovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeNode(node.id);
            }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center z-20 transition-colors"
          >
            <X size={10} className="text-white" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${meta.color}18`, color: meta.color }}
          >
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white/90">{meta.label}</span>
              <StatusIcon />
            </div>
            <p className="text-[10px] text-white/35 leading-tight">{meta.description}</p>
          </div>
        </div>

        {/* Summary */}
        <div
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium truncate"
          style={{
            background: node.status === "configured" ? `${meta.color}08` : "rgba(255,255,255,0.03)",
            color: node.status === "configured" ? `${meta.color}cc` : "rgba(255,255,255,0.3)",
            border: `1px solid ${node.status === "configured" ? `${meta.color}15` : "rgba(255,255,255,0.04)"}`,
          }}
        >
          {getSummary()}
        </div>

        {/* Connection ports */}
        {/* Left (input) port */}
        {node.type !== "product" && node.type !== "avatar" && (
          <div
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
            style={{
              borderColor: meta.color,
              background: "rgba(20,20,23,0.9)",
            }}
          />
        )}
        {/* Right (output) port */}
        {node.type !== "output" && (
          <div
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
            style={{
              borderColor: meta.color,
              background:
                node.status === "configured"
                  ? meta.color
                  : "rgba(20,20,23,0.9)",
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
