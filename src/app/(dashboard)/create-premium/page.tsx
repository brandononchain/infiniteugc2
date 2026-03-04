"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Coin,
  Sparkle,
  Upload,
  Eye,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";

const VIDEO_MODELS = [
  { name: "VEO3", desc: "Google AI video generation. 50 credits/chunk.", active: true },
  { name: "Sora 2 Pro", desc: "Next-gen premium video generation. 75 credits/chunk.", active: false },
  { name: "OmniHuman 1.5", desc: "Film-grade digital human. 40 credits/chunk.", active: false },
];

export default function CreatePremium() {
  const [selectedModel, setSelectedModel] = useState("VEO3");

  return (
    <div className="min-h-full bg-zinc-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition-colors">
            <ArrowLeft size={14} weight="bold" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8 space-y-8">
        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sparkle size={28} weight="duotone" className="text-rose-500" />
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Create Premium Video</h1>
          </div>
          <p className="text-xs text-rose-500 font-semibold ml-10">Your Credits: 30</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 divide-y divide-zinc-100">
          {/* Campaign name */}
          <div className="p-6">
            <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Campaign name</label>
            <input
              type="text"
              placeholder="e.g., Product Launch, Tutorial Part 1"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300 transition-all"
            />
            <p className="text-[10px] text-zinc-400 mt-1.5">Shown on your dashboard; optional.</p>
          </div>

          {/* Starting Keyframe */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center">
                <Eye size={14} className="text-zinc-500" />
              </div>
              <h2 className="text-sm font-bold text-zinc-950">Starting Keyframe Image</h2>
            </div>
            <p className="text-xs text-zinc-500">Upload an image to use as the starting visual. All video chunks will maintain continuity from this reference.</p>
            <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:border-accent-300 hover:bg-accent-50/30 transition-all cursor-pointer">
              <Upload size={24} className="text-zinc-300" />
              <p className="text-xs font-semibold text-accent-600">Click to upload keyframe image</p>
              <p className="text-[10px] text-zinc-400">PNG, JPG, WebP (max 10MB)</p>
            </div>
          </div>

          {/* Visual Instructions */}
          <div className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center">
                <Eye size={14} className="text-zinc-500" />
              </div>
              <h2 className="text-sm font-bold text-zinc-950">Visual Instructions</h2>
            </div>
            <p className="text-xs text-zinc-500">
              Guide the AI with plain text, or use a JSON object for precise control over: person, setting, lighting, camera, mood, style, background. Applied to every video chunk.
            </p>
            <textarea
              rows={5}
              placeholder={`Plain text: "warm golden lighting, cozy bedroom, handheld iPhone feel, excited mood"\n\nOr structured JSON:\n{\n  "person": "woman, late 20s, natural makeup",\n  "setting": "cozy bedroom, morning"\n}`}
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-xs text-zinc-800 placeholder:text-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300 transition-all resize-y"
            />
            <p className="text-[10px] text-zinc-400">Optional &mdash; 0/2000 characters. Plain text or JSON object. Applied to all video chunks.</p>
          </div>

          {/* Video Model */}
          <div className="p-6 space-y-3">
            <h2 className="text-sm font-bold text-zinc-950">Video Model</h2>
            <p className="text-xs text-zinc-500">Choose the AI model for generating your video chunks.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {VIDEO_MODELS.map((model) => (
                <button
                  key={model.name}
                  onClick={() => setSelectedModel(model.name)}
                  className={`text-left border rounded-xl p-4 transition-all ${
                    selectedModel === model.name
                      ? "border-accent-300 bg-accent-50/40 ring-1 ring-accent-200"
                      : "border-zinc-200/60 hover:border-zinc-300"
                  }`}
                >
                  <span className="text-sm font-bold text-zinc-900">{model.name}</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{model.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Script Content */}
          <div className="p-6 space-y-3">
            <h2 className="text-sm font-bold text-zinc-950">Script Content</h2>
            <textarea
              rows={8}
              placeholder="Enter your video script here... AI will analyze your script and determine the optimal number of video chunks."
              className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300 transition-all resize-y"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end">
          <button className="btn-ice flex items-center gap-2 text-sm font-semibold px-8 py-3 rounded-full shadow-lg">
            <Sparkle size={16} weight="fill" />
            Generate Premium Video
          </button>
        </div>
      </div>
    </div>
  );
}
