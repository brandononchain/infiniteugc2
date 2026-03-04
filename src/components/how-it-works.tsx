"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, memo } from "react";
import Image from "next/image";
import {
  PencilSimple,
  UserCircle,
  FilmSlate,
} from "@phosphor-icons/react";

const steps = [
  {
    num: "01",
    title: "Write or Generate Your Script",
    desc: "Start from scratch or let AI draft a script that matches your brand voice, product, and audience. Templates for TikTok, Instagram Reels, YouTube Shorts, and paid ads.",
    icon: PencilSimple,
    visual: "script",
  },
  {
    num: "02",
    title: "Pick Your AI Avatar",
    desc: "Choose from 300+ diverse, ultra-realistic AI presenters. Upload your own face to create a custom avatar, or let the AI select the best match for your target demographic.",
    icon: UserCircle,
    visual: "avatar",
  },
  {
    num: "03",
    title: "Generate & Export",
    desc: "Hit generate. Your video is ready in under 2 minutes. Add captions, overlays, music, and B-roll, then export in any format. Batch-create hundreds at once.",
    icon: FilmSlate,
    visual: "export",
  },
];

/* ─── Step Visual Components ─── */
const SCRIPT_LINES = [
  { type: "label", text: "[HOOK: 0:00-0:03]" },
  { type: "body", text: "\"Wait, you're still editing videos manually?\"" },
  { type: "label", text: "[PROBLEM: 0:03-0:08]" },
  { type: "body", text: "\"I used to spend 6 hours on a single TikTok. Finding creators, writing scripts, going back and forth on edits...\"" },
  { type: "label", text: "[SOLUTION: 0:08-0:15]" },
  { type: "body", text: "\"Then I found Infinite UGC. Now I generate 50 videos before lunch, all with AI avatars that look completely real.\"" },
  { type: "label", text: "[CTA: 0:15-0:18]" },
  { type: "body", text: "\"Link in bio. Seriously, this will change how you make content.\"" },
];

