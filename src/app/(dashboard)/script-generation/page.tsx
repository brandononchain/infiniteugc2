"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseQueries } from "@/lib/api";
import {
  SCRIPT_TONES,
  SCRIPT_FORMATS,
  SCRIPT_PLATFORMS,
  TARGET_AUDIENCES,
  VIRAL_HOOK_PATTERNS,
  CTA_TEMPLATES,
  type ScriptTone,
  type ScriptFormat,
  type ScriptPlatform,
  type TargetAudience,
} from "@/lib/prompts";
import {
  Sparkle,
  Copy,
  Check,
  ArrowClockwise,
  FileText,
  Plus,
  CircleNotch,
  X,
  Lightning,
  Lightbulb,
  Target,
  Megaphone,
  CaretRight,
  Star,
  Timer,
  Users,
} from "@phosphor-icons/react";

export default function ScriptGeneration() {
  const router = useRouter();

  // Core inputs
  const [product, setProduct] = useState("");
  const [tone, setTone] = useState<ScriptTone>("conversational");
  const [format, setFormat] = useState<ScriptFormat>("ugc_ad");
  const [platform, setPlatform] = useState<ScriptPlatform>("tiktok");
  const [audience, setAudience] = useState<TargetAudience>("broad");
  const [duration, setDuration] = useState("30");

  // Advanced inputs
  const [keyBenefits, setKeyBenefits] = useState("");
  const [pricePoint, setPricePoint] = useState("");
  const [competitorMention, setCompetitorMention] = useState("");
  const [extra, setExtra] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Output state
  const [generating, setGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [scriptSource, setScriptSource] = useState<"ai" | "template" | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspiration
  const [showHookInspiration, setShowHookInspiration] = useState(false);
  const [showCtaInspiration, setShowCtaInspiration] = useState(false);

  const handleCopy = () => {
    if (generatedScript) {
      navigator.clipboard.writeText(generatedScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = async () => {
    if (!product.trim()) {
      setError("Please enter a product or service");
      return;
    }
    setGenerating(true);
    setError(null);
    setSaved(false);
    setScriptSource(null);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          tone,
          format,
          platform,
          audience,
          duration,
          keyBenefits,
          pricePoint,
          competitorMention,
          extra,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedScript(data.script);
        setScriptSource(data.source || "ai");
      } else {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to generate script");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToScripts = async () => {
    if (!generatedScript) return;
    setSaving(true);
    setError(null);
    try {
      const formatLabel = SCRIPT_FORMATS.find((f) => f.value === format)?.label || format;
      const name = `${formatLabel} — ${product.trim().slice(0, 40) || "Generated Script"}`;
      const result = await supabaseQueries.createScript(name, generatedScript);
      if (result) {
        setSaved(true);
      } else {
        setError("Failed to save script");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleUseInCampaign = async () => {
    if (!generatedScript) return;
    setSaving(true);
    try {
      const formatLabel = SCRIPT_FORMATS.find((f) => f.value === format)?.label || format;
      const name = `${formatLabel} — ${product.trim().slice(0, 40) || "Generated Script"}`;
      const result = await supabaseQueries.createScript(name, generatedScript);
      if (result) {
        router.push(`/create?script=${result.id}`);
      } else {
        setError("Failed to save script before navigating");
      }
    } catch {
      setError("Failed to save script");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkle size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Script Generation
              </h1>
              <p className="text-xs text-zinc-400">
                AI-powered viral UGC scripts — platform-optimized
              </p>
            </div>
          </div>
          {scriptSource === "ai" && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-200 px-2.5 py-1 rounded-full">
              Powered by GPT-4o
            </span>
          )}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Left: Input Form ─── */}
          <div className="space-y-5">
            {/* Product / Service */}
            <div className="bg-[#1e1e22] rounded-xl p-5 brutal-card">
              <h2 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <Target size={14} weight="bold" className="text-violet-500" />
                What are you selling?
              </h2>

              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                  Product or Service *
                </label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g., AI video generation tool for marketers"
                  className="w-full brutal-input bg-[#1e1e22] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-400 transition-all"
                />
              </div>

              {/* Platform */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                  <Megaphone size={11} weight="bold" />
                  Platform
                </label>
                <div className="flex flex-wrap gap-2">
                  {SCRIPT_PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        platform === p.value
                          ? "bg-zinc-900 text-white"
                          : "bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:border-white/[0.1]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                  <Users size={11} weight="bold" />
                  Target Audience
                </label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_AUDIENCES.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAudience(a.value)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        audience === a.value
                          ? "bg-zinc-900 text-white"
                          : "bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:border-white/[0.1]"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Script Style */}
            <div className="bg-[#1e1e22] rounded-xl p-5 brutal-card">
              <h2 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <Star size={14} weight="bold" className="text-amber-500" />
                Script Style
              </h2>

              {/* Tone */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                  Tone
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SCRIPT_TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`text-left px-3 py-2 rounded-lg transition-all ${
                        tone === t.value
                          ? "bg-violet-500/10 border-2 border-violet-300"
                          : "bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.1]"
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold ${
                          tone === t.value ? "text-violet-700" : "text-zinc-400"
                        }`}
                      >
                        {t.label}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {t.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SCRIPT_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFormat(f.value)}
                      className={`text-left px-3 py-2 rounded-lg transition-all ${
                        format === f.value
                          ? "bg-violet-500/10 border-2 border-violet-300"
                          : "bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.1]"
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold ${
                          format === f.value ? "text-violet-700" : "text-zinc-400"
                        }`}
                      >
                        {f.label}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {f.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                  <Timer size={11} weight="bold" />
                  Target Duration
                </label>
                <div className="flex gap-2">
                  {["15", "30", "60", "90"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg flex-1 transition-all ${
                        duration === d
                          ? "bg-zinc-900 text-white"
                          : "bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:border-white/[0.1]"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-[#1e1e22] rounded-xl brutal-card overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Lightbulb size={14} weight="bold" className="text-amber-500" />
                  Advanced Options
                </span>
                <CaretRight
                  size={14}
                  weight="bold"
                  className={`text-zinc-400 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                />
              </button>

              {showAdvanced && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/[0.05] pt-4">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                      Key Benefits to Highlight
                    </label>
                    <input
                      type="text"
                      value={keyBenefits}
                      onChange={(e) => setKeyBenefits(e.target.value)}
                      placeholder="e.g., saves 10 hours/week, 90% cheaper than alternatives"
                      className="w-full brutal-input bg-[#1e1e22] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                      Price Point
                    </label>
                    <input
                      type="text"
                      value={pricePoint}
                      onChange={(e) => setPricePoint(e.target.value)}
                      placeholder="e.g., $29/month, $9.99 one-time"
                      className="w-full brutal-input bg-[#1e1e22] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                      Competitor / Alternative to Reference
                    </label>
                    <input
                      type="text"
                      value={competitorMention}
                      onChange={(e) => setCompetitorMention(e.target.value)}
                      placeholder="e.g., Canva, traditional video editors"
                      className="w-full brutal-input bg-[#1e1e22] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">
                      Extra Creative Direction
                    </label>
                    <textarea
                      value={extra}
                      onChange={(e) => setExtra(e.target.value)}
                      rows={3}
                      placeholder="e.g., Include a question hook, mention free trial, reference trending audio 'I just found out...'"
                      className="w-full brutal-input bg-[#1e1e22] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-400 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !product.trim()}
              className="w-full btn-brutal flex items-center justify-center gap-2.5 text-sm font-bold text-white px-6 py-4 rounded-xl disabled:opacity-50"
            >
              {generating ? (
                <>
                  <CircleNotch size={16} className="animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Lightning size={16} weight="fill" />
                  Generate Script
                </>
              )}
            </button>
          </div>

          {/* ─── Right: Output + Inspiration ─── */}
          <div className="space-y-5">
            {generatedScript ? (
              <div className="bg-[#1e1e22] rounded-xl p-6 brutal-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-zinc-100">
                    Generated Script
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 border border-white/[0.08] px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50"
                    >
                      <ArrowClockwise size={12} weight="bold" />
                      Regenerate
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 border border-white/[0.08] px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
                    >
                      {copied ? (
                        <Check
                          size={12}
                          weight="bold"
                          className="text-emerald-500"
                        />
                      ) : (
                        <Copy size={12} weight="bold" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Script output */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-4 mb-4 shadow-sm">
                  <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                    {generatedScript}
                  </pre>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                  <span>
                    Platform:{" "}
                    <strong className="text-zinc-400">
                      {SCRIPT_PLATFORMS.find((p) => p.value === platform)?.label}
                    </strong>
                  </span>
                  <span>
                    Tone:{" "}
                    <strong className="text-zinc-400">
                      {SCRIPT_TONES.find((t) => t.value === tone)?.label}
                    </strong>
                  </span>
                  <span>
                    Format:{" "}
                    <strong className="text-zinc-400">
                      {SCRIPT_FORMATS.find((f) => f.value === format)?.label}
                    </strong>
                  </span>
                  <span>
                    Duration: <strong className="text-zinc-400">{duration}s</strong>
                  </span>
                  <span>
                    Audience:{" "}
                    <strong className="text-zinc-400">
                      {TARGET_AUDIENCES.find((a) => a.value === audience)?.label}
                    </strong>
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[0.08]">
                  <button
                    onClick={handleSaveToScripts}
                    disabled={saving || saved}
                    className="flex items-center gap-2 text-xs font-semibold text-white btn-brutal px-5 py-2.5 rounded-xl disabled:opacity-50"
                  >
                    {saving ? (
                      <CircleNotch size={14} className="animate-spin" />
                    ) : saved ? (
                      <Check size={14} weight="bold" />
                    ) : (
                      <Plus size={14} weight="bold" />
                    )}
                    {saved ? "Saved!" : "Save to Scripts"}
                  </button>
                  <button
                    onClick={handleUseInCampaign}
                    disabled={saving}
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-400 border border-white/[0.08] px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50"
                  >
                    <FileText size={14} weight="bold" />
                    Use in Campaign
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
                <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <FileText
                    size={24}
                    weight="duotone"
                    className="text-zinc-300"
                  />
                </div>
                <h3 className="text-sm font-bold text-zinc-200 mb-1">
                  Your script will appear here
                </h3>
                <p className="text-xs text-zinc-400 mb-1">
                  Fill in the parameters and click Generate.
                </p>
                <p className="text-[10px] text-zinc-400">
                  AI generates platform-optimized scripts with viral hook patterns.
                </p>
              </div>
            )}

            {/* Hook Inspiration */}
            <div className="bg-[#1e1e22] rounded-xl brutal-card overflow-hidden">
              <button
                onClick={() => setShowHookInspiration(!showHookInspiration)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Lightning size={14} weight="fill" className="text-amber-500" />
                  Hook Inspiration
                  <span className="text-[10px] font-medium text-zinc-400">
                    {VIRAL_HOOK_PATTERNS.length} patterns
                  </span>
                </span>
                <CaretRight
                  size={14}
                  weight="bold"
                  className={`text-zinc-400 transition-transform ${showHookInspiration ? "rotate-90" : ""}`}
                />
              </button>

              {showHookInspiration && (
                <div className="px-5 pb-5 border-t border-white/[0.05] pt-4">
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Proven viral hook patterns used by top UGC creators. Click to
                    copy and customize.
                  </p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {VIRAL_HOOK_PATTERNS.map((hook, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          navigator.clipboard.writeText(hook);
                        }}
                        className="w-full text-left text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.08] px-3 py-2 rounded-lg hover:border-violet-300 hover:text-violet-400 transition-all"
                      >
                        &ldquo;{hook}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTA Inspiration */}
            <div className="bg-[#1e1e22] rounded-xl brutal-card overflow-hidden">
              <button
                onClick={() => setShowCtaInspiration(!showCtaInspiration)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Megaphone size={14} weight="fill" className="text-emerald-500" />
                  CTA Templates
                  <span className="text-[10px] font-medium text-zinc-400">
                    {CTA_TEMPLATES.length} templates
                  </span>
                </span>
                <CaretRight
                  size={14}
                  weight="bold"
                  className={`text-zinc-400 transition-transform ${showCtaInspiration ? "rotate-90" : ""}`}
                />
              </button>

              {showCtaInspiration && (
                <div className="px-5 pb-5 border-t border-white/[0.05] pt-4">
                  <p className="text-[11px] text-zinc-400 mb-3">
                    High-converting call-to-action closers. Click to copy.
                  </p>
                  <div className="space-y-1.5">
                    {CTA_TEMPLATES.map((cta, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          navigator.clipboard.writeText(cta);
                        }}
                        className="w-full text-left text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.08] px-3 py-2 rounded-lg hover:border-emerald-300 hover:text-emerald-400 transition-all"
                      >
                        &ldquo;{cta}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
