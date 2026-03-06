"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useVoices } from "@/hooks/use-data";
import { premiumJobs, supabaseQueries } from "@/lib/api";
import type { PremiumVideoProvider } from "@/types";
import {
  ArrowLeft,
  Sparkle,
  Upload,
  Eye,
  Coin,
  Play,
  CircleNotch,
  Info,
  X,
  CaretDown,
  Microphone,
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
      // Upload keyframe if present
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-400 transition-colors">
              <ArrowLeft size={12} weight="bold" />
              Back
            </Link>
            <div className="w-px h-5 bg-zinc-200" />
            <div className="flex items-center gap-2">
              <Sparkle size={16} weight="duotone" className="text-rose-500" />
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight">Create Premium</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#00BCFF]/10 border border-[#00BCFF]/20 text-[#00BCFF] text-[11px] font-semibold px-3 py-1 rounded-full">
            <Coin size={12} weight="fill" />
            <span className="text-[#00BCFF] font-bold">{credits}</span> credits
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 bg-rose-500/10 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
          <Info size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 py-6 space-y-5">
            {/* Campaign name */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Campaign name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product Launch, Tutorial Part 1"
                className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400 transition-all"
              />
            </div>

            {/* Starting Keyframe */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white/[0.05] flex items-center justify-center">
                  <Eye size={12} className="text-zinc-400" />
                </div>
                <h2 className="text-xs font-bold text-zinc-100">Starting Keyframe Image</h2>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleKeyframeUpload} className="hidden" />
              {keyframePreview ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/[0.08]">
                  <img src={keyframePreview} alt="Keyframe" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setKeyframeFile(null); setKeyframePreview(null); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="brutal-empty p-5 w-full flex flex-col items-center justify-center gap-1.5 hover:border-[#00BCFF]/30 hover:bg-[#00BCFF]/10/30 transition-all cursor-pointer"
                >
                  <Upload size={20} className="text-zinc-400" />
                  <p className="text-[11px] font-semibold text-[#00BCFF]">Upload keyframe image</p>
                  <p className="text-[10px] text-zinc-400">PNG, JPG, WebP (max 10MB)</p>
                </button>
              )}
            </div>

            {/* Visual Instructions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white/[0.05] flex items-center justify-center">
                  <Eye size={12} className="text-zinc-400" />
                </div>
                <h2 className="text-xs font-bold text-zinc-100">Visual Instructions</h2>
              </div>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={`"warm golden lighting, cozy bedroom, handheld iPhone feel"`}
                className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 font-mono transition-all resize-none"
              />
              <p className="text-[10px] text-zinc-400">Optional. Plain text or JSON. Applied to all chunks.</p>
            </div>

            {/* Video Model */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-zinc-100">Video Model</h2>
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_MODELS.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => { setSelectedModel(model.value); setEstimate(null); }}
                    className={`text-left rounded-lg p-3 transition-all brutal-card ${
                      selectedModel === model.value
                        ? "!border-accent-400 bg-[#00BCFF]/10/40 ring-2 ring-accent-200"
                        : "hover:border-white/[0.1]"
                    }`}
                  >
                    <span className="text-xs font-bold text-zinc-200">{model.name}</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5 leading-snug">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selection (OmniHuman only) */}
            {isOmniHuman && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Microphone size={14} className="text-zinc-400" />
                  <h2 className="text-xs font-bold text-zinc-100">Voice (Required for OmniHuman)</h2>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                    className="w-full flex items-center justify-between brutal-select bg-[#1e1e22] px-3 py-2 text-sm text-zinc-400"
                  >
                    <span>{voices?.find((v) => v.id === selectedVoiceId)?.name || "Select a voice"}</span>
                    <CaretDown size={14} className="text-zinc-400" />
                  </button>
                  {showVoiceDropdown && voices && voices.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e22] border border-white/[0.08] rounded-lg shadow-lg z-20 overflow-hidden max-h-40 overflow-y-auto">
                      {voices.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVoiceId(v.id); setShowVoiceDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] ${selectedVoiceId === v.id ? "bg-[#00BCFF]/10 text-[#00BCFF] font-semibold" : "text-zinc-400"}`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Script Content */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-zinc-100">Script Content</h2>
              <textarea
                rows={5}
                value={script}
                onChange={(e) => { setScript(e.target.value); setEstimate(null); }}
                placeholder="Enter your video script here..."
                className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400 transition-all resize-none"
              />
            </div>

            {/* Estimate */}
            {estimate && (
              <div className="bg-[#00BCFF]/10 border border-[#00BCFF]/20 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#00BCFF]">Estimated: {estimate.chunks} chunks</p>
                  <p className="text-[10px] text-[#00BCFF]">{estimate.credits} credits total</p>
                </div>
                {estimate.credits > credits && (
                  <span className="text-[10px] font-semibold text-rose-400">Insufficient credits</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                onClick={handleEstimate}
                disabled={estimating || !script.trim()}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-400 border border-white/[0.08] px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50"
              >
                {estimating ? <CircleNotch size={14} className="animate-spin" /> : <Coin size={14} weight="duotone" />}
                Estimate Cost
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !script.trim() || (isOmniHuman && !selectedVoiceId)}
                className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? <CircleNotch size={14} className="animate-spin" /> : <Sparkle size={14} weight="fill" />}
                {generating ? "Generating..." : "Generate Premium Video"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
