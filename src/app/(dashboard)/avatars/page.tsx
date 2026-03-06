"use client";

import { useState, useRef } from "react";
import { useAvatars, useVoices } from "@/hooks/use-data";
import { supabaseQueries } from "@/lib/api";
import {
  UserCircle,
  DownloadSimple,
  Plus,
  Upload,
  CircleNotch,
  X,
  Trash,
  CaretDown,
} from "@phosphor-icons/react";

export default function Avatars() {
  const { data: avatars, loading, refetch } = useAvatars();
  const { data: voices } = useVoices();

  const [showModal, setShowModal] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!avatarName.trim() || !imageFile) return;
    setUploading(true);
    setError(null);
    try {
      const path = `avatars/${Date.now()}-${imageFile.name}`;
      const imageUrl = await supabaseQueries.uploadFile("avatars", path, imageFile);
      if (!imageUrl) throw new Error("Upload failed");

      await supabaseQueries.createAvatar(avatarName, imageUrl, selectedVoiceId);
      setShowModal(false);
      setAvatarName("");
      setImageFile(null);
      setImagePreview(null);
      setSelectedVoiceId(null);
      refetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await supabaseQueries.deleteAvatar(id);
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
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Avatars</h1>
            <p className="text-xs text-zinc-400">Manage your AI avatars and voice profiles</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 text-xs font-semibold text-white btn-brutal px-4 py-2 rounded-full"
          >
            <DownloadSimple size={14} weight="bold" />
            Upload Avatar
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : avatars && avatars.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {avatars.map((avatar) => (
              <div key={avatar.id} className="bg-[#1e1e22] rounded-xl overflow-hidden brutal-card group">
                <div className="aspect-square bg-white/[0.03] relative">
                  {avatar.image_url ? (
                    <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircle size={40} className="text-zinc-300" />
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(avatar.id)}
                    disabled={deletingId === avatar.id}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {deletingId === avatar.id ? <CircleNotch size={12} className="animate-spin" /> : <Trash size={12} />}
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-zinc-200 truncate">{avatar.name}</p>
                  <p className="text-[10px] text-zinc-400">
                    {avatar.voice_id
                      ? voices?.find((v) => v.id === avatar.voice_id)?.name || "Voice linked"
                      : "No voice"
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <UserCircle size={24} weight="duotone" className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-zinc-200 mb-1">No avatars yet</h3>
            <p className="text-xs text-zinc-400 mb-1">Upload your first avatar image with a Voice ID to start</p>
            <p className="text-xs text-zinc-400 mb-6">creating videos.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
            >
              <DownloadSimple size={14} weight="bold" />
              Upload Avatar
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[#1e1e22] rounded-2xl p-6 w-full max-w-md shadow-xl border border-white/[0.08]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-zinc-100">Upload Avatar</h2>
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
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Avatar Name</label>
                <input
                  type="text"
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                  placeholder="e.g., Professional Sarah"
                  className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Avatar Image</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/[0.08]">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full brutal-empty p-4 flex flex-col items-center gap-1.5 hover:border-[#00BCFF]/30 transition-all cursor-pointer"
                  >
                    <Upload size={18} className="text-zinc-400" />
                    <p className="text-[11px] font-semibold text-[#00BCFF]">Upload image</p>
                    <p className="text-[10px] text-zinc-400">PNG, JPG, WebP</p>
                  </button>
                )}
              </div>

              <div className="relative">
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Voice (Optional)</label>
                <button
                  onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                  className="w-full flex items-center justify-between brutal-select bg-[#1e1e22] px-3 py-2 text-sm text-zinc-400"
                >
                  <span>{voices?.find((v) => v.id === selectedVoiceId)?.name || "Select a voice"}</span>
                  <CaretDown size={14} className="text-zinc-400" />
                </button>
                {showVoiceDropdown && voices && voices.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e22] border border-white/[0.08] rounded-lg shadow-lg z-20 overflow-hidden max-h-40 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedVoiceId(null); setShowVoiceDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:bg-white/[0.03]"
                    >
                      No voice
                    </button>
                    {voices.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { setSelectedVoiceId(v.id); setShowVoiceDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] ${selectedVoiceId === v.id ? "bg-[#00BCFF]/10 font-semibold" : "text-zinc-400"}`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
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
                onClick={handleUpload}
                disabled={uploading || !avatarName.trim() || !imageFile}
                className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full disabled:opacity-50"
              >
                {uploading && <CircleNotch size={12} className="animate-spin" />}
                {uploading ? "Uploading..." : "Upload Avatar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
