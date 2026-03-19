"use client";

import { motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useRef, useState, useEffect, memo } from "react";
import Image from "next/image";
import {
  VideoCamera,
  Users,
  Microphone,
  TextT,
  Robot,
  Scissors,
  SquaresFour,
} from "@phosphor-icons/react";

/* ─── Spotlight Border Effect ─── */
function SpotlightCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  const background = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(400px circle at ${x}px ${y}px, rgba(59, 130, 246, 0.06), transparent 60%)`
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`relative bg-glass-white backdrop-blur-xl rounded-(--radius-card-lg) border border-glass-border shadow-(--shadow-glass) overflow-hidden group hover:shadow-(--shadow-glass-hover) ${className}`}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background }}
      />
      {/* Glass inner highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ─── Typewriter Effect (AI Agent card) ─── */
const TYPEWRITER_PROMPTS = [
  "Create 50 TikTok ads for my protein bar line...",
  "Translate my top-performing ad into Japanese and Spanish...",
  "Generate a B-roll intro with upbeat music and captions...",
  "Clone my brand voice and produce 20 testimonial videos...",
];

const TypewriterEffect = memo(function TypewriterEffect() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = TYPEWRITER_PROMPTS[promptIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIndex < current.length) {
      timeout = setTimeout(() => setCharIndex((c) => c + 1), 35);
    } else if (!deleting && charIndex === current.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex((c) => c - 1), 20);
    } else if (deleting && charIndex === 0) {
      timeout = setTimeout(() => {
        setDeleting(false);
        setPromptIndex((p) => (p + 1) % TYPEWRITER_PROMPTS.length);
      }, 50);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, promptIndex]);

  return (
    <div className="bg-zinc-50 rounded-xl border border-zinc-200/50 p-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
          AI Agent
        </span>
      </div>
      <p className="text-sm text-zinc-700 font-mono min-h-12">
        {TYPEWRITER_PROMPTS[promptIndex].slice(0, charIndex)}
        <span className="inline-block w-0.5 h-4 bg-accent-500 ml-0.5 animate-pulse align-middle" />
      </p>
    </div>
  );
});

/* ─── Infinite Carousel (Mass Video card) ─── */
const CAROUSEL_VIDEOS = [
  { src: "/videos/ugc-1.mp4", name: "Jess K.", caption: "This changed my morning routine ☀️", views: "1.2M", platform: "TikTok" },
  { src: "/videos/ugc-2.mp4", name: "Liam T.", caption: "Honest review after 30 days...", views: "847K", platform: "Reels" },
  { src: "/videos/ugc-3.mp4", name: "Priya M.", caption: "POV: you finally found THE product", views: "2.1M", platform: "TikTok" },
  { src: "/videos/ugc-4.mp4", name: "Dani R.", caption: "Link in bio for 20% off 🔥", views: "536K", platform: "Shorts" },
  { src: "/videos/ugc-5.mp4", name: "Mika S.", caption: "Why everyone is switching to this", views: "1.8M", platform: "TikTok" },
  { src: "/videos/ugc-6.mp4", name: "Ayla B.", caption: "Before vs after, no filter", views: "3.4M", platform: "Reels" },
  { src: "/videos/ugc-7.mp4", name: "Carlos V.", caption: "Top 3 things nobody tells you", views: "672K", platform: "Shorts" },
  { src: "/videos/ugc-8.mp4", name: "Nina W.", caption: "This is NOT sponsored btw", views: "1.5M", platform: "TikTok" },
];

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "bg-zinc-950 text-white",
  Reels: "bg-linear-to-r from-purple-500 to-pink-500 text-white",
  Shorts: "bg-red-600 text-white",
};

const InfiniteCarousel = memo(function InfiniteCarousel() {
  return (
    <div className="overflow-hidden mt-4 -mx-2">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex gap-3"
      >
        {[...CAROUSEL_VIDEOS, ...CAROUSEL_VIDEOS].map((video, i) => (
          <div
            key={i}
            className="shrink-0 w-28 h-48 rounded-xl border border-zinc-200/50 relative overflow-hidden bg-zinc-900 group cursor-pointer"
          >
            {/* Autoplay Video */}
            <video
              src={video.src}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              className="w-full h-full object-cover"
            />

            {/* Platform badge */}
            <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[7px] font-bold tracking-wide ${PLATFORM_COLORS[video.platform]}`}>
              {video.platform}
            </div>

            {/* Muted indicator */}
            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            </div>

            {/* Bottom gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-zinc-950/90 via-zinc-950/50 to-transparent pt-10 pb-2 px-2">
              {/* Caption */}
              <p className="text-[8px] leading-tight text-white/90 line-clamp-2 mb-1.5">
                {video.caption}
              </p>
              {/* Creator + views */}
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-semibold text-white/70">{video.name}</span>
                <span className="text-[7px] text-white/50">▶ {video.views}</span>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
});

