"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Play } from "@phosphor-icons/react";

export default function Showcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-zinc-950 text-white relative overflow-hidden">
      {/* Mesh gradient blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-150 h-150 bg-accent-600/10 rounded-full blur-[150px] animate-float" />
        <div
          className="absolute bottom-1/4 -right-40 w-125 h-125 bg-accent-400/8 rounded-full blur-[130px]"
          style={{ animationDelay: "3s", animationDuration: "8s" }}
        />
      </div>

      <div className="max-w-350 mx-auto px-6 lg:px-12 relative z-10" ref={ref}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-accent-400 uppercase tracking-wider mb-3">
            See It In Action
          </p>
          <h2 className="text-3xl md:text-5xl tracking-tighter font-bold text-white max-w-2xl mx-auto">
            Watch How Fast AI Turns Ideas Into Content
          </h2>
          <p className="text-lg text-zinc-400 mt-4 max-w-[50ch] mx-auto">
            From script to finished video in under two minutes. No editing
            skills required. The AI handles everything.
          </p>
        </motion.div>

        {/* Video Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{
            type: "spring",
            stiffness: 80,
            damping: 20,
            delay: 0.2,
          }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Glow behind */}
          <div className="absolute -inset-4 bg-accent-500/10 rounded-[2rem] blur-xl" />

          {/* Browser frame */}
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-zinc-900/60 backdrop-blur-xl">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <div className="flex-1 text-center">
                <div className="inline-block bg-zinc-800 rounded-md px-8 py-1 text-xs text-zinc-500 font-mono">
                  app.infiniteugc.com/create
                </div>
              </div>
            </div>

            {/* Content area — video placeholder */}
            <div className="relative aspect-video bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              {/* Grid pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {/* Play button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="relative z-10 w-20 h-20 bg-accent-600/80 hover:bg-accent-600/95 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors shadow-lg shadow-accent-600/30 ring-1 ring-white/10"
              >
                <Play size={28} weight="fill" className="text-white ml-1" />
              </motion.button>

              {/* Decorative UI elements */}
              <div className="absolute top-6 left-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10" />
                <div>
                  <div className="w-20 h-2 bg-white/10 rounded" />
                  <div className="w-14 h-2 bg-white/5 rounded mt-1.5" />
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-accent-500/60 rounded-full" />
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  0:47 / 2:15
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-8 md:gap-16 mt-12 text-center"
        >
          {[
            { metric: "< 2 min", label: "Average render time" },
            { metric: "4K", label: "Export quality" },
            { metric: "47", label: "Export formats" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-2xl font-mono font-bold text-white">
                {item.metric}
              </p>
              <p className="text-sm text-zinc-500 mt-1">{item.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
