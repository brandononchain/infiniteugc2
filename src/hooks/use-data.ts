"use client";

import { useState, useEffect, useCallback } from "react";
import { supabaseQueries } from "@/lib/api";
import type {
  Profile,
  Avatar,
  Voice,
  Script,
  ScriptGroup,
  Job,
  PremiumJob,
  MassCampaign,
  MassJob,
  HookJob,
  ImageGenerationJob,
} from "@/types";

/* ─── Generic fetch hook ─── */
function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/* ─── Profile ─── */
export function useProfile() {
  return useQuery<Profile | null>(supabaseQueries.getProfile);
}

/* ─── Avatars ─── */
export function useAvatars() {
  return useQuery<Avatar[]>(async () => {
    const result = await supabaseQueries.getAvatars();
    return result.data;
  });
}

/* ─── Voices ─── */
export function useVoices() {
  return useQuery<Voice[]>(async () => {
    const result = await supabaseQueries.getVoices();
    return result.data;
  });
}

/* ─── Scripts ─── */
export function useScripts() {
  return useQuery<Script[]>(async () => {
    const result = await supabaseQueries.getScripts();
    return result.data;
  });
}

/* ─── Script Groups ─── */
export function useScriptGroups() {
  return useQuery<ScriptGroup[]>(supabaseQueries.getScriptGroups);
}

/* ─── Jobs (non-draft) ─── */
export function useJobs(statusFilter?: string) {
  return useQuery<Job[]>(() => supabaseQueries.getJobs(statusFilter), [statusFilter]);
}

/* ─── Draft Jobs (Campaigns) ─── */
export function useDraftJobs() {
  return useQuery<Job[]>(supabaseQueries.getDraftJobs);
}

/* ─── Completed Jobs ─── */
export function useCompletedJobs() {
  return useQuery<Job[]>(supabaseQueries.getCompletedJobs);
}

/* ─── Premium Jobs ─── */
export function usePremiumJobs() {
  return useQuery<PremiumJob[]>(supabaseQueries.getPremiumJobs);
}

/* ─── Completed Premium Jobs ─── */
export function useCompletedPremiumJobs() {
  return useQuery<PremiumJob[]>(supabaseQueries.getCompletedPremiumJobs);
}

/* ─── Mass Campaigns ─── */
export function useMassCampaigns() {
  return useQuery<MassCampaign[]>(supabaseQueries.getMassCampaigns);
}

/* ─── Mass Jobs ─── */
export function useMassJobs() {
  return useQuery<MassJob[]>(supabaseQueries.getMassJobs);
}

/* ─── Completed Mass Jobs ─── */
export function useCompletedMassJobs() {
  return useQuery<MassJob[]>(supabaseQueries.getCompletedMassJobs);
}

/* ─── Hook Jobs ─── */
export function useHookJobs() {
  return useQuery<HookJob[]>(supabaseQueries.getHookJobs);
}

/* ─── Image Generation Jobs ─── */
export function useImageJobs() {
  return useQuery<ImageGenerationJob[]>(supabaseQueries.getImageJobs);
}

/* ─── Job Stats (dashboard) ─── */
export function useJobStats() {
  return useQuery(supabaseQueries.getJobStats);
}

/* ─── Polling hook for active jobs ─── */
export function useJobPolling(
  hasActiveJobs: boolean,
  refetchFn: () => void,
  intervalMs = 5000
) {
  useEffect(() => {
    if (!hasActiveJobs) return;
    const id = setInterval(refetchFn, intervalMs);
    return () => clearInterval(id);
  }, [hasActiveJobs, refetchFn, intervalMs]);
}