/* ─── Avatar Grid ─── */
const AI_AVATARS = [
  { src: "/avatars/ai-avatar-1.jpg", name: "Sophia" },
  { src: "/avatars/ai-avatar-2.jpg", name: "Aiden" },
  { src: "/avatars/ai-avatar-3.jpg", name: "Mina" },
  { src: "/avatars/ai-avatar-4.jpg", name: "Jordan" },
  { src: "/avatars/ai-avatar-5.jpg", name: "Priya" },
  { src: "/avatars/ai-avatar-6.jpg", name: "Marcus" },
  { src: "/avatars/ai-avatar-7.jpg", name: "Zara" },
  { src: "/avatars/ai-avatar-8.jpg", name: "Luca" },
];

const AvatarGrid = memo(function AvatarGrid() {
  return (
    <div className="grid grid-cols-4 gap-2 mt-4">
      {AI_AVATARS.map((avatar, i) => (
        <motion.div
          key={avatar.name}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: i * 0.05,
            repeat: Infinity,
            repeatDelay: 5,
          }}
          className="aspect-square rounded-xl border border-white/30 overflow-hidden bg-zinc-100 relative group shadow-sm"
        >
          <Image
            src={avatar.src}
            alt={avatar.name}
            width={96}
            height={96}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Hover name tag */}
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-zinc-950/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-[8px] font-semibold text-white text-center">{avatar.name}</p>
          </div>
          <div className="absolute inset-0 bg-accent-500/0 group-hover:bg-accent-500/10 transition-colors" />
        </motion.div>
      ))}
    </div>
  );
});

/* ─── Waveform SVG ─── */
const WAVEFORM_BARS = Array.from({ length: 24 }, (_, i) => ({
  h1: `${20 + ((i * 7 + 3) % 30)}%`,
  h2: `${40 + ((i * 11 + 5) % 50)}%`,
  h3: `${20 + ((i * 13 + 7) % 30)}%`,
  dur: 1.2 + ((i * 3) % 8) / 10,
}));

