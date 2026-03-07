"use client";

import { Plus, X, CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

export interface TextOverlay {
  text: string;
  style: string;
  startTime: number;
  duration: number;
  fontSize: number;
}

const OVERLAY_STYLES = ["White", "Black", "Red", "Plain White"] as const;

interface TextOverlaysTabProps {
  textOverlays: TextOverlay[];
  setTextOverlays: React.Dispatch<React.SetStateAction<TextOverlay[]>>;
}

export default function TextOverlaysTab({
  textOverlays,
  setTextOverlays,
}: TextOverlaysTabProps) {
  const addOverlay = () => {
    setTextOverlays((prev) => [
      ...prev,
      { text: "", style: "White", startTime: 0, duration: 5, fontSize: 72 },
    ]);
  };

  const removeOverlay = (idx: number) => {
    setTextOverlays((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOverlay = (idx: number, updates: Partial<TextOverlay>) => {
    setTextOverlays((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...updates } : o))
    );
  };

  const inputClass =
    "bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-zinc-200 px-3 py-2 focus:border-[#00A3FF]/50 focus:outline-none transition-colors duration-150 hover:bg-white/[0.06]";

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-zinc-200 font-medium">Text Overlays</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Add your own text</p>
        </div>
        <button
          onClick={addOverlay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.06] text-[11px] font-semibold text-zinc-300 hover:text-white transition-all duration-150"
        >
          <Plus size={12} weight="bold" />
          Add text
        </button>
      </div>

      <AnimatePresence>
        {textOverlays.map((overlay, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-zinc-400 font-medium">
                  Layer {idx + 1}
                </span>
                <button
                  onClick={() => removeOverlay(idx)}
                  className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] transition-all duration-150"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Text input */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500 font-medium">
                  Text
                </label>
                <textarea
                  value={overlay.text}
                  onChange={(e) =>
                    updateOverlay(idx, {
                      text: e.target.value.slice(0, 500),
                    })
                  }
                  placeholder="Enter overlay text..."
                  rows={2}
                  className={`w-full ${inputClass} resize-none`}
                />
                <p className="text-[10px] text-zinc-600 text-right tabular-nums">
                  {overlay.text.length}/500
                </p>
              </div>

              {/* Style dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500 font-medium">
                  Style
                </label>
                <div className="relative">
                  <select
                    value={overlay.style}
                    onChange={(e) =>
                      updateOverlay(idx, { style: e.target.value })
                    }
                    className={`w-full ${inputClass} appearance-none cursor-pointer pr-8`}
                  >
                    {OVERLAY_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                  />
                </div>
              </div>

              {/* Timing row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 font-medium">
                    Start (s)
                  </label>
                  <input
                    type="number"
                    value={overlay.startTime}
                    onChange={(e) =>
                      updateOverlay(idx, {
                        startTime: Number(e.target.value),
                      })
                    }
                    className={`w-full ${inputClass} tabular-nums`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 font-medium">
                    Duration (s)
                  </label>
                  <input
                    type="number"
                    value={overlay.duration}
                    onChange={(e) =>
                      updateOverlay(idx, {
                        duration: Number(e.target.value),
                      })
                    }
                    className={`w-full ${inputClass} tabular-nums`}
                  />
                </div>
              </div>

              {/* Font size */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500 font-medium">
                  Font size
                </label>
                <input
                  type="number"
                  value={overlay.fontSize}
                  onChange={(e) =>
                    updateOverlay(idx, {
                      fontSize: Number(e.target.value),
                    })
                  }
                  className={`w-full ${inputClass} tabular-nums`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {textOverlays.length === 0 && (
        <div className="py-6 flex flex-col items-center gap-1.5">
          <p className="text-[12px] text-zinc-500">No text overlays</p>
          <p className="text-[11px] text-zinc-600">
            Click &quot;Add text&quot; to create one.
          </p>
        </div>
      )}
    </div>
  );
}
