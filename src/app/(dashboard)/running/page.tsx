"use client";

import { useState } from "react";
import { VideoCamera } from "@phosphor-icons/react";
import Link from "next/link";

export default function RunningQueue() {
  const [tab, setTab] = useState<"active" | "failed">("active");

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 brutal-header">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Running Queue</h1>
            <p className="text-xs text-zinc-500">Monitor your video generation progress</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {/* Tabs */}
        <div className="flex border-b-2 border-zinc-300 mb-6">
          <button
            onClick={() => setTab("active")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === "active"
                ? "border-accent-500 text-accent-700"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setTab("failed")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === "failed"
                ? "border-rose-500 text-rose-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Failed
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl p-16 text-center brutal-empty">
          <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-4">
            <VideoCamera size={24} weight="duotone" className="text-zinc-300" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-500 mb-1">
            {tab === "active" ? "No videos currently rendering" : "No failed videos"}
          </h3>
          <p className="text-xs text-zinc-500 mb-6">
            {tab === "active"
              ? "Create a campaign to start generating videos."
              : "Failed campaigns will appear here."}
          </p>
          <Link
            href="/create"
            className="inline-flex btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
          >
            Go to Campaigns
          </Link>
        </div>
      </div>
    </div>
  );
}
