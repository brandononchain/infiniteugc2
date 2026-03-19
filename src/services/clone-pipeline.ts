/**
 * Clone Pipeline Orchestrator
 *
 * Runs the full video cloning pipeline asynchronously:
 *
 * 1. Gemini 2.5 Flash ultra-deep forensic video analysis (clone-analyzer)
 * 2. Claude Sonnet 4 blueprint extraction (clone-prompt-generator Phase 1)
 * 3. GPT-5.2 clone prompt generation + quality gate (clone-prompt-generator Phase 2)
 * 4. Reference keyframe extraction from source video for VEO3 visual continuity
 * 5. VEO3 video generation using the clone prompt
 * 6. Store the cloned video in Supabase storage
 *
 * The pipeline produces a brand new video that looks and feels like it was
 * made by the same creator as the source — but with entirely different content.
 */

import { getSupabaseAdmin } from "../lib/supabase";
import { analyzeVideoForCloning } from "./clone-analyzer";
import { generateClonePrompt, ClonePromptResult } from "./clone-prompt-generator";
import {
  generateVideo,
  waitForVideoCompletion,
  downloadVideo,
} from "./veo3";
import { extractHookKeyframe } from "./hook-keyframe";

type CloneJobStatus =
  | "pending"
  | "analyzing"
  | "extracting_blueprint"
  | "generating_prompt"
  | "generating_video"
  | "completed"
  | "failed";

async function updateCloneStatus(
  cloneJobId: string,
  status: CloneJobStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  const { error } = await supabase
    .from("clone_jobs")
    .update(update)
    .eq("id", cloneJobId);

  if (error) {
    console.warn(`[ClonePipeline] Failed to update status to ${status}: ${error.message}`);
  }
}

/**
 * Main pipeline orchestration function.
 * Called as fire-and-forget from the route handler.
 */
export async function processCloneGeneration(
  cloneJobId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // Fetch the clone job
    const { data: cloneJob, error: fetchError } = await supabase
      .from("clone_jobs")
      .select("*")
      .eq("id", cloneJobId)
      .single();

    if (fetchError || !cloneJob) {
      throw new Error(`Clone job ${cloneJobId} not found: ${fetchError?.message}`);
    }

    console.log(`[ClonePipeline] Starting clone pipeline for job ${cloneJobId}`);
    console.log(`[ClonePipeline] Source video: ${cloneJob.source_video_url}`);
    console.log(`[ClonePipeline] User prompt: ${cloneJob.user_prompt}`);

    // ── Step 1: Ultra-deep forensic video analysis with Gemini ──
    await updateCloneStatus(cloneJobId, "analyzing");
    console.log("[ClonePipeline] Step 1: Deep forensic analysis with Gemini 2.5 Flash...");

    const analysis = await analyzeVideoForCloning(cloneJob.source_video_url);
    await updateCloneStatus(cloneJobId, "analyzing", {
      analysis_result: analysis,
    });

    console.log(`[ClonePipeline] Analysis complete: ${analysis.length} chars`);

    // ── Step 2+3: Blueprint extraction + Clone prompt generation ──
    await updateCloneStatus(cloneJobId, "extracting_blueprint");
    console.log("[ClonePipeline] Step 2: Blueprint extraction + prompt generation...");

    const cloneResult: ClonePromptResult = await generateClonePrompt(
      analysis,
      cloneJob.user_prompt
    );

    await updateCloneStatus(cloneJobId, "generating_prompt", {
      clone_blueprint: cloneResult.blueprint,
      clone_prompt: cloneResult.prompt,
      clone_duration: cloneResult.durationSeconds,
      clone_rating: cloneResult.rating,
      clone_rating_feedback: cloneResult.ratingFeedback,
      clone_attempts: cloneResult.attempts,
    });

    console.log(`[ClonePipeline] Clone prompt generated (${cloneResult.durationSeconds}s, rating: ${cloneResult.rating}/10, attempts: ${cloneResult.attempts})`);

    // ── Step 4: Generate cloned video with VEO3 ──
    await updateCloneStatus(cloneJobId, "generating_video");
    console.log("[ClonePipeline] Step 3: Generating cloned video with VEO3...");

    // Detect aspect ratio from analysis
    const isLandscape = /landscape|16:\s*9/i.test(analysis);
    const aspectRatio: "9:16" | "16:9" = isLandscape ? "16:9" : "9:16";
    console.log(`[ClonePipeline] Detected aspect ratio: ${aspectRatio}`);

    // Extract a reference keyframe from source for visual continuity
    let referenceImageUrl: string | undefined;
    try {
      console.log("[ClonePipeline] Extracting reference keyframe from source video...");
      referenceImageUrl = await extractHookKeyframe(
        cloneJob.source_video_url,
        cloneJobId,
        userId,
        2 // 2s into the video to avoid intros/black frames
      );
      console.log(`[ClonePipeline] Reference keyframe: ${referenceImageUrl}`);
    } catch (frameErr: any) {
      console.warn(`[ClonePipeline] Keyframe extraction failed (continuing without): ${frameErr.message}`);
    }

    // Clamp duration to VEO3's supported range
    const veo3Duration = Math.min(8, Math.max(4, cloneResult.durationSeconds)) as 4 | 6 | 8;

    const veo3Operation = await generateVideo(cloneResult.prompt, {
      aspectRatio,
      durationSeconds: veo3Duration,
      referenceImageUrl,
    });

    const completedOp = await waitForVideoCompletion(veo3Operation);
    const cloneVideoResultUrl = completedOp.response?.resultUrls?.[0];

    if (!cloneVideoResultUrl) {
      throw new Error("VEO3 returned no video URL");
    }

    // Download and upload cloned video to Supabase
    const cloneBuffer = await downloadVideo(cloneVideoResultUrl);
    const clonePath = `${userId}/${cloneJobId}/cloned.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(clonePath, cloneBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload cloned video: ${uploadError.message}`);
    }

    const { data: clonePublicUrlData } = supabase.storage
      .from("videos")
      .getPublicUrl(clonePath);

    const cloneVideoUrl = clonePublicUrlData.publicUrl;

    // ── Step 5: Mark completed ──
    await updateCloneStatus(cloneJobId, "completed", {
      cloned_video_url: cloneVideoUrl,
      completed_at: new Date().toISOString(),
    });

    console.log(`[ClonePipeline] Job ${cloneJobId} completed successfully`);
    console.log(`[ClonePipeline] Cloned video: ${cloneVideoUrl}`);
  } catch (error: any) {
    console.error(`[ClonePipeline] Job ${cloneJobId} failed:`, error.message);

    await updateCloneStatus(cloneJobId, "failed", {
      error_message: error.message || "Unknown error during clone generation",
    });

    // Refund credits
    try {
      const creditsCost = 25; // Clone job cost
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits + creditsCost })
          .eq("id", userId);
        console.log(`[ClonePipeline] Refunded ${creditsCost} credits to user ${userId}`);
      }
    } catch (refundErr: any) {
      console.error(`[ClonePipeline] Credit refund exception: ${refundErr.message}`);
    }
  }
}
