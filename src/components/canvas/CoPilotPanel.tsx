"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import type { CoPilotMessage } from "@/lib/canvas/types";
import {
  Sparkles,
  Send,
  Loader2,
  RotateCcw,
  X,
  Check,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CoPilotPanel — Floating AI chat overlay on the canvas
   ═══════════════════════════════════════════════════════════ */

export function CoPilotPanel() {
  const {
    state,
    dispatch,
    copilot,
    copilotDispatch,
    setActivePanel,
  } = useCanvas();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [copilot.messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ─── Send ─── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || copilot.isThinking) return;
    setInput("");

    const userMsg: CoPilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    copilotDispatch({ type: "ADD_MESSAGE", payload: userMsg });
    copilotDispatch({ type: "SET_THINKING", payload: true });

    try {
      const canvasContext = state.nodes.map((n) => ({
        type: n.type,
        status: n.status,
        data: n.data,
      }));

      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: copilot.messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          canvasState: canvasContext,
        }),
      });

      if (!res.ok) throw new Error("CoPilot request failed");
      const data = await res.json();

      if (data.actions && data.actions.length > 0) {
        // The reducer auto-loads the default workflow if canvas is empty
        dispatch({ type: "APPLY_COPILOT_ACTIONS", payload: { actions: data.actions } });
      }

      const assistantMsg: CoPilotMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        actions: data.actions,
        timestamp: Date.now(),
      };
      copilotDispatch({ type: "ADD_MESSAGE", payload: assistantMsg });
    } catch {
      copilotDispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Try again.",
          timestamp: Date.now(),
        },
      });
    } finally {
      copilotDispatch({ type: "SET_THINKING", payload: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "UGC video for a skincare product, girl in dorm room",
    "Testimonial video for a fitness app",
    "TikTok ad for sneakers, energetic hook",
    "How-to video for a meal prep service",
  ];

  const noUserMessages = copilot.messages.filter((m) => m.role === "user").length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute top-3 right-3 bottom-3 w-[380px] z-40 flex flex-col rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl"
      style={{ background: "rgba(12, 12, 15, 0.88)", backdropFilter: "blur(40px) saturate(180%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-400/20">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-white/90">CoPilot</h3>
            <p className="text-[10px] text-white/30">Builds your workflow from a prompt</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => copilotDispatch({ type: "CLEAR_MESSAGES" })}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={() => setActivePanel(null)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {copilot.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {copilot.isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2"
          >
            <div className="w-6 h-6 rounded-lg bg-accent-400/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={11} className="text-accent-400" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.04]">
              <Loader2 size={11} className="text-accent-400 animate-spin" />
              <span className="text-[11px] text-white/35">Building workflow...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {noUserMessages && (
        <div className="px-4 pb-2 space-y-1.5">
          <p className="text-[9px] text-white/20 uppercase tracking-widest font-semibold">Quick Start</p>
          <div className="space-y-1">
            {quickPrompts.map((qp) => (
              <button
                key={qp}
                onClick={() => {
                  setInput(qp);
                  inputRef.current?.focus();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/70 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.08] transition-all leading-snug"
              >
                {qp}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-end gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] focus-within:border-accent-400/25 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to create..."
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-white/90 placeholder:text-white/20 resize-none outline-none min-h-[28px] max-h-[100px] py-0.5"
            style={{ fieldSizing: "content" as never }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || copilot.isThinking}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-20 bg-accent-400/15 hover:bg-accent-400/25 text-accent-400"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message }: { message: CoPilotMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-accent-400/15 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={11} className="text-accent-400" />
        </div>
      )}

      <div className={`max-w-[88%] ${isUser ? "ml-auto" : ""}`}>
        <div
          className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
            isUser
              ? "bg-accent-400/15 text-white/85 rounded-tr-sm"
              : "bg-white/[0.04] text-white/60 rounded-tl-sm border border-white/[0.04]"
          }`}
        >
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1" : ""}>
              {line.startsWith("- ") ? (
                <span className="flex items-start gap-1.5">
                  <span className="text-accent-400/50 mt-px text-[10px]">&#9679;</span>
                  <span>{line.slice(2)}</span>
                </span>
              ) : (
                line
              )}
            </p>
          ))}
        </div>

        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.actions.map((action, i) => (
              <div
                key={i}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/8 border border-emerald-500/12 text-[9px] text-emerald-400/70"
              >
                <Check size={8} />
                {action.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
