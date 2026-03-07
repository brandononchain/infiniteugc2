"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Plus,
  VideoCamera,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  ArrowUp,
  CaretDown,
  Keyhole,
  Eye,
  PencilSimple,
  User,
  BookOpen,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import type { Avatar } from "./AvatarPicker";
import ScriptSelector, { type Script } from "./ScriptSelector";

const ENGINES = [
  "HeyGen",
  "OmniHuman 1.5",
  "Seedance 1.5 Pro",
  "Sora 2",
  "Sora 2 Pro",
  "VEO3",
] as const;
const RATIOS = ["9:16", "16:9", "1:1", "4:3"] as const;

interface CommandPillProps {
  prompt: string;
  setPrompt: (v: string) => void;
  videoEngine: string;
  setVideoEngine: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  draftMode: boolean;
  setDraftMode: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  selectedAvatar: Avatar | null;
  onAvatarClick: () => void;
  selectedScript: Script | null;
  onSelectScript: (script: Script | null) => void;
}

export default function CommandPill({
  prompt,
  setPrompt,
  videoEngine,
  setVideoEngine,
  aspectRatio,
  setAspectRatio,
  draftMode,
  setDraftMode,
  showSettings,
  setShowSettings,
  selectedAvatar,
  onAvatarClick,
  selectedScript,
  onSelectScript,
}: CommandPillProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  const [showEngineMenu, setShowEngineMenu] = useState(false);
  const [showScriptMenu, setShowScriptMenu] = useState(false);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    },
    [setPrompt]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
    }
  };

  // Click-outside handlers
  useEffect(() => {
    if (!showEngineMenu) return;
    const handler = (e: MouseEvent) => {
      if (engineRef.current && !engineRef.current.contains(e.target as Node)) {
        setShowEngineMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEngineMenu]);

  useEffect(() => {
    if (!showScriptMenu) return;
    const handler = (e: MouseEvent) => {
      if (scriptRef.current && !scriptRef.current.contains(e.target as Node)) {
        setShowScriptMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showScriptMenu]);

  return (
    <div className="w-full flex flex-col items-center gap-3.5">
      {/* Action pills */}
      <div className="flex items-center gap-2.5">
        {[
          { label: "KEYFRAME", icon: Keyhole },
          { label: "REFERENCE", icon: Eye },
          { label: "MODIFY", icon: PencilSimple },
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-[11px] font-semibold tracking-widest text-zinc-400 hover:text-zinc-200 transition-all duration-200 uppercase"
          >
            <Icon size={14} weight="bold" />
            {label}
          </button>
        ))}
      </div>

      {/* Main prompt pill */}
      <div className="relative w-full bg-[#0D0D0D]/90 backdrop-blur-2xl rounded-2xl border border-white/[0.07] shadow-[0_4px_48px_rgba(0,0,0,0.55)]">
        {/* Textarea row */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to see..."
            rows={1}
            className="w-full bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed"
            style={{ maxHeight: 160 }}
          />
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.05]" />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Left icons */}
          <div className="flex items-center">
            {/* Avatar button */}
            <button
              onClick={onAvatarClick}
              className="p-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-150 flex items-center gap-1.5"
              title="Select avatar"
            >
              {selectedAvatar ? (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: selectedAvatar.color + "30",
                    border: `1px solid ${selectedAvatar.color}50`,
                  }}
                >
                  <User
                    size={12}
                    weight="fill"
                    style={{ color: selectedAvatar.color }}
                  />
                </div>
              ) : (
                <User size={20} className="text-zinc-500" />
              )}
            </button>

            <button className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all duration-150">
              <Plus size={18} weight="bold" />
            </button>
            <button className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all duration-150">
              <VideoCamera size={20} />
            </button>
            <button className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all duration-150">
              <InfinityIcon size={20} />
            </button>

            <div className="w-px h-5 bg-white/[0.06] mx-2" />

            {/* Script selector */}
            <div ref={scriptRef} className="relative">
              <button
                onClick={() => setShowScriptMenu(!showScriptMenu)}
                className={`p-2.5 rounded-lg transition-all duration-150 ${
                  showScriptMenu || selectedScript
                    ? "text-[#00A3FF] bg-[#00A3FF]/[0.08]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]"
                }`}
                title="Script library"
              >
                <BookOpen size={20} />
              </button>
              <AnimatePresence>
                {showScriptMenu && (
                  <ScriptSelector
                    selectedScript={selectedScript}
                    onSelect={onSelectScript}
                    onClose={() => setShowScriptMenu(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-lg transition-all duration-150 ${
                showSettings
                  ? "text-[#00A3FF] bg-[#00A3FF]/[0.08]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]"
              }`}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Draft toggle */}
            <button
              onClick={() => setDraftMode(!draftMode)}
              className="flex items-center gap-2"
            >
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                Draft
              </span>
              <div
                className={`w-8 h-[18px] rounded-full relative transition-colors duration-200 flex-shrink-0 ${
                  draftMode ? "bg-[#00A3FF]" : "bg-white/[0.10]"
                }`}
              >
                <div
                  className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                    draftMode ? "left-[16px]" : "left-[2px]"
                  }`}
                />
              </div>
            </button>

            {/* Engine selector */}
            <div ref={engineRef} className="relative">
              <button
                onClick={() => setShowEngineMenu(!showEngineMenu)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all duration-150 whitespace-nowrap"
              >
                <span className="text-[11px] font-semibold tracking-wide text-zinc-300">
                  {videoEngine}&nbsp;·&nbsp;{aspectRatio}
                </span>
                <CaretDown
                  size={10}
                  weight="bold"
                  className={`text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                    showEngineMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showEngineMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                    className="absolute bottom-[calc(100%+8px)] right-0 w-[220px] bg-[#0D0D0D]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-50"
                  >
                    <div className="p-2">
                      <p className="px-2 py-1 text-[9px] uppercase tracking-widest text-zinc-600 font-semibold">
                        Engine
                      </p>
                      {ENGINES.map((eng) => (
                        <button
                          key={eng}
                          onClick={() => setVideoEngine(eng)}
                          className={`w-full text-left text-[12px] px-2.5 py-1.5 rounded-lg transition-colors duration-100 ${
                            videoEngine === eng
                              ? "text-[#00A3FF] bg-[#00A3FF]/[0.07]"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                          }`}
                        >
                          {eng}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-white/[0.06] p-2">
                      <p className="px-2 py-1 text-[9px] uppercase tracking-widest text-zinc-600 font-semibold">
                        Aspect Ratio
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {RATIOS.map((r) => (
                          <button
                            key={r}
                            onClick={() => setAspectRatio(r)}
                            className={`text-[11px] py-1.5 rounded-lg text-center font-medium transition-colors duration-100 ${
                              aspectRatio === r
                                ? "text-[#00A3FF] bg-[#00A3FF]/[0.07]"
                                : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Generate */}
            <button
              disabled={!prompt.trim()}
              className="w-9 h-9 rounded-full bg-[#00A3FF] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(0,163,255,0.35)] hover:shadow-[0_0_24px_rgba(0,163,255,0.55)] hover:brightness-110 transition-all duration-200 disabled:opacity-20 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <ArrowUp size={17} weight="bold" className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
