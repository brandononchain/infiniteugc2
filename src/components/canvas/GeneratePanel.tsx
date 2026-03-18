"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import {
  VIDEO_PROVIDERS,
  NODE_METADATA,
  type ProviderNodeData,
  type ScriptNodeData,
  type AvatarNodeData,
  type OutputNodeData,
  type CaptionsNodeData,
} from "@/lib/canvas/types";
import { campaigns } from "@/lib/api";
import { X, Zap, Check, AlertTriangle, Loader2, Play, ChevronRight } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   GeneratePanel — Floating panel to review & launch generation
   ═══════════════════════════════════════════════════════════ */

export function GeneratePanel() {
  const { state, setActivePanel, isWorkflowReady, getNodeByType, dispatch } = useCanvas();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const ready = isWorkflowReady();

  const providerNode = getNodeByType("provider");
  const scriptNode = getNodeByType("script");
  const avatarNode = getNodeByType("avatar");
  const captionsNode = getNodeByType("captions");
  const outputNode = getNodeByType("output");

  const providerData = providerNode?.data as ProviderNodeData | undefined;
  const scriptData = scriptNode?.data as ScriptNodeData | undefined;
  const avatarData = avatarNode?.data as AvatarNodeData | undefined;
  const outputData = outputNode?.data as OutputNodeData | undefined;
  const captionsData = captionsNode?.data as CaptionsNodeData | undefined;

  const credits = providerData?.provider ? VIDEO_PROVIDERS[providerData.provider]?.credits || 1 : 1;

  // Status checklist
  const checks = [
    {
      label: "Avatar",
      ready: !!avatarData?.avatarId,
      value: avatarData?.avatar?.name || "Not selected",
      color: NODE_METADATA.avatar.color,
    },
    {
      label: "Script",
      ready: !!(scriptData?.content || scriptData?.generatedContent || scriptData?.scriptId),
      value: scriptData?.script?.name || (scriptData?.generatedContent ? "CoPilot generated" : scriptData?.content ? "Custom" : "Not set"),
      color: NODE_METADATA.script.color,
    },
    {
      label: "Provider",
      ready: !!providerData?.provider,
      value: providerData?.provider ? VIDEO_PROVIDERS[providerData.provider].label : "Not set",
      color: NODE_METADATA.provider.color,
    },
    {
      label: "Captions",
      ready: true,
      value: captionsData?.enabled ? "Enabled" : "Disabled",
      color: NODE_METADATA.captions.color,
    },
  ];

  const handleGenerate = async () => {
    if (!ready || generating) return;
    setGenerating(true);
    setResult(null);

    try {
      const campaign = await campaigns.create({
        campaign_name: outputData?.campaignName || "Canvas Campaign",
        avatar_id: avatarData?.avatarId,
        script_id: scriptData?.scriptId || undefined,
        video_provider: providerData?.provider,
        caption_enabled: captionsData?.enabled ?? true,
        text_overlays: outputData?.overlays || [],
      });

      const runResult = await campaigns.run(campaign.id);

      if (outputNode) {
        dispatch({ type: "UPDATE_NODE_STATUS", payload: { nodeId: outputNode.id, status: "processing" } });
      }

      setResult({
        success: true,
        message: `Queued #${runResult.queue_position} — ${runResult.cost} credits`,
      });
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Generation failed",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute top-3 right-3 w-[320px] z-40 flex flex-col rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl"
      style={{ background: "rgba(12, 12, 15, 0.88)", backdropFilter: "blur(40px) saturate(180%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-accent-400" />
          <h3 className="text-[13px] font-semibold text-white/90">Generate</h3>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* Checklist */}
      <div className="px-4 py-3 space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{
                background: check.ready ? `${check.color}15` : "rgba(255,255,255,0.03)",
              }}
            >
              {check.ready ? (
                <Check size={10} style={{ color: check.color }} />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] text-white/40">{check.label}</span>
            </div>
            <span className={`text-[11px] font-medium truncate max-w-[120px] ${check.ready ? "text-white/60" : "text-white/25"}`}>
              {check.value}
            </span>
          </div>
        ))}
      </div>

      {/* Cost */}
      <div className="mx-4 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/35">Estimated Cost</span>
          <span className="text-[13px] font-semibold text-accent-400">{credits} credits</span>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`mx-4 mt-2 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2 ${
          result.success ? "bg-emerald-500/8 text-emerald-400/80 border border-emerald-500/15" : "bg-red-500/8 text-red-400/80 border border-red-500/15"
        }`}>
          {result.success ? <Check size={12} /> : <AlertTriangle size={12} />}
          {result.message}
        </div>
      )}

      {/* Generate button */}
      <div className="p-4 pt-3">
        <button
          onClick={handleGenerate}
          disabled={!ready || generating}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all ${
            ready && !generating
              ? "btn-brutal-accent"
              : "bg-white/[0.04] text-white/20 border border-white/[0.06] cursor-not-allowed"
          }`}
        >
          {generating ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap size={15} />
              Generate Video
            </>
          )}
        </button>
        {!ready && (
          <p className="text-[10px] text-white/20 text-center mt-2">
            Select an avatar, script, and provider to generate
          </p>
        )}
      </div>
    </motion.div>
  );
}
