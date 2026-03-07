"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Fire,
  BookmarkSimple,
  Image as ImageIcon,
  Robot,
  UserCircle,
  CaretRight,
  Sparkle,
  Play,
  Copy,
  Sliders,
  CaretDown,
} from "@phosphor-icons/react";

/* ─────────────────────── DATA ─────────────────────── */

const HERO_CARDS = [
  {
    title: "AI VIDEO ADS",
    subtitle: "Create scroll-stopping video ads in minutes",
    href: "/create",
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=600&fit=crop",
  },
  {
    title: "AVATAR VIDEO",
    subtitle: "Generate talking avatar videos with AI actors",
    badge: "AURORA MODEL",
    href: "/create",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
  },
  {
    title: "ASSET GENERATOR",
    subtitle: "Product photos, backgrounds & visual effects",
    href: "/image-generation",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=600&fit=crop",
  },
];

const QUICK_TOOLS = [
  { label: "Image Ads", icon: ImageIcon, href: "/image-generation" },
  { label: "Ad Clone", badge: "BETA", icon: Copy, href: "/create" },
  { label: "Create Your Own Avatar", icon: UserCircle, href: "/avatars" },
  { label: "Video Editor", icon: Sliders, href: "/editor" },
];

const TRENDING_COLLECTIONS = [
  {
    title: "Viral Message Threads",
    description: "Text-thread style ads that grab attention fast",
    images: [
      "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400&h=530&fit=crop",
    ],
  },
  {
    title: "Show Your App",
    description: "Screen recordings and app demo creatives",
    images: [
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1596742578443-7682ef7b7e2f?w=400&h=530&fit=crop",
    ],
  },
  {
    title: "Show Your Product",
    description: "Product-focused ads with lifestyle context",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=530&fit=crop",
    ],
  },
  {
    title: "Best for Services",
    description: "Service-based businesses and B2B creatives",
    images: [
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=530&fit=crop",
    ],
  },
  {
    title: "Billboards",
    description: "Large format digital billboard creatives",
    images: [
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=530&fit=crop",
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=530&fit=crop",
    ],
  },
];

const UGC_TABS = [
  "Hook", "Viral", "SALE", "Multi-Industry", "Apparel", "Accessories",
  "Beauty & Personal Care", "Services", "Physical Goods", "Apps",
  "Food & Beverage", "Financial", "Health", "Tech & Electronics",
  "Sports & Outdoor", "Household Product", "Home Improvement", "Pets",
  "Education", "Billboards", "New Year", "UGC", "Cinematic", "Aesthetic",
  "Avatar Swap",
];

