"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import type { Avatar, Voice, Script, VideoProvider } from "@/types";
import { X, Check } from "lucide-react";

interface NodeConfigPanelProps {
  avatars: Avatar[];
  voices: Voice[];
  scripts: Script[];
}

/* ═══════════════════════════════════════════════════════════
   NodeConfigPanel — Right-side panel for configuring nodes
   ═══════════════════════════════════════════════════════════ */

export function NodeConfigPanel({ avatars, voices, scripts }: NodeConfigPanelProps) {
  const { state, updateNodeData, selectNode } = useCanvas();
  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);

  return (
    <AnimatePresence mode="wait">
      {selectedNode && (
        <motion.div
          key={selectedNode.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
          className="w-[320px] shrink-0 flex flex-col rounded-2xl border border-white/8 overflow-hidden"
          style={{ background: "rgba(20, 20, 23, 0.8)", backdropFilter: "blur(20px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  background: `${NODE_METADATA[selectedNode.type].color}18`,
                  color: NODE_METADATA[selectedNode.type].color,
                }}
              >
                {NODE_METADATA[selectedNode.type].label[0]}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">
                  {NODE_METADATA[selectedNode.type].label}
                </h3>
                <p className="text-[10px] text-white/35">
                  {NODE_METADATA[selectedNode.type].description}
                </p>
              </div>
            </div>
            <button
              onClick={() => selectNode(null)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Config body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <NodeConfigBody
              node={selectedNode}
              avatars={avatars}
              voices={voices}
              scripts={scripts}
              onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Config body router ─── */
function NodeConfigBody({
  node,
  avatars,
  voices,
  scripts,
  onUpdate,
}: {
  node: WorkflowNode;
  avatars: Avatar[];
  voices: Voice[];
  scripts: Script[];
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  switch (node.type) {
    case "product":
      return <ProductConfig data={node.data as ProductNodeData} onUpdate={onUpdate} />;
    case "avatar":
      return <AvatarConfig data={node.data as AvatarNodeData} avatars={avatars} onUpdate={onUpdate} />;
    case "script":
      return <ScriptConfig data={node.data as ScriptNodeData} scripts={scripts} onUpdate={onUpdate} />;
    case "voice":
      return <VoiceConfig data={node.data as VoiceNodeData} voices={voices} onUpdate={onUpdate} />;
    case "provider":
      return <ProviderConfig data={node.data as ProviderNodeData} onUpdate={onUpdate} />;
    case "captions":
      return <CaptionsConfig data={node.data as CaptionsNodeData} onUpdate={onUpdate} />;
    case "output":
      return <OutputConfig data={node.data as OutputNodeData} onUpdate={onUpdate} />;
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   Individual Node Configs
   ═══════════════════════════════════════════════════════════ */

function ProductConfig({ data, onUpdate }: { data: ProductNodeData; onUpdate: (d: Record<string, unknown>) => void }) {
  const [name, setName] = useState(data.name || "");
  const [desc, setDesc] = useState(data.description || "");
  const [url, setUrl] = useState(data.url || "");

  const save = () => onUpdate({ name, description: desc, url });

  return (
    <>
      <FieldLabel label="Product Name" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        placeholder="e.g. GlowSerum Pro"
        className="brutal-input w-full px-3 py-2 text-sm rounded-lg"
      />
      <FieldLabel label="Description" />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={save}
        placeholder="What does your product do? Who is it for?"
        rows={3}
        className="brutal-input w-full px-3 py-2 text-sm rounded-lg resize-none"
      />
      <FieldLabel label="Product URL (optional)" />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={save}
        placeholder="https://..."
        className="brutal-input w-full px-3 py-2 text-sm rounded-lg"
      />
    </>
  );
}

function AvatarConfig({
  data,
  avatars,
  onUpdate,
}: {
  data: AvatarNodeData;
  avatars: Avatar[];
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  return (
    <>
      <FieldLabel label="Select Avatar" />
      {avatars.length === 0 ? (
        <div className="brutal-empty p-4 text-center">
          <p className="text-xs text-white/40">No avatars yet. Create one in the Avatars page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {avatars.map((av) => (
            <button
              key={av.id}
              onClick={() => onUpdate({ avatarId: av.id, avatar: av })}
              className={`relative rounded-xl overflow-hidden border transition-all ${
                data.avatarId === av.id
                  ? "border-purple-500/50 ring-2 ring-purple-500/20"
                  : "border-white/8 hover:border-white/15"
              }`}
            >
              <div className="aspect-square bg-surface-inset">
                {av.image_url ? (
                  <img src={av.image_url} alt={av.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-lg font-bold">
                    {av.name[0]}
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5 text-[10px] font-medium text-white/60 truncate text-center">
                {av.name}
              </div>
              {data.avatarId === av.id && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ScriptConfig({
  data,
  scripts,
  onUpdate,
}: {
  data: ScriptNodeData;
  scripts: Script[];
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const [custom, setCustom] = useState(data.content || data.generatedContent || "");
  const [mode, setMode] = useState<"select" | "write">(data.scriptId ? "select" : "write");

  return (
    <>
      <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/6">
        <button
          onClick={() => setMode("select")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === "select" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
          }`}
        >
          Library
        </button>
        <button
          onClick={() => setMode("write")}
          className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === "write" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "select" ? (
        <>
          <FieldLabel label="Choose from your scripts" />
          {scripts.length === 0 ? (
            <div className="brutal-empty p-4 text-center">
              <p className="text-xs text-white/40">No scripts yet.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {scripts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onUpdate({ scriptId: s.id, script: s, content: s.content })}
                  className={`w-full text-left rounded-lg px-3 py-2 border transition-all ${
                    data.scriptId === s.id
                      ? "border-emerald-500/40 bg-emerald-500/8"
                      : "border-white/6 hover:border-white/12 bg-white/3"
                  }`}
                >
                  <div className="text-xs font-medium text-white/80 truncate">{s.name}</div>
                  <div className="text-[10px] text-white/35 truncate mt-0.5">{s.content}</div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <FieldLabel label="Write your script" />
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => onUpdate({ content: custom, scriptId: undefined, script: undefined })}
            placeholder="Write your script here or let CoPilot generate one..."
            rows={6}
            className="brutal-input w-full px-3 py-2 text-sm rounded-lg resize-none"
          />
          <p className="text-[10px] text-white/30">
            {custom.split(/\s+/).filter(Boolean).length} words
          </p>
        </>
      )}

      {data.generatedContent && (
        <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <p className="text-[10px] font-medium text-emerald-400/80 mb-1">CoPilot Generated</p>
          <p className="text-[11px] text-white/50 leading-relaxed">{data.generatedContent}</p>
        </div>
      )}
    </>
  );
}

function VoiceConfig({
  data,
  voices,
  onUpdate,
}: {
  data: VoiceNodeData;
  voices: Voice[];
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  return (
    <>
      <FieldLabel label="Select Voice" />
      {voices.length === 0 ? (
        <div className="brutal-empty p-4 text-center">
          <p className="text-xs text-white/40">No voices yet. Clone one in the Voices page.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {voices.map((v) => (
            <button
              key={v.id}
              onClick={() => onUpdate({ voiceId: v.id, voice: v })}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 border transition-all ${
                data.voiceId === v.id
                  ? "border-pink-500/40 bg-pink-500/8"
                  : "border-white/6 hover:border-white/12 bg-white/3"
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                style={{
                  background: data.voiceId === v.id ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.05)",
                  color: data.voiceId === v.id ? "#ec4899" : "rgba(255,255,255,0.3)",
                }}
              >
                {v.name[0]}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-medium text-white/80 truncate">{v.name}</div>
              </div>
              {data.voiceId === v.id && (
                <Check size={14} className="ml-auto text-pink-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ProviderConfig({
  data,
  onUpdate,
}: {
  data: ProviderNodeData;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const providers = Object.entries(VIDEO_PROVIDERS) as [VideoProvider, { label: string; tier: string; credits: number }][];

  return (
    <>
      <FieldLabel label="Video Generation Engine" />
      <div className="space-y-1.5">
        {providers.map(([key, info]) => (
          <button
            key={key}
            onClick={() => onUpdate({ provider: key })}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 border transition-all ${
              data.provider === key
                ? "border-accent-400/40 bg-accent-400/8"
                : "border-white/6 hover:border-white/12 bg-white/3"
            }`}
          >
            <div className="text-left">
              <div className="text-xs font-medium text-white/80">{info.label}</div>
              <div className="text-[10px] text-white/35">{info.tier}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-accent-400/70">{info.credits} cr</span>
              {data.provider === key && <Check size={14} className="text-accent-400" />}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function CaptionsConfig({
  data,
  onUpdate,
}: {
  data: CaptionsNodeData;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <FieldLabel label="Auto-Captions" />
        <button
          onClick={() => onUpdate({ enabled: !data.enabled })}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            data.enabled ? "bg-cyan-500" : "bg-white/10"
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              data.enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {data.enabled && (
        <p className="text-[11px] text-white/40">
          Captions will be auto-generated and synced to your video with TikTok-style animation.
        </p>
      )}
    </>
  );
}

function OutputConfig({
  data,
  onUpdate,
}: {
  data: OutputNodeData;
  onUpdate: (d: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(data.campaignName || "");

  return (
    <>
      <FieldLabel label="Campaign Name" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onUpdate({ campaignName: name })}
        placeholder="e.g. Summer Launch Campaign"
        className="brutal-input w-full px-3 py-2 text-sm rounded-lg"
      />
      {data.estimatedCredits !== undefined && (
        <div className="mt-2 p-3 rounded-lg bg-accent-400/5 border border-accent-400/15">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Estimated Cost</span>
            <span className="text-sm font-semibold text-accent-400">
              {data.estimatedCredits} credits
            </span>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Shared ─── */
function FieldLabel({ label }: { label: string }) {
  return <label className="text-[11px] font-medium text-white/50 uppercase tracking-wider">{label}</label>;
}
