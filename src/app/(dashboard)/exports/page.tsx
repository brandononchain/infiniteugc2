"use client";

import { useState } from "react";
import { useCompletedJobs, useCompletedPremiumJobs, useCompletedMassJobs } from "@/hooks/use-data";
import {
  DownloadSimple,
  VideoCamera,
  Play,
  CircleNotch,
} from "@phosphor-icons/react";
import Link from "next/link";

type Tab = "standard" | "premium" | "mass";

export default function Exports() {
  const [tab, setTab] = useState<Tab>("standard");
  const { data: completedJobs, loading: jobsLoading } = useCompletedJobs();
  const { data: completedPremium, loading: premiumLoading } = useCompletedPremiumJobs();
  const { data: completedMass, loading: massLoading } = useCompletedMassJobs();

  const loading = tab === "standard" ? jobsLoading : tab === "premium" ? premiumLoading : massLoading;
  const totalCount = (completedJobs?.length ?? 0) + (completedPremium?.length ?? 0) + (completedMass?.length ?? 0);

  const renderVideoCard = (id: string, name: string, thumbnailUrl: string | null, videoUrl: string | null, provider: string | null) => (
    <div key={id} className="bg-[#1e1e22] rounded-xl overflow-hidden brutal-card group">
      <div className="aspect-[9/16] bg-white/[0.03] relative">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <VideoCamera size={24} className="text-zinc-300" />
          </div>
        )}
        {videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <Play size={32} weight="fill" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">{name || "Untitled"}</p>
          <p className="text-[10px] text-zinc-400">{provider || "—"}</p>
        </div>
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 hover:text-[#00BCFF] hover:border-[#00BCFF]/30 transition-colors shrink-0"
          >
            <DownloadSimple size={14} weight="bold" />
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center">
          <div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Exports</h1>
            <p className="text-xs text-zinc-400">{totalCount} videos ready to download</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {/* Tabs */}
        <div className="flex border-b border-white/[0.08] mb-6">
          {(
            [
              { id: "standard" as Tab, label: "Standard", count: completedJobs?.length ?? 0 },
              { id: "premium" as Tab, label: "Premium", count: completedPremium?.length ?? 0 },
              { id: "mass" as Tab, label: "Mass", count: completedMass?.length ?? 0 },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                tab === t.id
                  ? "border-accent-500 text-[#00BCFF]"
                  : "border-transparent text-zinc-400 hover:text-zinc-400"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : tab === "standard" && completedJobs && completedJobs.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {completedJobs.map((job) =>
              renderVideoCard(job.id, "Mass Video", null, job.video_url, job.video_provider)
            )}
          </div>
        ) : tab === "premium" && completedPremium && completedPremium.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {completedPremium.map((job) =>
              renderVideoCard(job.id, job.campaign_name || "Premium Video", null, job.final_video_url, job.video_provider)
            )}
          </div>
        ) : tab === "mass" && completedMass && completedMass.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {completedMass.map((job) =>
              renderVideoCard(job.id, "Mass Video", null, job.video_url, job.video_provider)
            )}
          </div>
        ) : (
          <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <VideoCamera size={24} weight="duotone" className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-1">No exported videos yet</h3>
            <p className="text-xs text-zinc-400 mb-1">Create and run campaigns or premium videos to</p>
            <p className="text-xs text-zinc-400 mb-6">see them here.</p>
            <Link
              href="/dashboard"
              className="inline-flex btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
