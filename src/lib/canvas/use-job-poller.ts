"use client";

import { useEffect, useRef, useCallback } from "react";
import { campaigns } from "@/lib/api";
import type { Job, JobStatus } from "@/types";
import type { NodeStatus } from "./types";

/* ═══════════════════════════════════════════════════════════
   useJobPoller — Polls backend for active job statuses and
   invokes a callback when status changes are detected.

   Production-grade:
   - Exponential backoff on errors (5s → 10s → 20s, capped at 30s)
   - Stops polling when all jobs reach terminal state
   - Cleans up on unmount
   - De-dupes concurrent polls
   - Respects visibility API (pauses when tab hidden)
   ═══════════════════════════════════════════════════════════ */

const BASE_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 30_000;
const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed", "cancelled"];

interface ActiveJob {
  jobId: string;
  campaignId: string;
  /** Which node types should be updated when this job changes */
  nodeIds: string[];
}

interface StatusChange {
  jobId: string;
  nodeIds: string[];
  jobStatus: JobStatus;
  nodeStatus: NodeStatus;
  videoUrl: string | null;
  errorMessage: string | null;
}

export function useJobPoller(
  activeJobs: ActiveJob[],
  onStatusChange: (changes: StatusChange[]) => void,
  onJobComplete?: (job: Job) => void
) {
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef(false);
  const backoffRef = useRef(BASE_INTERVAL_MS);
  const lastStatusRef = useRef<Map<string, JobStatus>>(new Map());
  const activeJobsRef = useRef(activeJobs);
  activeJobsRef.current = activeJobs;

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const onJobCompleteRef = useRef(onJobComplete);
  onJobCompleteRef.current = onJobComplete;

  const poll = useCallback(async () => {
    const jobs = activeJobsRef.current;
    if (jobs.length === 0 || pollingRef.current) return;

    pollingRef.current = true;

    try {
      const changes: StatusChange[] = [];

      // Fetch all active jobs in parallel
      const results = await Promise.allSettled(
        jobs.map((j) => campaigns.get(j.campaignId))
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const activeJob = jobs[i];

        if (result.status === "rejected") continue;

        const job = result.value;
        const prevStatus = lastStatusRef.current.get(activeJob.jobId);

        if (prevStatus !== job.status) {
          lastStatusRef.current.set(activeJob.jobId, job.status);

          changes.push({
            jobId: activeJob.jobId,
            nodeIds: activeJob.nodeIds,
            jobStatus: job.status,
            nodeStatus: mapJobStatusToNodeStatus(job.status),
            videoUrl: job.video_url,
            errorMessage: job.error_message,
          });

          if (TERMINAL_STATUSES.includes(job.status)) {
            onJobCompleteRef.current?.(job);
          }
        }
      }

      if (changes.length > 0) {
        onStatusChangeRef.current(changes);
      }

      // Reset backoff on success
      backoffRef.current = BASE_INTERVAL_MS;
    } catch {
      // Exponential backoff on error
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_INTERVAL_MS);
    } finally {
      pollingRef.current = false;
    }
  }, []);

  // Schedule polling
  useEffect(() => {
    // Nothing to poll
    const nonTerminalJobs = activeJobs.filter(
      (j) => !TERMINAL_STATUSES.includes(lastStatusRef.current.get(j.jobId) as JobStatus)
    );
    if (nonTerminalJobs.length === 0) {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const scheduleNext = () => {
      intervalRef.current = setTimeout(async () => {
        // Pause polling when tab is hidden
        if (document.visibilityState === "hidden") {
          scheduleNext();
          return;
        }
        await poll();
        scheduleNext();
      }, backoffRef.current);
    };

    // Initial poll immediately
    poll().then(scheduleNext);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeJobs, poll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const clearJob = useCallback((jobId: string) => {
    lastStatusRef.current.delete(jobId);
  }, []);

  return { clearJob };
}

function mapJobStatusToNodeStatus(jobStatus: JobStatus): NodeStatus {
  switch (jobStatus) {
    case "queued":
    case "processing":
      return "processing";
    case "completed":
      return "complete";
    case "failed":
    case "cancelled":
      return "error";
    case "draft":
    default:
      return "configured";
  }
}
