"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import {
  NODE_METADATA,
  VIDEO_PROVIDERS,
  type ProductNodeData,
  type AvatarNodeData,
  type ScriptNodeData,
  type VoiceNodeData,
  type ProviderNodeData,
  type CaptionsNodeData,
  type OutputNodeData,
  type WorkflowNode,
} from "@/lib/canvas/types";
import type { VideoProvider } from "@/types";
import { X, Check, Sparkles, Loader2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   NodeConfigPanel — Floating config panel for selected node
   ═══════════════════════════════════════════════════════════ */

export function NodeConfigPanel() {
  const { state, updateNodeData, setActivePanel } = useCanvas();
  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);

  if (!selectedNode) return null;

  return (
    <motion.div
      key={selectedNode.id}
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute top-3 right-3 bottom-3 w-[320px] z-40 flex flex-col rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl"
      style={{ background: "rgba(12, 12, 15, 0.88)", backdropFilter: "blur(40px) saturate(180%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
            style={{
              background: `${NODE_METADATA[selectedNode.type].color}18`,
              color: NODE_METADATA[selectedNode.type].color,
            }}
          >
            {NODE_METADATA[selectedNode.type].label[0]}
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-white/90">{NODE_METADATA[selectedNode.type].label}</h3>
            <p className="text-[10px] text-white/30">{NODE_METADATA[selectedNode.type].description}</p>
          </div>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <NodeConfigBody
          node={selectedNode}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
        />
      </div>
    </motion.div>
  );
}

function NodeConfigBody({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  switch (node.type) {
    case "product":
      return <ProductConfig data={node.data as ProductNodeData} onUpdate={onUpdate} />;
    case "script":
      return <ScriptConfig data={node.data as ScriptNodeData} onUpdate={onUpdate} />;
    case "provider":
      return <ProviderConfig data={node.data as ProviderNodeData} onUpdate={onUpdate} />;
    case "captions":
      return <CaptionsConfig data={node.data as CaptionsNodeData} onUpdate={onUpdate} />;
    case "output":
      return <OutputConfig data={node.data as OutputNodeData} onUpdate={onUpdate} />;
    default:
      return (
        <p className="text-[11px] text-white/30">
          Use the Assets panel in the dock to select {node.type === "avatar" ? "an avatar" : "a voice"}.
        </p>
      );
  }
}

/* ─── Individual configs ─── */

function ProductConfig({ data, onUpdate }: { data: ProductNodeData; onUpdate: (d: Record<string, unknown>) => void }) {
  const [name, setName] = useState(data.name || "");
  const [desc, setDesc] = useState(data.description || "");

  const save = () => onUpdate({ name, description: desc });

  return (
    <>
      <Label text="Product Name" />
      <input value={name} onChange={(e) => setName(e.target.value)} onBlur={save} placeholder="e.g. GlowSerum Pro" className="brutal-input w-full px-3 py-2 text-sm rounded-lg" />
      <Label text="Description" />
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={save} placeholder="What does your product do?" rows={3} className="brutal-input w-full px-3 py-2 text-sm rounded-lg resize-none" />
    </>
  );
}

function ScriptConfig({ data, onUpdate }: { data: ScriptNodeData; onUpdate: (d: Record<string, unknown>) => void }) {
  const [custom, setCustom] = useState(data.content || data.generatedContent || "");
  const [generating, setGenerating] = useState(false);
  const [product, setProduct] = useState("");

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: product || "our product",
          tone: "conversational",
          format: "ugc_ad",
          platform: "tiktok",
          audience: "broad",
          duration: "30",
        }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      const result = await res.json();
      if (result.script) {
        setCustom(result.script);
        onUpdate({ content: result.script, generatedContent: result.script });
      }
    } catch {
      // Silently fail, user can retry
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Label text="Script Content" />
      <textarea
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        onBlur={() => onUpdate({ content: custom })}
        placeholder="Write your script or generate one with AI..."
        rows={8}
        className="brutal-input w-full px-3 py-2 text-sm rounded-lg resize-none"
      />
      <p className="text-[10px] text-white/25">{custom.split(/\s+/).filter(Boolean).length} words</p>

      {/* AI Generate */}
      <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
        <Label text="Generate with AI" />
        <input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Product name (e.g. GlowSerum)"
          className="brutal-input w-full px-3 py-2 text-sm rounded-lg"
        />
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-all bg-accent-400/12 hover:bg-accent-400/20 text-accent-400 border border-accent-400/15 disabled:opacity-40"
        >
          {generating ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={12} />
              Generate Script
            </>
          )}
        </button>
      </div>

      {data.generatedContent && data.generatedContent !== custom && (
        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/12 mt-2">
          <p className="text-[9px] font-medium text-emerald-400/60 mb-1">CoPilot Generated</p>
          <p className="text-[11px] text-white/40 leading-relaxed line-clamp-4">{data.generatedContent}</p>
          <button
            onClick={() => {
              setCustom(data.generatedContent || "");
              onUpdate({ content: data.generatedContent });
            }}
            className="text-[10px] text-accent-400/70 hover:text-accent-400 mt-1 font-medium"
          >
            Use this script
          </button>
        </div>
      )}
    </>
  );
}

function ProviderConfig({ data, onUpdate }: { data: ProviderNodeData; onUpdate: (d: Record<string, unknown>) => void }) {
  const providers = Object.entries(VIDEO_PROVIDERS) as [VideoProvider, { label: string; tier: string; credits: number }][];
  return (
    <>
      <Label text="Video Engine" />
      <div className="space-y-1.5">
        {providers.map(([key, info]) => (
          <button
            key={key}
            onClick={() => onUpdate({ provider: key })}
            className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 border transition-all ${
              data.provider === key
                ? "border-accent-400/30 bg-accent-400/8"
                : "border-white/[0.05] hover:border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="text-left">
              <div className="text-[11px] font-medium text-white/70">{info.label}</div>
              <div className="text-[9px] text-white/30">{info.tier}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-accent-400/60">{info.credits} cr</span>
              {data.provider === key && <Check size={12} className="text-accent-400" />}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function CaptionsConfig({ data, onUpdate }: { data: CaptionsNodeData; onUpdate: (d: Record<string, unknown>) => void }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Label text="Auto-Captions" />
        <button
          onClick={() => onUpdate({ enabled: !data.enabled })}
          className={`relative w-9 h-5 rounded-full transition-colors ${data.enabled ? "bg-cyan-500" : "bg-white/10"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${data.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>
      {data.enabled && <p className="text-[11px] text-white/30">TikTok-style captions will be auto-generated.</p>}
    </>
  );
}

function OutputConfig({ data, onUpdate }: { data: OutputNodeData; onUpdate: (d: Record<string, unknown>) => void }) {
  const [name, setName] = useState(data.campaignName || "");
  return (
    <>
      <Label text="Campaign Name" />
      <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onUpdate({ campaignName: name })} placeholder="e.g. Summer Launch" className="brutal-input w-full px-3 py-2 text-sm rounded-lg" />
    </>
  );
}

function Label({ text }: { text: string }) {
  return <label className="text-[10px] font-medium text-white/40 uppercase tracking-wider">{text}</label>;
}
