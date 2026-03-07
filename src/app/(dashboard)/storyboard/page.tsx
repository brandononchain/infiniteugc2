"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  VideoCamera,
  Upload,
  Play,
  MagicWand,
  CaretDown,
  Lightning,
  Lightbulb,
  FilmStrip,
  Gear,
  X,
} from "@phosphor-icons/react";

/* ─────────────────── CONSTANTS ─────────────────── */

const MODELS = [
  { value: "veo3", label: "VEO3" },
  { value: "veo3-fast", label: "VEO3 Fast" },
  { value: "seed-dance", label: "Seed Dance 1.5" },
  { value: "kling-2.6", label: "Kling 2.6" },
  { value: "kling-3.1", label: "Kling 3.1" },
];

const RESOLUTIONS = ["720p", "1080p"] as const;
const ASPECT_RATIOS = ["9:16", "16:9", "1:1"] as const;
const DURATIONS = ["4s", "6s", "8s", "10s"] as const;

const TEMPLATES = [
  { name: "Cinematic Product B-Roll", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=710&fit=crop" },
  { name: "Vegetable Concept Animations", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=710&fit=crop" },
  { name: "3D Objects Animation", image: "https://images.unsplash.com/photo-1633899306328-c5e70574aaa2?w=400&h=710&fit=crop" },
  { name: "Zach The Film Style", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=710&fit=crop" },
  { name: "Reporter Style", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=710&fit=crop" },
  { name: "Mom/Doctor/Concerned Person Greed", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=710&fit=crop" },
  { name: "Fullscreen In Car Mom/Doctor/Concerned Person", image: "https://images.unsplash.com/photo-1449965408869-ebd3fee56862?w=400&h=710&fit=crop" },
  { name: "Bottom-of-Funnel Template", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=710&fit=crop" },
];

const TIPS = [
  "Describe the motion and camera movement explicitly",
  "Include lighting cues like \"golden hour\" or \"neon-lit\"",
  "Reference a visual style: cinematic, documentary, stop-motion",
  "Keep prompts under 200 words for best results",
  "Mention the subject first, then context and mood",
];

const RECENT_OUTPUTS = [
  { duration: "4s" },
  { duration: "6s" },
  { duration: "8s" },
];

/* ─────────────────── COMPONENTS ─────────────────── */

const DECK_CARDS = TEMPLATES.slice(0, 3);

const CARD_STACKED = [
  { x: "-50%", y: "-58%", rotate: -2, scale: 0.96, zIndex: 1 },
  { x: "-50%", y: "-50%", rotate: 0,  scale: 0.98, zIndex: 2 },
  { x: "-50%", y: "-42%", rotate: 2,  scale: 1,    zIndex: 3 },
];

const CARD_FANNED = [
  { x: "-50%", y: "-95%",  rotate: 0, scale: 1.04, zIndex: 1 },
  { x: "-50%", y: "-50%",  rotate: 0, scale: 1.04, zIndex: 2 },
  { x: "-50%", y: "-5%",   rotate: 0, scale: 1.04, zIndex: 3 },
];

function TemplateDeck({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const positions = hovered ? CARD_FANNED : CARD_STACKED;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-full rounded-2xl border border-dashed border-[#00BCFF]/30 p-6 pt-8 pb-5 flex flex-col items-center justify-end overflow-hidden cursor-pointer group hover:border-[#00BCFF]/60 hover:shadow-[0_0_30px_rgba(0,188,255,0.08)] transition-all duration-300"
    >
      {/* Stacked card deck — vertical fan-out */}
      <div className="relative w-full h-52 mb-2">
        {DECK_CARDS.map((tpl, i) => {
          const pos = positions[i];
          return (
            <motion.div
              key={tpl.name}
              className="absolute left-1/2 top-1/2 w-[85%] h-[54px] rounded-lg overflow-hidden shadow-lg border border-white/[0.08]"
              animate={{
                x: pos.x,
                y: pos.y,
                rotate: pos.rotate,
                scale: pos.scale,
                zIndex: pos.zIndex,
              }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              style={{ zIndex: pos.zIndex }}
            >
              <img
                src={tpl.image}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
              {/* Dark overlay when stacked, fades on fan-out */}
              <motion.div
                className="absolute inset-0 bg-[#141417]"
                animate={{ opacity: hovered ? 0 : 0.55 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          );
        })}
      </div>

      <span className="text-sm font-bold text-[#00BCFF] group-hover:text-[#2ecbff] transition-colors">
        Pull from Templates
      </span>
      <span className="text-[11px] text-zinc-500 mt-0.5">
        9:16 ready-to-use templates
      </span>
    </button>
  );
}

/* ─────────────────── PAGE ─────────────────── */

export default function StoryboardPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [model, setModel] = useState("veo3");
  const [resolution, setResolution] = useState<(typeof RESOLUTIONS)[number]>("1080p");
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>("16:9");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>("4s");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 3000);
  };

  const aspectRatioStyle = (): React.CSSProperties => {
    switch (aspectRatio) {
      case "9:16":
        return { aspectRatio: "9/16", maxHeight: 520 };
      case "1:1":
        return { aspectRatio: "1/1", maxHeight: 520 };
      default:
        return { aspectRatio: "16/9" };
    }
  };

  const modelLabel = MODELS.find((m) => m.value === model)?.label ?? model;

  return (
    <div className="min-h-full py-8">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2">
            <VideoCamera size={26} weight="duotone" className="text-[#00BCFF]" />
            AI Video Prompter
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Generate cinematic AI videos from text prompts and reference images.
          </p>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* ─── Left Column: Controls ─── */}
          <div className="col-span-12 lg:col-span-3 space-y-5">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <Gear size={16} weight="bold" className="text-zinc-400" />
              <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                Create Video
              </h2>
            </div>

            {/* Image dropzone */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 mb-2 block">
                Reference Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-white/[0.06]">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="brutal-empty w-full h-40 flex flex-col items-center justify-center gap-2 hover:border-[#00BCFF]/30 transition-colors cursor-pointer group"
                >
                  <Upload
                    size={28}
                    weight="duotone"
                    className="text-zinc-500 group-hover:text-[#00BCFF] transition-colors"
                  />
                  <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Click to upload image
                  </span>
                </button>
              )}
            </div>

            {/* Prompt textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-400">Prompt</label>
                <button
                  onClick={() => setEnhancePrompt(!enhancePrompt)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all ${
                    enhancePrompt
                      ? "bg-[#00BCFF]/15 text-[#00BCFF] border border-[#00BCFF]/25"
                      : "text-zinc-500 border border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <MagicWand size={12} weight="fill" />
                  Enhance
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your video scene..."
                rows={4}
                className="brutal-input w-full px-3 py-2.5 text-sm resize-none"
              />
            </div>

            {/* Model dropdown */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 mb-2 block">Model</label>
              <div className="relative">
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="brutal-select w-full px-3 py-2.5 text-sm appearance-none pr-8 cursor-pointer"
                >
                  {MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={14}
                  weight="bold"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
              </div>
            </div>

            {/* Resolution pills */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 mb-2 block">Resolution</label>
              <div className="flex gap-2">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      resolution === r ? "brutal-pill-active" : "brutal-pill"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio pills */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 mb-2 block">Aspect Ratio</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      aspectRatio === r ? "brutal-pill-active" : "brutal-pill"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration dropdown */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 mb-2 block">Duration</label>
              <div className="relative">
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as typeof duration)}
                  className="brutal-select w-full px-3 py-2.5 text-sm appearance-none pr-8 cursor-pointer"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={14}
                  weight="bold"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                />
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="btn-ice w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Lightning size={18} weight="fill" />
                  </motion.div>
                  Generating...
                </>
              ) : (
                <>
                  <Lightning size={18} weight="fill" />
                  Generate Video
                </>
              )}
              <span className="ml-auto text-[11px] opacity-70 font-medium">10 credits</span>
            </button>
          </div>

          {/* ─── Center Column: Preview ─── */}
          <div className="col-span-12 lg:col-span-6 space-y-6">
            {/* Video player */}
            <div className="brutal-card p-1 hover:transform-none">
              <div
                className="relative bg-[#141417] rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300"
                style={aspectRatioStyle()}
              >
                {/* Grid pattern background */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />

                {/* Play button */}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center backdrop-blur-sm hover:bg-white/[0.12] transition-colors cursor-pointer group">
                    <Play
                      size={28}
                      weight="fill"
                      className="text-zinc-300 ml-1 group-hover:text-white transition-colors"
                    />
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">
                    Preview will appear here
                  </span>
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.06]">
                  <div
                    className="h-full rounded-r-full"
                    style={{
                      width: "35%",
                      background: "linear-gradient(90deg, #00BCFF, #0069A8)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recent outputs */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Recent Outputs
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {RECENT_OUTPUTS.map((item, i) => (
                  <div
                    key={i}
                    className="relative bg-[#141417] border border-white/[0.06] rounded-xl overflow-hidden cursor-pointer group hover:border-white/[0.12] transition-colors"
                  >
                    <div className="aspect-[9/16] flex items-center justify-center">
                      {/* Subtle grid pattern */}
                      <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                          backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                          backgroundSize: "20px 20px",
                        }}
                      />
                      <Play
                        size={20}
                        weight="fill"
                        className="text-zinc-600 group-hover:text-zinc-400 transition-colors relative z-10"
                      />
                    </div>
                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                      <span className="text-[10px] font-bold text-zinc-300">
                        {item.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Right Column: Settings ─── */}
          <div className="col-span-12 lg:col-span-3 space-y-5">
            {/* Output settings summary */}
            <div className="brutal-card p-4 hover:transform-none space-y-3">
              <h3 className="text-sm font-bold text-zinc-200">Output settings</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Resolution", value: resolution },
                  { label: "Duration", value: duration },
                  { label: "Ratio", value: aspectRatio },
                  { label: "Model", value: modelLabel },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{row.label}</span>
                    <span className="text-xs font-semibold text-zinc-300">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-1.5 mb-3">
                <Lightbulb size={16} weight="fill" className="text-yellow-500" />
                Tips
              </h3>
              <div className="brutal-card p-4 hover:transform-none">
                <ul className="space-y-3">
                  {TIPS.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed">
                      <span className="w-1 h-1 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Pull from Templates — card deck with fan-out on hover */}
            <TemplateDeck onClick={() => setShowTemplates(true)} />
          </div>
        </div>
      </div>

      {/* ─── Template Picker Modal ─── */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTemplates(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="relative w-full max-w-2xl max-h-[80vh] brutal-card p-0 overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100">Templates</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Choose a preset to start with</p>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              {/* Template grid */}
              <div className="p-5 overflow-y-auto max-h-[calc(80vh-60px)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {TEMPLATES.map((tpl) => (
                    <motion.button
                      key={tpl.name}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowTemplates(false)}
                      className="relative rounded-xl overflow-hidden bg-[#141417] border border-white/[0.06] hover:border-[#00BCFF]/30 transition-colors group text-left"
                    >
                      <div className="aspect-[9/16] relative">
                        <img
                          src={tpl.image}
                          alt={tpl.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        {/* Gradient overlay for text */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {/* Template name */}
                        <div className="absolute bottom-0 left-0 right-0 p-2.5">
                          <span className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
                            {tpl.name}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
