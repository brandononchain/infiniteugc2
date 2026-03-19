"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Star, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";

const testimonials = [
  {
    quote:
      "We went from producing 4 videos a week to 400. The quality is indistinguishable from real creator content, and our ROAS jumped overnight.",
    metric: "3.7x ROAS in month one",
    name: "Priya Anand",
    role: "Head of Growth",
    company: "Velora Beauty",
    avatar: "/avatars/ai-avatar-1.jpg",
  },
  {
    quote:
      "Our team used to spend $12K per month on UGC creators. Infinite UGC runs about $100/month and the output is better. I still can't believe it.",
    metric: "$47K saved in Q1",
    name: "Marcus Wieland",
    role: "CMO",
    company: "FitForge Nutrition",
    avatar: "/avatars/ai-avatar-3.jpg",
  },
  {
    quote:
      "The AI agent is unlike anything I've seen. I told it to localize our top ad into 8 languages with matching avatars. Done in 11 minutes. Absolute game changer.",
    metric: "8 markets in 11 min",
    name: "Seo-yun Park",
    role: "Paid Acquisition Lead",
    company: "Novu Health",
    avatar: "/avatars/ai-avatar-5.jpg",
  },
  {
    quote:
      "We A/B test 200+ creative variants per week now. The batch mode is ridiculously fast and the avatar quality keeps improving with each update.",
    metric: "212% more ad variants",
    name: "Claudia Restrepo",
    role: "Performance Marketing",
    company: "Onda Supplements",
    avatar: "/avatars/ai-avatar-7.jpg",
  },
  {
    quote:
      "Previously, getting a single UGC video took 5-7 days of back and forth with a creator. Now I ship 50 videos before lunch. The ROI speaks for itself.",
    metric: "50 videos per day",
    name: "Tobias Falk",
    role: "Founder & CEO",
    company: "Meridian Labs",
    avatar: "/avatars/ai-avatar-9.jpg",
  },
  {
    quote:
      "The voice cloning feature is unreal. We cloned our founder's voice, paired it with custom avatars, and produced an entire quarter of content in one afternoon.",
    metric: "92 videos in 3 hours",
    name: "Amara Osei",
    role: "Creative Director",
    company: "Lumina Skincare",
    avatar: "/avatars/ai-avatar-10.jpg",
  },
];

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "left" ? -380 : 380,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 400);
  }

  return (
    <section className="py-24 md:py-32 overflow-hidden" ref={ref}>
      <div className="max-w-350 mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <p className="text-sm font-medium text-accent-600 uppercase tracking-wider mb-3">
              Results
            </p>
            <h2 className="text-3xl md:text-5xl tracking-tighter font-bold text-zinc-950 max-w-lg">
              Brands That Scale With Us
            </h2>
          </motion.div>

          {/* Scroll controls */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full bg-glass-white backdrop-blur-sm border border-glass-border shadow-(--shadow-glass) flex items-center justify-center text-zinc-500 hover:text-zinc-950 hover:border-accent-200/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-full bg-glass-white backdrop-blur-sm border border-glass-border shadow-(--shadow-glass) flex items-center justify-center text-zinc-500 hover:text-zinc-950 hover:border-accent-200/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-6 px-6 lg:-mx-12 lg:px-12"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: i * 0.08,
              }}
              className="shrink-0 w-85 md:w-95 snap-start"
            >
              <div className="bg-glass-white backdrop-blur-xl rounded-(--radius-card-lg) border border-glass-border shadow-(--shadow-glass) p-7 h-full flex flex-col relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      weight="fill"
                      className="text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm text-zinc-600 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Metric */}
                <div className="mt-4 mb-5 inline-flex items-center bg-glass-accent backdrop-blur-sm text-accent-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-accent-200/30 w-fit">
                  {t.metric}
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
                  <Image
                    src={t.avatar}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white/60"
                    loading="lazy"
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t.role}, {t.company}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
