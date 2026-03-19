"use client";

import { motion } from "framer-motion";
import { MagnifyingGlass, FileText, PencilSimpleLine } from "@phosphor-icons/react";
import { useState } from "react";

export interface Script {
  id: string;
  title: string;
  wordCount: number;
}

const SCRIPTS: Script[] = [
  { id: "1", title: "Testimonial Script", wordCount: 14 },
  { id: "2", title: "Product Demo", wordCount: 14 },
  { id: "3", title: "Welcome Video", wordCount: 12 },
  { id: "4", title: "How-To Tutorial", wordCount: 28 },
  { id: "5", title: "Brand Story", wordCount: 22 },
];

interface ScriptSelectorProps {
  selectedScript: Script | null;
  onSelect: (script: Script | null) => void;
  onClose: () => void;
}

export default function ScriptSelector({
  selectedScript,
  onSelect,
  onClose,
}: ScriptSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = SCRIPTS.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute bottom-[calc(100%+8px)] left-0 w-[280px] bg-[#0D0D0D]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-50"
    >
      {/* Search */}
      <div className="p-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <MagnifyingGlass size={13} className="text-zinc-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search scripts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-full"
            autoFocus
          />
        </div>
      </div>

      {/* Script list */}
      <div className="p-1.5 max-h-[240px] overflow-y-auto">
        {filtered.map((script) => (
          <button
            key={script.id}
            onClick={() => {
              onSelect(script);
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-100 ${
              selectedScript?.id === script.id
                ? "bg-[#00A3FF]/[0.07] text-[#00A3FF]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
            }`}
          >
            <FileText size={15} className="flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[12px] font-medium truncate">{script.title}</p>
              <p className="text-[10px] text-zinc-600">~{script.wordCount} words</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-[11px] text-zinc-600 text-center py-4">
            No scripts found
          </p>
        )}
      </div>

      {/* Write custom */}
      <div className="border-t border-white/[0.06] p-1.5">
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[#00A3FF] hover:bg-[#00A3FF]/[0.06] transition-colors duration-100"
        >
          <PencilSimpleLine size={14} />
          <span className="text-[12px] font-medium">Write custom script</span>
        </button>
      </div>
    </motion.div>
  );
}