const WaveformViz = memo(function WaveformViz() {
  return (
    <div className="flex items-end gap-0.75 h-16 mt-4">
      {WAVEFORM_BARS.map((bar, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-accent-400/60 rounded-full"
          animate={{
            height: [bar.h1, bar.h2, bar.h3],
          }}
          transition={{
            duration: bar.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
});

/* ─── Video Editor Mockup ─── */
const TIMELINE_CLIPS = [
  { color: "bg-accent-400", w: "w-16" },
  { color: "bg-emerald-400", w: "w-10" },
  { color: "bg-violet-400", w: "w-20" },
  { color: "bg-amber-400", w: "w-8" },
  { color: "bg-accent-300", w: "w-14" },
];

const VideoEditorViz = memo(function VideoEditorViz() {
  return (
    <div className="mt-4 rounded-xl border border-zinc-200/60 bg-zinc-50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200/50 bg-white">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[9px] font-medium text-zinc-400 ml-2">Video Editor</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-10 h-4 rounded bg-accent-500 flex items-center justify-center">
            <span className="text-[8px] text-white font-semibold">Export</span>
          </div>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex h-24">
        {/* Assets sidebar */}
        <div className="w-16 border-r border-zinc-200/50 p-1.5 flex flex-col gap-1">
          <div className="w-full h-5 rounded bg-zinc-200/60 animate-pulse" />
          <div className="w-full h-5 rounded bg-zinc-200/40" />
          <div className="w-full h-5 rounded bg-zinc-200/40" />
          <div className="w-3/4 h-5 rounded bg-zinc-200/30" />
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center bg-zinc-900 relative">
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-lg bg-zinc-700 border border-zinc-600 flex items-center justify-center"
          >
            <div className="w-0 h-0 border-l-6 border-l-white border-y-4 border-y-transparent ml-0.5" />
          </motion.div>
          <span className="absolute bottom-1 left-2 text-[7px] text-zinc-500 font-mono">00:00:14:22</span>
        </div>

        {/* Properties */}
        <div className="w-16 border-l border-zinc-200/50 p-1.5 flex flex-col gap-1">
          <div className="w-full h-3 rounded bg-zinc-200/50" />
          <div className="w-3/4 h-3 rounded bg-zinc-200/40" />
          <div className="w-full h-6 rounded bg-accent-100/60 border border-accent-200/30 mt-1" />
          <div className="w-full h-3 rounded bg-zinc-200/30" />
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-zinc-200/50 px-2 py-2 bg-white">
        {/* Toolbar icons */}
        <div className="flex items-center gap-2 mb-1.5">
          {["✂", "◫", "⎘", "♫"].map((icon, i) => (
            <span key={i} className="text-[8px] text-zinc-400">{icon}</span>
          ))}
        </div>
        {/* Tracks */}
        <div className="space-y-1">
          <div className="flex items-center gap-1 h-4 relative">
            <span className="text-[7px] text-zinc-400 w-4 shrink-0">V1</span>
            <div className="flex gap-0.5 flex-1">
              {TIMELINE_CLIPS.map((clip, j) => (
                <motion.div
                  key={j}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: j * 0.15 + 0.3, type: "spring", stiffness: 120, damping: 15 }}
                  className={`${clip.w} h-3.5 ${clip.color} rounded-sm origin-left`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 h-3">
            <span className="text-[7px] text-zinc-400 w-4 shrink-0">A1</span>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 80, damping: 15 }}
              className="flex-1 h-2.5 bg-accent-200/60 rounded-sm origin-left"
            />
          </div>
        </div>
        {/* Playhead */}
        <motion.div
          className="relative h-0.5 mt-1 bg-zinc-100 rounded-full overflow-hidden"
        >
          <motion.div
            className="absolute left-0 top-0 h-full bg-accent-500 rounded-full"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    </div>
  );
});

/* ─── Template Grid (Agent Templates card) ─── */
const TEMPLATES = [
  { label: "Product Review", emoji: "📦", color: "bg-amber-100 border-amber-200/60 text-amber-700" },
  { label: "Ecommerce Ad", emoji: "🛒", color: "bg-emerald-100 border-emerald-200/60 text-emerald-700" },
  { label: "Service Promo", emoji: "💼", color: "bg-accent-100 border-accent-200/60 text-accent-700" },
  { label: "Testimonial", emoji: "⭐", color: "bg-violet-100 border-violet-200/60 text-violet-700" },
  { label: "How-to Guide", emoji: "📖", color: "bg-rose-100 border-rose-200/60 text-rose-700" },
  { label: "Before & After", emoji: "✨", color: "bg-cyan-100 border-cyan-200/60 text-cyan-700" },
];

const TemplateGrid = memo(function TemplateGrid() {
  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {TEMPLATES.map((tpl, i) => (
        <motion.button
          key={tpl.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 16,
            delay: i * 0.07,
          }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border ${tpl.color} cursor-pointer transition-shadow hover:shadow-md`}
        >
          <span className="text-lg">{tpl.emoji}</span>
          <span className="text-[10px] font-semibold leading-tight text-center">
            {tpl.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
});

/* ─── Features Data ─── */
const features = [
  {
    title: "Mass Video Creation",
    desc: "Bulk-generate thousands of on-brand videos. Combine avatars, scripts, and styles in any configuration.",
    icon: VideoCamera,
    span: "md:col-span-2",
    content: "carousel",
  },
  {
    title: "300+ AI Avatars",
    desc: "Diverse, realistic AI presenters, or clone your own face and voice.",
    icon: Users,
    span: "",
    content: "avatars",
  },
  {
    title: "AI Voice Cloning",
    desc: "Clone and manage voices across 50+ languages with pixel-perfect lip sync.",
    icon: Microphone,
    span: "",
    content: "waveform",
  },
  {
    title: "Smart Captions & Overlays",
    desc: "Auto-generate timed captions, text overlays, and branded elements.",
    icon: TextT,
    span: "",
    content: "captions",
  },
  {
    title: "Built-in Video Editor",
    desc: "Trim, cut, layer, and polish, all inside InfiniteUGC. No external tools needed.",
    icon: Scissors,
    span: "",
    content: "editor",
  },
  {
    title: "Agent Templates",
    desc: "One-click video styles for every use case: reviews, ecommerce, services, ads, and more.",
    icon: SquaresFour,
    span: "",
    content: "templates",
  },
  {
    title: "AI Agent",
    desc: 'Describe what you want in plain English. The agent handles scripting, casting, rendering, and export.',
    icon: Robot,
    span: "md:col-span-2",
    content: "typewriter",
  },
];

/* ─── Features Section ─── */
export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-350 mx-auto px-6 lg:px-12" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="mb-16"
        >
          <p className="text-sm font-medium text-accent-600 uppercase tracking-wider mb-3">
            Capabilities
          </p>
          <h2 className="text-3xl md:text-5xl tracking-tighter font-bold text-zinc-950 max-w-xl">
            Everything You Need to Dominate Content
          </h2>
          <p className="text-lg text-zinc-500 leading-relaxed mt-4 max-w-[55ch]">
            A complete toolkit for AI-powered video production, from single
            clips to enterprise-scale campaigns.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: i * 0.08,
              }}
              className={feature.span}
            >
              <SpotlightCard className="h-full p-7 md:p-8">
                <div className="flex items-start gap-4 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-glass-accent backdrop-blur-sm border border-accent-200/30 flex items-center justify-center shrink-0">
                    <feature.icon
                      size={20}
                      weight="duotone"
                      className="text-accent-600"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>

                {/* Dynamic inner content */}
                {feature.content === "carousel" && <InfiniteCarousel />}
                {feature.content === "avatars" && <AvatarGrid />}
                {feature.content === "waveform" && <WaveformViz />}
                {feature.content === "typewriter" && <TypewriterEffect />}
                {feature.content === "captions" && (
                  <div className="mt-4 space-y-2">
                    {[
                      { text: "Hey, have you tried this yet?", w: "w-4/5" },
                      { text: "It literally changed my skincare routine", w: "w-full" },
                      { text: "Link in bio for 20% off", w: "w-3/5" },
                    ].map((line, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: j * 0.3 + 1,
                          repeat: Infinity,
                          repeatDelay: 4,
                          type: "spring",
                          stiffness: 100,
                          damping: 20,
                        }}
                        className={`${line.w} bg-zinc-950/80 text-white text-xs px-3 py-1.5 rounded-lg inline-block`}
                      >
                        {line.text}
                      </motion.div>
                    ))}
                  </div>
                )}
                {feature.content === "editor" && <VideoEditorViz />}
                {feature.content === "templates" && <TemplateGrid />}
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
