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

  /* ─── Completeness checklist ─── */
  const steps = [
    { done: !!name && provider !== undefined },
    { done: !!selectedAvatarId },
    { done: !!selectedScriptId },
    { done: true }, // customization is always "complete"
  ];
  const completedSteps = steps.filter((s) => s.done).length;

  return (
    <div className="flex items-center justify-center min-h-full p-4 lg:p-6">
      {/* ═══ Mac-style window card ═══ */}
      <div className="w-full max-w-[1120px] rounded-2xl border border-white/[0.08] bg-[#1e1e22] shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[calc(100dvh-100px)]">

        {/* ── Window title bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#1e1e22] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00BCFF] to-[#0069A8] flex items-center justify-center">
                <Sparkle size={12} weight="fill" className="text-white" />
              </div>
              <span className="text-xs font-bold text-zinc-200 tracking-tight">Create Campaign</span>
              <span className="text-[10px] text-zinc-500 hidden sm:inline">— AI videos with captions & overlays</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#00BCFF]/10 border border-[#00BCFF]/20 text-[#00BCFF] text-[10px] font-semibold px-2.5 py-1 rounded-full">
              <Coin size={11} weight="fill" />
              <span className="font-bold">{credits}</span> credits
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 border border-white/[0.08] px-2.5 py-1 rounded-full hover:bg-white/[0.05] transition-colors disabled:opacity-50"
            >
              {saving ? <CircleNotch size={11} className="animate-spin" /> : <CheckCircle size={11} weight="bold" />}
              Save
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            <Info size={13} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300"><X size={11} /></button>
          </div>
        )}

        {/* ── Body: Preview | Steps ── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

          {/* ─── Left: preview sandbox ─── */}
          <div className="hidden lg:flex flex-col w-[340px] xl:w-[380px] shrink-0 border-r border-white/[0.06]">
            {/* Preview header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Preview</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Preview canvas — full bleed */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/20 relative overflow-hidden">
                <div className="flex flex-col items-center justify-center gap-3">
                  {selectedAvatar?.image_url ? (
                    <img
                      src={selectedAvatar.image_url}
                      alt={selectedAvatar.name}
                      className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Eye size={24} className="text-zinc-600" />
                    </div>
                  )}
                  {selectedAvatar && (
                    <span className="text-[10px] font-semibold text-zinc-400">{selectedAvatar.name}</span>
                  )}
                  <p className="text-[9px] text-zinc-500 text-center leading-relaxed px-2 line-clamp-4">
                    {selectedScript?.content?.slice(0, 120) || "Select a script to preview..."}
                  </p>
                </div>

                {/* Overlay badges */}
                {captionsEnabled && (
                  <div className="absolute bottom-16 inset-x-0 flex justify-center">
                    <span className="text-[9px] bg-black/50 text-white/80 px-3 py-1 rounded-full font-medium backdrop-blur-sm border border-white/[0.06]">CC — Auto-Captions</span>
                  </div>
                )}
                {replyEnabled && replyText && (
                  <div className="absolute bottom-6 inset-x-6">
                    <div className="bg-white/[0.06] backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/[0.04]">
                      <p className="text-[9px] text-zinc-400 font-medium truncate">{replyText}</p>
                    </div>
                  </div>
                )}
                {textOverlays.filter(o => o.text).map((o, i) => (
                  <div key={i} className="absolute inset-x-6" style={{ top: `${10 + i * 12}%` }}>
                    <p className="text-[10px] text-white font-bold text-center drop-shadow-md">{o.text}</p>
                  </div>
                ))}
            </div>

            {/* Cost bar */}
            <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coin size={12} weight="duotone" className="text-amber-400" />
                <span className="text-[10px] font-semibold text-zinc-400">Estimated Cost</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#00BCFF]">
                {estimatedCost ? `~${estimatedCost} cr` : "—"}
              </span>
            </div>
          </div>

          {/* ─── Right: Form steps (scrollable) ─── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-5 lg:px-8 py-5 space-y-5">

              {/* Step 1: Project Details */}
              <section className="space-y-3">
                <StepHeader n={1} title="Project Details" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Campaign name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Product Launch Video"
                      className="w-full brutal-input px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Video engine</label>
                    <button
                      onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                      className="w-full flex items-center justify-between brutal-select px-3 py-2 text-sm text-zinc-200"
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
              </section>

              <hr className="border-white/[0.06]" />

              {/* Step 2: Select Avatar */}
              <section className="space-y-3">
                <StepHeader n={2} title="Select Avatar" />
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
              </section>

              <hr className="border-white/[0.06]" />

              {/* Step 3: Select Script */}
              <section className="space-y-3">
                <StepHeader n={3} title="Select Script" />
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
              </section>

              <hr className="border-white/[0.06]" />

              {/* Step 4: Customization */}
              <section className="space-y-3">
                <StepHeader n={4} title="Customization" />
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
              </section>
            </div>
          </div>
        </div>

        {/* ── Bottom bar: Run Campaign ── */}
        <div className="shrink-0 border-t border-white/[0.06] px-5 py-3 flex items-center justify-between bg-[#1a1a1e]">
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-zinc-500">
            {selectedAvatarId && <span className="flex items-center gap-1"><CheckCircle size={12} weight="fill" className="text-emerald-400" /> Avatar</span>}
            {selectedScriptId && <span className="flex items-center gap-1"><CheckCircle size={12} weight="fill" className="text-emerald-400" /> Script</span>}
            {captionsEnabled && <span className="flex items-center gap-1"><CheckCircle size={12} weight="fill" className="text-emerald-400" /> Captions</span>}
            {!selectedAvatarId && !selectedScriptId && <span className="text-zinc-500">Select avatar & script to continue</span>}
          </div>
          <button
            onClick={handleRun}
            disabled={running || !selectedAvatarId || !selectedScriptId}
            className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {running ? <CircleNotch size={14} className="animate-spin" /> : <Play size={14} weight="fill" />}
            {running ? "Running..." : "Run Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared sub-components ─── */

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-full bg-[#00BCFF] text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-[#00BCFF]/20">
        {n}
      </div>
      <h2 className="text-sm font-bold text-zinc-100 tracking-tight">{title}</h2>
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
