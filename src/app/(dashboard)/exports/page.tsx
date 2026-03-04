"use client";

import { DownloadSimple, VideoCamera } from "@phosphor-icons/react";
import Link from "next/link";

export default function Exports() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-header">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Exports</h1>
            <p className="text-xs text-zinc-400">0 videos ready to download</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        <div className="bg-white rounded-2xl border border-zinc-200/50 p-16 text-center glass-empty">
          <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
            <VideoCamera size={24} weight="duotone" className="text-zinc-300" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-500 mb-1">No exported videos yet</h3>
          <p className="text-xs text-zinc-400 mb-1">Create and run campaigns or premium videos to</p>
          <p className="text-xs text-zinc-400 mb-6">see them here.</p>
          <Link
            href="/dashboard"
            className="inline-flex btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
