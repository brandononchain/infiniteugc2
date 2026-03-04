"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  ArrowRight,
  Play,
  FilmSlate,
  ImageSquare,
  Lightning,
  TrendUp,
  Coin,
  VideoCamera,
  UserCircle,
  Sparkle,
  Stack,
  Microphone,
  FileText,
  DownloadSimple,
  Fire,
  Eye,
} from "@phosphor-icons/react";

/* ─── Quick-Action Cards (Creatify-style hero) ─── */
const HERO_CARDS = [
  {
    title: "CREATE SINGLE CAMPAIGN",
    subtitle: "Create a single AI-powered video ad",
    href: "/create",
    icon: VideoCamera,
  },
  {
    title: "CREATE MASS CAMPAIGN",
    subtitle: "Batch generate videos at scale",
    href: "/create-mass",
    icon: Stack,
  },
  {
    title: "CREATE PREMIUM CONTENT",
    subtitle: "VEO3, Sora 2 Pro & OmniHuman models",
    href: "/create-premium",
    icon: Sparkle,
  },
];

const QUICK_TOOLS = [
  { label: "Image Generation", icon: ImageSquare, href: "/image-generation" },
  { label: "Script Generation", icon: FileText, href: "/script-generation" },
  { label: "Hook Generation", icon: Lightning, href: "/hooks" },
  { label: "Video Editor", icon: FilmSlate, href: "/editor" },
  { label: "Voices", icon: Microphone, href: "/voices" },
  { label: "Avatars", icon: UserCircle, href: "/avatars" },
  { label: "Scripts", icon: FileText, href: "/scripts" },
  { label: "Exports", icon: DownloadSimple, href: "/exports" },
];

const CATEGORIES = [
  "Hook", "Viral", "SALE", "Multi-Industry", "Apparel", "Accessories",
  "Beauty & Personal Care", "Services", "Physical Goods", "Apps",
  "Food & Beverage", "Financial", "Health", "Tech & Electronics",
  "Sports & Outdoor", "Household Product", "Home Improvement", "Pets",
  "Education", "UGC", "Cinematic", "Aesthetic",
];

/* Placeholder feed items */
const FEED_ITEMS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  score: Math.floor(Math.random() * 30) + 40,
  views: `${(Math.random() * 50 + 10).toFixed(1)}k`,
  type: i % 3 === 0 ? "UGC" : i % 3 === 1 ? "Cinematic" : "Hook",
}));

/* ─── Stat item ─── */
const STATS = [
  { label: "Videos Created", value: "0", icon: VideoCamera, change: null },
  { label: "Credits Left", value: "30", icon: Coin, change: null },
  { label: "Active Campaigns", value: "0", icon: Play, change: null },
  { label: "Total Views", value: "0", icon: Eye, change: null },
];

export default function DashboardHome() {
  return (
    <div className="min-h-full">
      {/* ─── Top Bar ─── */}
      <div className="sticky top-0 z-30 brutal-header">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">
              Welcome back, Sarah
            </h1>
            <p className="text-xs text-zinc-500">Ready to create something amazing?</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-accent-50 border border-accent-200 text-accent-700 text-xs font-semibold px-3.5 py-1.5 rounded-full">
              <Coin size={14} weight="fill" />
              <span>30 credits</span>
            </div>
            <Link
              href="/create"
              className="btn-ice flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full"
            >
              <Plus size={14} weight="bold" />
              New Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-10">
        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 120, damping: 20 }}
              className="bg-white rounded-xl p-5 group brutal-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center group-hover:bg-accent-50 transition-colors">
                  <stat.icon size={18} weight="duotone" className="text-zinc-500 group-hover:text-accent-600 transition-colors" />
                </div>
                {stat.change && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <TrendUp size={10} weight="bold" />
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-zinc-950 tracking-tight">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── Hero Cards (Creatify-style) ─── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-zinc-950 tracking-tight">Start Creating</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HERO_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 100, damping: 20 }}
              >
                <Link
                  href={card.href}
                  className="group block relative overflow-hidden rounded-2xl h-48 md:h-56 border border-white/40 shadow-lg"
                  style={{ background: 'rgba(255, 255, 255, 0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                >
                  {/* Subtle shimmer on hover */}
                  <div className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10 h-full flex flex-col justify-end p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-white/40 border border-white/50 flex items-center justify-center backdrop-blur-sm">
                        <card.icon size={18} weight="bold" className="text-zinc-700" />
                      </div>
                    </div>
                    <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight uppercase">
                      {card.title}
                      <ArrowRight size={16} weight="bold" className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">{card.subtitle}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Quick Tools Row ─── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_TOOLS.map((tool, i) => (
              <motion.div
                key={tool.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05, type: "spring", stiffness: 120, damping: 20 }}
              >
                <Link
                  href={tool.href}
                  className="flex items-center gap-3 bg-white rounded-xl px-5 py-4 group brutal-card"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-accent-50 transition-colors">
                    <tool.icon size={16} weight="duotone" className="text-zinc-500 group-hover:text-accent-600 transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-700 group-hover:text-zinc-950 transition-colors">
                    {tool.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── Social & UGC Ads Gallery ─── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-950 tracking-tight uppercase">
                  Social & UGC Ads
                </h2>
                <span className="text-[10px] font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  AI
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Discover social-first and UGC-style ads made to feel native and authentic.
              </p>
            </div>
            <Link
              href="#"
              className="text-xs font-semibold text-accent-600 hover:text-accent-700 flex items-center gap-1 transition-colors"
            >
              See all
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mt-4 mb-6">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
                  i === 0
                    ? "brutal-pill-active"
                    : "brutal-pill"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Video Grid (placeholders) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {FEED_ITEMS.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.03, type: "spring", stiffness: 120, damping: 20 }}
                className="group relative aspect-9/16 bg-zinc-100 rounded-xl overflow-hidden cursor-pointer brutal-card"
              >
                {/* Placeholder gradient */}
                <div className={`absolute inset-0 bg-linear-to-br ${
                  i % 4 === 0
                    ? "from-rose-100 via-rose-50 to-amber-50"
                    : i % 4 === 1
                    ? "from-sky-100 via-blue-50 to-indigo-50"
                    : i % 4 === 2
                    ? "from-emerald-100 via-teal-50 to-cyan-50"
                    : "from-violet-100 via-purple-50 to-pink-50"
                }`} />

                {/* Score badge */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-white text-[10px] font-bold text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200 shadow-sm">
                  <Fire size={10} weight="fill" className="text-orange-500" />
                  {item.score}
                </div>

                {/* Play overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all shadow-lg">
                    <Play size={16} weight="fill" className="text-zinc-900 ml-0.5" />
                  </div>
                </div>

                {/* Bottom info */}
                <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/50 to-transparent p-2.5 pt-8">
                  <span className="text-[10px] font-medium text-white/80">{item.type}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
