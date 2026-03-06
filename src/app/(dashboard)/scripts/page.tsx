"use client";

import { useState } from "react";
import { useScripts, useScriptGroups } from "@/hooks/use-data";
import { supabaseQueries } from "@/lib/api";
import {
  FileText,
  Plus,
  PencilSimple,
  FolderOpen,
  CircleNotch,
  X,
  Trash,
  Check,
  CaretDown,
} from "@phosphor-icons/react";

export default function Scripts() {
  const { data: scripts, loading, refetch: refetchScripts } = useScripts();
  const { data: scriptGroups, refetch: refetchGroups } = useScriptGroups();

  const [tab, setTab] = useState<"scripts" | "groups">("scripts");
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Script form
  const [scriptName, setScriptName] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [scriptGroupId, setScriptGroupId] = useState<string | null>(null);
  const [showGroupSelect, setShowGroupSelect] = useState(false);
  const [savingScript, setSavingScript] = useState(false);

  // Group form
  const [groupName, setGroupName] = useState("");
  const [selectedScriptIds, setSelectedScriptIds] = useState<string[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openNewScript = () => {
    setEditingId(null);
    setScriptName("");
    setScriptContent("");
    setScriptGroupId(null);
    setError(null);
    setShowScriptModal(true);
  };

  const openEditScript = (id: string) => {
    const script = scripts?.find((s) => s.id === id);
    if (!script) return;
    setEditingId(id);
    setScriptName(script.name);
    setScriptContent(script.content);
    setScriptGroupId(script.group_id || null);
    setError(null);
    setShowScriptModal(true);
  };

  const handleSaveScript = async () => {
    if (!scriptName.trim() || !scriptContent.trim()) return;
    setSavingScript(true);
    setError(null);
    try {
      if (editingId) {
        await supabaseQueries.updateScript(editingId, {
          name: scriptName,
          content: scriptContent,
          group_id: scriptGroupId,
        });
      } else {
        await supabaseQueries.createScript(scriptName, scriptContent, scriptGroupId || undefined);
      }
      setShowScriptModal(false);
      refetchScripts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save script");
    } finally {
      setSavingScript(false);
    }
  };

  const handleDeleteScript = async (id: string) => {
    setDeletingId(id);
    try {
      await supabaseQueries.deleteScript(id);
      refetchScripts();
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setSavingGroup(true);
    setError(null);
    try {
      await supabaseQueries.createScriptGroup(groupName, selectedScriptIds);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedScriptIds([]);
      refetchGroups();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setSavingGroup(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Scripts</h1>
            <p className="text-xs text-zinc-400">Write and manage your video scripts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setGroupName(""); setSelectedScriptIds([]); setError(null); setShowGroupModal(true); }}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 border border-white/[0.08] px-4 py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
            >
              <FolderOpen size={14} weight="bold" />
              New Group
            </button>
            <button
              onClick={openNewScript}
              className="btn-ice flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full"
            >
              <Plus size={14} weight="bold" />
              New Script
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {/* Tabs */}
        <div className="flex border-b border-white/[0.08] mb-6">
          <button
            onClick={() => setTab("scripts")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === "scripts" ? "border-accent-500 text-[#00BCFF]" : "border-transparent text-zinc-400"
            }`}
          >
            Scripts ({scripts?.length ?? 0})
          </button>
          <button
            onClick={() => setTab("groups")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === "groups" ? "border-accent-500 text-[#00BCFF]" : "border-transparent text-zinc-400"
            }`}
          >
            Groups ({scriptGroups?.length ?? 0})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : tab === "scripts" ? (
          scripts && scripts.length > 0 ? (
            <div className="space-y-3">
              {scripts.map((script) => (
                <div key={script.id} className="bg-[#1e1e22] rounded-xl p-4 brutal-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} weight="duotone" className="text-accent-500" />
                      <p className="text-sm font-bold text-zinc-200">{script.name}</p>
                      {script.group_id && (
                        <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                          {scriptGroups?.find((g) => g.id === script.group_id)?.name || "Group"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditScript(script.id)}
                        className="text-zinc-400 hover:text-[#00BCFF] transition-colors"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteScript(script.id)}
                        disabled={deletingId === script.id}
                        className="text-zinc-400 hover:text-rose-500 transition-colors"
                      >
                        {deletingId === script.id ? <CircleNotch size={12} className="animate-spin" /> : <Trash size={14} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-3 whitespace-pre-wrap">{script.content}</p>
                  <p className="text-[10px] text-zinc-400 mt-2">
                    {script.content.split(/\s+/).length} words &middot; {new Date(script.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <FileText size={24} weight="duotone" className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-200 mb-1">No scripts yet</h3>
              <p className="text-xs text-zinc-400 mb-1">Write your first script or let AI generate one for you.</p>
              <p className="text-xs text-zinc-400 mb-6">Organize scripts into groups for mass campaigns.</p>
              <button
                onClick={openNewScript}
                className="inline-flex items-center gap-2 btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
              >
                <PencilSimple size={14} weight="bold" />
                Write Your First Script
              </button>
            </div>
          )
        ) : (
          scriptGroups && scriptGroups.length > 0 ? (
            <div className="space-y-3">
              {scriptGroups.map((group) => (
                <div key={group.id} className="bg-[#1e1e22] rounded-xl p-4 brutal-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <FolderOpen size={18} weight="duotone" className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-200">{group.name}</p>
                      <p className="text-[10px] text-zinc-400">{group.script_ids?.length ?? 0} scripts</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={24} weight="duotone" className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-bold text-zinc-200 mb-1">No script groups yet</h3>
              <p className="text-xs text-zinc-400 mb-6">Create groups to organize scripts for mass campaigns.</p>
              <button
                onClick={() => { setGroupName(""); setSelectedScriptIds([]); setError(null); setShowGroupModal(true); }}
                className="inline-flex items-center gap-2 btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
              >
                <FolderOpen size={14} weight="bold" />
                Create First Group
              </button>
            </div>
          )
        )}
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[#1e1e22] rounded-2xl p-6 w-full max-w-lg shadow-xl border border-white/[0.08]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-zinc-100">{editingId ? "Edit Script" : "New Script"}</h2>
              <button onClick={() => setShowScriptModal(false)} className="text-zinc-400 hover:text-zinc-400">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Script Name</label>
                <input
                  type="text"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="e.g., Product Launch Hook"
                  className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Content</label>
                <textarea
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  rows={8}
                  placeholder="Write your video script here..."
                  className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400 resize-none"
                />
                <p className="text-[10px] text-zinc-400 mt-1">{scriptContent.split(/\s+/).filter(Boolean).length} words</p>
              </div>
              <div className="relative">
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Group (optional)</label>
                <button
                  onClick={() => setShowGroupSelect(!showGroupSelect)}
                  className="w-full flex items-center justify-between brutal-select bg-[#1e1e22] px-3 py-2 text-sm text-zinc-400"
                >
                  <span>{scriptGroups?.find((g) => g.id === scriptGroupId)?.name || "No group"}</span>
                  <CaretDown size={14} className="text-zinc-400" />
                </button>
                {showGroupSelect && scriptGroups && scriptGroups.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e22] border border-white/[0.08] rounded-lg shadow-lg z-20 overflow-hidden">
                    <button onClick={() => { setScriptGroupId(null); setShowGroupSelect(false); }} className="w-full text-left px-3 py-2 text-sm text-zinc-400 hover:bg-white/[0.03]">No group</button>
                    {scriptGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => { setScriptGroupId(g.id); setShowGroupSelect(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/[0.03] ${scriptGroupId === g.id ? "bg-[#00BCFF]/10 font-semibold" : "text-zinc-400"}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowScriptModal(false)} className="text-xs font-semibold text-zinc-400 px-4 py-2">Cancel</button>
              <button
                onClick={handleSaveScript}
                disabled={savingScript || !scriptName.trim() || !scriptContent.trim()}
                className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full disabled:opacity-50"
              >
                {savingScript && <CircleNotch size={12} className="animate-spin" />}
                {savingScript ? "Saving..." : editingId ? "Update" : "Create Script"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-[#1e1e22] rounded-2xl p-6 w-full max-w-md shadow-xl border border-white/[0.08]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-zinc-100">New Script Group</h2>
              <button onClick={() => setShowGroupModal(false)} className="text-zinc-400 hover:text-zinc-400">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Product Launch Scripts"
                  className="w-full brutal-input bg-[#1e1e22] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-400"
                />
              </div>
              {scripts && scripts.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 mb-1 block">Select Scripts</label>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {scripts.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedScriptIds((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          );
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-xs transition-colors ${
                          selectedScriptIds.includes(s.id) ? "bg-[#00BCFF]/10 text-[#00BCFF] font-semibold" : "text-zinc-400 hover:bg-white/[0.03]"
                        }`}
                      >
                        {selectedScriptIds.includes(s.id) && <Check size={12} weight="bold" className="text-[#00BCFF]" />}
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowGroupModal(false)} className="text-xs font-semibold text-zinc-400 px-4 py-2">Cancel</button>
              <button
                onClick={handleCreateGroup}
                disabled={savingGroup || !groupName.trim()}
                className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full disabled:opacity-50"
              >
                {savingGroup && <CircleNotch size={12} className="animate-spin" />}
                {savingGroup ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
