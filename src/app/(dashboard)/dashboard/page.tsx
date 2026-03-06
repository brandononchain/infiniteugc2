"use client";

import { useAuth } from "@/lib/auth-context";
import { useJobStats, useCompletedJobs } from "@/hooks/use-data";
import {
  VideoCamera,
  Lightning,
  CheckCircle,
  Clock,
  Coin,
  Play,
  Sparkle,
  ArrowRight,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";

export default function DashboardHome() {
  const { user, profile } = useAuth();
  const { data: stats } = useJobStats();
  const { data: completedJobs } = useCompletedJobs();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const credits = profile?.credits ?? 0;

  const STATS = [
    {
      label: "Total Videos",
      value: stats?.total ?? 0,
      icon: VideoCamera,
      color: "text-sky-400",
      bg: "bg-sky-500/100/10",
    },
    {
      label: "Processing",
      value: (stats?.processing ?? 0) + (stats?.queued ?? 0),
      icon: Lightning,
      color: "text-amber-400",
      bg: "bg-amber-500/100/10",
    },
    {
      label: "Completed",
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-500/100/10",
    },
    {
      label: "Failed",
      value: stats?.failed ?? 0,
      icon: WarningCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/100/10",
    },
  ];

  const recentVideos = (completedJobs || []).slice(0, 6);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div>
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs text-zinc-400">Here&apos;s your video generation overview</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#00BCFF]/10 border border-[#00BCFF]/20 text-[#00BCFF] text-[11px] font-semibold px-3 py-1 rounded-full">
              <Coin size={12} weight="fill" />
              <span className="text-[#00BCFF] font-bold">{credits.toLocaleString()}</span> credits
            </div>
            <Link
              href="/create"
              className="btn-ice flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full"
            >
              <Play size={12} weight="fill" />
              New Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-[#1e1e22] rounded-xl p-4 brutal-card">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon size={18} weight="duotone" className={stat.color} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-zinc-200">{stat.value}</p>
                <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold text-zinc-100 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/create"
              className="bg-[#1e1e22] rounded-xl p-4 brutal-card hover:border-[#00BCFF]/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                  <Sparkle size={18} weight="fill" className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-200">Create Campaign</p>
                  <p className="text-[11px] text-zinc-400">Single AI video with avatar</p>
                </div>
                <ArrowRight size={16} className="text-zinc-400 group-hover:text-accent-500 transition-colors" />
              </div>
            </Link>
            <Link
              href="/create-mass"
              className="bg-[#1e1e22] rounded-xl p-4 brutal-card hover:border-[#00BCFF]/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Lightning size={18} weight="fill" className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-200">Mass Campaign</p>
                  <p className="text-[11px] text-zinc-400">Batch videos from script groups</p>
                </div>
                <ArrowRight size={16} className="text-zinc-400 group-hover:text-accent-500 transition-colors" />
              </div>
            </Link>
            <Link
              href="/create-premium"
              className="bg-[#1e1e22] rounded-xl p-4 brutal-card hover:border-[#00BCFF]/30 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkle size={18} weight="fill" className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-200">Premium Video</p>
                  <p className="text-[11px] text-zinc-400">VEO3, Sora 2, OmniHuman</p>
                </div>
                <ArrowRight size={16} className="text-zinc-400 group-hover:text-accent-500 transition-colors" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Videos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-zinc-100">Recent Exports</h2>
            {recentVideos.length > 0 && (
              <Link href="/exports" className="text-xs font-medium text-[#00BCFF] hover:text-[#00BCFF] transition-colors">
                View all
              </Link>
            )}
          </div>

          {recentVideos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentVideos.map((job) => (
                <div
                  key={job.id}
                  className="bg-[#1e1e22] rounded-xl overflow-hidden brutal-card group"
                >
                  {job.video_url ? (
                    <div className="aspect-[9/16] bg-zinc-900 relative">
                      <video
                        src={job.video_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <a
                        href={job.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
                      >
                        <Play
                          size={32}
                          weight="fill"
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </a>
                    </div>
                  ) : (
                    <div className="aspect-[9/16] bg-white/[0.03] flex items-center justify-center">
                      <VideoCamera size={24} className="text-zinc-300" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-zinc-200 truncate">
                      {job.campaign_name || "Untitled"}
                    </p>
                    <p className="text-[10px] text-zinc-400">{job.video_provider || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#1e1e22] rounded-xl p-12 text-center brutal-empty">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <VideoCamera size={24} weight="duotone" className="text-zinc-300" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-400 mb-1">No videos yet</h3>
              <p className="text-xs text-zinc-400 mb-6">Create your first campaign to start generating videos.</p>
              <Link
                href="/create"
                className="inline-flex btn-ice text-xs font-semibold px-6 py-2.5 rounded-full"
              >
                Create Campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
