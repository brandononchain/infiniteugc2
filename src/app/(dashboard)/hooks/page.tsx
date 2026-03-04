"use client";

import { ArrowClockwise, VideoCamera } from "@phosphor-icons/react";

export default function Hooks() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 brutal-header">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Hooks Generation</h1>
            <p className="text-xs text-zinc-400">Select a completed video and generate an AI-powered hook</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-500 border border-zinc-200 px-3.5 py-1.5 rounded-full">
              10 credits
            </span>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-400 transition-colors">
              <ArrowClockwise size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8 space-y-6">
        {/* Select Video */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-950">Select a Video</h2>
            <span className="text-xs text-rose-500 font-medium">0 videos available</span>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-16 text-center brutal-empty">
            <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
              <VideoCamera size={24} weight="duotone" className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-500 mb-1">No completed videos yet</h3>
            <p className="text-xs text-zinc-400">Create and run campaigns to generate videos first.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
