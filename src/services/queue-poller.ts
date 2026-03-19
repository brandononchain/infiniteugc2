import { getSupabaseAdmin } from "../lib/supabase";
import { triggerNextQueuedJobs } from "./video-generator";

// How often to check for queued jobs and stale jobs (ms)
const POLL_INTERVAL = 30_000; // 30 seconds

// Jobs stuck in "processing" longer than this are considered stale and auto-failed
const STALE_PROCESSING_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// Jobs stuck in "queued" longer than this are considered abandoned and auto-failed
const STALE_QUEUED_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Clean up stale jobs:
 * - "processing" jobs older than 15 min → mark as failed + refund credits
 * - "queued" jobs older than 30 min → mark as failed + refund credits
 */
async function cleanupStaleJobs(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const affectedUserIds: Set<string> = new Set();

  const now = Date.now();

  // 1. Find stale "processing" jobs
  const staleProcessingCutoff = new Date(now - STALE_PROCESSING_THRESHOLD_MS).toISOString();
  const { data: staleProcessing } = await supabase
    .from("jobs")
    .select("id, user_id, scripts(content), video_provider")
    .eq("status", "processing")
    .lt("updated_at", staleProcessingCutoff)
    .limit(100);

  if (staleProcessing && staleProcessing.length > 0) {
    console.log(`[QUEUE-POLLER] Found ${staleProcessing.length} stale processing job(s)`);

    for (const job of staleProcessing) {
      console.log(`[QUEUE-POLLER] Auto-failing stale processing job: ${job.id}`);

      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "Job timed out",
          error_details: `Job was stuck in processing state for over ${STALE_PROCESSING_THRESHOLD_MS / 60000} minutes`,
        })
        .eq("id", job.id);

      // Refund credits
      await refundJobCredits(job);

      affectedUserIds.add(job.user_id);
    }
  }

  // 2. Find stale "queued" jobs
  const staleQueuedCutoff = new Date(now - STALE_QUEUED_THRESHOLD_MS).toISOString();
  const { data: staleQueued } = await supabase
    .from("jobs")
    .select("id, user_id, scripts(content), video_provider")
    .eq("status", "queued")
    .lt("created_at", staleQueuedCutoff)
    .limit(100);

  if (staleQueued && staleQueued.length > 0) {
    console.log(`[QUEUE-POLLER] Found ${staleQueued.length} stale queued job(s)`);

    for (const job of staleQueued) {
      console.log(`[QUEUE-POLLER] Auto-failing stale queued job: ${job.id}`);

      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "Job timed out in queue",
          error_details: `Job was stuck in queue for over ${STALE_QUEUED_THRESHOLD_MS / 60000} minutes`,
        })
        .eq("id", job.id);

      // Refund credits
      await refundJobCredits(job);

      affectedUserIds.add(job.user_id);
    }
  }

  return [...affectedUserIds];
}

/**
 * Refund credits for a failed/timed-out job
 */
async function refundJobCredits(job: {
  user_id: string;
  scripts?: { content: string } | { content: string }[] | null;
  video_provider?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    const scriptData = job.scripts;
    const script = Array.isArray(scriptData) ? scriptData[0] : scriptData;

    if (!script?.content) return;

    // Dynamic import to avoid circular deps
    const { calculateVideoCost } = await import("../lib/credits");
    const refundAmount = calculateVideoCost(script.content, job.video_provider);

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", job.user_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits + refundAmount })
        .eq("id", job.user_id);

      console.log(`[QUEUE-POLLER] Refunded ${refundAmount} credits to user ${job.user_id}`);
    }
  } catch (err) {
    console.error(`[QUEUE-POLLER] Failed to refund credits for job:`, err);
  }
}

/**
 * Single poll cycle:
 * 1. Clean up stale jobs (free up processing slots)
 * 2. Find all users with queued jobs
 * 3. Trigger queue processing for each user
 */
async function pollCycle(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    // Step 1: Clean up stale jobs first (this frees processing slots)
    const affectedUserIds = await cleanupStaleJobs();

    // Step 2: Find all distinct users who have queued jobs
    const { data: queuedJobs } = await supabase
      .from("jobs")
      .select("user_id")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(500);

    if (!queuedJobs || queuedJobs.length === 0) {
      // Also trigger for users whose stale jobs were cleaned up (they might have queued jobs now able to run)
      for (const userId of affectedUserIds) {
        await triggerNextQueuedJobs(userId);
      }
      return;
    }

    // Deduplicate user IDs
    const userIds = new Set<string>(queuedJobs.map((j) => j.user_id));

    // Also add users from stale cleanup
    for (const userId of affectedUserIds) {
      userIds.add(userId);
    }

    console.log(`[QUEUE-POLLER] Found queued jobs for ${userIds.size} user(s), triggering processing`);

    // Step 3: Trigger queue processing for each user
    for (const userId of userIds) {
      try {
        await triggerNextQueuedJobs(userId);
      } catch (err) {
        console.error(`[QUEUE-POLLER] Error triggering queue for user ${userId}:`, err);
      }
    }
  } catch (err) {
    console.error("[QUEUE-POLLER] Poll cycle error:", err);
  }
}

/**
 * Start the queue poller. Call once at backend startup.
 */
export function startQueuePoller(): void {
  if (pollTimer) {
    console.log("[QUEUE-POLLER] Already running, skipping duplicate start");
    return;
  }

  console.log(
    `[QUEUE-POLLER] Starting queue poller (interval: ${POLL_INTERVAL / 1000}s, ` +
    `stale processing: ${STALE_PROCESSING_THRESHOLD_MS / 60000}min, ` +
    `stale queued: ${STALE_QUEUED_THRESHOLD_MS / 60000}min)`
  );

  // Run immediately on startup to catch any jobs left from before restart
  pollCycle();

  // Then poll periodically
  pollTimer = setInterval(pollCycle, POLL_INTERVAL);
}

/**
 * Stop the queue poller (for graceful shutdown).
 */
export function stopQueuePoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[QUEUE-POLLER] Stopped");
  }
}
