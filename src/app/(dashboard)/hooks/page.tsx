"use client";

import { useState } from "react";
import {
  useCompletedJobs,
  useCompletedPremiumJobs,
  useCompletedMassJobs,
  useHookJobs,
} from "@/hooks/use-data";
import { hooks } from "@/lib/api";
import type { Job, PremiumJob, MassJob, HookJob as HookJobType } from "@/types";
import {
  ArrowClockwise,
  VideoCamera,
  Lightning,
  CircleNotch,
  CheckCircle,
  XCircle,
  Play,
  DownloadSimple,
  X,
} from "@phosphor-icons/react";

type SourceVideo = {
  id: string;
  source_type: "job" | "premium_job" | "mass_job";
  name: string;
  video_url: string;
  created_at: string;
};

export default function Hooks() {
  const { data: stdJobs, loading: l1 } = useCompletedJobs();
  const { data: premJobs, loading: l2 } = useCompletedPremiumJobs();
  const { data: massJobs, loading: l3 } = useCompletedMassJobs();
  const { data: hookJobs, loading: l4, refetch: refetchHooks } = useHookJobs();

  const [selectedVideo, setSelectedVideo] = useState<SourceVideo | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = l1 || l2 || l3 || l4;

  // Build flat list of all source videos
  const sourceVideos: SourceVideo[] = [
    ...(stdJobs || [])
      .filter((j: Job) => j.video_url)
      .map((j: Job) => ({
        id: j.id,
        source_type: "job" as const,
        name: j.campaign_name || "Standard Video",
        video_url: j.video_url!,
        created_at: j.created_at,
      })),
    ...(premJobs || [])
      .filter((j: PremiumJob) => j.final_video_url)
      .map((j: PremiumJob) => ({
        id: j.id,
        source_type: "premium_job" as const,
        name: j.campaign_name || "Premium Video",
        video_url: j.final_video_url!,
        created_at: j.created_at,
      })),
    ...(massJobs || [])
      .filter((j: MassJob) => j.video_url)
      .map((j: MassJob) => ({
        id: j.id,
        source_type: "mass_job" as const,
        name: `Mass Job`,
        video_url: j.video_url!,
        created_at: j.created_at,
      })),
  ];

  const handleGenerate = async () => {
    if (!selectedVideo) return;
    setGenerating(true);
    setError(null);
    try {
      await hooks.generate({
        source_type: selectedVideo.source_type,
        source_id: selectedVideo.id,
      });
      refetchHooks();
      setSelectedVideo(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate hook");
    } finally {
      setGenerating(false);
    }
  };

  const completedHooks = (hookJobs || []).filter(
    (h: HookJobType) => h.status === "completed" && h.hook_video_url
  );
  const activeHooks = (hookJobs || []).filter(
    (h: HookJobType) => h.status === "processing" || h.status === "queued"
  );

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 brutal-header">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">
              Hooks Generation
            </h1>
            <p className="text-xs text-zinc-500">
              Select a completed video and generate an AI-powered hook
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-600 border border-zinc-200 px-3.5 py-1.5 rounded-full shadow-sm">
              15 credits per hook
            </span>
            <button
              onClick={() => refetchHooks()}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 shadow-sm hover:shadow-md hover:-translate-y-px text-zinc-500 transition-all"
            >
              <ArrowClockwise size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Active hook generations */}
        {activeHooks.length > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 flex items-center gap-2">
            <CircleNotch size={14} className="animate-spin text-sky-600" />
            <span className="text-xs font-semibold text-sky-700">
              {activeHooks.length} hook{activeHooks.length > 1 ? "s" : ""}{" "}
              generating...
            </span>
          </div>
        )}

        {/* Select Video */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-950">Select a Video</h2>
            <span className="text-xs text-zinc-500 font-medium">
              {sourceVideos.length} video{sourceVideos.length !== 1 ? "s" : ""}{" "}
              available
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <CircleNotch size={20} className="animate-spin text-zinc-400" />
            </div>
          ) : sourceVideos.length === 0 ? (
            <div className="bg-white rounded-xl p-16 text-center brutal-empty">
              <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
                <VideoCamera
                  size={24}
                  weight="duotone"
                  className="text-zinc-300"
                />
              </div>
              <h3 className="text-sm font-semibold text-zinc-500 mb-1">
                No completed videos yet
              </h3>
              <p className="text-xs text-zinc-500">
                Create and run campaigns to generate videos first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sourceVideos.map((vid) => (
                <button
                  key={`${vid.source_type}-${vid.id}`}
                  onClick={() => setSelectedVideo(vid)}
                  className={`bg-white rounded-xl overflow-hidden brutal-card text-left transition-all ${
                    selectedVideo?.id === vid.id &&
                    selectedVideo?.source_type === vid.source_type
                      ? "ring-2 ring-sky-400 border-sky-300"
                      : "hover:shadow-md hover:-translate-y-px"
                  }`}
                >
                  <div className="aspect-video bg-zinc-900 relative">
                    <video
                      src={vid.video_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play size={20} weight="fill" className="text-white/80" />
                    </div>
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/50 text-white">
                      {vid.source_type === "job"
                        ? "STD"
                        : vid.source_type === "premium_job"
                          ? "PRE"
                          : "MASS"}
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[11px] font-semibold text-zinc-800 truncate">
                      {vid.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(vid.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generate button */}
        {selectedVideo && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full disabled:opacity-50"
            >
              {generating ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                <Lightning size={14} weight="fill" />
              )}
              {generating ? "Generating..." : "Generate Hook"}
            </button>
            <span className="text-xs text-zinc-500">
              for &ldquo;{selectedVideo.name}&rdquo;
            </span>
          </div>
        )}

        {/* Generated Hooks */}
        {completedHooks.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-zinc-950 mb-3">
              Generated Hooks
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {completedHooks.map((hook: HookJobType) => (
                <div
                  key={hook.id}
                  className="bg-white rounded-xl overflow-hidden brutal-card group"
                >
                  <div className="aspect-video bg-zinc-900 relative">
                    <video
                      src={hook.hook_video_url!}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                    <a
                      href={hook.hook_video_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-md bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <DownloadSimple size={10} weight="bold" />
                    </a>
                  </div>
                  <div className="px-3 py-2 flex items-center gap-1.5">
                    <CheckCircle
                      size={12}
                      weight="fill"
                      className="text-emerald-500"
                    />
                    <span className="text-[10px] text-zinc-500">
                      {new Date(hook.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed hooks */}
        {(hookJobs || []).filter((h: HookJobType) => h.status === "failed")
          .length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-zinc-950 mb-3">
              Failed Hooks
            </h2>
            <div className="space-y-2">
              {(hookJobs || [])
                .filter((h: HookJobType) => h.status === "failed")
                .map((hook: HookJobType) => (
                  <div
                    key={hook.id}
                    className="bg-white rounded-lg p-3 brutal-card flex items-center gap-3"
                  >
                    <XCircle
                      size={16}
                      weight="fill"
                      className="text-rose-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-700">
                        Hook generation failed
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {hook.error_message || "Unknown error"}
                      </p>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(hook.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
