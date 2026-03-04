"use client";

import { UserCircle, DownloadSimple, Plus } from "@phosphor-icons/react";

export default function Avatars() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 brutal-header">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Avatars</h1>
            <p className="text-xs text-zinc-500">Manage your AI avatars and voice profiles</p>
          </div>
          <button className="flex items-center gap-2 text-xs font-semibold text-white btn-brutal px-4 py-2 rounded-full">
            <DownloadSimple size={14} weight="bold" />
            Upload Avatar
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        <div className="bg-white rounded-xl p-16 text-center brutal-empty">
          <div className="w-14 h-14 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-4">
            <UserCircle size={24} weight="duotone" className="text-zinc-300" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">No avatars yet</h3>
          <p className="text-xs text-zinc-500 mb-1">Upload your first avatar image with a Voice ID to start</p>
          <p className="text-xs text-zinc-500 mb-6">creating videos.</p>
          <button className="inline-flex items-center gap-2 btn-ice text-xs font-semibold px-6 py-2.5 rounded-full">
            <DownloadSimple size={14} weight="bold" />
            Upload Avatar
          </button>
        </div>
      </div>
    </div>
  );
}
