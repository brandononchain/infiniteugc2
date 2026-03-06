"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useVoices } from "@/hooks/use-data";
import { premiumJobs, supabaseQueries } from "@/lib/api";
import type { PremiumVideoProvider } from "@/types";
import {
  Sparkle,
  Upload,
  Coin,
  Play,
  CircleNotch,
  Info,
  X,
  CaretDown,
  Microphone,
  Image,
} from "@phosphor-icons/react";

const VIDEO_MODELS: { value: PremiumVideoProvider; name: string; desc: string; costPerChunk: number }[] = [
  { value: "veo3", name: "VEO3", desc: "Google AI. 50 cr/chunk.", costPerChunk: 50 },
  { value: "sora2pro", name: "Sora 2 Pro", desc: "Premium gen. 75 cr/chunk.", costPerChunk: 75 },
  { value: "omnihuman", name: "OmniHuman 1.5", desc: "Digital human. 40 cr/chunk.", costPerChunk: 40 },
];

export default function CreatePremium() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: voices } = useVoices();

  const [name, setName] = useState("");
  const [selectedModel, setSelectedModel] = useState<PremiumVideoProvider>("veo3");
  const [script, setScript] = useState("");
  const [instructions, setInstructions] = useState("");
  const [keyframeFile, setKeyframeFile] = useState<File | null>(null);
  const [keyframePreview, setKeyframePreview] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{ chunks: number; credits: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const credits = profile?.credits ?? 0;
  const isOmniHuman = selectedModel === "omnihuman";

  const handleKeyframeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKeyframeFile(file);
    setKeyframePreview(URL.createObjectURL(file));
  };

  const handleEstimate = async () => {
    if (!script.trim()) return;
    setEstimating(true);
    setError(null);
    try {
      const est = await premiumJobs.estimate(script, selectedModel);
      setEstimate(est);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to estimate");
    } finally {
      setEstimating(false);
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      let keyframeUrl: string | undefined;
      if (keyframeFile) {
        const path = `keyframes/${Date.now()}-${keyframeFile.name}`;
        const url = await supabaseQueries.uploadFile("keyframes", path, keyframeFile);
        if (url) keyframeUrl = url;
      }

      const job = await premiumJobs.create({
        script_content: script,
        keyframe_image_url: keyframeUrl,
        campaign_name: name || undefined,
        instructions: instructions || undefined,
        video_provider: selectedModel,
        voice_id: isOmniHuman && selectedVoiceId ? selectedVoiceId : undefined,
      });

      await premiumJobs.generate(job.id);
      router.push("/running");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full p-4 lg:p-6">
      {/* ═══ Mac-style window card ═══ */}
      <div className="w-full max-w-[1120px] rounded-2xl border border-white/[0.08] bg-[#1e1e22] shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[calc(100dvh-100px)]">

        {/* ── Window title bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#1e1e22] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                <Sparkle size={12} weight="fill" className="text-white" />
              </div>
              <span className="text-xs font-bold text-zinc-200 tracking-tight">Create Premium</span>
              <span className="text-[10px] text-zinc-500 hidden sm:inline">— VEO3, Sora 2 Pro & OmniHuman</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#00BCFF]/10 border border-[#00BCFF]/20 text-[#00BCFF] text-[10px] font-semibold px-2.5 py-1 rounded-full">
              <Coin size={11} weight="fill" />
              <span className="font-bold">{credits}</span> credits
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            <Info size={13} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300"><X size={11} /></button>
          </div>
        )}

        {/* ── Body: Preview | Steps ── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

          {/* ─── Left: preview sandbox ─── */}
          <div className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 border-r border-white/[0.06]">
            {/* Preview header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Preview</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Preview canvas — full bleed */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/20 relative overflow-hidden">
              {keyframePreview ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={keyframePreview}
                    alt="Keyframe"
                    className="max-w-full max-h-full rounded-xl object-contain border border-white/[0.08] shadow-lg"
                  />
                  <button
                    onClick={() => { setKeyframeFile(null); setKeyframePreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors backdrop-blur-sm border border-white/[0.08]"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Image size={24} className="text-zinc-600" />
                  </div>
                  <p className="text-[9px] text-zinc-500 text-center leading-relaxed px-2">
                    Upload a keyframe to preview...
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-semibold text-[#00BCFF] hover:text-[#00BCFF]/80 transition-colors"
                  >
                    Upload image
                  </button>
                </div>
              )}

              {/* Model badge */}
              <div className="absolute top-3 left-3">
                <span className="text-[9px] bg-black/50 text-white/80 px-3 py-1 rounded-full font-medium backdrop-blur-sm border border-white/[0.06]">
                  {VIDEO_MODELS.find((m) => m.value === selectedModel)?.name}
                </span>
              </div>

              {/* Script preview */}
              {script && (
                <div className="absolute bottom-4 inset-x-4">
                  <div className="bg-white/[0.06] backdrop-blur-sm rounded-lg px-3 py-2 border border-white/[0.04]">
                    <p className="text-[9px] text-zinc-400 font-medium line-clamp-3">{script.slice(0, 200)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Cost bar */}
            <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coin size={12} weight="duotone" className="text-amber-400" />
                <span className="text-[10px] font-semibold text-zinc-400">Estimated Cost</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#00BCFF]">
                {estimate ? `~${estimate.credits} cr (${estimate.chunks} chunks)` : "—"}
              </span>
            </div>
          </div>

          {/* ─── Right: Form steps (scrollable) ─── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-5 lg:px-8 py-5 space-y-5">

              {/* Step 1: Project Details */}
              <section className="space-y-3">
                <StepHeader n={1} title="Project Details" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Campaign name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Product Launch, Tutorial Part 1"
                      className="w-full brutal-input px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Video model</label>
                    <div className="grid grid-cols-3 gap-2">
                      {VIDEO_MODELS.map((model) => (
                        <button
                          key={model.value}
                          onClick={() => { setSelectedModel(model.value); setEstimate(null); }}
                          className={`text-left rounded-lg p-2 transition-all border ${
                            selectedModel === model.value
                              ? "border-[#00BCFF]/50 bg-[#00BCFF]/10 ring-1 ring-[#00BCFF]/20"
                              : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-zinc-200">{model.name}</span>
                          <p className="text-[9px] text-zinc-500 mt-0.5 leading-snug">{model.costPerChunk} cr/chunk</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <hr className="border-white/[0.06]" />

              {/* Step 2: Keyframe & Visual */}
              <section className="space-y-3">
                <StepHeader n={2} title="Keyframe & Visual" />
                {/* Keyframe upload */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Starting keyframe image</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleKeyframeUpload} className="hidden" />
                  {keyframePreview ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/[0.08]">
                      <img src={keyframePreview} alt="Keyframe" className="w-full h-full object-cover" />
                      <button
                        onClick={() => { setKeyframeFile(null); setKeyframePreview(null); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 flex flex-col items-center justify-center gap-1.5 hover:border-[#00BCFF]/30 hover:bg-[#00BCFF]/[0.04] transition-all cursor-pointer"
                    >
                      <Upload size={20} className="text-zinc-500" />
                      <p className="text-[11px] font-semibold text-[#00BCFF]">Upload keyframe image</p>
                      <p className="text-[10px] text-zinc-500">PNG, JPG, WebP (max 10MB)</p>
                    </button>
                  )}
                </div>

                {/* Visual instructions */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 block">Visual instructions</label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={`"warm golden lighting, cozy bedroom, handheld iPhone feel"`}
                    className="w-full brutal-input px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 font-mono transition-all resize-none"
                  />
                  <p className="text-[10px] text-zinc-500">Optional. Plain text or JSON. Applied to all chunks.</p>
                </div>
              </section>

              <hr className="border-white/[0.06]" />

              {/* Step 3: Script & Voice */}
              <section className="space-y-3">
                <StepHeader n={3} title="Script & Voice" />

                {/* Script Content */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 block">Script content</label>
                  <textarea
                    rows={5}
                    value={script}
                    onChange={(e) => { setScript(e.target.value); setEstimate(null); }}
                    placeholder="Enter your video script here..."
                    className="w-full brutal-input px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 transition-all resize-none"
                  />
                </div>

                {/* Voice Selection (OmniHuman only) */}
                {isOmniHuman && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Microphone size={13} className="text-zinc-400" />
                      <label className="text-[11px] font-semibold text-zinc-400">Voice (required for OmniHuman)</label>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                        className="w-full flex items-center justify-between brutal-select px-3 py-2 text-sm text-zinc-400"
                      >
                        <span>{voices?.find((v) => v.id === selectedVoiceId)?.name || "Select a voice"}</span>
                        <CaretDown size={14} className="text-zinc-500" />
                      </button>
                      {showVoiceDropdown && voices && voices.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#252529] border border-white/[0.08] rounded-lg shadow-xl shadow-black/40 z-20 overflow-hidden max-h-40 overflow-y-auto">
                          {voices.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => { setSelectedVoiceId(v.id); setShowVoiceDropdown(false); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.05] transition-colors ${selectedVoiceId === v.id ? "bg-[#00BCFF]/10 text-[#00BCFF] font-semibold" : "text-zinc-400"}`}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Estimate result */}
                {estimate && (
                  <div className="bg-[#00BCFF]/10 border border-[#00BCFF]/20 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#00BCFF]">Estimated: {estimate.chunks} chunks</p>
                      <p className="text-[10px] text-[#00BCFF]/80">{estimate.credits} credits total</p>
                    </div>
                    {estimate.credits > credits && (
                      <span className="text-[10px] font-semibold text-rose-400">Insufficient credits</span>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* ── Bottom bar: Generate ── */}
        <div className="shrink-0 border-t border-white/[0.06] px-5 py-3 flex items-center justify-between bg-[#1a1a1e]">
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-zinc-500">
            {name && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {name}</span>}
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#00BCFF]" /> {VIDEO_MODELS.find((m) => m.value === selectedModel)?.name}</span>
            {keyframeFile && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Keyframe</span>}
            {!script.trim() && <span className="text-zinc-500">Enter a script to continue</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEstimate}
              disabled={estimating || !script.trim()}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 border border-white/[0.08] px-3 py-2 rounded-full hover:bg-white/[0.05] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {estimating ? <CircleNotch size={11} className="animate-spin" /> : <Coin size={11} weight="duotone" />}
              Estimate Cost
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !script.trim() || (isOmniHuman && !selectedVoiceId)}
              className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {generating ? <CircleNotch size={14} className="animate-spin" /> : <Sparkle size={14} weight="fill" />}
              {generating ? "Generating..." : "Generate Premium Video"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ─── */

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-full bg-[#00BCFF] text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-[#00BCFF]/20">
        {n}
      </div>
      <h2 className="text-sm font-bold text-zinc-100 tracking-tight">{title}</h2>
    </div>
  );
}
