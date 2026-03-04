"use client";

import { useState, useEffect } from "react";
import { useImageJobs } from "@/hooks/use-data";
import { imageGeneration } from "@/lib/api";
import type { ImageModel, ImageGenerationJob } from "@/types";
import {
  ImageSquare,
  Plus,
  CaretDown,
  ArrowUp,
  Sparkle,
  Minus,
  CircleNotch,
  DownloadSimple,
  X,
} from "@phosphor-icons/react";

const SUGGESTIONS = [
  "Ethereal apiary with honey-gold aura, glowing honeycombs",
  "Minimalist living room at golden hour, soft shadows",
  "Abstract fluid art, deep blues and coral, 8K",
];

const IMAGE_MODELS: { value: ImageModel; label: string }[] = [
  { value: "nano_banana", label: "Nano Banana Pro" },
  { value: "seedream_4_5", label: "Seedream 4.5" },
];

const ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:3", "3:4"];
const RESOLUTIONS = ["1K", "2K", "4K"];

export default function ImageGeneration() {
  const { data: existingJobs, loading: loadingJobs, refetch } = useImageJobs();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("nano_banana");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("2K");
  const [count, setCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);
  const [polledJobs, setPolledJobs] = useState<ImageGenerationJob[]>([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showAspectDropdown, setShowAspectDropdown] = useState(false);
  const [showResDropdown, setShowResDropdown] = useState(false);

  // Poll pending jobs
  useEffect(() => {
    if (pendingJobIds.length === 0) return;
    const interval = setInterval(async () => {
      try {
        const results = await imageGeneration.poll(pendingJobIds);
        setPolledJobs(results);
        const stillPending = results.filter(
          (j) => j.status === "processing" || j.status === "queued"
        );
        if (stillPending.length === 0) {
          setPendingJobIds([]);
          refetch();
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pendingJobIds, refetch]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await imageGeneration.generate({
        prompt,
        model,
        aspectRatio,
        resolution,
        count,
      });
      if (response.jobs) {
        setPendingJobIds(response.jobs.map((j) => j.id));
      }
      setPrompt("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  // Combine polled + existing completed images
  const completedFromPolled = polledJobs.filter(
    (j) => j.status === "completed" && j.image_url
  );
  const completedFromExisting = (existingJobs || []).filter(
    (j) => j.status === "completed" && j.image_url
  );
  // Deduplicate by id
  const seenIds = new Set<string>();
  const allCompleted: ImageGenerationJob[] = [];
  for (const j of [...completedFromPolled, ...completedFromExisting]) {
    if (!seenIds.has(j.id)) {
      seenIds.add(j.id);
      allCompleted.push(j);
    }
  }

  const processingCount =
    pendingJobIds.length > 0
      ? polledJobs.filter(
          (j) => j.status === "processing" || j.status === "queued"
        ).length || pendingJobIds.length
      : 0;

  return (
    <div className="min-h-full flex flex-col">
      {error && (
        <div className="mx-6 mt-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 overflow-y-auto">
        {processingCount > 0 && (
          <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 flex items-center gap-2">
              <CircleNotch size={14} className="animate-spin text-sky-600" />
              <span className="text-xs font-semibold text-sky-700">
                Generating {processingCount} image
                {processingCount > 1 ? "s" : ""}...
              </span>
            </div>
          </div>
        )}

        {allCompleted.length > 0 ? (
          <div className="max-w-5xl mx-auto px-6 lg:px-10 py-6">
            <h2 className="text-sm font-bold text-zinc-950 mb-4">
              Generated Images
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allCompleted.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl overflow-hidden brutal-card group"
                >
                  <div className="aspect-square bg-zinc-50 relative">
                    <img
                      src={job.image_url!}
                      alt={job.prompt}
                      className="w-full h-full object-cover"
                    />
                    <a
                      href={job.image_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <DownloadSimple size={12} weight="bold" />
                    </a>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-zinc-500 truncate">
                      {job.prompt}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !loadingJobs ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
            <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200 shadow-sm flex items-center justify-center mx-auto mb-5">
              <ImageSquare
                size={24}
                weight="duotone"
                className="text-zinc-400"
              />
            </div>
            <h2 className="text-sm font-bold text-zinc-900 mb-1">
              Your generations will appear here
            </h2>
            <p className="text-xs text-zinc-500 mb-6">
              Use the prompt bar below to create your first image.
            </p>

            <div className="flex flex-col items-center gap-2 mb-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-xs text-zinc-600 brutal-pill px-4 py-2 rounded-full hover:border-accent-300 hover:text-accent-600 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <CircleNotch size={24} className="animate-spin text-zinc-400" />
          </div>
        )}
      </div>

      {/* Bottom prompt bar */}
      <div
        className="sticky bottom-0 brutal-header px-6 lg:px-10 py-4"
        style={{
          borderBottom: "none",
          borderTop: "1px solid #e4e4e7",
          boxShadow: "none",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 brutal-card focus-within:ring-2 focus-within:ring-accent-200 focus-within:border-accent-300 transition-all">
            <Plus size={16} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe the image you want to create..."
              className="flex-1 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent"
            />
          </div>

          {/* Options row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              {/* Model selector */}
              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
                >
                  <Sparkle
                    size={12}
                    weight="fill"
                    className="text-zinc-500"
                  />
                  {IMAGE_MODELS.find((m) => m.value === model)?.label}
                  <CaretDown size={10} className="text-zinc-500" />
                </button>
                {showModelDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    {IMAGE_MODELS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => {
                          setModel(m.value);
                          setShowModelDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 ${
                          model === m.value ? "bg-accent-50 font-semibold" : ""
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Aspect ratio */}
              <div className="relative">
                <button
                  onClick={() => setShowAspectDropdown(!showAspectDropdown)}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
                >
                  {aspectRatio}{" "}
                  <CaretDown size={10} className="text-zinc-500" />
                </button>
                {showAspectDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar}
                        onClick={() => {
                          setAspectRatio(ar);
                          setShowAspectDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 ${
                          aspectRatio === ar
                            ? "bg-accent-50 font-semibold"
                            : ""
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolution */}
              <div className="relative">
                <button
                  onClick={() => setShowResDropdown(!showResDropdown)}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
                >
                  {resolution}{" "}
                  <CaretDown size={10} className="text-zinc-500" />
                </button>
                {showResDropdown && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    {RESOLUTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setResolution(r);
                          setShowResDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 ${
                          resolution === r
                            ? "bg-accent-50 font-semibold"
                            : ""
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Count */}
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="px-2 py-1.5 text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  <Minus size={12} weight="bold" />
                </button>
                <span className="text-xs font-semibold text-zinc-700 min-w-4 text-center">
                  {count}
                </span>
                <button
                  onClick={() => setCount(Math.min(8, count + 1))}
                  className="px-2 py-1.5 text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  <Plus size={12} weight="bold" />
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full disabled:opacity-50"
            >
              {generating ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                "Generate"
              )}
              {!generating && <ArrowUp size={14} weight="bold" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
