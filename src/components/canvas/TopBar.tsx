"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FolderOpen, Plus, Check } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   TopBar — Logo + Workspace switcher (top-left of canvas)
   Enterprise-grade: save/switch between workspaces.
   ═══════════════════════════════════════════════════════════ */

interface Workspace {
  id: string;
  name: string;
  active?: boolean;
}

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: "default", name: "My Workspace", active: true },
];

export function TopBar() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeWorkspace = workspaces.find((w) => w.active) || workspaces[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setRenaming(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  const switchWorkspace = (id: string) => {
    setWorkspaces((ws) => ws.map((w) => ({ ...w, active: w.id === id })));
    setDropdownOpen(false);
  };

  const addWorkspace = () => {
    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: `Workspace ${workspaces.length + 1}`,
      active: true,
    };
    setWorkspaces((ws) => [...ws.map((w) => ({ ...w, active: false })), newWs]);
    setDropdownOpen(false);
  };

  const startRename = () => {
    setRenameValue(activeWorkspace.name);
    setRenaming(true);
  };

  const finishRename = () => {
    if (renameValue.trim()) {
      setWorkspaces((ws) =>
        ws.map((w) => (w.id === activeWorkspace.id ? { ...w, name: renameValue.trim() } : w))
      );
    }
    setRenaming(false);
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="flex items-center gap-3 px-5 py-3 pointer-events-auto w-fit">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-400 to-accent-700 flex items-center justify-center shadow-md shadow-accent-400/15">
            <svg width="14" height="8" viewBox="0 0 32 16" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8c3.5 0 5.5-2 8-5.5C18.5 14 20.5 16 24 16c4.4 0 8-3.6 8-8s-3.6-8-8-8c-3.5 0-5.5 2-8 5.5C13.5 2 11.5 0 8 0zm0 4c-2.2 0-4 1.8-4 4s1.8 4 4 4c1.5 0 2.8-1 4.5-3.2L13.2 8l-.7-.8C10.8 5 9.5 4 8 4zm16 0c-1.5 0-2.8 1-4.5 3.2L18.8 8l.7.8C21.2 11 22.5 12 24 12c2.2 0 4-1.8 4-4s-1.8-4-4-4z" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-white/70 tracking-tight hidden sm:block">
            InfiniteUGC
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-white/[0.08]" />

        {/* Workspace selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              if (renaming) return;
              setDropdownOpen(!dropdownOpen);
            }}
            onDoubleClick={startRename}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all group"
          >
            <FolderOpen size={13} className="text-white/25 group-hover:text-white/40 transition-colors" />
            {renaming ? (
              <input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={finishRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") finishRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="bg-transparent text-[13px] font-medium text-white/90 outline-none w-[140px] border-b border-accent-400/40"
              />
            ) : (
              <span className="text-[13px] font-medium text-white/50 group-hover:text-white/70 transition-colors max-w-[180px] truncate">
                {activeWorkspace.name}
              </span>
            )}
            {!renaming && (
              <ChevronDown
                size={12}
                className={`text-white/20 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            )}
          </button>

          <AnimatePresence>
            {dropdownOpen && !renaming && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full mt-1.5 left-0 min-w-[220px] rounded-xl p-1.5 border border-white/[0.08] shadow-2xl"
                style={{ background: "rgba(14, 14, 17, 0.95)", backdropFilter: "blur(24px)" }}
              >
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-semibold px-2.5 py-1.5">
                  Workspaces
                </p>

                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => switchWorkspace(ws.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] transition-all ${
                      ws.active
                        ? "bg-accent-400/8 text-white/80"
                        : "text-white/40 hover:text-white/65 hover:bg-white/[0.04]"
                    }`}
                  >
                    <FolderOpen size={13} className={ws.active ? "text-accent-400/70" : "text-white/20"} />
                    <span className="truncate flex-1 text-left">{ws.name}</span>
                    {ws.active && <Check size={12} className="text-accent-400/70 shrink-0" />}
                  </button>
                ))}

                <div className="my-1 border-t border-white/[0.04]" />

                <button
                  onClick={addWorkspace}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] text-white/30 hover:text-white/55 hover:bg-white/[0.04] transition-all"
                >
                  <Plus size={13} />
                  <span>New Workspace</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
