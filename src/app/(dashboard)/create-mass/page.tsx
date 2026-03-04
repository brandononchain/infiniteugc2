"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAvatars, useScripts, useScriptGroups } from "@/hooks/use-data";
import { massCampaigns } from "@/lib/api";
import type { MassVideoProvider, TextOverlay } from "@/types";
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
  Play,
  CircleNotch,
  X,
  Trash,
} from "@phosphor-icons/react";

const MASS_PROVIDERS: { value: MassVideoProvider; label: string }[] = [
  { value: "hedra_avatar", label: "Hedra Avatar" },
  { value: "hedra_omnia", label: "Hedra Omnia" },
];

export default function CreateMass() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: avatars } = useAvatars();
  const { data: scripts } = useScripts();
  const { data: scriptGroups } = useScriptGroups();

  const [name, setName] = useState("");
  const [provider, setProvider] = useState<MassVideoProvider>("hedra_avatar");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [scriptMode, setScriptMode] = useState<"single" | "group">("single");
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [replyEnabled, setReplyEnabled] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const credits = profile?.credits ?? 0;
  const selectedAvatar = avatars?.find((a) => a.id === selectedAvatarId);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await massCampaigns.create({
        campaign_name: name || undefined,
        avatar_id: selectedAvatarId || undefined,
        script_group_id: selectedGroupId || undefined,
        video_provider: provider,
        caption_enabled: captionsEnabled,
        text_overlays: textOverlays.length > 0 ? textOverlays : undefined,
      });
      router.push("/running");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const campaign = await massCampaigns.create({
        campaign_name: name || undefined,
        avatar_id: selectedAvatarId || undefined,
        script_group_id: selectedGroupId || undefined,
        video_provider: provider,
        caption_enabled: captionsEnabled,
        text_overlays: textOverlays.length > 0 ? textOverlays : undefined,
      });
      await massCampaigns.run(campaign.id);
      router.push("/running");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to run");
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
              <p className="text-[10px] text-zinc-500">Batch AI videos with captions &amp; overlays</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-accent-50 border border-accent-200/40 text-accent-700 text-[11px] font-semibold px-3 py-1 rounded-full">
              <Coin size={12} weight="fill" />
              <span className="text-accent-800 font-bold">{credits}</span> credits
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 border border-zinc-200 px-3 py-1.5 rounded-full hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {saving ? <CircleNotch size={12} className="animate-spin" /> : <CheckCircle size={12} weight="bold" />}
              Save
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-linear-to-r from-rose-500 via-pink-500 to-rose-400" />
      </div>

      {error && (
        <div className="mx-6 mt-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
          <Info size={14} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 flex">
        {/* ─── Left: Preview ─── */}
        <div className="hidden lg:flex flex-col w-80 xl:w-[400px] shrink-0 border-r border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-200">
            <span className="text-xs font-semibold text-zinc-900">Preview</span>
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-5 bg-zinc-50">
            <div className="relative w-full max-w-[240px] xl:max-w-[280px]">
              <div className="relative bg-zinc-950 rounded-[2.5rem] p-[10px] shadow-xl shadow-zinc-900/20 ring-1 ring-zinc-800">
                <div className="relative aspect-[9/19.5] bg-linear-to-br from-rose-100 via-pink-50 to-rose-50 rounded-[2rem] overflow-hidden">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[72px] h-[22px] bg-zinc-950 rounded-full z-10" />
                  <div className="absolute inset-x-0 top-12 bottom-8 flex flex-col items-center justify-center gap-2">
                    {selectedAvatar?.image_url ? (
                      <img src={selectedAvatar.image_url} alt={selectedAvatar.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md" />
                    ) : (
                      <p className="text-xs text-zinc-300 font-medium">Preview</p>
                    )}
                  </div>
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

        {/* ─── Right: Form ─── */}
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Product Launch Batch"
                    className="w-full brutal-input bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all"
                  />
                </div>
                <div className="relative">
                  <label className="text-[11px] font-semibold text-zinc-700 mb-1 block">Video engine</label>
                  <button
                    onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                    className="w-full flex items-center justify-between brutal-select bg-white px-3 py-2 text-sm text-zinc-900"
                  >
                    <span>{MASS_PROVIDERS.find((p) => p.value === provider)?.label}</span>
                    <CaretDown size={14} className="text-zinc-500" />
                  </button>
                  {showProviderDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 overflow-hidden">
                      {MASS_PROVIDERS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => { setProvider(p.value); setShowProviderDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors ${provider === p.value ? "bg-accent-50 text-accent-700 font-semibold" : "text-zinc-700"}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="border-t border-zinc-300" />

            {/* Step 2: Select Avatar */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                <h2 className="text-sm font-bold text-zinc-950">Select Avatar</h2>
              </div>
              {avatars && avatars.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarId(avatar.id === selectedAvatarId ? null : avatar.id)}
                      className={`rounded-lg p-2 transition-all brutal-card text-center ${
                        selectedAvatarId === avatar.id
                          ? "!border-accent-400 bg-accent-50/40 ring-2 ring-accent-200"
                          : "hover:border-zinc-300"
                      }`}
                    >
                      {avatar.image_url ? (
                        <img src={avatar.image_url} alt={avatar.name} className="w-12 h-12 rounded-full object-cover mx-auto mb-1" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-100 mx-auto mb-1" />
                      )}
                      <p className="text-[10px] font-semibold text-zinc-800 truncate">{avatar.name}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="brutal-info p-3 flex items-start gap-2.5">
                  <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-zinc-700 font-medium">No avatars yet. <a href="/avatars" className="text-accent-600 font-semibold hover:underline">Create an avatar</a></p>
                </div>
              )}
            </section>

            <div className="border-t border-zinc-300" />

            {/* Step 3: Select Script */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                  <h2 className="text-sm font-bold text-zinc-950">Select Script</h2>
                </div>
                <div className="flex border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                  <button
                    onClick={() => setScriptMode("single")}
                    className={`text-[11px] font-semibold px-3 py-1 transition-colors ${scriptMode === "single" ? "bg-linear-to-br from-zinc-700 via-zinc-800 to-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
                  >Single</button>
                  <button
                    onClick={() => setScriptMode("group")}
                    className={`text-[11px] font-semibold px-3 py-1 transition-colors ${scriptMode === "group" ? "bg-linear-to-br from-zinc-700 via-zinc-800 to-zinc-950 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
                  >Group</button>
                </div>
              </div>
              {scriptMode === "group" ? (
                <div className="relative">
                  <label className="text-[11px] font-semibold text-zinc-700 mb-1 block">Script Group</label>
                  <button
                    onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                    className="w-full flex items-center gap-2 brutal-select bg-white px-3 py-2 text-sm text-zinc-500"
                  >
                    <FolderOpen size={14} className="text-zinc-400" />
                    {scriptGroups?.find((g) => g.id === selectedGroupId)?.name || "Select a script group"}
                    <CaretDown size={14} className="text-zinc-400 ml-auto" />
                  </button>
                  {showGroupDropdown && scriptGroups && scriptGroups.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-20 overflow-hidden">
                      {scriptGroups.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => { setSelectedGroupId(g.id); setShowGroupDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors ${selectedGroupId === g.id ? "bg-accent-50 text-accent-700 font-semibold" : "text-zinc-700"}`}
                        >
                          {g.name} <span className="text-[10px] text-zinc-400">({g.script_ids?.length ?? 0} scripts)</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {(!scriptGroups || scriptGroups.length === 0) && !showGroupDropdown && (
                    <div className="mt-2 brutal-info p-3 flex items-start gap-2.5">
                      <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-zinc-700 font-medium">No script groups. <a href="/scripts" className="text-accent-600 font-semibold hover:underline">Create a group</a></p>
                    </div>
                  )}
                </div>
              ) : (
                scripts && scripts.length > 0 ? (
                  <div className="space-y-2">
                    {scripts.map((script) => (
                      <button
                        key={script.id}
                        onClick={() => setSelectedScriptId(script.id === selectedScriptId ? null : script.id)}
                        className={`w-full text-left rounded-lg p-3 transition-all brutal-card ${
                          selectedScriptId === script.id
                            ? "!border-accent-400 bg-accent-50/40 ring-2 ring-accent-200"
                            : "hover:border-zinc-300"
                        }`}
                      >
                        <p className="text-xs font-bold text-zinc-900">{script.name}</p>
                        <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{script.content}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="brutal-info p-3 flex items-start gap-2.5">
                    <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-zinc-700 font-medium">
                      No scripts found. <a href="/scripts" className="text-accent-600 font-semibold hover:underline">Write a script</a>
                    </p>
                  </div>
                )
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
                    <button onClick={() => setCaptionsEnabled(!captionsEnabled)}>
                      {captionsEnabled ? <ToggleRight size={20} weight="fill" className="text-accent-500" /> : <ToggleLeft size={20} className="text-zinc-400" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">TikTok-style synced captions (+25 cr)</p>
                </div>
                <div className="bg-white rounded-lg p-3 brutal-card">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-zinc-900">Text overlays</span>
                    <button onClick={addOverlay} className="flex items-center gap-1 text-[10px] font-semibold text-zinc-700 bg-zinc-100 px-2 py-1 rounded hover:bg-zinc-200/70 transition-colors">
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
                            className="flex-1 brutal-input bg-white px-2 py-1 text-[11px] text-zinc-900"
                          />
                          <button onClick={() => setTextOverlays((p) => p.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-rose-500">
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
              <div className="bg-white rounded-lg p-3 brutal-card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-900">Reply Comment</span>
                    <p className="text-[10px] text-zinc-500">TikTok style pinned reply</p>
                  </div>
                  <button onClick={() => setReplyEnabled(!replyEnabled)}>
                    {replyEnabled ? <ToggleRight size={20} weight="fill" className="text-accent-500" /> : <ToggleLeft size={20} className="text-zinc-300" />}
                  </button>
                </div>
                {replyEnabled && (
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Enter reply comment..."
                    className="mt-2 w-full brutal-input bg-white px-2 py-1.5 text-[11px] text-zinc-900"
                  />
                )}
              </div>
            </section>

            {/* Run button */}
            <div className="flex justify-end pt-2 pb-4">
              <button
                onClick={handleRun}
                disabled={running || !selectedAvatarId || (scriptMode === "group" ? !selectedGroupId : !selectedScriptId)}
                className="btn-ice flex items-center gap-2 text-xs font-semibold px-6 py-2.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <Play size={14} weight="fill" />
                )}
                {running ? "Running..." : "Run Mass Campaign"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
