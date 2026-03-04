"use client";

import { FileText, Plus, PencilSimple, FolderOpen } from "@phosphor-icons/react";

export default function Scripts() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-header">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Scripts</h1>
            <p className="text-xs text-zinc-400">Write and manage your video scripts</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-xs font-semibold text-zinc-700 border border-zinc-200 px-4 py-2 rounded-full hover:bg-zinc-50 transition-colors">
              <FolderOpen size={14} weight="bold" />
              New Group
            </button>
            <button className="btn-ice flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full">
              <Plus size={14} weight="bold" />
              New Script
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        <div className="bg-white rounded-2xl border border-zinc-200/50 p-16 text-center glass-empty">
          <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
            <FileText size={24} weight="duotone" className="text-zinc-300" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mb-1">No scripts yet</h3>
          <p className="text-xs text-zinc-400 mb-1">Write your first script or let AI generate one for you.</p>
          <p className="text-xs text-zinc-400 mb-6">Organize scripts into groups for mass campaigns.</p>
          <button className="inline-flex items-center gap-2 btn-ice text-xs font-semibold px-6 py-2.5 rounded-full">
            <PencilSimple size={14} weight="bold" />
            Write Your First Script
          </button>
        </div>
      </div>
    </div>
  );
}
