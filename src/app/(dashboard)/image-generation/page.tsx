"use client";

import { useState } from "react";
import {
  ImageSquare,
  Plus,
  CaretDown,
  ArrowUp,
  Sparkle,
  Minus,
} from "@phosphor-icons/react";

const SUGGESTIONS = [
  "Ethereal apiary with honey-gold aura, glowing honeycombs",
  "Minimalist living room at golden hour, soft shadows",
  "Abstract fluid art, deep blues and coral, 8K",
];

export default function ImageGeneration() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(4);

  return (
    <div className="min-h-full flex flex-col">
      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-center mx-auto mb-5">
          <ImageSquare size={24} weight="duotone" className="text-zinc-300" />
        </div>
        <h2 className="text-sm font-bold text-zinc-900 mb-1">Your generations will appear here</h2>
        <p className="text-xs text-zinc-400 mb-6">Use the prompt bar below to create your first image.</p>

        {/* Suggestion pills */}
        <div className="flex flex-col items-center gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="text-xs text-zinc-500 border border-zinc-200 px-4 py-2 rounded-full hover:border-accent-200 hover:text-accent-600 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom prompt bar */}
      <div className="sticky bottom-0 brutal-header px-6 lg:px-10 py-4" style={{ borderBottom: 'none', borderTop: '2px solid #d4d4d8', boxShadow: 'none' }}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center gap-3 brutal-card focus-within:ring-2 focus-within:ring-accent-200 focus-within:border-accent-300 transition-all">
            <Plus size={16} className="text-zinc-300 shrink-0" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create..."
              className="flex-1 text-sm text-zinc-800 placeholder:text-zinc-300 outline-none bg-transparent"
            />
          </div>

          {/* Options row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                <Sparkle size={12} weight="fill" className="text-zinc-400" />
                Nano Banana Pro
                <CaretDown size={10} className="text-zinc-400" />
              </button>
              <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                9:16 <CaretDown size={10} className="text-zinc-400" />
              </button>
              <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                2K <CaretDown size={10} className="text-zinc-400" />
              </button>
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="px-2 py-1.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <Minus size={12} weight="bold" />
                </button>
                <span className="text-xs font-semibold text-zinc-700 min-w-4 text-center">{count}</span>
                <button
                  onClick={() => setCount(Math.min(12, count + 1))}
                  className="px-2 py-1.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <Plus size={12} weight="bold" />
                </button>
              </div>
            </div>

            <button className="btn-ice flex items-center gap-2 text-xs font-semibold px-5 py-2 rounded-full">
              Generate
              <ArrowUp size={14} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
