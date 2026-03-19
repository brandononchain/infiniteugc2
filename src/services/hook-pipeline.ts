/**
 * Hook Pipeline Orchestrator
 *
 * Runs the full hook generation pipeline asynchronously:
 * 1. Gemini 2.5 Flash forensic video analysis
 * 2. GPT-5.2 hook prompt generation + GPT-5.2 quality gate (dynamic 4/6/8s duration)
 * 3. Reference keyframe extraction from original video
 * 4. VEO3 hook video generation (dynamic duration with reference image)
 * 5. Lambda stitching (hook + original) with resolution normalization
 */

import { getSupabaseAdmin } from "../lib/supabase";
import { analyzeVideoForHook } from "./video-analyzer";
import { generateHookPrompt, HookPromptResult } from "./hook-prompt-generator";
import {
  generateVideo,
  waitForVideoCompletion,
  downloadVideo,
} from "./veo3";
import { triggerStitching } from "./lambda-invoker";
import { extractHookKeyframe } from "./hook-keyframe";

type HookJobStatus =
  | "pending"
  | "analyzing"
  | "generating_prompt"
  | "generating_hook"
  | "stitching"
  | "completed"
  | "failed";

async function updateHookStatus(
  hookJobId: string,
  status: HookJobStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  const { error } = await supabase
    .from("hook_jobs")
    .update(update)
    .eq("id", hookJobId);

  if (error) {
    console.warn(`[HookPipeline] Failed to update status to ${status}: ${error.message}`);
  }
}

/**
 * Main pipeline orchestration function.
 * Called as fire-and-forget from the route handler.
 */
export async function processHookGeneration(
  hookJobId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // Fetch the hook job
    const { data: hookJob, error: fetchError } = await supabase
      .from("hook_jobs")
      .select("*")
      .eq("id", hookJobId)
      .single();

    if (fetchError || !hookJob) {
      throw new Error(`Hook job ${hookJobId} not found: ${fetchError?.message}`);
    }

    console.log(`[HookPipeline] Starting pipeline for job ${hookJobId}`);

    // ── Step 1: Analyze video with Gemini 2.5 Flash ──
    await updateHookStatus(hookJobId, "analyzing");
    console.log("[HookPipeline] Step 1: Analyzing video with Gemini...");

    const analysis = await analyzeVideoForHook(hookJob.source_video_url);
    await updateHookStatus(hookJobId, "analyzing", { analysis_result: analysis });

    console.log("[HookPipeline] Video analysis complete");

    // ── Step 2: Generate hook prompt with GPT-5.2 ──
    await updateHookStatus(hookJobId, "generating_prompt");
    console.log("[HookPipeline] Step 2: Generating hook prompt with GPT-5.2...");

    const hookResult: HookPromptResult = await generateHookPrompt(analysis);
    await updateHookStatus(hookJobId, "generating_prompt", {
      hook_prompt: hookResult.prompt,
      hook_duration: hookResult.durationSeconds,
      hook_rating: hookResult.rating,
      hook_rating_feedback: hookResult.ratingFeedback,
      hook_attempts: hookResult.attempts,
    });

    console.log(`[HookPipeline] Hook prompt generated (${hookResult.durationSeconds}s, rating: ${hookResult.rating}/10, attempts: ${hookResult.attempts})`);

    // ── Step 3: Generate hook video with VEO3 ──
    await updateHookStatus(hookJobId, "generating_hook");
    console.log("[HookPipeline] Step 3: Generating hook video with VEO3...");

    // Detect aspect ratio from analysis (default portrait 9:16)
    const isLandscape = /landscape|16:\s*9/i.test(analysis);
    const aspectRatio = isLandscape ? "16:9" : "9:16";
    console.log(`[HookPipeline] Detected aspect ratio: ${aspectRatio}`);

    // Extract an environment-focused keyframe (bottom-cropped to avoid faces).
    // VEO3 uses this for color/lighting/setting reference — NOT to reproduce a person.
    let referenceImageUrl: string | undefined;
    try {
      console.log("[HookPipeline] Extracting environment keyframe (bottom-crop, no face)...");
      referenceImageUrl = await extractHookKeyframe(
        hookJob.source_video_url,
        hookJobId,
        userId,
        3 // 3s in to avoid intro/black frames
      );
      console.log(`[HookPipeline] Reference keyframe: ${referenceImageUrl}`);
    } catch (frameErr: any) {
      // Non-fatal: continue without reference image
      console.warn(`[HookPipeline] Keyframe extraction failed (continuing without): ${frameErr.message}`);
    }

    // Use the dynamically selected duration from GPT-5.2
    const veo3Operation = await generateVideo(hookResult.prompt, {
      aspectRatio: aspectRatio as "9:16" | "16:9",
      durationSeconds: hookResult.durationSeconds,
      referenceImageUrl,
    });

    const completedOp = await waitForVideoCompletion(veo3Operation);
    const hookVideoResultUrl = completedOp.response?.resultUrls?.[0];

    if (!hookVideoResultUrl) {
      throw new Error("VEO3 returned no video URL");
    }

    // Download and upload hook video to Supabase
    const hookBuffer = await downloadVideo(hookVideoResultUrl);
    const hookPath = `${userId}/${hookJobId}/hook.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("premium-videos")
      .upload(hookPath, hookBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload hook video: ${uploadError.message}`);
    }

    const { data: hookPublicUrlData } = supabase.storage
      .from("premium-videos")
      .getPublicUrl(hookPath);

    const hookVideoUrl = hookPublicUrlData.publicUrl;
    await updateHookStatus(hookJobId, "generating_hook", { hook_video_url: hookVideoUrl });

    console.log(`[HookPipeline] Hook video uploaded: ${hookVideoUrl}`);

    // ── Step 4: Stitch hook + original via Lambda ──
    await updateHookStatus(hookJobId, "stitching");
    console.log("[HookPipeline] Step 4: Triggering Lambda stitching...");

    await triggerStitching(
      hookJobId,
      userId,
      hookJob.credits_cost || 15,
      [hookVideoUrl, hookJob.source_video_url],
      "hook_jobs"
    );

    console.log(`[HookPipeline] Stitching triggered. Lambda will update hook_jobs on completion.`);
  } catch (error: any) {
    console.error(`[HookPipeline] Job ${hookJobId} failed:`, error.message);

    await updateHookStatus(hookJobId, "failed", {
      error_message: error.message || "Unknown error during hook generation",
    });

    // Refund credits
    try {
      const { error: refundError } = await supabase.rpc("increment_credits", {
        user_id: userId,
        amount: 15,
      });

      if (refundError) {
        console.error(`[HookPipeline] Failed to refund credits: ${refundError.message}`);
      } else {
        console.log(`[HookPipeline] Refunded 15 credits to user ${userId}`);
      }
    } catch (refundErr: any) {
      console.error(`[HookPipeline] Credit refund exception: ${refundErr.message}`);
    }
  }
}