const LiveScriptEditor = memo(function LiveScriptEditor() {
  const [visibleChars, setVisibleChars] = useState(0);

  const fullText = SCRIPT_LINES.map((l) => l.text).join("\n");

  useEffect(() => {
    if (visibleChars >= fullText.length) {
      const resetTimeout = setTimeout(() => setVisibleChars(0), 3000);
      return () => clearTimeout(resetTimeout);
    }
    const timeout = setTimeout(() => setVisibleChars((c) => c + 1), 18);
    return () => clearTimeout(timeout);
  }, [visibleChars, fullText.length]);

  // Map char position back to lines
  let charsConsumed = 0;

  return (
    <div className="bg-glass-white backdrop-blur-xl rounded-2xl border border-glass-border shadow-(--shadow-glass) overflow-hidden">
      {/* Editor header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/20 bg-white/40">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <span className="text-xs font-medium text-zinc-500 ml-2">Script Editor</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50/80 px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI Writing
          </div>
        </div>
      </div>

      {/* Editor body with line numbers */}
      <div className="p-4 font-mono text-xs leading-relaxed min-h-48 max-h-60 overflow-hidden">
        {SCRIPT_LINES.map((line, i) => {
          const lineStart = charsConsumed;
          charsConsumed += line.text.length + (i < SCRIPT_LINES.length - 1 ? 1 : 0);
          const lineChars = Math.max(0, Math.min(line.text.length, visibleChars - lineStart));

          if (lineChars === 0 && visibleChars <= lineStart) return null;

          return (
            <div key={i} className="flex gap-3 mb-1">
              <span className="text-zinc-300 w-4 text-right shrink-0 select-none">{i + 1}</span>
              <span
                className={
                  line.type === "label"
                    ? "text-accent-500/80 font-semibold"
                    : "text-zinc-700"
                }
              >
                {line.text.slice(0, lineChars)}
                {lineChars < line.text.length && lineChars > 0 && (
                  <span className="inline-block w-0.5 h-3.5 bg-accent-500 ml-px animate-pulse align-middle" />
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/20 bg-white/30 text-[10px] text-zinc-400">
        <span>TikTok Ad · 18s</span>
        <span className="text-accent-600 font-medium">
          {Math.min(Math.round((visibleChars / fullText.length) * 100), 100)}% generated
        </span>
      </div>
    </div>
  );
});

const AVATAR_NAMES = ["Sophia", "Marcus", "Aisha", "James", "Luna", "Derek"];
const AVATAR_IDS = [1, 3, 5, 7, 9, 10];

function AvatarVisual() {
  return (
    <div className="relative bg-glass-white backdrop-blur-xl rounded-2xl border border-glass-border shadow-(--shadow-glass) p-6 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              delay: i * 0.08,
            }}
            className="group relative"
          >
            <div
              className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                i === 2
                  ? "border-accent-500 ring-2 ring-accent-200/60 shadow-lg shadow-accent-500/10"
                  : "border-white/40 group-hover:border-accent-300/60"
              }`}
            >
              <Image
                src={`/avatars/ai-avatar-${AVATAR_IDS[i]}.jpg`}
                alt={AVATAR_NAMES[i]}
                width={200}
                height={200}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Name tag on hover */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/80 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
              {AVATAR_NAMES[i]}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="mt-4 flex items-center justify-between"
      >
        <span className="text-xs text-zinc-500">Aisha M. · selected</span>
        <span className="text-xs text-accent-600 font-medium">300+ more →</span>
      </motion.div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="bg-glass-white backdrop-blur-xl rounded-2xl border border-glass-border shadow-(--shadow-glass) p-6 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
      <div className="space-y-3">
        {/* Progress bar */}
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span>Rendering 47 videos...</span>
          <span className="font-mono text-accent-600">87%</span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            whileInView={{ width: "87%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-accent-500 rounded-full"
          />
        </div>

        {/* File list */}
        <div className="mt-4 space-y-2">
          {[
            { name: "tiktok_organic_001.mp4", size: "4.2 MB", done: true },
            { name: "tiktok_organic_002.mp4", size: "3.8 MB", done: true },
            { name: "ig_reel_spanish_003.mp4", size: "5.1 MB", done: false },
          ].map((file, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
            >
              <span className="text-xs font-mono text-zinc-700">
                {file.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400">{file.size}</span>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${
                    file.done
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {file.done ? "✓" : "..."}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Section ─── */
export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-100px" });

  /* Step-based line progress — advances as each step enters the viewport */
  const step0Ref = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const stepRefs = [step0Ref, step1Ref, step2Ref];

  const step0Visible = useInView(step0Ref, { once: true, margin: "-20% 0px -20% 0px" });
  const step1Visible = useInView(step1Ref, { once: true, margin: "-20% 0px -20% 0px" });
  const step2Visible = useInView(step2Ref, { once: true, margin: "-20% 0px -20% 0px" });

  const lineProgress = step2Visible ? 100 : step1Visible ? 55 : step0Visible ? 15 : 0;

  return (
    <section
      id="how-it-works"
      className="py-24 md:py-32 bg-zinc-50/80 relative"
      ref={sectionRef}
    >
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="mb-20"
        >
          <p className="text-sm font-medium text-accent-600 uppercase tracking-wider mb-3">
            How It Works
          </p>
          <h2 className="text-3xl md:text-5xl tracking-tighter font-bold text-zinc-950 max-w-xl">
            From Script to Screen in 3 Steps
          </h2>
        </motion.div>

        {/* Steps — Zig-Zag */}
        <div className="space-y-20 md:space-y-32 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-zinc-100 -translate-x-1/2">
            <div
              className="w-full bg-accent-300/40 origin-top transition-[height] duration-700 ease-out"
              style={{ height: `${lineProgress}%` }}
            />
          </div>

          {steps.map((step, i) => {
            const isReversed = i % 2 !== 0;
            return (
              <motion.div
                key={step.num}
                ref={stepRefs[i]}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  type: "spring",
                  stiffness: 80,
                  damping: 20,
                }}
                className={`grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center ${
                  isReversed ? "md:direction-rtl" : ""
                }`}
              >
                {/* Text */}
                <div
                  className={`${isReversed ? "md:order-2 md:text-left" : ""} md:direction-ltr`}
                >
                  <span className="text-7xl md:text-8xl font-extrabold text-zinc-100 leading-none select-none">
                    {step.num}
                  </span>
                  <div className="flex items-center gap-3 mt-4 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-glass-accent backdrop-blur-sm border border-accent-200/30 flex items-center justify-center">
                      <step.icon
                        size={20}
                        weight="duotone"
                        className="text-accent-600"
                      />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-zinc-950 tracking-tight">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-base text-zinc-500 leading-relaxed max-w-[50ch]">
                    {step.desc}
                  </p>
                </div>

                {/* Visual */}
                <div
                  className={`${isReversed ? "md:order-1" : ""} md:direction-ltr`}
                >
                  {step.visual === "script" && <LiveScriptEditor />}
                  {step.visual === "avatar" && <AvatarVisual />}
                  {step.visual === "export" && <ExportVisual />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
