"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import CommandPill from "./CommandPill";
import AdvancedPopover from "./AdvancedPopover";
import AvatarPicker, { type Avatar } from "./AvatarPicker";
import type { Script } from "./ScriptSelector";
import type { TextOverlay } from "./tabs/TextOverlaysTab";
import type { ReplyConfig } from "./tabs/ReplyCommentTab";
import { Play, User } from "@phosphor-icons/react";

export default function LumaGenerationCanvas() {
  const [prompt, setPrompt] = useState("");
  const [videoEngine, setVideoEngine] = useState("HeyGen");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [draftMode, setDraftMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);

  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionStyle, setCaptionStyle] = useState("White");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [replyEnabled, setReplyEnabled] = useState(false);
  const [replyConfig, setReplyConfig] = useState<ReplyConfig>({
    avatarUrl: "",
    name: "",
    comment: "",
    scale: 1,
    rotation: 0,
    startTime: 0,
    duration: 5,
  });

  // Click outside bottom zone to close settings
  const bottomZoneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (
        bottomZoneRef.current &&
        !bottomZoneRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* Background — subtle radial gradient like Luma */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, #0C0C0E 0%, #050505 60%, #030303 100%)",
        }}
      />

      {/* Main Stage */}
      <div className="relative flex-1 flex items-center justify-center px-10 pt-6 pb-56">
        {/* Preview Card — Luma-style dark cinematic card */}
        <div className="relative w-full max-w-[440px]">
          {/* The card */}
          <div className="relative rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
            {/* Video area — 9:16 portrait aspect */}
            <div className="aspect-[9/16] max-h-[480px] bg-gradient-to-b from-[#0E0E10] to-[#08080A] flex flex-col items-center justify-center gap-4 relative">
              {/* Selected avatar indicator */}
              {selectedAvatar && (
                <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.08]">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: selectedAvatar.color + "30" }}
                  >
                    <User size={10} weight="fill" style={{ color: selectedAvatar.color }} />
                  </div>
                  <span className="text-[10px] text-zinc-300 font-medium">
                    {selectedAvatar.name}
                  </span>
                </div>
              )}

              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Play size={22} weight="fill" className="text-zinc-600 ml-0.5" />
              </div>
              <div className="text-center px-6">
                <p className="text-zinc-500 text-[13px] font-medium">
                  {selectedAvatar
                    ? `Ready to generate with ${selectedAvatar.name}`
                    : "Select an avatar to begin"}
                </p>
                <p className="text-zinc-600 text-[11px] mt-1">
                  {selectedScript
                    ? selectedScript.title
                    : "Describe your scene below"}
                </p>
              </div>
            </div>

            {/* Status bar at bottom of card */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-[#0A0A0A]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 font-medium">
                  {draftMode ? "Draft" : "HiFi"} · 5s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                  {aspectRatio}
                </span>
                <span className="text-[10px] text-zinc-600">·</span>
                <span className="text-[10px] text-zinc-600 font-medium">
                  {videoEngine}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom zone */}
      <div className="absolute bottom-5 inset-x-0 flex flex-col items-center z-10 px-6">
        <div
          ref={bottomZoneRef}
          className="w-full max-w-[680px] flex flex-col items-center"
        >
          <AnimatePresence>
            {showSettings && (
              <AdvancedPopover
                captionsEnabled={captionsEnabled}
                setCaptionsEnabled={setCaptionsEnabled}
                captionStyle={captionStyle}
                setCaptionStyle={setCaptionStyle}
                textOverlays={textOverlays}
                setTextOverlays={setTextOverlays}
                replyEnabled={replyEnabled}
                setReplyEnabled={setReplyEnabled}
                replyConfig={replyConfig}
                setReplyConfig={setReplyConfig}
              />
            )}
          </AnimatePresence>

          <CommandPill
            prompt={prompt}
            setPrompt={setPrompt}
            videoEngine={videoEngine}
            setVideoEngine={setVideoEngine}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            draftMode={draftMode}
            setDraftMode={setDraftMode}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            selectedAvatar={selectedAvatar}
            onAvatarClick={() => setShowAvatarPicker(true)}
            selectedScript={selectedScript}
            onSelectScript={setSelectedScript}
          />
        </div>
      </div>

      {/* Avatar Picker Overlay */}
      <AnimatePresence>
        {showAvatarPicker && (
          <AvatarPicker
            selectedAvatar={selectedAvatar}
            onSelect={setSelectedAvatar}
            onClose={() => setShowAvatarPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
