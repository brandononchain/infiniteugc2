"use client";

import { useState } from "react";
import {
  Sparkle,
  CaretDown,
  Copy,
  Check,
  ArrowClockwise,
  FileText,
  Plus,
} from "@phosphor-icons/react";

const TONES = ["Conversational", "Professional", "Energetic", "Humorous", "Inspirational", "Urgent"];
const FORMATS = ["UGC Ad", "Product Demo", "Testimonial", "How-To", "Hook + CTA", "Story-Driven"];

export default function ScriptGeneration() {
  const [product, setProduct] = useState("");
  const [tone, setTone] = useState("Conversational");
  const [format, setFormat] = useState("UGC Ad");
  const [duration, setDuration] = useState("30");
  const [extra, setExtra] = useState("");
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SAMPLE_SCRIPT = `[HOOK — 0-3s]
"Wait… you're still editing your ads manually?"

[PROBLEM — 3-8s]
"I used to spend hours scripting, filming, and editing just ONE video ad. It was exhausting."

[SOLUTION — 8-18s]
"Then I found InfiniteUGC — it generates scroll-stopping video ads with AI avatars, captions, and hooks in minutes."

[SOCIAL PROOF — 18-24s]
"Over 10,000 creators are already using it to scale their content."

[CTA — 24-30s]
"Try it free — link in bio. Your first video is on us."`;

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
              <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Script Generation</h1>
              <p className="text-xs text-zinc-500">AI-powered video scripts in seconds</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 border-2 border-zinc-900 px-3.5 py-1.5 rounded-full shadow-[2px_2px_0_#18181b]">
              5 credits per script
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Left: Input Form ─── */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h2 className="text-sm font-bold text-zinc-950 mb-4">Script Parameters</h2>

              {/* Product/Service */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">Product or Service</label>
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
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        tone === t
                          ? "brutal-pill-active"
                          : "brutal-pill"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">Format</label>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                        format === f
                          ? "brutal-pill-active"
                          : "brutal-pill"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">Target Duration</label>
                <div className="flex gap-2">
                  {["15", "30", "60", "90"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                        duration === d
                          ? "brutal-pill-active"
                          : "brutal-pill"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Instructions */}
              <div className="mb-5">
                <label className="text-[11px] font-semibold text-zinc-700 mb-1.5 block">Extra Instructions (optional)</label>
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
                onClick={() => setGenerated(true)}
                className="w-full btn-ice flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl"
              >
                <Sparkle size={16} weight="fill" />
                Generate Script
              </button>
            </div>
          </div>

          {/* ─── Right: Output ─── */}
          <div className="space-y-5">
            {generated ? (
              <div className="bg-white rounded-xl p-6 brutal-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-zinc-950">Generated Script</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGenerated(true)}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 border-2 border-zinc-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0_#18181b] hover:shadow-[3px_3px_0_#18181b] hover:-translate-y-px transition-all"
                    >
                      <ArrowClockwise size={12} weight="bold" />
                      Regenerate
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600 border-2 border-zinc-900 px-3 py-1.5 rounded-lg shadow-[2px_2px_0_#18181b] hover:shadow-[3px_3px_0_#18181b] hover:-translate-y-px transition-all"
                    >
                      {copied ? <Check size={12} weight="bold" className="text-emerald-500" /> : <Copy size={12} weight="bold" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Script output */}
                <div className="bg-zinc-50 border-2 border-zinc-900 rounded-lg p-4 mb-4 shadow-[3px_3px_0_#18181b]">
                  <pre className="text-xs text-zinc-700 font-mono whitespace-pre-wrap leading-relaxed">
                    {SAMPLE_SCRIPT}
                  </pre>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                  <span>Tone: <strong className="text-zinc-600">{tone}</strong></span>
                  <span>Format: <strong className="text-zinc-600">{format}</strong></span>
                  <span>Duration: <strong className="text-zinc-600">{duration}s</strong></span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-300">
                  <button className="flex items-center gap-2 text-xs font-semibold text-white bg-zinc-900 px-5 py-2.5 rounded-xl border-2 border-zinc-900 shadow-[3px_3px_0_#18181b] hover:shadow-[4px_4px_0_#18181b] hover:-translate-y-px transition-all">
                    <Plus size={14} weight="bold" />
                    Save to Scripts
                  </button>
                  <button className="flex items-center gap-2 text-xs font-semibold text-zinc-700 border-2 border-zinc-900 px-5 py-2.5 rounded-xl shadow-[3px_3px_0_#18181b] hover:shadow-[4px_4px_0_#18181b] hover:-translate-y-px transition-all">
                    <FileText size={14} weight="bold" />
                    Use in Campaign
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-16 text-center brutal-empty">
                <div className="w-14 h-14 rounded-xl bg-zinc-50 border-2 border-zinc-900 flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0_#18181b]">
                  <FileText size={24} weight="duotone" className="text-zinc-300" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 mb-1">No script generated yet</h3>
                <p className="text-xs text-zinc-500 mb-1">Fill in the parameters and click Generate</p>
                <p className="text-xs text-zinc-500">to create an AI-powered video script.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
