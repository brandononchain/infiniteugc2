"use client";

import {
  UserCircle,
  UploadSimple,
  Minus as MinusIcon,
  Plus as PlusIcon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Toggle } from "./AutoCaptionsTab";

export interface ReplyConfig {
  avatarUrl: string;
  name: string;
  comment: string;
  scale: number;
  rotation: number;
  startTime: number;
  duration: number;
}

interface ReplyCommentTabProps {
  replyEnabled: boolean;
  setReplyEnabled: (v: boolean) => void;
  replyConfig: ReplyConfig;
  setReplyConfig: React.Dispatch<React.SetStateAction<ReplyConfig>>;
}

export default function ReplyCommentTab({
  replyEnabled,
  setReplyEnabled,
  replyConfig,
  setReplyConfig,
}: ReplyCommentTabProps) {
  const update = (updates: Partial<ReplyConfig>) => {
    setReplyConfig((prev) => ({ ...prev, ...updates }));
  };

  const inputClass =
    "bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-zinc-200 px-3 py-2 focus:border-[#00A3FF]/50 focus:outline-none transition-colors duration-150 hover:bg-white/[0.06]";

  const resetDefaults = () => {
    update({ scale: 1, rotation: 0 });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-zinc-200 font-medium">Reply Comment</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            TikTok-style pinned reply
          </p>
        </div>
        <Toggle
          checked={replyEnabled}
          onChange={() => setReplyEnabled(!replyEnabled)}
        />
      </div>

      <AnimatePresence>
        {replyEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-1">
              {/* Person avatar */}
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-500 font-medium">
                  Person avatar
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-600">
                    <UserCircle size={24} />
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.06] text-[11px] font-medium text-zinc-300 hover:text-white transition-all duration-150">
                    <UploadSimple size={13} />
                    Upload
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600">
                  No image = default grey avatar
                </p>
              </div>

              {/* Person name */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500 font-medium">
                  Person name
                </label>
                <input
                  type="text"
                  placeholder="e.g. sarah_wellness"
                  value={replyConfig.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className={`w-full ${inputClass}`}
                />
              </div>

              {/* Comment text */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500 font-medium">
                  Comment text
                </label>
                <textarea
                  placeholder="Write any comment and see what happens"
                  value={replyConfig.comment}
                  onChange={(e) =>
                    update({ comment: e.target.value.slice(0, 300) })
                  }
                  rows={3}
                  className={`w-full ${inputClass} resize-none`}
                />
                <p className="text-[10px] text-zinc-600 text-right tabular-nums">
                  {replyConfig.comment.length}/300
                </p>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 font-medium">
                    Start time (s)
                  </label>
                  <input
                    type="number"
                    value={replyConfig.startTime}
                    onChange={(e) =>
                      update({ startTime: Number(e.target.value) })
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
                    value={replyConfig.duration}
                    onChange={(e) =>
                      update({ duration: Number(e.target.value) })
                    }
                    className={`w-full ${inputClass} tabular-nums`}
                  />
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-500 font-medium">
                    Scale
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        update({
                          scale: Math.max(0.5, +(replyConfig.scale - 0.1).toFixed(1)),
                        })
                      }
                      className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
                    >
                      <MinusIcon size={11} weight="bold" />
                    </button>
                    <span className="text-[12px] text-zinc-300 tabular-nums w-8 text-center font-medium">
                      {replyConfig.scale.toFixed(1)}
                    </span>
                    <button
                      onClick={() =>
                        update({
                          scale: Math.min(2, +(replyConfig.scale + 0.1).toFixed(1)),
                        })
                      }
                      className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
                    >
                      <PlusIcon size={11} weight="bold" />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={replyConfig.scale}
                  onChange={(e) => update({ scale: Number(e.target.value) })}
                  className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-[#00A3FF]"
                />
              </div>

              {/* Rotation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-500 font-medium">
                    Rotation
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        update({
                          rotation: Math.max(-180, replyConfig.rotation - 5),
                        })
                      }
                      className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
                    >
                      <MinusIcon size={11} weight="bold" />
                    </button>
                    <span className="text-[12px] text-zinc-300 tabular-nums w-8 text-center font-medium">
                      {replyConfig.rotation}&deg;
                    </span>
                    <button
                      onClick={() =>
                        update({
                          rotation: Math.min(180, replyConfig.rotation + 5),
                        })
                      }
                      className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all duration-150"
                    >
                      <PlusIcon size={11} weight="bold" />
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={replyConfig.rotation}
                  onChange={(e) =>
                    update({ rotation: Number(e.target.value) })
                  }
                  className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-[#00A3FF]"
                />
              </div>

              {/* Reset */}
              <button
                onClick={resetDefaults}
                className="text-[11px] text-zinc-500 hover:text-[#00A3FF] transition-colors duration-150"
              >
                Reset to default
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
