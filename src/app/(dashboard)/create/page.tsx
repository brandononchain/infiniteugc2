"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle,
  Info,
  Play,
  CircleNotch,
  X,
  Trash,
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
  const selectedAvatar = avatars?.find((a) => a.id === selectedAvatarId);

  // Estimate credits
  const estimatedCost = useMemo(() => {
    if (!selectedScript?.content) return null;
    const wordCount = selectedScript.content.split(/\s+/).length;
    const durationSec = (wordCount / 150) * 60; // ~150 words / min
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-rose-500 to-pink-500 flex items-center justify-center">
              <Sparkle size={16} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight">Create Campaign</h1>
              <p className="text-[10px] text-zinc-400">AI videos with captions &amp; overlays</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#00BCFF]/10 border border-[#00BCFF]/20/40 text-[#00BCFF] text-[11px] font-semibold px-3 py-1 rounded-full">
              <Coin size={12} weight="fill" />
              <span className="text-[#00BCFF] font-bold">{credits}</span> credits
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 border border-white/[0.08] px-3 py-1.5 rounded-full hover:bg-white/[0.03] transition-colors disabled:opacity-50"
            >
              {saving ? <CircleNotch size={12} className="animate-spin" /> : <CheckCircle size={12} weight="bold" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 bg-rose-500/10 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
          <Info size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Content: fills remaining height */}
      <div className="flex-1 min-h-0 flex">
        {/* ─── Left: Preview (fixed in view) ─── */}
        <div className="hidden lg:flex flex-col w-80 xl:w-[400px] shrink-0 border-r border-white/[0.08] bg-[#1e1e22]">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.08]">
            <span className="text-xs font-semibold text-zinc-200">Preview</span>
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500/100 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-5 bg-white/[0.03]">
            {/* iPhone device frame */}
            <div className="relative w-full max-w-[240px] xl:max-w-[280px]">
              <div className="relative bg-zinc-950 rounded-[2.5rem] p-[10px] shadow-xl shadow-zinc-900/20 ring-1 ring-zinc-800">
                <div className="relative aspect-[9/19.5] bg-linear-to-br from-rose-100 via-pink-50 to-rose-50 rounded-[2rem] overflow-hidden">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-zinc-950 rounded-full z-10" />
                  <div className="absolute inset-x-0 top-12 bottom-8 flex flex-col items-center justify-center gap-2">
                    {selectedAvatar?.image_url ? (
                      <img src={selectedAvatar.image_url} alt={selectedAvatar.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-zinc-200/50 flex items-center justify-center">
                        <Eye size={20} className="text-zinc-400" />
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-400 font-medium px-4 text-center line-clamp-3">
                      {selectedScript?.content?.slice(0, 80) || "Preview"}
                    </p>
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-zinc-950/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-white/[0.08] px-5 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Coin size={13} weight="duotone" className="text-amber-500" />
              <span className="text-[11px] font-semibold text-zinc-200">Cost</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1"><Eye size={12} className="text-zinc-400" />Estimated</span>
              <span className="font-mono text-zinc-400">{estimatedCost ? `~${estimatedCost} credits` : "—"}</span>
            </div>
          </div>
        </div>

        {/* ─── Right: Form (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 py-6 space-y-6">
            {/* Step 1: Project Details */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00BCFF]/100 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                <h2 className="text-sm font-bold text-zinc-100">Project Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Campaign name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Product Launch Video"
                    className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400 transition-all"
                  />
                </div>
                <div className="relative">
                  <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Video engine</label>
                  <button
                    onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                    className="w-full flex items-center justify-between brutal-select bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200"
                  >
                    <span>{VIDEO_PROVIDERS.find((p) => p.value === provider)?.label}</span>
                    <CaretDown size={14} className="text-zinc-400" />
                  </button>
                  {showProviderDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e22] border border-white/[0.08] rounded-lg shadow-lg z-20 overflow-hidden">
                      {VIDEO_PROVIDERS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => { setProvider(p.value); setShowProviderDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] transition-colors ${provider === p.value ? "bg-[#00BCFF]/10 text-[#00BCFF] font-semibold" : "text-zinc-400"}`}
                        >
                          {p.label}
                          {p.multiplier > 1 && <span className="text-[10px] text-zinc-400 ml-2">{p.multiplier}x credits</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="border-t border-white/[0.1]" />

            {/* Step 2: Select Avatar */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00BCFF]/100 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                <h2 className="text-sm font-bold text-zinc-100">Select Avatar</h2>
              </div>
              {avatars && avatars.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarId(avatar.id === selectedAvatarId ? null : avatar.id)}
                      className={`rounded-lg p-2 transition-all brutal-card text-center ${
                        selectedAvatarId === avatar.id
                          ? "!border-accent-400 bg-[#00BCFF]/10/40 ring-2 ring-accent-200"
                          : "hover:border-white/[0.1]"
                      }`}
                    >
                      {avatar.image_url ? (
                        <img src={avatar.image_url} alt={avatar.name} className="w-12 h-12 rounded-full object-cover mx-auto mb-1" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/[0.05] mx-auto mb-1" />
                      )}
                      <p className="text-[10px] font-semibold text-zinc-300 truncate">{avatar.name}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="brutal-info p-3 flex items-start gap-2.5">
                  <Info size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-zinc-400 font-medium">No avatars yet. <a href="/avatars" className="text-[#00BCFF] font-semibold hover:underline">Create an avatar</a></p>
                </div>
              )}
            </section>

            <div className="border-t border-white/[0.1]" />

            {/* Step 3: Write Script */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00BCFF]/100 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                <h2 className="text-sm font-bold text-zinc-100">Select Script</h2>
              </div>
              {scripts && scripts.length > 0 ? (
                <div className="space-y-2">
                  {scripts.map((script) => (
                    <button
                      key={script.id}
                      onClick={() => setSelectedScriptId(script.id === selectedScriptId ? null : script.id)}
                      className={`w-full text-left rounded-lg p-3 transition-all brutal-card ${
                        selectedScriptId === script.id
                          ? "!border-accent-400 bg-[#00BCFF]/10/40 ring-2 ring-accent-200"
                          : "hover:border-white/[0.1]"
                      }`}
                    >
                      <p className="text-xs font-bold text-zinc-200">{script.name}</p>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{script.content}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="brutal-info p-3 flex items-start gap-2.5">
                  <Info size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-zinc-400 font-medium">
                    No scripts found. <a href="/scripts" className="text-[#00BCFF] font-semibold hover:underline">Write a script</a> or <a href="/script-generation" className="text-[#00BCFF] font-semibold hover:underline">generate with AI</a>
                  </p>
                </div>
              )}
            </section>

            <div className="border-t border-white/[0.1]" />

            {/* Step 4: Customization */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00BCFF]/100 text-white flex items-center justify-center text-[10px] font-bold">4</div>
                <h2 className="text-sm font-bold text-zinc-100">Customization</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#1e1e22] rounded-lg p-3 brutal-card">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-zinc-200">Auto-Captions</span>
                    <button onClick={() => setCaptionsEnabled(!captionsEnabled)} className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                      {captionsEnabled ? <ToggleRight size={20} weight="fill" className="text-accent-500" /> : <ToggleLeft size={20} className="text-zinc-400" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400">TikTok-style synced captions (+25 cr)</p>
                </div>
                <div className="bg-[#1e1e22] rounded-lg p-3 brutal-card">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-zinc-200">Text overlays</span>
                    <button onClick={addOverlay} className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 bg-white/[0.05] px-2 py-1 rounded hover:bg-zinc-200/70 transition-colors">
                      <Plus size={10} weight="bold" />
                      Add
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
                            className="flex-1 brutal-input bg-[#1e1e22] px-2 py-1 text-[11px] text-zinc-200"
                          />
                          <button onClick={() => removeOverlay(idx)} className="text-zinc-400 hover:text-rose-500">
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-400">No overlays yet</p>
                  )}
                </div>
              </div>
              <div className="bg-[#1e1e22] rounded-lg p-3 brutal-card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-200">Reply Comment</span>
                    <p className="text-[10px] text-zinc-400">TikTok style pinned reply</p>
                  </div>
                  <button onClick={() => setReplyEnabled(!replyEnabled)} className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                    {replyEnabled ? <ToggleRight size={20} weight="fill" className="text-accent-500" /> : <ToggleLeft size={20} className="text-zinc-300" />}
                  </button>
                </div>
                {replyEnabled && (
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Enter reply comment..."
                    className="mt-2 w-full brutal-input bg-[#1e1e22] px-2 py-1.5 text-[11px] text-zinc-200"
                  />
                )}
              </div>
            </section>

            {/* Run button */}
            <div className="flex justify-end pt-2 pb-4">
              <button
                onClick={handleRun}
                disabled={running || !selectedAvatarId || !selectedScriptId}
                className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <Play size={14} weight="fill" />
                )}
                {running ? "Running..." : "Run Campaign"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
