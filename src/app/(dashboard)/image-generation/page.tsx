"use client";

import { useState, useEffect, useRef } from "react";
import { useImageJobs } from "@/hooks/use-data";
import { imageGeneration } from "@/lib/api";
import {
  IMAGE_PROMPT_TEMPLATES,
  IMAGE_CATEGORIES,
  IMAGE_STYLES,
  enhanceImagePrompt,
  type ImageCategory,
  type ImageStyle,
} from "@/lib/prompts";
import type { ImageModel, ImageGenerationJob } from "@/types";
import {
  ImageSquare,
  Plus,
  ArrowUp,
  Sparkle,
  Minus,
  CircleNotch,
  DownloadSimple,
  X,
  MagicWand,
  Sliders,
  Lightning,
  BookOpen,
  CaretRight,
  Check,
  Eye,
} from "@phosphor-icons/react";

const IMAGE_MODELS: { value: ImageModel; label: string; description: string }[] = [
  { value: "nano_banana", label: "Nano Banana Pro", description: "Gemini-powered, best for creative & artistic" },
  { value: "seedream_4_5", label: "Seedream 4.5", description: "Best for photorealistic & product shots" },
];

const ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:3", "3:4"];
const RESOLUTIONS = ["1K", "2K", "4K"];

type Tab = "generate" | "templates" | "gallery";

