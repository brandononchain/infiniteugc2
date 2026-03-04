"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseQueries } from "@/lib/api";
import {
  Sparkle,
  Copy,
  Check,
  ArrowClockwise,
  FileText,
  Plus,
  CircleNotch,
  X,
} from "@phosphor-icons/react";

const TONES = [
  "Conversational",
  "Professional",
  "Energetic",
  "Humorous",
  "Inspirational",
  "Urgent",
];
const FORMATS = [
  "UGC Ad",
  "Product Demo",
  "Testimonial",
  "How-To",
  "Hook + CTA",
  "Story-Driven",
];

export default function ScriptGeneration() {
  const router = useRouter();
  const [product, setProduct] = useState("");
  const [tone, setTone] = useState("Conversational");
  const [format, setFormat] = useState("UGC Ad");
  const [duration, setDuration] = useState("30");
  const [extra, setExtra] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = () => {
    if (generatedScript) {
      navigator.clipboard.writeText(generatedScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buildPrompt = () => {
    let p = `Write a ${duration}-second video script in a ${tone.toLowerCase()} tone, formatted as a ${format} script.`;
    if (product.trim()) {
      p += ` The product/service is: ${product.trim()}.`;
    }
    if (extra.trim()) {
      p += ` Additional instructions: ${extra.trim()}.`;
    }
    p += ` Structure it with clear sections like [HOOK], [PROBLEM], [SOLUTION], [SOCIAL PROOF], [CTA] with timestamps. Make it natural and engaging for short-form video.`;
    return p;
  };

  const handleGenerate = async () => {
    if (!product.trim()) {
      setError("Please enter a product or service");
      return;
    }
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      // Use the backend API for script generation if available,
      // falling back to a structured template approach
      const prompt = buildPrompt();
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, product, tone, format, duration, extra }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedScript(data.script);
      } else {
        // Fallback: generate a structured template locally
        setGeneratedScript(generateLocalTemplate());
      }
    } catch {
      // Fallback on network error
      setGeneratedScript(generateLocalTemplate());
    } finally {
      setGenerating(false);
    }
  };

  const generateLocalTemplate = () => {
    const productName = product.trim() || "your product";
    const hookTime = duration === "15" ? "0-2s" : "0-3s";
    const problemEnd = duration === "15" ? "5s" : duration === "30" ? "8s" : duration === "60" ? "15s" : "20s";
    const solutionEnd = duration === "15" ? "10s" : duration === "30" ? "18s" : duration === "60" ? "35s" : "50s";
    const proofEnd = duration === "15" ? "12s" : duration === "30" ? "24s" : duration === "60" ? "50s" : "70s";

    return `[HOOK — ${hookTime}]
"Wait… you haven't tried ${productName} yet?"

[PROBLEM — ${hookTime.split("-")[1] || "3s"}-${problemEnd}]
"I used to struggle with the same thing. Spending hours trying to get results, and nothing was working."

[SOLUTION — ${problemEnd}-${solutionEnd}]
"Then I discovered ${productName} — and everything changed. It's ${
      tone === "Energetic" ? "absolutely incredible" : 
      tone === "Professional" ? "remarkably efficient" : 
      tone === "Humorous" ? "ridiculously easy" : 
      "genuinely amazing"
    } how fast you see results."

[SOCIAL PROOF — ${solutionEnd}-${proofEnd}]
"Thousands of people are already using it and seeing real results every single day."

[CTA — ${proofEnd}-${duration}s]
"Try it out — link in bio. You won't regret it."`;
  };

  const handleSaveToScripts = async () => {
    if (!generatedScript) return;
    setSaving(true);
    setError(null);
    try {
      const name = `${format} - ${product.trim().slice(0, 40) || "Generated Script"}`;
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
    // Save first, then navigate to create page
    setSaving(true);
    try {
      const name = `${format} - ${product.trim().slice(0, 40) || "Generated Script"}`;
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
      <div className="sticky top-0 z-30 brutal-header">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkle size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-950 tracking-tight">
                Script Generation
              </h1>
              <p className="text-xs text-zinc-500">
                AI-powered video scripts in seconds
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={12} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Left: Input Form ─── */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h2 className="text-sm font-bold text-zinc-950 mb-4">
                Script Parameters
              </h2>

              {/* Product/Service */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">
                  Product or Service
                </label>
                <input
                  type="text"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g., AI video generation tool for marketers"
                  className="w-full brutal-input bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all"
                />
              </div>

              {/* Tone */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">
                  Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        tone === t ? "brutal-pill-active" : "brutal-pill"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">
                  Format
                </label>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        format === f ? "brutal-pill-active" : "brutal-pill"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">
                  Target Duration
                </label>
                <div className="flex gap-2">
                  {["15", "30", "60", "90"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                        duration === d ? "brutal-pill-active" : "brutal-pill"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Instructions */}
              <div className="mb-5">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">
                  Extra Instructions (optional)
                </label>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={3}
                  placeholder="e.g., Include a question hook, mention free trial, target Gen Z audience"
                  className="w-full brutal-input bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all resize-none"
                />
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !product.trim()}
                className="w-full btn-ice flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <CircleNotch size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkle size={16} weight="fill" />
                    Generate Script
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ─── Right: Output ─── */}
          <div className="space-y-5">
            {generatedScript ? (
              <div className="bg-white rounded-xl p-6 brutal-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-zinc-950">
                    Generated Script
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50"
                    >
                      <ArrowClockwise size={12} weight="bold" />
                      Regenerate
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
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
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-4 shadow-sm">
                  <pre className="text-xs text-zinc-700 font-mono whitespace-pre-wrap leading-relaxed">
                    {generatedScript}
                  </pre>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                  <span>
                    Tone: <strong className="text-zinc-600">{tone}</strong>
                  </span>
                  <span>
                    Format: <strong className="text-zinc-600">{format}</strong>
                  </span>
                  <span>
                    Duration:{" "}
                    <strong className="text-zinc-600">{duration}s</strong>
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-300">
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
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-700 border border-zinc-200 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50"
                  >
                    <FileText size={14} weight="bold" />
                    Use in Campaign
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-16 text-center brutal-empty">
                <div className="w-14 h-14 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <FileText
                    size={24}
                    weight="duotone"
                    className="text-zinc-300"
                  />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">
                  No script generated yet
                </h3>
                <p className="text-xs text-zinc-500 mb-1">
                  Fill in the parameters and click Generate
                </p>
                <p className="text-xs text-zinc-500">
                  to create an AI-powered video script.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
