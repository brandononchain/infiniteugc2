"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkle,
  Upload,
  Eye,
  Coin,
} from "@phosphor-icons/react";

const VIDEO_MODELS = [
  { name: "VEO3", desc: "Google AI. 50 cr/chunk.", active: true },
  { name: "Sora 2 Pro", desc: "Premium gen. 75 cr/chunk.", active: false },
  { name: "OmniHuman 1.5", desc: "Digital human. 40 cr/chunk.", active: false },
];

export default function CreatePremium() {
  const [selectedModel, setSelectedModel] = useState("VEO3");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 z-30 glass-header">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-700 transition-colors">
              <ArrowLeft size={12} weight="bold" />
              Back
            </Link>
            <div className="w-px h-5 bg-zinc-200" />
            <div className="flex items-center gap-2">
              <Sparkle size={16} weight="duotone" className="text-rose-500" />
              <h1 className="text-sm font-bold text-zinc-950 tracking-tight">Create Premium</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-accent-50 border border-accent-200/40 text-accent-700 text-[11px] font-semibold px-3 py-1 rounded-full">
            <Coin size={12} weight="fill" />
            <span className="text-accent-800 font-bold">30</span> credits
          </div>
        </div>
      </div>

      {/* Content: two-column layout */}
      <div className="flex-1 min-h-0 flex">
        {/* ─── Left: Form (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 py-6 space-y-5">
            {/* Campaign name */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 mb-1 block">Campaign name</label>
              <input
                type="text"
                placeholder="e.g., Product Launch, Tutorial Part 1"
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300 transition-all"
              />
            </div>

            {/* Starting Keyframe */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-zinc-100 flex items-center justify-center">
                  <Eye size={12} className="text-zinc-500" />
                </div>
                <h2 className="text-xs font-bold text-zinc-950">Starting Keyframe Image</h2>
              </div>
              <div className="border-2 border-dashed border-zinc-200 rounded-lg p-5 flex flex-col items-center justify-center gap-1.5 hover:border-accent-300 hover:bg-accent-50/30 transition-all cursor-pointer">
                <Upload size={20} className="text-zinc-300" />
                <p className="text-[11px] font-semibold text-accent-600">Upload keyframe image</p>
                <p className="text-[10px] text-zinc-400">PNG, JPG, WebP (max 10MB)</p>
              </div>
            </div>

            {/* Visual Instructions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-zinc-100 flex items-center justify-center">
                  <Eye size={12} className="text-zinc-500" />
                </div>
                <h2 className="text-xs font-bold text-zinc-950">Visual Instructions</h2>
              </div>
              <textarea
                rows={3}
                placeholder={`"warm golden lighting, cozy bedroom, handheld iPhone feel"`}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 placeholder:text-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300 transition-all resize-none"
              />
              <p className="text-[10px] text-zinc-400">Optional. Plain text or JSON. Applied to all chunks.</p>
            </div>

            {/* Video Model */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-zinc-950">Video Model</h2>
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_MODELS.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => setSelectedModel(model.name)}
                    className={`text-left border rounded-lg p-3 transition-all ${
                      selectedModel === model.name
                        ? "border-accent-300 bg-accent-50/40 ring-1 ring-accent-200 card-elevated"
                        : "border-zinc-200/50 hover:border-zinc-300 card-elevated"
                    }`}
                  >
                    <span className="text-xs font-bold text-zinc-900">{model.name}</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Script Content */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-zinc-950">Script Content</h2>
              <textarea
                rows={5}
                placeholder="Enter your video script here..."
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300 transition-all resize-none"
              />
            </div>

            {/* Generate */}
            <div className="flex justify-end pt-2">
              <button className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full shadow-lg">
                <Sparkle size={14} weight="fill" />
                Generate Premium Video
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
