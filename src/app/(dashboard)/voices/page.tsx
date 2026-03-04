"use client";

import { Microphone, Plus, Upload } from "@phosphor-icons/react";

export default function Voices() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Voices</h1>
            <p className="text-xs text-zinc-400">Clone and manage your AI voices</p>
          </div>
          <button className="btn-ice flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full">
            <Plus size={14} weight="bold" />
            Clone Voice
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-4">
            <Microphone size={24} weight="duotone" className="text-zinc-300" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">No voices yet</h3>
          <p className="text-xs text-zinc-400 mb-1">Clone your first voice by uploading an audio sample.</p>
          <p className="text-xs text-zinc-400 mb-6">Your cloned voices will appear here.</p>
          <button className="inline-flex items-center gap-2 btn-ice text-xs font-semibold px-6 py-2.5 rounded-full">
            <Plus size={14} weight="bold" />
            Clone Your First Voice
          </button>
        </div>
      </div>
    </div>
  );
}