export default function ImageGeneration() {
  const { data: existingJobs, loading: loadingJobs, refetch } = useImageJobs();

  // Core state
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("nano_banana");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("2K");
  const [count, setCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Style enhancement
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>("photorealistic");
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [enhanceDetail, setEnhanceDetail] = useState(false);
  const [enhanceComposition, setEnhanceComposition] = useState(false);
  const [showEnhancePreview, setShowEnhancePreview] = useState(false);

  // Template browser
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [selectedCategory, setSelectedCategory] = useState<ImageCategory | "all">("all");

  // Polling
  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);
  const [polledJobs, setPolledJobs] = useState<ImageGenerationJob[]>([]);

  // Dropdown management
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // no-op, kept for future dropdown usage
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pendingJobIds, refetch]);

  // Get the enhanced prompt preview
  const getEnhancedPrompt = () => {
    if (!prompt.trim()) return "";
    if (!enhanceEnabled) return prompt.trim();
    return enhanceImagePrompt(prompt, selectedStyle, {
      enhanceDetail,
      enhanceComposition,
    }).prompt;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const finalPrompt = enhanceEnabled
        ? enhanceImagePrompt(prompt, selectedStyle, {
            enhanceDetail,
            enhanceComposition,
          }).prompt
        : prompt.trim();

      const response = await imageGeneration.generate({
        prompt: finalPrompt,
        model,
        aspectRatio,
        resolution,
        count,
      });
      if (response.jobs) {
        setPendingJobIds(response.jobs.map((j) => j.id));
      }
      setPrompt("");
      setActiveTab("gallery");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const handleTemplateSelect = (templatePrompt: string) => {
    setPrompt(templatePrompt);
    setActiveTab("generate");
  };

  // Gallery data
  const completedFromPolled = polledJobs.filter(
    (j) => j.status === "completed" && j.image_url
  );
  const completedFromExisting = (existingJobs || []).filter(
    (j) => j.status === "completed" && j.image_url
  );
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

  // Filter templates
  const filteredTemplates =
    selectedCategory === "all"
      ? IMAGE_PROMPT_TEMPLATES
      : IMAGE_PROMPT_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center">
              <ImageSquare size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Image Generation
              </h1>
              <p className="text-xs text-zinc-400">
                AI-powered visuals with smart prompt enhancement
              </p>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
            {(
              [
                { key: "generate" as Tab, label: "Create", icon: Sparkle },
                { key: "templates" as Tab, label: "Templates", icon: BookOpen },
                { key: "gallery" as Tab, label: "Gallery", icon: ImageSquare },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                  activeTab === key
                    ? "bg-[#1e1e22] text-zinc-200 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-400"
                }`}
              >
                <Icon size={12} weight={activeTab === key ? "fill" : "regular"} />
                {label}
                {key === "gallery" && allCompleted.length > 0 && (
                  <span className="text-[9px] bg-zinc-200 text-zinc-400 px-1.5 py-0.5 rounded-full">
                    {allCompleted.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 bg-rose-500/10 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Processing banner */}
      {processingCount > 0 && (
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-4">
          <div className="bg-sky-500/10 border border-sky-200 rounded-lg p-3 flex items-center gap-2">
            <CircleNotch size={14} className="animate-spin text-sky-400" />
            <span className="text-xs font-semibold text-sky-700">
              Generating {processingCount} image
              {processingCount > 1 ? "s" : ""}... This may take 30-60 seconds.
            </span>
          </div>
        </div>
      )}

      {/* ═══ TAB: CREATE ═══ */}
      {activeTab === "generate" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Prompt + Enhancement */}
              <div className="lg:col-span-2 space-y-5">
                {/* Prompt input */}
                <div className="bg-[#1e1e22] rounded-xl p-5 brutal-card">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-zinc-100">Prompt</h2>
                    <button
                      onClick={() => setEnhanceEnabled(!enhanceEnabled)}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        enhanceEnabled
                          ? "bg-violet-500/10 text-violet-700 border border-violet-200"
                          : "bg-white/[0.03] text-zinc-400 border border-white/[0.08]"
                      }`}
                    >
                      <MagicWand
                        size={12}
                        weight={enhanceEnabled ? "fill" : "regular"}
                      />
                      Smart Enhance {enhanceEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    rows={4}
                    placeholder="Describe your image... e.g., A premium skincare bottle on a marble surface with morning light"
                    className="w-full brutal-input bg-[#1e1e22] px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-400 resize-none transition-all"
                  />

                  {/* Quick suggestions */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      "UGC product flatlay on linen surface, golden hour",
                      "Skincare routine morning scene, bathroom shelf",
                      "Craft cocktail with dramatic bar lighting",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPrompt(s)}
                        className="text-[10px] text-zinc-400 bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 rounded-full hover:border-violet-300 hover:text-violet-400 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style Selection */}
                {enhanceEnabled && (
                  <div className="bg-[#1e1e22] rounded-xl p-5 brutal-card">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        <Sliders size={14} weight="bold" className="text-violet-500" />
                        Style & Enhancement
                      </h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEnhanceDetail(!enhanceDetail)}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                            enhanceDetail
                              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-200"
                              : "bg-white/[0.03] text-zinc-400 border border-white/[0.08]"
                          }`}
                        >
                          +Detail
                        </button>
                        <button
                          onClick={() => setEnhanceComposition(!enhanceComposition)}
                          className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                            enhanceComposition
                              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-200"
                              : "bg-white/[0.03] text-zinc-400 border border-white/[0.08]"
                          }`}
                        >
                          +Composition
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {IMAGE_STYLES.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setSelectedStyle(style.value)}
                          className={`text-left px-3 py-2.5 rounded-lg transition-all ${
                            selectedStyle === style.value
                              ? "bg-violet-500/10 border-2 border-violet-300 shadow-sm"
                              : "bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.1]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {selectedStyle === style.value && (
                              <Check
                                size={10}
                                weight="bold"
                                className="text-violet-400"
                              />
                            )}
                            <span
                              className={`text-xs font-semibold ${
                                selectedStyle === style.value
                                  ? "text-violet-700"
                                  : "text-zinc-400"
                              }`}
                            >
                              {style.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Enhanced prompt preview */}
                    {prompt.trim() && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowEnhancePreview(!showEnhancePreview)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-400 mb-2"
                        >
                          <Eye size={12} />
                          {showEnhancePreview ? "Hide" : "Preview"} enhanced prompt
                          <CaretRight
                            size={10}
                            className={`transition-transform ${showEnhancePreview ? "rotate-90" : ""}`}
                          />
                        </button>
                        {showEnhancePreview && (
                          <div className="bg-violet-500/10/50 border border-violet-200 rounded-lg p-3">
                            <p className="text-[11px] text-violet-800 leading-relaxed font-mono">
                              {getEnhancedPrompt()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Generate button (large) */}
                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  className="w-full btn-brutal flex items-center justify-center gap-2.5 text-sm font-bold text-white px-6 py-4 rounded-xl disabled:opacity-50 transition-all"
                >
                  {generating ? (
                    <>
                      <CircleNotch size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Lightning size={16} weight="fill" />
                      Generate {count} Image{count > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>

              {/* Right: Settings panel */}
              <div className="space-y-5" ref={dropdownRef}>
                <div className="bg-[#1e1e22] rounded-xl p-5 brutal-card">
                  <h2 className="text-sm font-bold text-zinc-100 mb-4">
                    Settings
                  </h2>

                  {/* Model */}
                  <div className="mb-4">
                    <label className="text-[11px] font-semibold text-zinc-400 mb-2 block">
                      AI Model
                    </label>
                    <div className="space-y-2">
                      {IMAGE_MODELS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setModel(m.value)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                            model === m.value
                              ? "bg-zinc-900 text-white"
                              : "bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.1] text-zinc-400"
                          }`}
                        >
                          <div className="text-xs font-semibold">{m.label}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              model === m.value ? "text-zinc-400" : "text-zinc-400"
                            }`}
                          >
                            {m.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Aspect Ratio */}
                  <div className="mb-4">
                    <label className="text-[11px] font-semibold text-zinc-400 mb-2 block">
                      Aspect Ratio
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ASPECT_RATIOS.map((ar) => (
                        <button
                          key={ar}
                          onClick={() => setAspectRatio(ar)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            aspectRatio === ar
                              ? "bg-zinc-900 text-white"
                              : "bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:border-white/[0.1]"
                          }`}
                        >
                          {ar}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution */}
                  <div className="mb-4">
                    <label className="text-[11px] font-semibold text-zinc-400 mb-2 block">
                      Resolution
                    </label>
                    <div className="flex gap-1.5">
                      {RESOLUTIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setResolution(r)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            resolution === r
                              ? "bg-zinc-900 text-white"
                              : "bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:border-white/[0.1]"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Count */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-2 block">
                      Number of Images
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCount(Math.max(1, count - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] transition-colors"
                      >
                        <Minus size={12} weight="bold" />
                      </button>
                      <span className="text-sm font-bold text-zinc-200 min-w-6 text-center">
                        {count}
                      </span>
                      <button
                        onClick={() => setCount(Math.min(8, count + 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:bg-white/[0.05] transition-colors"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Keyboard shortcut hint */}
                <div className="text-center">
                  <p className="text-[10px] text-zinc-400">
                    Press <kbd className="px-1 py-0.5 bg-white/[0.05] border border-white/[0.08] rounded text-[9px] font-mono">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-white/[0.05] border border-white/[0.08] rounded text-[9px] font-mono">Enter</kbd> to generate
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: TEMPLATES ═══ */}
      {activeTab === "templates" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 py-6">
            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  selectedCategory === "all"
                    ? "bg-zinc-900 text-white"
                    : "bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:border-white/[0.1]"
                }`}
              >
                All ({IMAGE_PROMPT_TEMPLATES.length})
              </button>
              {IMAGE_CATEGORIES.map((cat) => {
                const catCount = IMAGE_PROMPT_TEMPLATES.filter(
                  (t) => t.category === cat.value
                ).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      selectedCategory === cat.value
                        ? "bg-zinc-900 text-white"
                        : "bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:border-white/[0.1]"
                    }`}
                  >
                    {cat.icon} {cat.label} ({catCount})
                  </button>
                );
              })}
            </div>

            {/* Template grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.basePrompt)}
                  className="bg-[#1e1e22] rounded-xl p-4 brutal-card text-left hover:shadow-md hover:-translate-y-px transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-zinc-200">
                      {template.name}
                    </h3>
                    <ArrowUp
                      size={12}
                      weight="bold"
                      className="text-zinc-300 group-hover:text-violet-500 rotate-45 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 bg-white/[0.03] border border-white/[0.08] px-2 py-0.5 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                    {template.basePrompt.slice(0, 120)}...
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: GALLERY ═══ */}
      {activeTab === "gallery" && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 py-6">
            {allCompleted.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-zinc-100">
                    Generated Images
                  </h2>
                  <span className="text-xs text-zinc-400 font-medium">
                    {allCompleted.length} image{allCompleted.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allCompleted.map((job) => (
                    <div
                      key={job.id}
                      className="bg-[#1e1e22] rounded-xl overflow-hidden brutal-card group"
                    >
                      <div className="aspect-square bg-white/[0.03] relative">
                        <img
                          src={job.image_url!}
                          alt={job.prompt}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setPrompt(job.prompt);
                              setActiveTab("generate");
                            }}
                            className="w-7 h-7 rounded-lg bg-white/90 text-zinc-400 flex items-center justify-center shadow-sm hover:bg-[#1e1e22]"
                            title="Reuse prompt"
                          >
                            <Sparkle size={12} weight="fill" />
                          </button>
                          <a
                            href={job.image_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg bg-white/90 text-zinc-400 flex items-center justify-center shadow-sm hover:bg-[#1e1e22]"
                            title="Download"
                          >
                            <DownloadSimple size={12} weight="bold" />
                          </a>
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-[10px] text-zinc-400 truncate">
                          {job.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : loadingJobs ? (
              <div className="flex items-center justify-center py-16">
                <CircleNotch size={24} className="animate-spin text-zinc-400" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-sm flex items-center justify-center mx-auto mb-5">
                  <ImageSquare
                    size={24}
                    weight="duotone"
                    className="text-zinc-400"
                  />
                </div>
                <h2 className="text-sm font-bold text-zinc-200 mb-1">
                  No images yet
                </h2>
                <p className="text-xs text-zinc-400 mb-4">
                  Generate your first image using the Create tab or a template.
                </p>
                <button
                  onClick={() => setActiveTab("generate")}
                  className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full"
                >
                  <Plus size={14} weight="bold" />
                  Create Image
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
