"use client";

import { motion } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import { NODE_METADATA, type WorkflowNodeType } from "@/lib/canvas/types";
import {
  X,
  Package,
  UserCircle,
  FileText,
  Mic,
  Cpu,
  Subtitles,
  Play,
  Sparkles,
  Image,
  Video,
  Wand2,
  Layout,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   NodePickerModal — Full-screen modal to add nodes.
   Categorized, organized, enterprise-grade feel.
   ═══════════════════════════════════════════════════════════ */

const ICON_MAP: Record<string, typeof Package> = {
  Package, UserCircle, FileText, Mic, Cpu, Subtitles, Play,
};

interface NodeCategory {
  label: string;
  description: string;
  icon: typeof Package;
  nodes: WorkflowNodeType[];
}

const CATEGORIES: NodeCategory[] = [
  {
    label: "Input",
    description: "Define what you're creating",
    icon: Package,
    nodes: ["product"],
  },
  {
    label: "Creative",
    description: "Avatar, script, and voice",
    icon: UserCircle,
    nodes: ["avatar", "script", "voice"],
  },
  {
    label: "Production",
    description: "Video engine and captions",
    icon: Video,
    nodes: ["provider", "captions"],
  },
  {
    label: "Output",
    description: "Final render settings",
    icon: Play,
    nodes: ["output"],
  },
];

export function NodePickerModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch, loadDefaultWorkflow } = useCanvas();

  const existingTypes = new Set(state.nodes.map((n) => n.type));

  const handleAddNode = (type: WorkflowNodeType) => {
    dispatch({ type: "ADD_NODE", payload: { nodeType: type } });
  };

  const handleAddAll = () => {
    loadDefaultWorkflow();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-[560px] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl"
        style={{ background: "rgba(16, 16, 19, 0.97)", backdropFilter: "blur(40px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-semibold text-white/90">Add Node</h2>
            <p className="text-[11px] text-white/30 mt-0.5">Choose a node to add to your workflow</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/5 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-6 pt-4 pb-2 flex gap-2">
          <button
            onClick={handleAddAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium text-accent-400/80 bg-accent-400/8 hover:bg-accent-400/12 border border-accent-400/15 transition-all"
          >
            <Layout size={13} />
            Add Full Template
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium text-white/30 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all"
          >
            <Sparkles size={13} />
            Use CoPilot Instead
          </button>
        </div>

        {/* Categories */}
        <div className="px-6 py-4 space-y-5 max-h-[400px] overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const availableNodes = cat.nodes.filter((n) => !existingTypes.has(n));
            const allAdded = availableNodes.length === 0;

            return (
              <div key={cat.label}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <CatIcon size={13} className="text-white/20" />
                  <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                    {cat.label}
                  </span>
                  <span className="text-[9px] text-white/15">{cat.description}</span>
                </div>

                {/* Nodes grid */}
                <div className="grid grid-cols-2 gap-2">
                  {cat.nodes.map((nodeType) => {
                    const meta = NODE_METADATA[nodeType];
                    const added = existingTypes.has(nodeType);
                    const NodeIcon = ICON_MAP[meta.icon] || Package;

                    return (
                      <button
                        key={nodeType}
                        onClick={() => {
                          if (!added) handleAddNode(nodeType);
                        }}
                        disabled={added}
                        className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all text-left ${
                          added
                            ? "border-white/[0.04] bg-white/[0.015] opacity-40 cursor-default"
                            : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] cursor-pointer"
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: added ? "rgba(255,255,255,0.03)" : `${meta.color}12`,
                            color: added ? "rgba(255,255,255,0.15)" : meta.color,
                          }}
                        >
                          <NodeIcon size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium text-white/70 flex items-center gap-1.5">
                            {meta.label}
                            {added && (
                              <span className="text-[9px] text-white/20 font-normal bg-white/[0.04] px-1.5 py-0.5 rounded">
                                Added
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-white/25 leading-snug mt-0.5">
                            {meta.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between">
          <p className="text-[10px] text-white/15">
            {state.nodes.length} node{state.nodes.length !== 1 ? "s" : ""} on canvas
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
