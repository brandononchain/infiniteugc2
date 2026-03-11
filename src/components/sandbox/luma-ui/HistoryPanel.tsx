"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Play, CaretUp } from "@phosphor-icons/react";

interface HistoryItem {
  id: string;
  ratio: "9:16" | "16:9" | "1:1" | "4:3";
  label: string;
  date: string;
  engine: string;
}

const HISTORY: HistoryItem[] = [
  { id: "1", ratio: "9:16", label: "Avatar testimonial — skincare", date: "2h ago", engine: "HeyGen" },
  { id: "2", ratio: "16:9", label: "Product showcase", date: "3h ago", engine: "Sora 2" },
  { id: "3", ratio: "9:16", label: "TikTok reply", date: "5h ago", engine: "HeyGen" },
  { id: "4", ratio: "9:16", label: "UGC ad — fitness app", date: "5h ago", engine: "OmniHuman 1.5" },
  { id: "5", ratio: "1:1", label: "Instagram carousel", date: "1d ago", engine: "VEO3" },
  { id: "6", ratio: "16:9", label: "YouTube intro", date: "1d ago", engine: "Sora 2 Pro" },
  { id: "7", ratio: "9:16", label: "Vertical reel — travel", date: "2d ago", engine: "Seedance 1.5 Pro" },
  { id: "8", ratio: "4:3", label: "Presentation clip", date: "2d ago", engine: "VEO3" },
  { id: "9", ratio: "9:16", label: "Story ad — supplements", date: "3d ago", engine: "HeyGen" },
  { id: "10", ratio: "16:9", label: "Demo walkthrough", date: "3d ago", engine: "Sora 2" },
  { id: "11", ratio: "9:16", label: "Reaction video", date: "4d ago", engine: "OmniHuman 1.5" },
  { id: "12", ratio: "1:1", label: "Square promo — sale", date: "5d ago", engine: "VEO3" },
  { id: "13", ratio: "9:16", label: "Testimonial v2", date: "5d ago", engine: "HeyGen" },
  { id: "14", ratio: "16:9", label: "Brand story", date: "6d ago", engine: "Sora 2 Pro" },
  { id: "15", ratio: "9:16", label: "Quick tip — morning routine", date: "1w ago", engine: "HeyGen" },
  { id: "16", ratio: "4:3", label: "Event recap", date: "1w ago", engine: "Seedance 1.5 Pro" },
  { id: "17", ratio: "9:16", label: "Behind the scenes", date: "1w ago", engine: "OmniHuman 1.5" },
  { id: "18", ratio: "16:9", label: "Tutorial — editing", date: "2w ago", engine: "Sora 2" },
  { id: "19", ratio: "1:1", label: "Announcement post", date: "2w ago", engine: "VEO3" },
  { id: "20", ratio: "9:16", label: "Unboxing", date: "2w ago", engine: "HeyGen" },
];

const ROW_HEIGHT = 340;

function getCardWidth(ratio: string): number {
  switch (ratio) {
    case "9:16": return ROW_HEIGHT * 9 / 16;
    case "16:9": return ROW_HEIGHT * 16 / 9;
    case "1:1": return ROW_HEIGHT;
    case "4:3": return ROW_HEIGHT * 4 / 3;
    default: return ROW_HEIGHT;
  }
}

interface HistoryPanelProps {
  onClose: () => void;
}

export default function HistoryPanel({ onClose }: HistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef(0);
  const [pullBack, setPullBack] = useState(0);
  const rafRef = useRef<number>(0);

  // Scroll-up-at-top to return to canvas
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let decayTimeout: NodeJS.Timeout;

    const startDecay = () => {
      const decay = () => {
        pullRef.current *= 0.82;
        if (pullRef.current < 0.01) {
          pullRef.current = 0;
          setPullBack(0);
          return;
        }
        setPullBack(pullRef.current);
        rafRef.current = requestAnimationFrame(decay);
      };
      rafRef.current = requestAnimationFrame(decay);
    };

    const handler = (e: WheelEvent) => {
      if (el.scrollTop <= 0 && e.deltaY < 0) {
        e.preventDefault();
        cancelAnimationFrame(rafRef.current!);
        clearTimeout(decayTimeout);

        pullRef.current = Math.min(pullRef.current + Math.abs(e.deltaY) * 0.0015, 1);
        setPullBack(pullRef.current);

        if (pullRef.current >= 1) {
          pullRef.current = 0;
          setPullBack(0);
          onClose();
          return;
        }

        decayTimeout = setTimeout(startDecay, 400);
      } else {
        // Reset if scrolling normally
        if (pullRef.current > 0) {
          pullRef.current = 0;
          setPullBack(0);
        }
      }
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      clearTimeout(decayTimeout);
      cancelAnimationFrame(rafRef.current!);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute inset-0 z-30 flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% 20%, #0A0A0C 0%, #050505 50%, #030303 100%)",
      }}
    >
      {/* Pull-back indicator */}
      {pullBack > 0 && (
        <div
          className="absolute top-0 inset-x-0 z-20 flex justify-center pt-3 pointer-events-none"
          style={{ opacity: pullBack }}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-sm">
            <CaretUp size={10} weight="bold" className="text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-medium">
              {pullBack > 0.6 ? "Release to go back" : "Pull up to return"}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06] flex-shrink-0">
        <div>
          <h2 className="text-[16px] text-white font-semibold">History</h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {HISTORY.length} generations
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.06] transition-all duration-150"
        >
          <ArrowUp size={13} weight="bold" />
          <span className="text-[11px] font-semibold tracking-wide">Back to canvas</span>
        </button>
      </div>

      {/* Grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-8 py-6"
        style={{
          transform: pullBack > 0 ? `translateY(${pullBack * 30}px)` : undefined,
          transition: pullBack > 0 ? "none" : "transform 0.3s ease-out",
        }}
      >
        <div className="flex flex-wrap gap-3 justify-center max-w-[1400px] mx-auto">
          {HISTORY.map((item) => (
            <button
              key={item.id}
              className="group relative rounded-xl overflow-hidden border border-[#00A3FF]/20 hover:border-[#00A3FF]/50 bg-[#0A0A0A] transition-all duration-200 hover:shadow-[0_0_24px_rgba(0,163,255,0.08)] flex-shrink-0"
              style={{
                width: getCardWidth(item.ratio),
                height: ROW_HEIGHT,
              }}
            >
              {/* Placeholder gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.015] to-transparent" />

              {/* Center play icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center backdrop-blur-sm">
                  <Play size={16} weight="fill" className="text-zinc-400 ml-0.5" />
                </div>
              </div>

              {/* Bottom label */}
              <div className="absolute bottom-0 inset-x-0 px-3 py-2.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                <p className="text-[11px] text-zinc-300 font-medium truncate">
                  {item.label}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] text-zinc-600">{item.date}</span>
                  <span className="text-[9px] text-zinc-700">·</span>
                  <span className="text-[9px] text-zinc-600">{item.engine}</span>
                </div>
              </div>

              {/* Ratio badge */}
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm border border-white/[0.04]">
                <span className="text-[9px] text-zinc-500 font-medium">
                  {item.ratio}
                </span>
              </div>

              {/* Hover tint */}
              <div className="absolute inset-0 bg-[#00A3FF]/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
