"use client";

import { motion } from "framer-motion";
import { X, User } from "@phosphor-icons/react";

export interface Avatar {
  id: string;
  name: string;
  color: string;
}

const AVATARS: Avatar[] = [
  { id: "1", name: "Joanna", color: "#6C5CE7" },
  { id: "2", name: "Ashley 4.0", color: "#E17055" },
  { id: "3", name: "Bylie", color: "#00B894" },
  { id: "4", name: "Leah", color: "#FDCB6E" },
  { id: "5", name: "Marcus", color: "#0984E3" },
  { id: "6", name: "Sofia", color: "#E84393" },
  { id: "7", name: "Kai", color: "#00CEC9" },
  { id: "8", name: "Nina", color: "#A29BFE" },
  { id: "9", name: "Priya", color: "#FAB1A0" },
  { id: "10", name: "Tyler", color: "#55EFC4" },
  { id: "11", name: "Mia", color: "#FD79A8" },
  { id: "12", name: "Omar", color: "#74B9FF" },
];

interface AvatarPickerProps {
  selectedAvatar: Avatar | null;
  onSelect: (avatar: Avatar) => void;
  onClose: () => void;
}

export default function AvatarPicker({
  selectedAvatar,
  onSelect,
  onClose,
}: AvatarPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-40 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-[820px] max-h-[80vh] bg-[#0D0D0D]/95 backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] text-white font-semibold">
              Select Avatar
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              Choose an AI presenter for your video
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar grid — 9:16 portrait thumbnails */}
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-72px)]">
          <div className="grid grid-cols-4 gap-4">
            {AVATARS.map((avatar) => {
              const isSelected = selectedAvatar?.id === avatar.id;
              return (
                <button
                  key={avatar.id}
                  onClick={() => {
                    onSelect(avatar);
                    onClose();
                  }}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-[#00A3FF] shadow-[0_0_20px_rgba(0,163,255,0.2)]"
                      : "border-transparent hover:border-white/[0.12]"
                  }`}
                >
                  {/* 9:16 portrait thumbnail */}
                  <div
                    className="aspect-[9/16] w-full rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-200 group-hover:brightness-110"
                    style={{
                      background: `linear-gradient(160deg, ${avatar.color}15 0%, ${avatar.color}08 50%, #0A0A0A 100%)`,
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        backgroundColor: avatar.color + "20",
                        border: `2px solid ${avatar.color}40`,
                      }}
                    >
                      <User
                        size={28}
                        weight="fill"
                        style={{ color: avatar.color }}
                      />
                    </div>
                  </div>

                  {/* Name overlay at bottom */}
                  <div className="absolute bottom-0 inset-x-0 px-2 py-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p
                      className={`text-[12px] font-medium text-center truncate ${
                        isSelected ? "text-[#00A3FF]" : "text-zinc-300"
                      }`}
                    >
                      {avatar.name}
                    </p>
                  </div>

                  {/* Selected check */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00A3FF] flex items-center justify-center">
                      <svg
                        width="10"
                        height="8"
                        viewBox="0 0 10 8"
                        fill="none"
                      >
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
