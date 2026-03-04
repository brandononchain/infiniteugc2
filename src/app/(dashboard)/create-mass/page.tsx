"use client";

import { useState } from "react";
import {
  Coin,
  CaretDown,
  Eye,
  Sparkle,
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
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Stack size={20} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Create Campaign</h1>
              <p className="text-xs text-zinc-400">AI videos with captions & overlays</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-accent-50 border border-accent-200/40 text-accent-700 text-xs font-semibold px-3.5 py-1.5 rounded-full">
              <Coin size={14} weight="fill" />
              BALANCE <span className="text-accent-800 font-bold">30</span> credits
            </div>
            <button className="flex items-center gap-2 text-xs font-semibold text-zinc-500 border border-zinc-200 px-4 py-2 rounded-full hover:bg-zinc-50 transition-colors">
              <CheckCircle size={14} weight="bold" />
              Save campaign
            </button>
          </div>
        </div>
        {/* Accent line */}
        <div className="h-0.5 bg-linear-to-r from-rose-500 via-pink-500 to-rose-400" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
          {/* ─── Left: Live Preview ─── */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
                <span className="text-sm font-semibold text-zinc-900">Live Preview</span>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span>9:16 portrait</span>
                  <span className="flex items-center gap-1 text-rose-500 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>
              <div className="aspect-[9/16] bg-linear-to-br from-rose-100 via-pink-50 to-rose-50 flex items-center justify-center">
                <p className="text-sm text-zinc-300">Preview will appear here</p>
              </div>
              <div className="px-5 py-2.5 border-t border-zinc-100 text-center">
                <p className="text-[10px] text-zinc-400">Click and drag text to reposition</p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white rounded-2xl border border-zinc-200/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Coin size={16} weight="duotone" className="text-amber-500" />
                <span className="text-sm font-semibold text-zinc-900">Cost breakdown</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Eye size={14} className="text-zinc-400" />
                    Duration
                  </div>
                  <span className="text-xs font-mono text-zinc-400">&mdash;</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-zinc-500">Total Credits</span>
                  <span className="text-xs font-mono text-accent-600 font-bold">&mdash;</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right: Form ─── */}
          <div className="space-y-8">
            {/* Step 1 */}
            <section className="space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-base font-bold text-zinc-950">Project Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Campaign name</label>
                  <input
                    type="text"
                    placeholder="e.g., Product Launch Video"
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300 transition-all"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1.5">A memorable name for tracking this campaign.</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Video engine</label>
                  <button className="w-full flex items-center justify-between border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 hover:border-zinc-300 transition-colors">
                    <span>Hedra Avatar</span>
                    <CaretDown size={14} className="text-zinc-400" />
                  </button>
                </div>
              </div>
            </section>

            <div className="border-t border-zinc-100" />

            {/* Step 2: Select Avatar */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <h2 className="text-base font-bold text-zinc-950">Select Avatar</h2>
                </div>
                <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setAvatarMode("single")}
                    className={`text-xs font-semibold px-4 py-1.5 transition-colors ${avatarMode === "single" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => setAvatarMode("group")}
                    className={`text-xs font-semibold px-4 py-1.5 transition-colors ${avatarMode === "group" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}
                  >
                    Group
                  </button>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200/40 rounded-xl p-4 flex items-start gap-3">
                <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-600">No avatars yet. <a href="/avatars" className="text-accent-600 font-semibold hover:underline">Create an avatar</a></p>
              </div>
            </section>

            <div className="border-t border-zinc-100" />

            {/* Step 3: Select Script */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                  <h2 className="text-base font-bold text-zinc-950">Select Script</h2>
                </div>
                <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setScriptMode("single")}
                    className={`text-xs font-semibold px-4 py-1.5 transition-colors ${scriptMode === "single" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => setScriptMode("group")}
                    className={`text-xs font-semibold px-4 py-1.5 transition-colors ${scriptMode === "group" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}
                  >
                    Group
                  </button>
                </div>
              </div>

              {scriptMode === "group" ? (
                <div>
                  <label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Script Group</label>
                  <button className="w-full flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-300 transition-colors">
                    <FolderOpen size={16} className="text-zinc-300" />
                    Select a script group
                    <CaretDown size={14} className="text-zinc-300 ml-auto" />
                  </button>
                  <p className="text-[10px] text-zinc-400 mt-1.5">Select a script group &mdash; each script in the group generates a separate video.</p>
                </div>
              ) : (
                <div className="bg-amber-50/60 border border-amber-200/40 rounded-xl p-4 flex items-start gap-3">
                  <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-600">
                    No scripts found. <a href="/scripts" className="text-accent-600 font-semibold hover:underline">Write a custom script</a> or <a href="/scripts" className="text-accent-600 font-semibold hover:underline">manage scripts</a>
                  </p>
                </div>
              )}
            </section>

            <div className="border-t border-zinc-100" />

            {/* Step 4: Customization */}
            <section className="space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">4</div>
                <h2 className="text-base font-bold text-zinc-950">Customization</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-zinc-200/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-zinc-900">Auto-Captions</span>
                    <button onClick={() => setCaptionsEnabled(!captionsEnabled)} className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                      Enable
                      {captionsEnabled ? <ToggleRight size={24} weight="fill" className="text-accent-500" /> : <ToggleLeft size={24} weight="regular" className="text-zinc-300" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400">TikTok-style synced captions</p>
                </div>

                <div className="bg-white border border-zinc-200/60 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-zinc-900">Text overlays</span>
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-zinc-100 px-3 py-1.5 rounded-lg hover:bg-zinc-200/70 transition-colors">
                      <Plus size={12} weight="bold" />
                      Add text
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400">Add your own text</p>
                  <div className="mt-3 border border-dashed border-zinc-200 rounded-lg p-4 text-center">
                    <p className="text-[10px] text-zinc-400">No text overlays</p>
                    <p className="text-[10px] text-zinc-300">Click &ldquo;Add text&rdquo; to create one.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-200/60 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-zinc-900">Reply Comment</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">TikTok style pinned reply</p>
                  </div>
                  <button onClick={() => setReplyEnabled(!replyEnabled)} className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                    Enable
                    {replyEnabled ? <ToggleRight size={24} weight="fill" className="text-accent-500" /> : <ToggleLeft size={24} weight="regular" className="text-zinc-300" />}
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
