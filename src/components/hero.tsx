"use client";

import { motion, useMotionValue, AnimatePresence } from "framer-motion";
import { ArrowRight, Lightning, Play, TiktokLogo, InstagramLogo, YoutubeLogo, XLogo, FacebookLogo } from "@phosphor-icons/react";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import GradientBackground from "./gradient-background";

/* ─── Orbit Card Data ─── */
const ORBIT_CARDS = [
  "/videos/ugc-1.mp4",
  "/videos/ugc-2.mp4",
  "/videos/ugc-3.mp4",
  "/videos/ugc-4.mp4",
  "/videos/ugc-5.mp4",
  "/videos/ugc-6.mp4",
  "/videos/ugc-7.mp4",
  "/videos/ugc-8.mp4",
];

const CARD_COUNT = ORBIT_CARDS.length;
const ORBIT_SPEED = 0.003; // radians per frame (~10s full orbit)

/* ─── 3D Orbit Carousel ─── */
function OrbitCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const [visible, setVisible] = useState(false);

  /* Staggered intro fade */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  /* 60 fps orbit loop */
  useEffect(() => {
    let raf: number;

    const tick = () => {
      angleRef.current += ORBIT_SPEED;
      const box = containerRef.current;
      if (!box) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const cw = box.offsetWidth;
      const ch = box.offsetHeight;
      const rx = cw * 0.52; // horizontal radius
      const ry = ch * 0.15; // vertical radius (tilt)

      /* Collect positions for z-sorting */
      const items: { i: number; depth: number; x: number; y: number }[] = [];
      for (let i = 0; i < CARD_COUNT; i++) {
        const theta = angleRef.current + (i * 2 * Math.PI) / CARD_COUNT;
        items.push({
          i,
          depth: Math.sin(theta),
          x: rx * Math.cos(theta),
          y: ry * Math.sin(theta),
        });
      }

      /* Back-to-front depth sort */
      items.sort((a, b) => a.depth - b.depth);

      for (let zi = 0; zi < items.length; zi++) {
        const { i, depth, x, y } = items[zi];
        const el = cardEls.current[i];
        if (!el) continue;

        const dn = (depth + 1) / 2; // 0 (far) → 1 (near)
        const scale = 0.7 + dn * 0.3;
        const opacity = 1;
        const blur = 0;
        /* Front cards above infinity loop (z-30), back cards behind */
        const zIndex = depth > 0 ? 50 + zi : zi;

        el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
        el.style.opacity = String(opacity);
        el.style.filter = blur > 0.1 ? `blur(${blur}px)` : "none";
        el.style.zIndex = String(zIndex);

        /* Smart play/pause based on depth */
        const vid = videoRefs.current[i];
        if (vid) {
          if (dn > 0.25 && vid.paused) vid.play().catch(() => {});
          else if (dn <= 0.25 && !vid.paused) vid.pause();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square flex items-center justify-center"
      style={{ perspective: "1200px" }}
    >
      {/* Subtle orbit track */}
      <div
        className="absolute top-1/2 left-1/2 border border-accent-300/[0.08] rounded-[50%] pointer-events-none"
        style={{ width: "104%", height: "30%", transform: "translate(-50%, -50%)" }}
      />

      {/* Accent glows */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-accent-400/15 rounded-full blur-[100px] animate-drift" />
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-accent-300/20 rounded-full blur-[80px] animate-drift-reverse" />

      {/* Infinity Loop center layer (z-30: between back and front orbit cards) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 50, damping: 18, delay: 0.3 }}
        className="relative z-30 pointer-events-none w-[70%] sm:w-[80%] md:w-[90%] lg:w-[95%] max-w-[780px]"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/hero/infinityloop.png"
            alt="InfiniteUGC"
            width={900}
            height={900}
            priority
            className="w-full h-auto object-contain drop-shadow-[0_20px_60px_rgba(14,165,233,0.3)]"
          />
        </motion.div>
      </motion.div>

      {/* Orbiting Cards */}
      {ORBIT_CARDS.map((src, i) => (
        <div
          key={i}
          ref={(el) => {
            cardEls.current[i] = el;
          }}
          className={`absolute top-1/2 left-1/2 -ml-[54px] -mt-[96px] w-[108px] h-[192px] transition-opacity duration-700 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          style={{ willChange: "transform, opacity, filter" }}
        >
          <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.15),0_2px_8px_rgba(0,0,0,0.08)] bg-white/5">
            {/* Glass reflection */}
            <div className="absolute inset-0 z-20 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />

            <video
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              src={src}
              loop
              muted
              playsInline
              preload="none"
              className="w-full h-full object-cover"
            />

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20 z-10">
              <motion.div
                className="h-full bg-accent-400/70"
                animate={{ width: ["0%", "100%"] }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Animated Word Reveal ─── */
function AnimatedHeadline() {
  const line1 = ["Your", "Content."];
  const line2 = ["Infinite", "Possibilities."];

  const wordVariant = {
    hidden: { opacity: 0, y: 40, rotateX: 40, filter: "blur(10px)" },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      rotateX: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 18,
        delay: 0.2 + i * 0.1,
      },
    }),
  };

  let wordIndex = 0;

  return (
    <h1
      className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] tracking-tighter leading-[0.92] font-extrabold text-zinc-950"
      style={{ perspective: "600px" }}
    >
      {/* Line 1 */}
      <span className="block">
        {line1.map((word) => {
          const i = wordIndex++;
          return (
            <motion.span
              key={`l1-${i}`}
              custom={i}
              variants={wordVariant}
              initial="hidden"
              animate="visible"
              className="inline-block mr-[0.25em] origin-bottom"
            >
              {word}
            </motion.span>
          );
        })}
      </span>
      {/* Line 2 — branded accent */}
      <span className="block mt-1">
        {line2.map((word, wi) => {
          const i = wordIndex++;
          const isAccent = wi === 0;
          return (
            <motion.span
              key={`l2-${i}`}
              custom={i}
              variants={wordVariant}
              initial="hidden"
              animate="visible"
              className={`inline-block mr-[0.25em] origin-bottom ${
                isAccent
                  ? \"bg-linear-to-r from-accent-500 to-accent-400 bg-clip-text text-transparent\"
                  : ""
              }`}
            >
              {word}
            </motion.span>
          );
        })}
      </span>
    </h1>
  );
}

/* ─── Magnetic Button ─── */
function MagneticButton({
  children,
  href,
  variant = "primary",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "ghost";
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouse = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const isPrimary = variant === "primary";

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      style={{ x, y }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full transition-all active:scale-[0.97] ${
        isPrimary
          ? "btn-ice shadow-(--shadow-accent-glow-lg) hover:shadow-(--shadow-accent-glow-lg)"
          : "border border-glass-border text-zinc-700 hover:border-zinc-400 hover:text-zinc-950 bg-glass-white backdrop-blur-xl shadow-(--shadow-glass)"
      }`}
    >
      {children}
    </motion.a>
  );
}

/* ─── Hero Section ─── */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-dvh flex items-center overflow-hidden"
      style={{ perspective: "2000px" }}
    >
      {/* ── WebGL Cinematic Ice Gradient Background ── */}
      <GradientBackground className="-z-20" />

      {/* Bottom fade into page background */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent -z-10 pointer-events-none" />

      {/* ── Main Content ── */}
      <div className="relative z-20 max-w-350 mx-auto w-full px-6 lg:px-12 pt-24 pb-16 lg:pb-0">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Left — Copy */}
          <div className="max-w-xl">
            {/* Tag */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0,
              }}
              className="inline-flex items-center gap-2 rounded-full badge-ice backdrop-blur-xl text-accent-700 px-4 py-1.5 text-sm font-medium mb-6 shadow-(--shadow-glass)"
            >
              <Lightning size={16} weight="fill" />
              AI-Powered Video at Scale
            </motion.div>

            <AnimatedHeadline />

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.65,
              }}
              className="text-lg md:text-xl text-zinc-500 leading-relaxed max-w-[50ch] mt-6"
            >
              One brief. Thousands of studio-quality videos. Powered by AI
              avatars and voice cloning so you can focus on strategy, not
              production.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.7,
              }}
              className="flex flex-wrap gap-4 mt-8"
            >
              <MagneticButton href="#pricing" variant="primary">
                Start Creating
                <ArrowRight size={16} weight="bold" />
              </MagneticButton>
              <MagneticButton href="#how-it-works" variant="ghost">
                <Play size={16} weight="fill" />
                See How It Works
              </MagneticButton>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="mt-12 flex items-center gap-6"
            >
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                Trusted by 500+ brands
              </span>
              <div className="flex gap-5 items-center">
                {[
                  { icon: TiktokLogo, label: "TikTok" },
                  { icon: InstagramLogo, label: "Instagram" },
                  { icon: YoutubeLogo, label: "YouTube" },
                  { icon: XLogo, label: "X" },
                  { icon: FacebookLogo, label: "Facebook" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-1.5 text-zinc-400"
                  >
                    <Icon size={18} weight="fill" />
                    <span className="text-xs font-medium hidden sm:inline">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right — 3D Orbit Carousel */}
          <div className="relative lg:pl-4">
            <OrbitCarousel />
          </div>
        </div>
      </div>
    </section>
  );
}
