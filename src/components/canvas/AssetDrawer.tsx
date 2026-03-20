"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCanvas, type AssetTab } from "@/lib/canvas/context";
import { supabaseQueries } from "@/lib/api";
import type { Avatar, Voice, Script } from "@/types";
import type { AvatarNodeData, VoiceNodeData, ScriptNodeData } from "@/lib/canvas/types";
import { X, Check, Mic, UserCircle, FileText, Loader2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   AssetDrawer — Floating panel for selecting assets
   Avatars / Voices / Scripts — each configures its canvas node
   ═══════════════════════════════════════════════════════════ */

export function AssetDrawer() {
  const { assetTab, setAssetTab, setActivePanel, state, dispatch, updateNodeData, getNodeByType, loadDefaultWorkflow } = useCanvas();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, v, s] = await Promise.all([
        supabaseQueries.getAvatars(),
        supabaseQueries.getVoices(),
        supabaseQueries.getScripts(),
      ]);
      setAvatars(a);
      setVoices(v);
      setScripts(s);
      setLoading(false);
    })();
  }, []);

  // We use addNode instead of loadDefaultWorkflow for targeted asset selection.
  // addNode auto-creates or updates the node of that type, so it always works
  // even when the canvas is empty.
  const selectAvatar = (av: Avatar) => {
    if (state.nodes.length === 0) loadDefaultWorkflow();
    // Use a timeout to let the state update if we just loaded the workflow
    const apply = () => {
      const node = getNodeByType("avatar");
      if (node) {
        updateNodeData(node.id, { avatarId: av.id, avatar: av } as AvatarNodeData);
      } else {
        // Dispatch directly — ADD_NODE will create the node with the data
        dispatch({
          type: "ADD_NODE",
          payload: { nodeType: "avatar", data: { avatarId: av.id, avatar: av } },
        });
      }
    };
    if (state.nodes.length === 0) {
      setTimeout(apply, 50);
    } else {
      apply();
    }
  };

  const selectVoice = (v: Voice) => {
    if (state.nodes.length === 0) loadDefaultWorkflow();
    const apply = () => {
      const node = getNodeByType("voice");
      if (node) {
        updateNodeData(node.id, { voiceId: v.id, voice: v } as VoiceNodeData);
      } else {
        dispatch({
          type: "ADD_NODE",
          payload: { nodeType: "voice", data: { voiceId: v.id, voice: v } },
        });
      }
    };
    if (state.nodes.length === 0) {
      setTimeout(apply, 50);
    } else {
      apply();
    }
  };

  const selectScript = (s: Script) => {
    if (state.nodes.length === 0) loadDefaultWorkflow();
    const apply = () => {
      const node = getNodeByType("script");
      if (node) {
        updateNodeData(node.id, { scriptId: s.id, script: s, content: s.content } as ScriptNodeData);
      } else {
        dispatch({
          type: "ADD_NODE",
          payload: { nodeType: "script", data: { scriptId: s.id, script: s, content: s.content } },
        });
      }
    };
    if (state.nodes.length === 0) {
      setTimeout(apply, 50);
    } else {
      apply();
    }
  };

  const avatarNode = getNodeByType("avatar");
  const voiceNode = getNodeByType("voice");
  const scriptNode = getNodeByType("script");
  const selectedAvatarId = (avatarNode?.data as AvatarNodeData)?.avatarId;
  const selectedVoiceId = (voiceNode?.data as VoiceNodeData)?.voiceId;
  const selectedScriptId = (scriptNode?.data as ScriptNodeData)?.scriptId;

  const tabs: { id: AssetTab; label: string; icon: typeof UserCircle; count: number }[] = [
    { id: "avatars", label: "Avatars", icon: UserCircle, count: avatars.length },
    { id: "voices", label: "Voices", icon: Mic, count: voices.length },
    { id: "scripts", label: "Scripts", icon: FileText, count: scripts.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute top-3 right-3 bottom-3 w-[340px] z-40 flex flex-col rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl"
      style={{ background: "rgba(12, 12, 15, 0.88)", backdropFilter: "blur(40px) saturate(180%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-[13px] font-semibold text-white/90">Assets</h3>
        <button
          onClick={() => setActivePanel(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-2 pb-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setAssetTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                assetTab === tab.id
                  ? "bg-white/8 text-white/90"
                  : "text-white/35 hover:text-white/55 hover:bg-white/[0.03]"
              }`}
            >
              <Icon size={13} />
              {tab.label}
              <span className="text-[9px] text-white/20">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="text-white/20 animate-spin" />
          </div>
        ) : assetTab === "avatars" ? (
          <div className="grid grid-cols-2 gap-2">
            {avatars.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-[11px] text-white/25">No avatars yet</div>
            ) : (
              avatars.map((av) => (
                <button
                  key={av.id}
                  onClick={() => selectAvatar(av)}
                  className={`relative rounded-xl overflow-hidden border transition-all ${
                    selectedAvatarId === av.id
                      ? "border-purple-500/40 ring-1 ring-purple-500/20"
                      : "border-white/[0.06] hover:border-white/12"
                  }`}
                >
                  <div className="aspect-square bg-white/[0.02]">
                    {av.image_url ? (
                      <img src={av.image_url} alt={av.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/15 text-lg font-bold">
                        {av.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5 text-[10px] font-medium text-white/50 truncate text-center">{av.name}</div>
                  {selectedAvatarId === av.id && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        ) : assetTab === "voices" ? (
          <div className="space-y-1.5">
            {voices.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-white/25">No voices yet</div>
            ) : (
              voices.map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectVoice(v)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 border transition-all ${
                    selectedVoiceId === v.id
                      ? "border-pink-500/40 bg-pink-500/8"
                      : "border-white/[0.05] hover:border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
                    style={{
                      background: selectedVoiceId === v.id ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.04)",
                      color: selectedVoiceId === v.id ? "#ec4899" : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {v.name[0]}
                  </div>
                  <span className="text-[12px] font-medium text-white/70 truncate">{v.name}</span>
                  {selectedVoiceId === v.id && <Check size={13} className="ml-auto text-pink-400 shrink-0" />}
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {scripts.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-white/25">No scripts yet</div>
            ) : (
              scripts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectScript(s)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 border transition-all ${
                    selectedScriptId === s.id
                      ? "border-emerald-500/40 bg-emerald-500/8"
                      : "border-white/[0.05] hover:border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="text-[11px] font-medium text-white/70 truncate">{s.name}</div>
                  <div className="text-[10px] text-white/30 truncate mt-0.5">{s.content}</div>
                  {selectedScriptId === s.id && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-400/70">
                      <Check size={9} /> Selected
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