const UGC_ITEMS = [
  { image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=530&fit=crop", likes: 284, wide: false },
  { image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=530&fit=crop", likes: 193, wide: false },
  { image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=530&fit=crop", likes: 412, wide: false },
  { image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=530&fit=crop", likes: 156, wide: false },
  { image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&h=530&fit=crop", likes: 378, wide: true },
  { image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=530&fit=crop", likes: 229, wide: false },
  { image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=530&fit=crop", likes: 341, wide: false },
  { image: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=530&fit=crop", likes: 167, wide: false },
  { image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=530&fit=crop", likes: 298, wide: false },
  { image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=530&fit=crop", likes: 445, wide: false },
  { image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&h=530&fit=crop", likes: 512, wide: true },
  { image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=530&fit=crop", likes: 189, wide: false },
];

const PRODUCT_TABS = [
  "Motion graphics", "SALE", "Multi-Industry", "New Year",
  "Tech & Electronics", "Food & Beverages", "Beauty & Skincare",
  "Apparel & Acc", "Viral", "Sports & Outdoor",
];

const PRODUCT_ITEMS = [
  { image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop", likes: 231 },
  { image: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=530&fit=crop", likes: 187 },
  { image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop", likes: 342 },
  { image: "https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=400&h=530&fit=crop", likes: 156 },
  { image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop", likes: 289 },
  { image: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=530&fit=crop", likes: 478 },
  { image: "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400&h=400&fit=crop", likes: 134 },
  { image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=530&fit=crop", likes: 267 },
  { image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop", likes: 198 },
  { image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=530&fit=crop", likes: 356 },
  { image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop", likes: 423 },
  { image: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=530&fit=crop", likes: 145 },
];

const AVATAR_ITEMS = [
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=530&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=530&fit=crop",
];

/* ─────────────────── COMPONENTS ─────────────────── */

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-[#00BCFF] to-[#6C5CE7] text-white align-super">
      <Sparkle size={10} weight="fill" />
      AI
    </span>
  );
}

function HeroSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {HERO_CARDS.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#1e1e22]"
        >
          <Image
            src={card.image}
            alt={card.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5">
            {card.badge && (
              <span className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/90 text-black tracking-wide">
                {card.badge}
              </span>
            )}
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {card.title}
              <ArrowRight
                size={20}
                weight="bold"
                className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
              />
            </h2>
            <p className="text-sm text-white/70 mt-1">{card.subtitle}</p>
          </div>
        </Link>
      ))}
    </section>
  );
}

function QuickTools() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.label}
              href={tool.href}
              className="flex items-center gap-3 bg-[#1e1e22] border border-white/[0.06] rounded-xl px-4 py-3.5 hover:border-white/[0.12] transition-colors group"
            >
              <Icon size={20} weight="duotone" className="text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0" />
              <span className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">
                {tool.label}
              </span>
              {tool.badge && (
                <span className="ml-auto text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#00BCFF]/15 text-[#00BCFF]">
                  {tool.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <div className="flex justify-center mt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
        >
          View all tools
          <CaretDown
            size={12}
            weight="bold"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </section>
  );
}

function TrendingCollections() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 320, behavior: "smooth" });
  };

  return (
    <section>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight uppercase">
            Trending Collections
            <AiBadge />
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Explore high-converting ad creatives &mdash; pick a favorite and recreate it instantly.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors">
            <Sliders size={14} weight="bold" />
            Personalize
          </button>
          <button className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors">
            <BookmarkSimple size={14} weight="bold" />
            Saved
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`[data-hide-scrollbar]::-webkit-scrollbar { display: none; }`}</style>
          {TRENDING_COLLECTIONS.map((col) => (
            <div
              key={col.title}
              className="shrink-0 w-[240px] cursor-pointer group"
            >
              <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-[#1e1e22]">
                {/* Stack of 3 images */}
                <div className="absolute inset-0 grid grid-rows-3 gap-0.5">
                  {col.images.map((img, i) => (
                    <div key={i} className="relative overflow-hidden">
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="240px"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-sm font-bold text-zinc-200 mt-2.5 group-hover:text-white transition-colors">
                {col.title}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{col.description}</p>
            </div>
          ))}
        </div>

        {/* Scroll arrow */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/3 -translate-y-1/2 w-10 h-10 bg-[#1e1e22]/90 border border-white/[0.08] rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-[#2a2a2e] transition-colors shadow-lg backdrop-blur-sm"
        >
          <CaretRight size={18} weight="bold" />
        </button>
      </div>
    </section>
  );
}

function PillTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            active === tab
              ? "brutal-pill-active"
              : "brutal-pill text-zinc-400"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function MediaGrid({
  items,
  actionLabel,
  variant,
}: {
  items: { image: string; likes: number; wide?: boolean }[];
  actionLabel: string;
  variant: "portrait" | "mixed";
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className={`relative rounded-xl overflow-hidden bg-[#1e1e22] group cursor-pointer ${
            item.wide ? "col-span-2" : ""
          }`}
        >
          <div className={variant === "portrait" ? "aspect-[3/4]" : i % 3 === 0 ? "aspect-square" : "aspect-[3/4]"}>
            <Image
              src={item.image}
              alt=""
              fill
              className="object-cover"
              sizes={item.wide ? "320px" : "200px"}
              unoptimized
            />
          </div>

          {/* Likes badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <Fire size={12} weight="fill" className="text-orange-400" />
            <span className="text-[10px] font-bold text-white">{item.likes}</span>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <button className="bg-white text-zinc-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1.5">
              <Play size={14} weight="fill" />
              {actionLabel}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SocialUGCAds() {
  const [activeTab, setActiveTab] = useState(UGC_TABS[0]);

  return (
    <section>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight uppercase">
            Social & UGC Ads
            <AiBadge />
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Browse trending UGC-style ad creatives and recreate them with your brand.
          </p>
        </div>
        <Link
          href="/create"
          className="text-xs font-semibold text-[#00BCFF] hover:text-[#00BCFF]/80 flex items-center gap-1 shrink-0 transition-colors"
        >
          See all
          <CaretRight size={12} weight="bold" />
        </Link>
      </div>

      <div className="mb-5">
        <PillTabs tabs={UGC_TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <MediaGrid items={UGC_ITEMS} actionLabel="Recreate" variant="portrait" />
    </section>
  );
}

function ProductVisualEffects() {
  const [activeTab, setActiveTab] = useState(PRODUCT_TABS[0]);

  return (
    <section>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight uppercase">
            Product Visual Effects
            <AiBadge />
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Stunning product visuals with AI-powered effects and motion graphics.
          </p>
        </div>
        <Link
          href="/image-generation"
          className="text-xs font-semibold text-[#00BCFF] hover:text-[#00BCFF]/80 flex items-center gap-1 shrink-0 transition-colors"
        >
          See all
          <CaretRight size={12} weight="bold" />
        </Link>
      </div>

      <div className="mb-5">
        <PillTabs tabs={PRODUCT_TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <MediaGrid items={PRODUCT_ITEMS} actionLabel="Recreate" variant="mixed" />
    </section>
  );
}

function AvatarShowcase() {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight uppercase">
          Avatar Showcase
          <AiBadge />
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          See avatars in action and generate talking videos with AI actors.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {AVATAR_ITEMS.map((src, i) => (
          <div
            key={i}
            className="relative rounded-xl overflow-hidden bg-[#1e1e22] group cursor-pointer"
          >
            <div className="aspect-[3/4]">
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="200px"
                unoptimized
              />
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <button className="bg-white text-zinc-900 text-xs font-bold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors flex items-center gap-1.5">
                <Robot size={14} weight="fill" />
                Create video
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────── PAGE ─────────────────── */

export default function DashboardHome() {
  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 space-y-12">
        <HeroSection />
        <QuickTools />
        <TrendingCollections />
        <SocialUGCAds />
        <ProductVisualEffects />
        <AvatarShowcase />
      </div>
    </div>
  );
}
