"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useAvatars, useScripts, useVoices } from "@/hooks/use-data";
import { campaigns } from "@/lib/api";
import type { VideoProvider, TextOverlay } from "@/types";
import {
  Coin,
  CaretDown,
  Eye,
  Sparkle,
  ToggleLeft,
  ToggleRight,
  Plus,
  Info,
  Play,
  CircleNotch,
  X,
  Trash,
  ArrowLeft,
} from "@phosphor-icons/react";

const VIDEO_PROVIDERS: { value: VideoProvider; label: string; multiplier: number }[] = [
  { value: "heygen", label: "HeyGen", multiplier: 1 },
  { value: "hedra_avatar", label: "Hedra Avatar", multiplier: 2 },
  { value: "hedra_omnia", label: "Hedra Omnia", multiplier: 1 },
  { value: "omnihuman", label: "OmniHuman 1.5", multiplier: 1 },
  { value: "sora2", label: "Sora 2", multiplier: 3 },
  { value: "seedance", label: "Seedance", multiplier: 2 },
  { value: "veo3", label: "VEO3", multiplier: 3 },
];

export default function CreateCampaign() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: avatars } = useAvatars();
  const { data: scripts } = useScripts();
  const { data: voices } = useVoices();

  const [name, setName] = useState("");
  const [provider, setProvider] = useState<VideoProvider>("heygen");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [replyEnabled, setReplyEnabled] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const credits = profile?.credits ?? 0;
  const selectedScript = scripts?.find((s) => s.id === selectedScriptId);

  const estimatedCost = useMemo(() => {
    if (!selectedScript?.content) return null;
    const wordCount = selectedScript.content.split(/\s+/).length;
    const durationSec = (wordCount / 150) * 60;
    const baseCost = Math.max(1, Math.ceil(durationSec / 5));
    const providerMeta = VIDEO_PROVIDERS.find((p) => p.value === provider);
    return baseCost * (providerMeta?.multiplier ?? 1) + (captionsEnabled ? 25 : 0);
  }, [selectedScript, provider, captionsEnabled]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await campaigns.create({
        campaign_name: name || undefined,
        avatar_id: selectedAvatarId || undefined,
        script_id: selectedScriptId || undefined,
        video_provider: provider,
        caption_enabled: captionsEnabled,
        text_overlays: textOverlays.length > 0 ? textOverlays : undefined,
      });
      router.push("/running");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const job = await campaigns.create({
        campaign_name: name || undefined,
        avatar_id: selectedAvatarId || undefined,
        script_id: selectedScriptId || undefined,
        video_provider: provider,
        caption_enabled: captionsEnabled,
        text_overlays: textOverlays.length > 0 ? textOverlays : undefined,
      });
      await campaigns.run(job.id);
      router.push("/running");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to run campaign");
    } finally {
      setRunning(false);
    }
  };

  const addOverlay = () => {
    setTextOverlays((prev) => [
      ...prev,
      { text: "", position: { x: 50, y: 10 }, style: { fontSize: 24, color: "#FFFFFF" } },
    ]);
  };

  const removeOverlay = (idx: number) => {
    setTextOverlays((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0">
        <div className="px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-300 transition-colors">
              <ArrowLeft size={12} weight="bold" />
              Back
            </Link>
            <div className="w-px h-5 bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <Sparkle size={16} weight="duotone" className="text-[#00BCFF]" />
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight">Create Campaign</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#00BCFF]/10 border border-[#00BCFF]/20 text-[#00BCFF] text-[11px] font-semibold px-3 py-1 rounded-full">
            <Coin size={12} weight="fill" />
            <span className="text-[#00BCFF] font-bold">{credits}</span> credits
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
          <Info size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 lg:px-8 py-6 space-y-6">

          {/* Campaign name & Video engine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">Campaign name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Product Launch Video"
                className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 transition-all"
              />
            </div>
            <div className="relative">
              <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block">Video engine</label>
              <button
                onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                className="w-full flex items-center justify-between brutal-select bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200"
              >
                <span>{VIDEO_PROVIDERS.find((p) => p.value === provider)?.label}</span>
                <CaretDown size={14} className="text-zinc-500" />
              </button>
              {showProviderDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#252529] border border-white/[0.08] rounded-lg shadow-xl shadow-black/40 z-20 overflow-hidden">
                  {VIDEO_PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => { setProvider(p.value); setShowProviderDropdown(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.05] transition-colors ${provider === p.value ? "bg-[#00BCFF]/10 text-[#00BCFF] font-semibold" : "text-zinc-400"}`}
                    >
                      {p.label}
                      {p.multiplier > 1 && <span className="text-[10px] text-zinc-500 ml-2">{p.multiplier}x credits</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Select Avatar */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-100">Select Avatar</h2>
            {avatars && avatars.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatarId(avatar.id === selectedAvatarId ? null : avatar.id)}
                    className={`rounded-xl p-2 transition-all text-center border ${
                      selectedAvatarId === avatar.id
                        ? "border-[#00BCFF]/50 bg-[#00BCFF]/10 ring-1 ring-[#00BCFF]/20"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                  >
                    {avatar.image_url ? (
                      <img src={avatar.image_url} alt={avatar.name} className="w-11 h-11 rounded-lg object-cover mx-auto mb-1.5" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-white/[0.05] mx-auto mb-1.5" />
                    )}
                    <p className="text-[10px] font-semibold text-zinc-400 truncate">{avatar.name}</p>
                  </button>
                ))}
              </div>
            ) : (
              <InfoBox>
                No avatars yet. <a href="/avatars" className="text-[#00BCFF] font-semibold hover:underline">Create an avatar</a>
              </InfoBox>
            )}
          </div>

          {/* Select Script */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-100">Select Script</h2>
            {scripts && scripts.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {scripts.map((script) => (
                  <button
                    key={script.id}
                    onClick={() => setSelectedScriptId(script.id === selectedScriptId ? null : script.id)}
                    className={`w-full text-left rounded-xl p-3 transition-all border ${
                      selectedScriptId === script.id
                        ? "border-[#00BCFF]/50 bg-[#00BCFF]/10 ring-1 ring-[#00BCFF]/20"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                  >
                    <p className="text-xs font-bold text-zinc-200">{script.name}</p>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{script.content}</p>
                  </button>
                ))}
              </div>
            ) : (
              <InfoBox>
                No scripts found. <a href="/scripts" className="text-[#00BCFF] font-semibold hover:underline">Write a script</a> or{" "}
                <a href="/script-generation" className="text-[#00BCFF] font-semibold hover:underline">generate with AI</a>
              </InfoBox>
            )}
          </div>

          {/* Customization */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-zinc-100">Customization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Auto-Captions */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-zinc-200">Auto-Captions</span>
                  <button onClick={() => setCaptionsEnabled(!captionsEnabled)}>
                    {captionsEnabled
                      ? <ToggleRight size={20} weight="fill" className="text-[#00BCFF]" />
                      : <ToggleLeft size={20} className="text-zinc-500" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">TikTok-style synced captions (+25 cr)</p>
              </div>

              {/* Text overlays */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-zinc-200">Text overlays</span>
                  <button onClick={addOverlay} className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-md hover:bg-white/[0.1] transition-colors">
                    <Plus size={10} weight="bold" /> Add
                  </button>
                </div>
                {textOverlays.length > 0 ? (
                  <div className="space-y-1.5 mt-2">
                    {textOverlays.map((overlay, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(e) => {
                            const updated = [...textOverlays];
                            updated[idx] = { ...updated[idx], text: e.target.value };
                            setTextOverlays(updated);
                          }}
                          placeholder="Overlay text..."
                          className="flex-1 brutal-input px-2 py-1 text-[11px] text-zinc-200"
                        />
                        <button onClick={() => removeOverlay(idx)} className="text-zinc-500 hover:text-rose-400 transition-colors">
                          <Trash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500">No overlays yet</p>
                )}
              </div>
            </div>

            {/* Reply Comment */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">Reply Comment</span>
                  <p className="text-[10px] text-zinc-500">TikTok-style pinned reply</p>
                </div>
                <button onClick={() => setReplyEnabled(!replyEnabled)}>
                  {replyEnabled
                    ? <ToggleRight size={20} weight="fill" className="text-[#00BCFF]" />
                    : <ToggleLeft size={20} className="text-zinc-500" />}
                </button>
              </div>
              {replyEnabled && (
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Enter reply comment..."
                  className="mt-2 w-full brutal-input px-2 py-1.5 text-[11px] text-zinc-200"
                />
              )}
            </div>
          </div>

          {/* Estimated cost */}
          {estimatedCost && (
            <div className="bg-[#00BCFF]/10 border border-[#00BCFF]/20 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#00BCFF]">Estimated: ~{estimatedCost} credits</p>
              </div>
              {estimatedCost > credits && (
                <span className="text-[10px] font-semibold text-rose-400">Insufficient credits</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pt-2 pb-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 border border-white/[0.08] px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:-translate-y-px transition-all disabled:opacity-50"
            >
              {saving ? <CircleNotch size={14} className="animate-spin" /> : <Eye size={14} weight="duotone" />}
              Save Draft
            </button>
            <button
              onClick={handleRun}
              disabled={running || !selectedAvatarId || !selectedScriptId}
              className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? <CircleNotch size={14} className="animate-spin" /> : <Play size={14} weight="fill" />}
              {running ? "Running..." : "Run Campaign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 flex items-start gap-2.5">
      <Info size={14} className="text-amber-400 mt-0.5 shrink-0" />
      <p className="text-[11px] text-zinc-400 font-medium">{children}</p>
    </div>
  );
}
