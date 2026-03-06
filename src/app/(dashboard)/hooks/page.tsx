"use client";

import { useState, useEffect } from "react";
import {
  useCompletedJobs,
  useCompletedPremiumJobs,
  useCompletedMassJobs,
  useHookJobs,
} from "@/hooks/use-data";
import { hooks } from "@/lib/api";
import { HOOK_STYLES, type HookStyle } from "@/lib/prompts";
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
  Info,
  Sparkle,
  FilmStrip,
  Timer,
  CaretRight,
} from "@phosphor-icons/react";

type SourceVideo = {
  id: string;
  source_type: "job" | "premium_job" | "mass_job";
  name: string;
  video_url: string;
  created_at: string;
};

type ViewTab = "select" | "hooks";

export default function Hooks() {
  const { data: stdJobs, loading: l1 } = useCompletedJobs();
  const { data: premJobs, loading: l2 } = useCompletedPremiumJobs();
  const { data: massJobs, loading: l3 } = useCompletedMassJobs();
  const {
    data: hookJobs,
    loading: l4,
    refetch: refetchHooks,
  } = useHookJobs();

  const [selectedVideo, setSelectedVideo] = useState<SourceVideo | null>(null);
  const [hookStyle, setHookStyle] = useState<HookStyle>("auto");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("select");
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

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
        name: "Mass Job",
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
      setActiveTab("hooks");
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
  const failedHooks = (hookJobs || []).filter(
    (h: HookJobType) => h.status === "failed"
  );

  // Auto-poll while hooks are processing
  useEffect(() => {
    if (activeHooks.length === 0) return;
    const interval = setInterval(() => {
      refetchHooks();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeHooks.length, refetchHooks]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Lightning size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Hook Generation
              </h1>
              <p className="text-xs text-zinc-400">
                AI-powered scroll-stopping hooks for your videos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("select")}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                  activeTab === "select"
                    ? "bg-[#1e1e22] text-zinc-200 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-400"
                }`}
              >
                <VideoCamera size={12} weight={activeTab === "select" ? "fill" : "regular"} />
                Select Video
              </button>
              <button
                onClick={() => setActiveTab("hooks")}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                  activeTab === "hooks"
                    ? "bg-[#1e1e22] text-zinc-200 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-400"
                }`}
              >
                <FilmStrip size={12} weight={activeTab === "hooks" ? "fill" : "regular"} />
                My Hooks
                {completedHooks.length > 0 && (
                  <span className="text-[9px] bg-zinc-200 text-zinc-400 px-1.5 py-0.5 rounded-full">
                    {completedHooks.length}
                  </span>
                )}
              </button>
            </div>

            <span className="text-xs font-semibold text-zinc-400 border border-white/[0.08] px-3.5 py-1.5 rounded-full shadow-sm">
              15 credits / hook
            </span>
            <button
              onClick={() => refetchHooks()}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] shadow-sm hover:shadow-md hover:-translate-y-px text-zinc-400 transition-all"
            >
              <ArrowClockwise size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Active hook generations banner */}
        {activeHooks.length > 0 && (
          <div className="mb-6 bg-sky-500/10 border border-sky-200 rounded-lg p-4 flex items-center gap-3">
            <CircleNotch size={16} className="animate-spin text-sky-400" />
            <div>
              <span className="text-xs font-bold text-sky-800">
                {activeHooks.length} hook{activeHooks.length > 1 ? "s" : ""}{" "}
                generating...
              </span>
              <p className="text-[11px] text-sky-400 mt-0.5">
                AI is analyzing your video, generating a prompt, and creating a
                scroll-stopping hook. This takes 2-5 minutes.
              </p>
            </div>
          </div>
        )}

        {/* ═══ TAB: SELECT VIDEO ═══ */}
        {activeTab === "select" && (
          <div className="space-y-6">
            {/* How it works */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
              <h3 className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                <Sparkle size={12} weight="fill" className="text-amber-400" />
                How Hook Generation Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { step: "1", text: "Select a completed video below" },
                  { step: "2", text: "AI analyzes the video forensically" },
                  { step: "3", text: "GPT generates a scroll-stopping hook prompt" },
                  { step: "4", text: "VEO3 creates a 4-8 second hook video" },
                  { step: "5", text: "Hook is stitched onto your original video" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {step}
                    </span>
                    <p className="text-[11px] text-amber-800 leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hook Style Selection */}
            {selectedVideo && (
              <div className="bg-[#1e1e22] rounded-xl p-5 brutal-card">
                <h2 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                  <Sparkle size={14} weight="bold" className="text-violet-500" />
                  Hook Style
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {HOOK_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setHookStyle(style.value)}
                      className={`text-left px-3 py-2.5 rounded-lg transition-all ${
                        hookStyle === style.value
                          ? "bg-amber-500/10 border-2 border-amber-300 shadow-sm"
                          : "bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.1]"
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold ${
                          hookStyle === style.value
                            ? "text-amber-700"
                            : "text-zinc-400"
                        }`}
                      >
                        {style.label}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {style.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Video selector */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-zinc-100">
                  Select a Completed Video
                </h2>
                <span className="text-xs text-zinc-400 font-medium">
                  {sourceVideos.length} video
                  {sourceVideos.length !== 1 ? "s" : ""} available
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <CircleNotch size={20} className="animate-spin text-zinc-400" />
                </div>
              ) : sourceVideos.length === 0 ? (
                <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                    <VideoCamera
                      size={24}
                      weight="duotone"
                      className="text-zinc-300"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-400 mb-1">
                    No completed videos yet
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Create and run campaigns to generate videos first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sourceVideos.map((vid) => {
                    const isSelected =
                      selectedVideo?.id === vid.id &&
                      selectedVideo?.source_type === vid.source_type;
                    return (
                      <button
                        key={`${vid.source_type}-${vid.id}`}
                        onClick={() =>
                          setSelectedVideo(isSelected ? null : vid)
                        }
                        className={`bg-[#1e1e22] rounded-xl overflow-hidden brutal-card text-left transition-all ${
                          isSelected
                            ? "ring-2 ring-amber-400 border-amber-300"
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
                            <Play
                              size={20}
                              weight="fill"
                              className="text-white/80"
                            />
                          </div>
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/50 text-white">
                            {vid.source_type === "job"
                              ? "STD"
                              : vid.source_type === "premium_job"
                                ? "PRE"
                                : "MASS"}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-500/100 flex items-center justify-center">
                              <CheckCircle
                                size={12}
                                weight="fill"
                                className="text-white"
                              />
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2">
                          <p className="text-[11px] font-semibold text-zinc-300 truncate">
                            {vid.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {new Date(vid.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Generate button */}
            {selectedVideo && (
              <div className="sticky bottom-4 z-20">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 brutal-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                      <Play size={16} weight="fill" className="text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-300">
                        {selectedVideo.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Timer size={10} />
                        ~2-5 min generation time • 15 credits
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="btn-brutal flex items-center gap-2 text-xs font-bold text-white px-6 py-3 rounded-xl disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <CircleNotch size={14} className="animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Lightning size={14} weight="fill" />
                        Generate Hook
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: MY HOOKS ═══ */}
        {activeTab === "hooks" && (
          <div className="space-y-6">
            {/* Completed hooks */}
            {completedHooks.length > 0 ? (
              <div>
                <h2 className="text-sm font-bold text-zinc-100 mb-3">
                  Generated Hooks
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {completedHooks.map((hook: HookJobType) => (
                    <div
                      key={hook.id}
                      className="bg-[#1e1e22] rounded-xl overflow-hidden brutal-card group"
                    >
                      <div className="aspect-video bg-zinc-900 relative">
                        {previewVideo === hook.id ? (
                          <video
                            src={hook.hook_video_url!}
                            className="w-full h-full object-cover"
                            controls
                            autoPlay
                            playsInline
                          />
                        ) : (
                          <>
                            <video
                              src={hook.hook_video_url!}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                            <button
                              onClick={() => setPreviewVideo(hook.id)}
                              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <Play
                                  size={16}
                                  weight="fill"
                                  className="text-zinc-300 ml-0.5"
                                />
                              </div>
                            </button>
                          </>
                        )}
                        <a
                          href={hook.hook_video_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <DownloadSimple size={12} weight="bold" />
                        </a>
                      </div>
                      <div className="px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle
                            size={12}
                            weight="fill"
                            className="text-emerald-500"
                          />
                          <span className="text-[10px] font-semibold text-zinc-400">
                            Hook Ready
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(hook.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                  <Lightning
                    size={24}
                    weight="duotone"
                    className="text-zinc-300"
                  />
                </div>
                <h3 className="text-sm font-semibold text-zinc-400 mb-1">
                  No hooks generated yet
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Select a video and generate your first AI hook.
                </p>
                <button
                  onClick={() => setActiveTab("select")}
                  className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full mx-auto"
                >
                  <CaretRight size={14} weight="bold" />
                  Create Hook
                </button>
              </div>
            )}

            {/* Failed hooks */}
            {failedHooks.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-zinc-100 mb-3">
                  Failed Hooks
                </h2>
                <div className="space-y-2">
                  {failedHooks.map((hook: HookJobType) => (
                    <div
                      key={hook.id}
                      className="bg-[#1e1e22] rounded-lg p-3 brutal-card flex items-center gap-3"
                    >
                      <XCircle
                        size={16}
                        weight="fill"
                        className="text-rose-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-400">
                          Hook generation failed
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {hook.error_message || "Unknown error — credits have been refunded"}
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

            {/* AI Info Card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
              <h3 className="text-xs font-bold text-zinc-400 mb-2 flex items-center gap-1.5">
                <Info size={12} weight="fill" className="text-zinc-400" />
                About Hook AI Pipeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-zinc-400">
                <div>
                  <p className="font-semibold text-zinc-400 mb-1">Video Analysis</p>
                  <p>Gemini 2.5 Flash performs forensic analysis of your video — product, setting, dialogue, visual style, and key moments.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-400 mb-1">Prompt Generation</p>
                  <p>GPT generates a scroll-stopping hook prompt with quality scoring and up to 3 retry attempts for optimal results.</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-400 mb-1">Video Creation</p>
                  <p>VEO3 generates a 4-8 second hook video using environment-matched keyframes, then stitches it to your original.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
