"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCanvas } from "@/lib/canvas/context";
import type { CoPilotMessage, CoPilotAction, WorkflowNodeType } from "@/lib/canvas/types";
import {
  Sparkles,
  Send,
  Loader2,
  ChevronDown,
  Wand2,
  Zap,
  RotateCcw,
  Play,
  Package,
  UserCircle,
  FileText,
  Mic,
  Cpu,
  Subtitles,
  Check,
} from "lucide-react";

const ACTION_ICONS: Record<string, typeof Package> = {
  add_node: Package,
  configure_node: Wand2,
  connect_nodes: Zap,
  generate_script: FileText,
  generate: Play,
};

const NODE_ICONS: Record<string, typeof Package> = {
  product: Package,
  avatar: UserCircle,
  script: FileText,
  voice: Mic,
  provider: Cpu,
  captions: Subtitles,
  output: Play,
};

/* ═══════════════════════════════════════════════════════════
   CoPilotPanel — AI chat interface for workflow building
   ═══════════════════════════════════════════════════════════ */

export function CoPilotPanel() {
  const { state, dispatch, copilot, copilotDispatch, loadDefaultWorkflow } = useCanvas();
  const [input, setInput] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [copilot.messages, scrollToBottom]);

  /* ─── Send message to CoPilot ─── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || copilot.isThinking) return;
    setInput("");

    // Add user message
    const userMsg: CoPilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    copilotDispatch({ type: "ADD_MESSAGE", payload: userMsg });
    copilotDispatch({ type: "SET_THINKING", payload: true });

    try {
      // Get current canvas state summary for context
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

      // Apply actions to canvas
      if (data.actions && data.actions.length > 0) {
        // If canvas is empty and we have add_node actions, load default workflow first
        const hasAddNodes = data.actions.some((a: CoPilotAction) => a.type === "add_node");
        if (state.nodes.length === 0 && hasAddNodes) {
          loadDefaultWorkflow();
          // Small delay to let the workflow load before applying configs
          await new Promise((r) => setTimeout(r, 100));
        }

        dispatch({
          type: "APPLY_COPILOT_ACTIONS",
          payload: { actions: data.actions },
        });
      }

      // Add assistant message
      const assistantMsg: CoPilotMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        actions: data.actions,
        timestamp: Date.now(),
      };
      copilotDispatch({ type: "ADD_MESSAGE", payload: assistantMsg });
    } catch (err) {
      const errorMsg: CoPilotMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Something went wrong. Please try again.",
        timestamp: Date.now(),
      };
      copilotDispatch({ type: "ADD_MESSAGE", payload: errorMsg });
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

  /* ─── Quick prompts ─── */
  const quickPrompts = [
    { label: "UGC Product Ad", prompt: "Create a UGC video ad for a skincare product with a college girl in her dorm room, energetic vibe" },
    { label: "Testimonial", prompt: "Make a testimonial video for a fitness app, with a professional tone" },
    { label: "TikTok Hook", prompt: "Generate a viral TikTok ad for new sneakers with a catchy hook and quick cuts" },
    { label: "How-To Video", prompt: "Create a how-to tutorial video showing how to use a meal prep service" },
  ];

  if (isCollapsed) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setIsCollapsed(false)}
        className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl border border-accent-400/20 bg-accent-400/10 hover:bg-accent-400/15 transition-all"
      >
        <Sparkles size={14} className="text-accent-400" />
        <span className="text-xs font-medium text-accent-400">CoPilot</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-[380px] shrink-0 flex flex-col rounded-2xl border border-white/8 overflow-hidden"
      style={{ background: "rgba(14, 14, 17, 0.85)", backdropFilter: "blur(24px)" }}
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90">CoPilot</h3>
            <p className="text-[10px] text-white/35">Describe what you want to create</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => copilotDispatch({ type: "CLEAR_MESSAGES" })}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/5 transition-all"
            title="Clear chat"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/5 transition-all"
          >
            <ChevronDown size={14} className="rotate-90" />
          </button>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {copilot.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Thinking indicator */}
        {copilot.isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-accent-400/15 flex items-center justify-center shrink-0">
              <Sparkles size={13} className="text-accent-400" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
              <Loader2 size={12} className="text-accent-400 animate-spin" />
              <span className="text-xs text-white/40">Building your workflow...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Quick prompts (show when no user messages) ─── */}
      {copilot.messages.filter((m) => m.role === "user").length === 0 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-2">Quick Start</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp) => (
              <button
                key={qp.label}
                onClick={() => {
                  setInput(qp.prompt);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-white/40 bg-white/4 hover:bg-white/8 hover:text-white/60 border border-white/6 transition-all"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input area ─── */}
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-end gap-2 p-2 rounded-xl bg-white/5 border border-white/8 focus-within:border-accent-400/30 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to create..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 resize-none outline-none min-h-[32px] max-h-[120px] py-1 px-1"
            style={{ fieldSizing: "content" as never }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || copilot.isThinking}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-30 bg-accent-400/15 hover:bg-accent-400/25 text-accent-400"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[9px] text-white/15 text-center mt-1.5">
          CoPilot builds your workflow automatically
        </p>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MessageBubble — Individual chat message
   ═══════════════════════════════════════════════════════════ */

function MessageBubble({ message }: { message: CoPilotMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-accent-400/15 flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-accent-400" />
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? "ml-auto" : ""}`}>
        {/* Message text */}
        <div
          className={`px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
            isUser
              ? "bg-accent-400/15 text-white/90 rounded-tr-sm"
              : "bg-white/5 text-white/70 rounded-tl-sm"
          }`}
        >
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1.5" : ""}>
              {line.startsWith("- ") ? (
                <span className="flex items-start gap-1.5">
                  <span className="text-accent-400/60 mt-0.5">&#8226;</span>
                  <span>{line.slice(2)}</span>
                </span>
              ) : (
                line
              )}
            </p>
          ))}
        </div>

        {/* Action chips */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.actions.map((action, i) => {
              const ActionIcon = ACTION_ICONS[action.type] || Zap;
              const nodeType = action.payload?.nodeType as WorkflowNodeType | undefined;
              const NodeIcon = nodeType ? NODE_ICONS[nodeType] || Package : ActionIcon;

              return (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/8 border border-emerald-500/15 text-[10px] text-emerald-400/70"
                >
                  <Check size={9} />
                  <span>{action.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
