"use client";

import { useState } from "react";
import {
  Coin,
  CaretDown,
  Eye,
  ToggleLeft,
  ToggleRight,
  Plus,
  CheckCircle,
  Info,
  Stack,
  FolderOpen,
} from "@phosphor-icons/react";

export default function CreateMass() {
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [replyEnabled, setReplyEnabled] = useState(false);
  const [avatarMode, setAvatarMode] = useState<"single" | "group">("single");
  const [scriptMode, setScriptMode] = useState<"single" | "group">("single");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 z-30 brutal-header">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Stack size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-950 tracking-tight">Create Mass</h1>
              <p className="text-[10px] text-zinc-500">Batch AI videos with captions & overlays</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-accent-50 border border-accent-200/40 text-accent-700 text-[11px] font-semibold px-3 py-1 rounded-full">
              <Coin size={12} weight="fill" />
              <span className="text-accent-800 font-bold">30</span> credits
            </div>
            <button className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 border border-zinc-200 px-3 py-1.5 rounded-full hover:bg-zinc-50 transition-colors">
              <CheckCircle size={12} weight="bold" />
              Save
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-linear-to-r from-rose-500 via-pink-500 to-rose-400" />
      </div>

      {/* Content: fills remaining height */}
      <div className="flex-1 min-h-0 flex">
        {/* ─── Left: Preview (fixed in view) ─── */}
        <div className="hidden lg:flex flex-col w-80 xl:w-[400px] shrink-0 border-r border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-200">
            <span className="text-xs font-semibold text-zinc-900">Preview</span>
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-5 bg-zinc-50">
            {/* iPhone device frame */}
            <div className="relative w-full max-w-[240px] xl:max-w-[280px]">
              {/* Device bezel */}
              <div className="relative bg-zinc-950 rounded-[2.5rem] p-[10px] shadow-xl shadow-zinc-900/20 ring-1 ring-zinc-800">
                {/* Screen */}
                <div className="relative aspect-[9/19.5] bg-linear-to-br from-rose-100 via-pink-50 to-rose-50 rounded-[2rem] overflow-hidden">
                  {/* Dynamic Island */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-zinc-950 rounded-full z-10" />
                  {/* Video content area (9:16 centered) */}
                  <div className="absolute inset-x-0 top-12 bottom-8 flex items-center justify-center">
                    <p className="text-xs text-zinc-300 font-medium">Preview</p>
                  </div>
                  {/* Home indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-zinc-950/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-zinc-200 px-5 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Coin size={13} weight="duotone" className="text-amber-500" />
              <span className="text-[11px] font-semibold text-zinc-900">Cost</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 flex items-center gap-1"><Eye size={12} className="text-zinc-400" />Duration</span>
              <span className="font-mono text-zinc-400">&mdash;</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-zinc-500">Credits</span>
              <span className="font-mono text-accent-600 font-bold">&mdash;</span>
            </div>
          </div>
        </div>

        {/* ─── Right: Form (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Step 1 */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                <h2 className="text-sm font-bold text-zinc-950">Project Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 mb-1 block">Campaign name</label>
                  <input
                    type="text"
                    placeholder="e.g., Product Launch Video"
                    className="w-full brutal-input bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 mb-1 block">Video engine</label>
                  <button className="w-full flex items-center justify-between brutal-select bg-white px-3 py-2 text-sm text-zinc-900">
                    <span>Hedra Avatar</span>
                    <CaretDown size={14} className="text-zinc-500" />
                  </button>
                </div>
              </div>
            </section>

            <div className="border-t border-zinc-300" />

            {/* Step 2: Select Avatar */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                  <h2 className="text-sm font-bold text-zinc-950">Select Avatar</h2>
                </div>
                <div className="flex border-2 border-zinc-900 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setAvatarMode("single")}
                    className={`text-[11px] font-semibold px-3 py-1 transition-colors ${avatarMode === "single" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >Single</button>
                  <button
                    onClick={() => setAvatarMode("group")}
                    className={`text-[11px] font-semibold px-3 py-1 transition-colors ${avatarMode === "group" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >Group</button>
                </div>
              </div>
              <div className="brutal-info p-3 flex items-start gap-2.5">
                <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-zinc-700 font-medium">No avatars yet. <a href="/avatars" className="text-accent-600 font-semibold hover:underline">Create an avatar</a></p>
              </div>
            </section>

            <div className="border-t border-zinc-300" />

            {/* Step 3: Select Script */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                  <h2 className="text-sm font-bold text-zinc-950">Select Script</h2>
                </div>
                <div className="flex border-2 border-zinc-900 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setScriptMode("single")}
                    className={`text-[11px] font-semibold px-3 py-1 transition-colors ${scriptMode === "single" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >Single</button>
                  <button
                    onClick={() => setScriptMode("group")}
                    className={`text-[11px] font-semibold px-3 py-1 transition-colors ${scriptMode === "group" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >Group</button>
                </div>
              </div>
              {scriptMode === "group" ? (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-700 mb-1 block">Script Group</label>
                  <button className="w-full flex items-center gap-2 brutal-select bg-white px-3 py-2 text-sm text-zinc-500">
                    <FolderOpen size={14} className="text-zinc-400" />
                    Select a script group
                    <CaretDown size={14} className="text-zinc-400 ml-auto" />
                  </button>
                </div>
              ) : (
                <div className="brutal-info p-3 flex items-start gap-2.5">
                  <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-zinc-700 font-medium">
                    No scripts found. <a href="/scripts" className="text-accent-600 font-semibold hover:underline">Write a script</a> or <a href="/scripts" className="text-accent-600 font-semibold hover:underline">manage scripts</a>
                  </p>
                </div>
              )}
            </section>

            <div className="border-t border-zinc-300" />

            {/* Step 4: Customization */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] font-bold">4</div>
                <h2 className="text-sm font-bold text-zinc-950">Customization</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 brutal-card">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-zinc-900">Auto-Captions</span>
                    <button onClick={() => setCaptionsEnabled(!captionsEnabled)} className="flex items-center gap-1 text-[10px] font-medium text-zinc-600">
                      {captionsEnabled ? <ToggleRight size={20} weight="fill" className="text-accent-500" /> : <ToggleLeft size={20} className="text-zinc-400" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">TikTok-style synced captions</p>
                </div>
                <div className="bg-white rounded-lg p-3 brutal-card">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-zinc-900">Text overlays</span>
                    <button className="flex items-center gap-1 text-[10px] font-semibold text-zinc-700 bg-zinc-100 px-2 py-1 rounded hover:bg-zinc-200/70 transition-colors">
                      <Plus size={10} weight="bold" />
                      Add
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">No overlays yet</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 brutal-card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-900">Reply Comment</span>
                    <p className="text-[10px] text-zinc-500">TikTok style pinned reply</p>
                  </div>
                  <button onClick={() => setReplyEnabled(!replyEnabled)} className="flex items-center gap-1 text-[10px] font-medium text-zinc-500">
                    {replyEnabled ? <ToggleRight size={20} weight="fill" className="text-accent-500" /> : <ToggleLeft size={20} className="text-zinc-300" />}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
