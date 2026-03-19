"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react";

export default function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-16 md:py-24" ref={ref}>
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
          className="relative bg-zinc-950 rounded-(--radius-card-lg) overflow-hidden"
        >
          {/* Decorative */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-125 h-125 bg-accent-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-100 h-100 bg-accent-400/8 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <div className="relative z-10 px-8 md:px-16 py-16 md:py-20">
            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-10 items-center">
              {/* Left */}
              <div>
                <h2 className="text-3xl md:text-5xl tracking-tighter font-bold text-white leading-tight">
                  Ready to 100x Your
                  <br />
                  Content Output?
                </h2>
                <p className="text-base md:text-lg text-zinc-400 mt-4 max-w-[50ch] leading-relaxed">
                  Join 500+ brands producing thousands of studio-quality videos
                  every month. No production crew. No waiting. Just results.
                </p>
              </div>

              {/* Right */}
              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-4 md:justify-end">
                <a
                  href="#"
                  className="btn-ice inline-flex items-center justify-center gap-2 backdrop-blur-sm text-white font-semibold text-sm px-8 py-4 rounded-full transition-all active:scale-[0.97] shadow-(--shadow-accent-glow-lg) ring-1 ring-white/10"
                >
                  Get Started Free
                  <ArrowRight size={16} weight="bold" />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 hover:bg-white/10 text-zinc-300 hover:text-white font-semibold text-sm px-8 py-4 rounded-full transition-all"
                >
                  <CalendarBlank size={16} weight="bold" />
                  Book a Demo
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
