"use client";

import { useState, useRef } from "react";
import { useVoices } from "@/hooks/use-data";
import { voices as voicesApi } from "@/lib/api";
import {
  Microphone,
  Plus,
  Upload,
  CircleNotch,
  X,
  SpeakerHigh,
  Trash,
} from "@phosphor-icons/react";
import { supabaseQueries } from "@/lib/api";

export default function Voices() {
  const { data: voices, loading, refetch } = useVoices();
  const [showModal, setShowModal] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClone = async () => {
    if (!cloneName.trim() || !audioFile) return;
    setCloning(true);
    setError(null);
    try {
      await voicesApi.clone(cloneName, audioFile);
      setShowModal(false);
      setCloneName("");
      setAudioFile(null);
      refetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to clone voice");
    } finally {
      setCloning(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const supabase = (await import("@/lib/supabase/client")).getSupabaseBrowserClient();
      await supabase.from("voices").delete().eq("id", id);
      refetch();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Voices</h1>
            <p className="text-xs text-zinc-400">Clone and manage your AI voices</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-ice flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full"
          >
            <Plus size={14} weight="bold" />
            Clone Voice
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : voices && voices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {voices.map((voice) => (
              <div key={voice.id} className="bg-[#1e1e22] rounded-xl p-4 brutal-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <SpeakerHigh size={18} weight="duotone" className="text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-200">{voice.name}</p>
                    <p className="text-[10px] text-zinc-400">
                      {voice.elevenlabs_voice_id ? "ElevenLabs" : "Custom"} &middot; {new Date(voice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(voice.id)}
                    disabled={deletingId === voice.id}
                    className="text-zinc-400 hover:text-rose-500 transition-colors"
                  >
                    {deletingId === voice.id ? <CircleNotch size={14} className="animate-spin" /> : <Trash size={14} />}
                  </button>
                </div>
                {voice.sample_url && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05]">
                    <audio src={voice.sample_url} controls className="w-full h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <Microphone size={24} weight="duotone" className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">No voices yet</h3>
            <p className="text-xs text-zinc-400 mb-1">Clone your first voice by uploading an audio sample.</p>
            <p className="text-xs text-zinc-400 mb-6">Your cloned voices will appear here.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
            >
              <Plus size={14} weight="bold" />
              Clone Your First Voice
            </button>
          </div>
        )}
      </div>

      {/* Clone Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[#1e1e22] rounded-2xl p-6 w-full max-w-md shadow-xl border border-white/[0.08]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-zinc-100">Clone Voice</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-400">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Voice Name</label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="e.g., My Voice"
                  className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Audio Sample</label>
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="hidden" />
                {audioFile ? (
                  <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/[0.08] rounded-lg">
                    <SpeakerHigh size={16} className="text-zinc-400" />
                    <span className="text-xs text-zinc-400 flex-1 truncate">{audioFile.name}</span>
                    <button onClick={() => setAudioFile(null)} className="text-zinc-400 hover:text-zinc-400">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full brutal-empty p-4 flex flex-col items-center gap-1.5 hover:border-[#00BCFF]/30 transition-all cursor-pointer"
                  >
                    <Upload size={18} className="text-zinc-400" />
                    <p className="text-[11px] font-semibold text-[#00BCFF]">Upload audio file</p>
                    <p className="text-[10px] text-zinc-400">MP3, WAV, M4A (10s–5min)</p>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="text-xs font-semibold text-zinc-400 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleClone}
                disabled={cloning || !cloneName.trim() || !audioFile}
                className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full disabled:opacity-50"
              >
                {cloning && <CircleNotch size={12} className="animate-spin" />}
                {cloning ? "Cloning..." : "Clone Voice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
