"use client";

import { CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

const CAPTION_STYLES = ["White", "Black", "Red", "Plain White"] as const;

interface AutoCaptionsTabProps {
  captionsEnabled: boolean;
  setCaptionsEnabled: (v: boolean) => void;
  captionStyle: string;
  setCaptionStyle: (v: string) => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
        checked ? "bg-[#00A3FF]" : "bg-white/[0.10]"
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export { Toggle };

export default function AutoCaptionsTab({
  captionsEnabled,
  setCaptionsEnabled,
  captionStyle,
  setCaptionStyle,
}: AutoCaptionsTabProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-zinc-200 font-medium">Auto-Captions</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            TikTok-style synced captions
          </p>
        </div>
        <Toggle checked={captionsEnabled} onChange={() => setCaptionsEnabled(!captionsEnabled)} />
      </div>

      <AnimatePresence>
        {captionsEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              <label className="text-[11px] text-zinc-500 font-medium">
                Caption style
              </label>
              <div className="relative">
                <select
                  value={captionStyle}
                  onChange={(e) => setCaptionStyle(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-zinc-200 px-3 py-2 focus:border-[#00A3FF]/50 focus:outline-none appearance-none cursor-pointer transition-colors duration-150 hover:bg-white/[0.06]"
                >
                  {CAPTION_STYLES.map((s) => (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
