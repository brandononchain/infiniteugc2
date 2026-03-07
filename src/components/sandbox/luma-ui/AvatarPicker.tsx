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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-[600px] max-h-[70vh] bg-[#0D0D0D]/95 backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[14px] text-white font-semibold">
              Select Avatar
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Choose an AI presenter for your video
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-all duration-150"
          >
            <X size={16} />
          </button>
        </div>

        {/* Avatar grid */}
        <div className="p-4 overflow-y-auto max-h-[calc(70vh-64px)]">
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((avatar) => {
              const isSelected = selectedAvatar?.id === avatar.id;
              return (
                <button
                  key={avatar.id}
                  onClick={() => {
                    onSelect(avatar);
                    onClose();
                  }}
                  className={`group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? "border-[#00A3FF] bg-[#00A3FF]/[0.06]"
                      : "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white/80 text-lg font-semibold shadow-lg"
                    style={{ backgroundColor: avatar.color + "30", borderColor: avatar.color + "50", borderWidth: 1 }}
                  >
                    <User size={24} weight="fill" style={{ color: avatar.color }} />
                  </div>
                  <span
                    className={`text-[11px] font-medium truncate w-full text-center ${
                      isSelected ? "text-[#00A3FF]" : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  >
                    {avatar.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
