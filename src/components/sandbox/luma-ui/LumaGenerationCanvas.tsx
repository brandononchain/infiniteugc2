"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CommandPill from "./CommandPill";
import AdvancedPopover from "./AdvancedPopover";
import AvatarPicker, { type Avatar } from "./AvatarPicker";
import HistoryPanel from "./HistoryPanel";
import type { Script } from "./ScriptSelector";
import type { TextOverlay } from "./tabs/TextOverlaysTab";
import type { ReplyConfig } from "./tabs/ReplyCommentTab";
import { Play, User } from "@phosphor-icons/react";

/* Card width for each aspect ratio (enlarged ~30%) */
const CARD_WIDTHS: Record<string, number> = {
  "9:16": 360,
  "16:9": 800,
  "1:1": 570,
  "4:3": 675,
};

/* Parse "W:H" → numeric ratio */
function parseRatio(r: string): number {
  const [w, h] = r.split(":").map(Number);
  return w / h;
}

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

  // History pull-up state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const pullAccRef = useRef(0);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  // Pull-down-to-reveal-history wheel handler
  const startDecay = useCallback(() => {
    const decay = () => {
      pullAccRef.current *= 0.82;
      if (pullAccRef.current < 0.01) {
        pullAccRef.current = 0;
        setPullProgress(0);
        return;
      }
      setPullProgress(pullAccRef.current);
      rafRef.current = requestAnimationFrame(decay);
    };
    rafRef.current = requestAnimationFrame(decay);
  }, []);

  useEffect(() => {
    if (historyOpen || showAvatarPicker) return;

    let decayTimeout: NodeJS.Timeout;

    const handler = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        cancelAnimationFrame(rafRef.current);
        clearTimeout(decayTimeout);

        pullAccRef.current = Math.min(pullAccRef.current + e.deltaY * 0.0015, 1);
        setPullProgress(pullAccRef.current);

        if (pullAccRef.current >= 1) {
          setHistoryOpen(true);
          pullAccRef.current = 0;
          setPullProgress(0);
          return;
        }

        decayTimeout = setTimeout(startDecay, 400);
      } else if (e.deltaY < 0 && pullAccRef.current > 0) {
        cancelAnimationFrame(rafRef.current);
        clearTimeout(decayTimeout);

        pullAccRef.current = Math.max(pullAccRef.current + e.deltaY * 0.0015, 0);
        setPullProgress(pullAccRef.current);

        if (pullAccRef.current <= 0) {
          clearTimeout(decayTimeout);
        } else {
          decayTimeout = setTimeout(startDecay, 400);
        }
      }
    };

    const el = canvasRef.current;
    if (!el) return;

    el.addEventListener("wheel", handler, { passive: true });
    return () => {
      el.removeEventListener("wheel", handler);
      clearTimeout(decayTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [historyOpen, showAvatarPicker, startDecay]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Canvas layer */}
      <div
        ref={canvasRef}
        className="absolute inset-0 flex flex-col"
        style={{
          transform: pullProgress > 0 ? `translateY(-${pullProgress * 40}px)` : undefined,
          transition: pullProgress > 0 ? "none" : "transform 0.3s ease-out",
        }}
      >
        {/* Background — flat black like Luma */}
        <div className="absolute inset-0 bg-[#0A0A0A]" />

        {/* Main Stage — grid for dead-center alignment */}
        <div className="relative flex-1 grid place-items-center pt-6 pb-64">
          {/* Preview Card — explicit width, dynamic aspect ratio */}
          <div
            style={{
              width: `min(${CARD_WIDTHS[aspectRatio] ?? 360}px, calc(100% - 80px))`,
            }}
          >
            {/* The card */}
            <div className="rounded-2xl overflow-hidden bg-[#141414] border border-white/[0.05] shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
              {/* Video area */}
              <div
                className="w-full bg-[#141414] grid place-items-center relative"
                style={{
                  aspectRatio: `${parseRatio(aspectRatio)}`,
                  maxHeight: "min(560px, calc(100dvh - 340px))",
                }}
              >
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

                {/* Centered content */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.06] grid place-items-center">
                    <Play size={22} weight="fill" className="text-zinc-600" />
                  </div>
                  <div className="text-center">
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
              </div>

              {/* Status bar at bottom of card */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.05] bg-[#141414]">
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

        {/* Bottom zone — hovers over the history peek */}
        <div className="absolute bottom-8 inset-x-0 flex flex-col items-center z-10 px-6">
          <div
            ref={bottomZoneRef}
            className="w-full max-w-[782px] flex flex-col items-center"
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

        {/* History peek — real cards peeking from bottom edge */}
        <div
          className="absolute bottom-0 inset-x-0 z-[5] overflow-hidden"
          style={{
            height: `${26 + pullProgress * 12}px`,
            transition: pullProgress > 0 ? "none" : "height 0.3s ease-out",
          }}
        >
          <div className="flex gap-3 justify-center max-w-[1400px] mx-auto px-8">
            {([
              { ratio: "9:16", label: "Avatar testimonial — skincare", date: "2h ago", engine: "HeyGen" },
              { ratio: "16:9", label: "Product showcase", date: "3h ago", engine: "Sora 2" },
              { ratio: "9:16", label: "TikTok reply", date: "5h ago", engine: "HeyGen" },
              { ratio: "9:16", label: "UGC ad — fitness app", date: "5h ago", engine: "OmniHuman 1.5" },
              { ratio: "1:1", label: "Instagram carousel", date: "1d ago", engine: "VEO3" },
            ] as const).map((card, i) => {
              const h = 340;
              const w = card.ratio === "9:16" ? h * 9 / 16
                : card.ratio === "16:9" ? h * 16 / 9
                : card.ratio === "1:1" ? h
                : h * 4 / 3;
              return (
                <div
                  key={i}
                  className="relative rounded-xl overflow-hidden border border-[#00A3FF]/20 bg-[#0A0A0A] flex-shrink-0 cursor-pointer hover:border-[#00A3FF]/40 transition-colors duration-200"
                  style={{ width: w, height: h }}
                  onClick={() => setHistoryOpen(true)}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.015] to-transparent" />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm border border-white/[0.04]">
                    <span className="text-[9px] text-zinc-500 font-medium">{card.ratio}</span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 px-3 py-2.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                    <p className="text-[11px] text-zinc-300 font-medium truncate">{card.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-zinc-600">{card.date}</span>
                      <span className="text-[9px] text-zinc-700">·</span>
                      <span className="text-[9px] text-zinc-600">{card.engine}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Soft glow flare beneath the peek cards */}
        <div
          className="absolute bottom-0 inset-x-0 h-20 pointer-events-none z-[4]"
          style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(0,163,255,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Thin blur line right at the edge */}
        <div
          className="absolute bottom-0 inset-x-0 h-[1px] pointer-events-none z-[6]"
          style={{
            background: "linear-gradient(90deg, transparent 10%, rgba(0,163,255,0.12) 30%, rgba(0,163,255,0.18) 50%, rgba(0,163,255,0.12) 70%, transparent 90%)",
            boxShadow: "0 0 12px 4px rgba(0,163,255,0.06)",
          }}
        />
      </div>

      {/* History Panel overlay */}
      <AnimatePresence>
        {historyOpen && (
          <HistoryPanel onClose={() => setHistoryOpen(false)} />
        )}
      </AnimatePresence>

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
