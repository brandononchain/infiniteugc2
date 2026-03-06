"use client";

import { useState, useCallback } from "react";
import { useJobs, usePremiumJobs, useMassJobs, useJobPolling } from "@/hooks/use-data";
import { jobs as jobsApi } from "@/lib/api";
import {
  VideoCamera,
  CircleNotch,
  XCircle,
  Clock,
  Lightning,
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";

type Tab = "active" | "failed";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  queued: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", label: "Queued" },
  processing: { icon: Lightning, color: "text-sky-400", bg: "bg-sky-500/10", label: "Processing" },
  completed: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Completed" },
  failed: { icon: WarningCircle, color: "text-rose-400", bg: "bg-rose-500/10", label: "Failed" },
  cancelled: { icon: XCircle, color: "text-zinc-400", bg: "bg-white/[0.03]", label: "Cancelled" },
};

export default function RunningQueue() {
  const [tab, setTab] = useState<Tab>("active");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: allJobs, loading: jobsLoading, refetch: refetchJobs } = useJobs();
  const { data: premiumJobs, refetch: refetchPremium } = usePremiumJobs();
  const { data: massJobs, refetch: refetchMass } = useMassJobs();

  const activeJobs = (allJobs || []).filter((j) => j.status === "queued" || j.status === "processing");
  const failedJobs = (allJobs || []).filter((j) => j.status === "failed");
  const activePremium = (premiumJobs || []).filter((j) => j.status === "queued" || j.status === "processing" || j.status === "stitching");
  const failedPremium = (premiumJobs || []).filter((j) => j.status === "failed");
  const activeMass = (massJobs || []).filter((j) => j.status === "queued" || j.status === "processing");
  const failedMass = (massJobs || []).filter((j) => j.status === "failed");

  const hasActive = activeJobs.length > 0 || activePremium.length > 0 || activeMass.length > 0;

  const refetchAll = useCallback(() => {
    refetchJobs();
    refetchPremium();
    refetchMass();
  }, [refetchJobs, refetchPremium, refetchMass]);

  useJobPolling(hasActive, refetchAll, 5000);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await jobsApi.cancel(id);
      refetchJobs();
    } catch {
      // ignore
    } finally {
      setCancellingId(null);
    }
  };

  const displayJobs = tab === "active"
    ? [...activeJobs, ...activePremium.map((p) => ({ ...p, _type: "premium" as const })), ...activeMass.map((m) => ({ ...m, _type: "mass" as const }))]
    : [...failedJobs, ...failedPremium.map((p) => ({ ...p, _type: "premium" as const })), ...failedMass.map((m) => ({ ...m, _type: "mass" as const }))];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Running Queue</h1>
            <p className="text-xs text-zinc-400">
              {activeJobs.length + activePremium.length + activeMass.length} active &middot; {failedJobs.length + failedPremium.length + failedMass.length} failed
            </p>
          </div>
          <button
            onClick={refetchAll}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] shadow-sm hover:shadow-md hover:-translate-y-px text-zinc-400 transition-all"
          >
            <ArrowClockwise size={14} weight="bold" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-8">
        {/* Tabs */}
        <div className="flex border-b border-white/[0.08] mb-6">
          <button
            onClick={() => setTab("active")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === "active"
                ? "border-accent-500 text-[#00BCFF]"
                : "border-transparent text-zinc-400 hover:text-zinc-400"
            }`}
          >
            Active ({activeJobs.length + activePremium.length + activeMass.length})
          </button>
          <button
            onClick={() => setTab("failed")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === "failed"
                ? "border-rose-500 text-rose-400"
                : "border-transparent text-zinc-400 hover:text-zinc-400"
            }`}
          >
            Failed ({failedJobs.length + failedPremium.length + failedMass.length})
          </button>
        </div>

        {jobsLoading ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : displayJobs.length > 0 ? (
          <div className="space-y-3">
            {displayJobs.map((job) => {
              const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
              const StatusIcon = status.icon;
              const jobType = "_type" in job ? (job._type === "premium" ? "Premium" : "Mass") : "Standard";

              return (
                <div key={job.id} className="bg-[#1e1e22] rounded-xl p-4 brutal-card flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                    {job.status === "processing" ? (
                      <CircleNotch size={18} className={`${status.color} animate-spin`} />
                    ) : (
                      <StatusIcon size={18} weight="duotone" className={status.color} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-200 truncate">
                        {"campaign_name" in job ? (job.campaign_name as string) || "Untitled" : "Untitled"}
                      </p>
                      <span className="text-[10px] font-semibold text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-full">{jobType}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {job.video_provider || "—"} &middot; {status.label}
                      {job.status === "failed" && "error_message" in job && job.error_message ? ` — ${(job as Record<string, unknown>).error_message}` : ""}
                    </p>
                  </div>
                  {(job.status === "queued" || job.status === "processing") && !("_type" in job) && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      disabled={cancellingId === job.id}
                      className="text-[11px] font-semibold text-rose-400 border border-rose-200 px-3 py-1.5 rounded-full hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                    >
                      {cancellingId === job.id ? <CircleNotch size={12} className="animate-spin" /> : "Cancel"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1e1e22] rounded-xl p-16 text-center brutal-empty">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <VideoCamera size={24} weight="duotone" className="text-zinc-300" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-1">
              {tab === "active" ? "No videos currently rendering" : "No failed videos"}
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
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
        )}
      </div>
    </div>
  );
}
