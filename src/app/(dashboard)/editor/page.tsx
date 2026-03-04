"use client";

import { FilmSlate, Plus, Scissors, VideoCamera } from "@phosphor-icons/react";

export default function Editor() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Editor</h1>
            <p className="text-xs text-zinc-400">Create and edit video projects</p>
          </div>
          <button className="flex items-center gap-2 text-xs font-semibold text-white bg-zinc-900 px-4 py-2 rounded-full hover:bg-zinc-800 transition-colors">
            <Plus size={14} weight="bold" />
            New Project
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
            <VideoCamera size={24} weight="duotone" className="text-zinc-300" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">No projects yet</h3>
          <p className="text-xs text-zinc-400 mb-1">Create your first video editing project to combine,</p>
          <p className="text-xs text-zinc-400 mb-6">trim, and enhance your AI-generated videos.</p>
          <button className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs font-semibold px-6 py-2.5 rounded-full hover:bg-zinc-800 transition-colors">
            <Plus size={14} weight="bold" />
            Create Your First Project
          </button>
        </div>
      </div>
    </div>
  );
}
