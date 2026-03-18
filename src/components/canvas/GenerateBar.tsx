"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import {
  VIDEO_PROVIDERS,
  type ProviderNodeData,
  type ScriptNodeData,
  type AvatarNodeData,
  type OutputNodeData,
} from "@/lib/canvas/types";
import { campaigns } from "@/lib/api";
import { Play, Loader2, Check, AlertTriangle, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   GenerateBar — Bottom action bar for triggering generation
   ═══════════════════════════════════════════════════════════ */

export function GenerateBar({ onJobCreated }: { onJobCreated?: (jobId: string) => void }) {
  const { state, isWorkflowReady, getNodeByType, dispatch } = useCanvas();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const ready = isWorkflowReady();

  // Gather workflow data
  const providerNode = getNodeByType("provider");
  const scriptNode = getNodeByType("script");
  const avatarNode = getNodeByType("avatar");
  const captionsNode = getNodeByType("captions");
  const outputNode = getNodeByType("output");

  const providerData = providerNode?.data as ProviderNodeData | undefined;
  const scriptData = scriptNode?.data as ScriptNodeData | undefined;
  const avatarData = avatarNode?.data as AvatarNodeData | undefined;
  const outputData = outputNode?.data as OutputNodeData | undefined;

  const credits = providerData?.provider
    ? VIDEO_PROVIDERS[providerData.provider]?.credits || 1
    : 1;

  // What's missing
  const missing: string[] = [];
  if (!avatarData?.avatarId) missing.push("Avatar");
  if (!scriptData?.content && !scriptData?.generatedContent && !scriptData?.scriptId) missing.push("Script");
  if (!providerData?.provider) missing.push("Provider");

  const handleGenerate = async () => {
    if (!ready || generating) return;

    setGenerating(true);
    setResult(null);

    try {
      // Create campaign via API
      const campaign = await campaigns.create({
        campaign_name: outputData?.campaignName || "Canvas Campaign",
        avatar_id: avatarData?.avatarId,
        script_id: scriptData?.scriptId || undefined,
        video_provider: providerData?.provider,
        caption_enabled: (captionsNode?.data as { enabled?: boolean })?.enabled ?? true,
        text_overlays: outputData?.overlays || [],
      });

      // Run it
      const runResult = await campaigns.run(campaign.id);

      // Update output node status
      if (outputNode) {
        dispatch({
          type: "UPDATE_NODE_STATUS",
          payload: { nodeId: outputNode.id, status: "processing" },
        });
      }

      setResult({
        success: true,
        message: `Video queued! Position #${runResult.queue_position}. Cost: ${runResult.cost} credits.`,
      });

      onJobCreated?.(runResult.job_id);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to generate. Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="shrink-0 px-4 py-3 border-t border-white/6">
      <div className="flex items-center gap-3">
        {/* Status */}
        <div className="flex-1 min-w-0">
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 text-xs ${
                result.success ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {result.success ? <Check size={13} /> : <AlertTriangle size={13} />}
              <span className="truncate">{result.message}</span>
            </motion.div>
          ) : !ready ? (
            <div className="flex items-center gap-2 text-xs text-white/30">
              <AlertTriangle size={12} />
              <span>Missing: {missing.join(", ")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-400/70">
              <Check size={12} />
              <span>Workflow ready</span>
              <span className="text-white/20">&#8226;</span>
              <span className="text-accent-400/70 font-mono">{credits} credits</span>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!ready || generating}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${
              ready && !generating
                ? "btn-brutal-accent"
                : "bg-white/5 text-white/20 border border-white/6 cursor-not-allowed"
            }
          `}
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
      </div>
    </div>
  );
}
