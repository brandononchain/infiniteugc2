/**
 * Video Cloner Pipeline (God Mode)
 *
 * The full end-to-end video cloning pipeline with product swap.
 * Takes a competitor's video + user's product info and produces a
 * new video that preserves the original's motion, style, and structure
 * but with the user's product and optionally a new avatar.
 *
 * Pipeline:
 * 1. SCENE ANALYSIS — Gemini segments the video into scenes
 * 2. PRODUCT SWAP PLANNING — Gemini generates per-scene swap prompts
 * 3. SOURCE VIDEO DOWNLOAD + SEGMENTATION — FFmpeg extracts each scene
 * 4. PER-SCENE REGENERATION:
 *    - talking_head → Kling Motion Control + Sync.so lip-sync
 *    - product_shot → Sora 2 Pro (image-to-video with product reference)
 *    - broll (product) → Sora 2 Pro or VEO3
 *    - broll (generic) / transition → keep original segment
 * 5. STITCHING — FFmpeg concatenates all regenerated scenes
 * 6. UPLOAD — Store final video in Supabase
 *
 * Integration points:
 * - Kling Motion Control API (motion-control.ts)
 * - Sync.so lip-sync API (sync.ts)
 * - Sora 2 Pro via Kie.ai (sora2.ts)
 * - VEO3 via Kie.ai (veo3.ts)
 * - ElevenLabs TTS (elevenlabs.ts)
 * - Gemini 2.5 Flash (scene analysis, product swap)
 * - FFmpeg (segment extraction, stitching)
 */

import { getSupabaseAdmin } from "../lib/supabase";
import { getKieApiKey, getSyncApiKey } from "../lib/keys";
import { withKlingRotation } from "../lib/keys";
import { analyzeVideoScenes, SceneAnalysisResult, SceneSegment } from "./scene-analyzer";
import { generateProductSwapPlan, UserProduct, SceneSwapPrompt, ProductSwapPlan } from "./product-swap";
import {
  extractSegment,
  extractFrameAtTime,
  stitchVideos,
  downloadVideoBuffer,
  getVideoMetadata,
} from "./video-stitcher";
import {
  createSora2Task,
  pollSora2Completion,
} from "./sora2";
import {
  generateVideo as generateVeo3Video,
  waitForVideoCompletion as waitForVeo3Completion,
  downloadVideo as downloadVeo3Video,
} from "./veo3";
import { createSyncGeneration, pollSyncCompletion } from "./sync";
import { generateAudio, cloneVoice } from "./elevenlabs";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ClonerJobStatus =
  | "pending"
  | "analyzing_scenes"
  | "planning_swap"
  | "extracting_segments"
  | "regenerating_scenes"
  | "stitching"
  | "completed"
  | "failed";

export interface ClonerJobConfig {
  /** User's product information */
  userProduct: UserProduct;
  /** Optional: user-provided replacement script */
  newScript?: string;
  /** Optional: avatar image URL for Kling MC face swap */
  avatarImageUrl?: string;
  /** Optional: voice ID for TTS (from user's voice library) */
  voiceId?: string;
  /** Optional: whether to clone voice from the source video */
  cloneVoiceFromSource?: boolean;
  /** Optional: preferred video model for B-roll/product shots */
  preferredModel?: "sora2pro" | "veo3";
  /** Optional: target aspect ratio override */
  aspectRatio?: "9:16" | "16:9";
}

interface RegeneratedScene {
  sceneIndex: number;
  videoBuffer: Buffer;
  strategy: string;
}

// ─────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────

async function updateClonerStatus(
  jobId: string,
  status: ClonerJobStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    status,
    pipeline_step: status,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  const { error } = await supabase
    .from("clone_jobs")
    .update(update)
    .eq("id", jobId);

  if (error) {
    console.warn(`[ClonerPipeline] Failed to update status to ${status}: ${error.message}`);
  }
}

// ─────────────────────────────────────────────
// Scene regeneration handlers
// ─────────────────────────────────────────────

/**
 * Regenerate a scene using Sora 2 Pro (image-to-video).
 * Used for product_shot and product-related B-roll scenes.
 */
async function regenerateWithSora2Pro(
  scenePrompt: SceneSwapPrompt,
  referenceFrameBuffer: Buffer,
  userId: string,
  jobId: string
): Promise<Buffer> {
  console.log(
    `[ClonerPipeline] Regenerating scene ${scenePrompt.sceneIndex} with Sora 2 Pro...`
  );

  const kieApiKey = await getKieApiKey();

  // Upload reference frame to Supabase for a URL
  const supabase = getSupabaseAdmin();
  const framePath = `clone-refs/${userId}/${jobId}/scene_${scenePrompt.sceneIndex}_ref.jpg`;

  const { error: frameUploadError } = await supabase.storage
    .from("videos")
    .upload(framePath, referenceFrameBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (frameUploadError) {
    throw new Error(`Failed to upload reference frame: ${frameUploadError.message}`);
  }

  const { data: frameUrlData } = supabase.storage.from("videos").getPublicUrl(framePath);
  const referenceImageUrl = frameUrlData.publicUrl;

  // Sora 2 Pro: max 12 seconds per generation
  // Clamp scene duration to fit within the 12s limit
  const nFrames = Math.min(12, Math.max(5, Math.ceil(scenePrompt.durationSeconds)));

  const taskId = await createSora2Task(scenePrompt.prompt, referenceImageUrl, kieApiKey, {
    nFrames: String(nFrames),
    aspectRatio: "portrait", // Will be overridden by the pipeline if needed
  });

  const { videoUrl } = await pollSora2Completion(taskId, kieApiKey);

  // Download the generated video
  const videoResponse = await fetchWithTimeout(videoUrl, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });
  if (!videoResponse.ok) {
    throw new Error(`Failed to download Sora 2 Pro output: ${videoResponse.status}`);
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  console.log(
    `[ClonerPipeline] Scene ${scenePrompt.sceneIndex} regenerated with Sora 2 Pro: ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`
  );

  return videoBuffer;
}

/**
 * Regenerate a scene using VEO3.
 * Used for complex B-roll scenes or when higher quality is needed.
 */
async function regenerateWithVeo3(
  scenePrompt: SceneSwapPrompt,
  referenceFrameBuffer: Buffer | null,
  userId: string,
  jobId: string
): Promise<Buffer> {
  console.log(
    `[ClonerPipeline] Regenerating scene ${scenePrompt.sceneIndex} with VEO3...`
  );

  let referenceImageUrl: string | undefined;

  if (referenceFrameBuffer) {
    const supabase = getSupabaseAdmin();
    const framePath = `clone-refs/${userId}/${jobId}/scene_${scenePrompt.sceneIndex}_ref.jpg`;

    const { error: frameUploadError } = await supabase.storage
      .from("videos")
      .upload(framePath, referenceFrameBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (!frameUploadError) {
      const { data: frameUrlData } = supabase.storage.from("videos").getPublicUrl(framePath);
      referenceImageUrl = frameUrlData.publicUrl;
    }
  }

  const veo3Duration = Math.min(8, Math.max(4, Math.ceil(scenePrompt.durationSeconds))) as 4 | 6 | 8;

  const operation = await generateVeo3Video(scenePrompt.prompt, {
    aspectRatio: "9:16",
    durationSeconds: veo3Duration,
    referenceImageUrl,
  });

  const completedOp = await waitForVeo3Completion(operation);
  const resultUrl = completedOp.response?.resultUrls?.[0];

  if (!resultUrl) {
    throw new Error("VEO3 returned no video URL");
  }

  const videoBuffer = await downloadVeo3Video(resultUrl);
  console.log(
    `[ClonerPipeline] Scene ${scenePrompt.sceneIndex} regenerated with VEO3: ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`
  );

  return videoBuffer;
}

/**
 * Regenerate a talking head scene using Kling Motion Control + optional Sync.so lip-sync.
 *
 * This is the "keys to the kingdom" — it:
 * 1. Takes the original video segment as motion reference
 * 2. Uses Kling MC to face-swap with the user's avatar
 * 3. Generates TTS audio with the new script
 * 4. Applies Sync.so lip-sync to match mouth to new audio
 */
async function regenerateWithKlingMC(
  scenePrompt: SceneSwapPrompt,
  sourceSegmentBuffer: Buffer,
  avatarImageUrl: string,
  voiceId: string | null,
  userId: string,
  jobId: string
): Promise<Buffer> {
  console.log(
    `[ClonerPipeline] Regenerating scene ${scenePrompt.sceneIndex} with Kling MC + Sync.so...`
  );

  const supabase = getSupabaseAdmin();

  // Step 1: Upload source segment as motion reference
  const segmentPath = `clone-refs/${userId}/${jobId}/scene_${scenePrompt.sceneIndex}_motion.mp4`;
  const { error: segUploadError } = await supabase.storage
    .from("videos")
    .upload(segmentPath, sourceSegmentBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (segUploadError) {
    throw new Error(`Failed to upload motion reference: ${segUploadError.message}`);
  }

  const { data: segUrlData } = supabase.storage.from("videos").getPublicUrl(segmentPath);
  const motionVideoUrl = segUrlData.publicUrl;

  // Step 2: Kling Motion Control — face swap with user's avatar
  console.log(`[ClonerPipeline] Running Kling MC face swap for scene ${scenePrompt.sceneIndex}...`);

  const mcVideoUrl = await withKlingRotation(async (jwtToken: string) => {
    // Create motion control task
    const body: Record<string, unknown> = {
      model_name: "kling-v3",
      image_url: avatarImageUrl,
      video_url: motionVideoUrl,
      prompt: scenePrompt.prompt || "",
      duration: "30",
      mode: "pro",
      cfg_scale: 0.5,
      character_orientation: "video",
      keep_original_sound: "no",
    };

    console.log(`[ClonerPipeline] Kling MC request for scene ${scenePrompt.sceneIndex}`);

    const response = await fetch("https://api.klingai.com/v1/videos/motion-control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Kling MC create failed (${response.status}): ${errorText}`);
    }

    const result: any = await response.json();
    if (result.code !== 0 || !result.data?.task_id) {
      throw new Error(`Kling MC task creation failed: ${result.message || "No task ID"}`);
    }

    const taskId = result.data.task_id;
    console.log(`[ClonerPipeline] Kling MC task: ${taskId}`);

    // Poll for completion
    for (let attempt = 1; attempt <= 80; attempt++) {
      const statusResponse = await fetch(
        `https://api.klingai.com/v1/videos/motion-control/${taskId}`,
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );

      if (!statusResponse.ok) {
        throw new Error(`Kling MC poll failed: ${statusResponse.status}`);
      }

      const statusResult: any = await statusResponse.json();
      const status = statusResult.data?.task_status || statusResult.data?.status;

      if (attempt % 10 === 0) {
        console.log(`[ClonerPipeline] Kling MC poll ${attempt}: ${status}`);
      }

      if (status === "Completed" || status === "completed" || status === "succeed") {
        const videoUrl =
          statusResult.data?.output?.video_url ||
          statusResult.data?.task_result?.videos?.[0]?.url ||
          statusResult.data?.works?.[0]?.resource?.resource;
        if (!videoUrl) throw new Error("Kling MC completed but no video URL");
        return videoUrl;
      }

      if (status === "Failed" || status === "failed" || status === "fail") {
        throw new Error(
          `Kling MC failed: ${statusResult.data?.error?.message || statusResult.data?.task_status_msg || "Unknown"}`
        );
      }

      await new Promise((r) => setTimeout(r, 15000));
    }

    throw new Error("Kling MC timed out");
  });

  // Download MC output
  const mcResponse = await fetchWithTimeout(mcVideoUrl, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });
  if (!mcResponse.ok) {
    throw new Error(`Failed to download Kling MC output: ${mcResponse.status}`);
  }
  let mcBuffer = Buffer.from(await mcResponse.arrayBuffer());
  console.log(
    `[ClonerPipeline] Kling MC output for scene ${scenePrompt.sceneIndex}: ${(mcBuffer.length / 1024 / 1024).toFixed(1)}MB`
  );

  // Step 3: If lip-sync needed, apply Sync.so
  if (scenePrompt.lipSync && scenePrompt.dialogueText && voiceId) {
    console.log(`[ClonerPipeline] Applying lip-sync for scene ${scenePrompt.sceneIndex}...`);

    // Generate TTS audio
    const ttsBuffer = await generateAudio(scenePrompt.dialogueText, voiceId);

    // Upload TTS to get a URL
    const ttsPath = `clone-refs/${userId}/${jobId}/scene_${scenePrompt.sceneIndex}_tts.mp3`;
    const { error: ttsUploadError } = await supabase.storage
      .from("sync-outputs")
      .upload(ttsPath, ttsBuffer, { contentType: "audio/mpeg", upsert: true });

    if (ttsUploadError) {
      throw new Error(`Failed to upload TTS audio: ${ttsUploadError.message}`);
    }

    const { data: ttsSignedData, error: ttsSignedError } = await supabase.storage
      .from("sync-outputs")
      .createSignedUrl(ttsPath, 60 * 60 * 2);

    if (ttsSignedError || !ttsSignedData?.signedUrl) {
      throw new Error(`Failed to create TTS signed URL: ${ttsSignedError?.message}`);
    }

    // Upload MC video to get a URL for Sync.so
    const mcVideoPath = `clone-refs/${userId}/${jobId}/scene_${scenePrompt.sceneIndex}_mc.mp4`;
    const { error: mcUploadError } = await supabase.storage
      .from("videos")
      .upload(mcVideoPath, mcBuffer, { contentType: "video/mp4", upsert: true });

    if (mcUploadError) {
      throw new Error(`Failed to upload MC video for sync: ${mcUploadError.message}`);
    }

    const { data: mcPublicUrlData } = supabase.storage.from("videos").getPublicUrl(mcVideoPath);

    // Apply Sync.so lip-sync
    const syncApiKey = await getSyncApiKey();
    const { id: syncGenId } = await createSyncGeneration({
      apiKey: syncApiKey,
      videoUrl: mcPublicUrlData.publicUrl,
      script: scenePrompt.dialogueText,
      audioUrl: ttsSignedData.signedUrl,
      model: "lipsync-2",
    });

    console.log(`[ClonerPipeline] Sync.so generation: ${syncGenId}`);
    const { outputUrl: syncOutputUrl } = await pollSyncCompletion(syncApiKey, syncGenId);

    // Download lip-synced result
    const syncResponse = await fetchWithTimeout(syncOutputUrl, {
      timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
    });
    if (!syncResponse.ok) {
      throw new Error(`Failed to download Sync.so output: ${syncResponse.status}`);
    }

    mcBuffer = Buffer.from(await syncResponse.arrayBuffer());
    console.log(
      `[ClonerPipeline] Lip-synced scene ${scenePrompt.sceneIndex}: ${(mcBuffer.length / 1024 / 1024).toFixed(1)}MB`
    );
  }

  return mcBuffer;
}

// ─────────────────────────────────────────────
// Main Pipeline Orchestrator
// ─────────────────────────────────────────────

/**
 * Run the full video cloning pipeline with product swap.
 *
 * This is the god-mode pipeline that:
 * 1. Analyzes the source video into scenes
 * 2. Plans product swaps per scene
 * 3. Extracts each scene segment from the source
 * 4. Regenerates each scene with the appropriate model
 * 5. Stitches everything back together
 * 6. Uploads and marks the job complete
 */
export async function processAdvancedCloneGeneration(
  cloneJobId: string,
  userId: string,
  config: ClonerJobConfig
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

    const sourceVideoUrl = cloneJob.source_video_url;
    console.log(`[ClonerPipeline] Starting advanced clone pipeline for job ${cloneJobId}`);
    console.log(`[ClonerPipeline] Source: ${sourceVideoUrl}`);
    console.log(`[ClonerPipeline] Product: ${config.userProduct.name}`);

    // ── Step 1: Scene Analysis ──
    await updateClonerStatus(cloneJobId, "analyzing_scenes");
    console.log("[ClonerPipeline] Step 1: Analyzing video scenes with Gemini...");

    const sceneAnalysis: SceneAnalysisResult = await analyzeVideoScenes(sourceVideoUrl);

    await updateClonerStatus(cloneJobId, "analyzing_scenes", {
      scene_analysis: JSON.stringify(sceneAnalysis),
    });

    console.log(
      `[ClonerPipeline] Scene analysis complete: ${sceneAnalysis.sceneCount} scenes, ${sceneAnalysis.totalDuration}s`
    );

    // ── Step 2: Product Swap Planning ──
    await updateClonerStatus(cloneJobId, "planning_swap");
    console.log("[ClonerPipeline] Step 2: Generating product swap plan...");

    const swapPlan: ProductSwapPlan = await generateProductSwapPlan(
      sceneAnalysis.scenes,
      config.userProduct,
      sceneAnalysis.scriptFull,
      config.newScript || null
    );

    await updateClonerStatus(cloneJobId, "planning_swap", {
      swap_plan: JSON.stringify(swapPlan),
      clone_prompt: swapPlan.newScript,
    });

    console.log(
      `[ClonerPipeline] Swap plan: ${swapPlan.scenesToRegenerate} to regenerate, ${swapPlan.scenesToKeep} to keep`
    );

    // ── Step 3: Download source video and extract segments ──
    await updateClonerStatus(cloneJobId, "extracting_segments");
    console.log("[ClonerPipeline] Step 3: Downloading source video and extracting segments...");

    const sourceVideoBuffer = await downloadVideoBuffer(sourceVideoUrl);
    const videoMeta = await getVideoMetadata(sourceVideoBuffer);

    console.log(
      `[ClonerPipeline] Source video: ${videoMeta.duration.toFixed(1)}s, ${videoMeta.width}x${videoMeta.height}, ${videoMeta.fps}fps`
    );

    // Resolve voice for TTS
    let resolvedVoiceId: string | null = null;

    if (config.voiceId) {
      // Look up the ElevenLabs voice ID
      const { data: voice } = await supabase
        .from("voices")
        .select("elevenlabs_voice_id")
        .eq("id", config.voiceId)
        .single();

      if (voice) {
        resolvedVoiceId = voice.elevenlabs_voice_id;
      }
    } else if (config.cloneVoiceFromSource) {
      // Clone voice from source video audio
      console.log("[ClonerPipeline] Cloning voice from source video...");
      try {
        const { extractAudioFromSegment } = await import("./video-stitcher");
        const audioBuffer = await extractAudioFromSegment(sourceVideoBuffer, 0, Math.min(60, videoMeta.duration));
        const voiceName = `Clone - ${config.userProduct.name} - ${cloneJobId.substring(0, 8)}`;
        resolvedVoiceId = await cloneVoice(voiceName, audioBuffer, "voice-sample.mp3");
        console.log(`[ClonerPipeline] Voice cloned: ${resolvedVoiceId}`);

        // Save to voices table
        await supabase.from("voices").insert({
          user_id: userId,
          elevenlabs_voice_id: resolvedVoiceId,
          name: voiceName,
        } as any);
      } catch (voiceErr: any) {
        console.warn(`[ClonerPipeline] Voice cloning failed: ${voiceErr.message}`);
      }
    }

    // ── Step 4: Regenerate each scene ──
    await updateClonerStatus(cloneJobId, "regenerating_scenes");
    console.log("[ClonerPipeline] Step 4: Regenerating scenes...");

    const regeneratedScenes: RegeneratedScene[] = [];
    const totalScenes = swapPlan.scenePrompts.length;

    for (let i = 0; i < totalScenes; i++) {
      const sp = swapPlan.scenePrompts[i];

      await updateClonerStatus(cloneJobId, "regenerating_scenes", {
        pipeline_progress: `Regenerating scene ${i + 1}/${totalScenes} (${sp.strategy})`,
      });

      try {
        if (sp.strategy === "keep_original") {
          // Extract and keep the original segment
          console.log(`[ClonerPipeline] Scene ${sp.sceneIndex}: Keeping original`);
          const segmentBuffer = await extractSegment(
            sourceVideoBuffer,
            sp.startSeconds,
            sp.endSeconds
          );
          regeneratedScenes.push({
            sceneIndex: sp.sceneIndex,
            videoBuffer: segmentBuffer,
            strategy: "keep_original",
          });
        } else if (sp.strategy === "sora2pro") {
          // Extract reference frame from the best timestamp
          const refFrameTime = Math.min(
            sp.referenceFrameTimestamp || sp.startSeconds + 1,
            sp.endSeconds - 0.5
          );
          const referenceFrame = await extractFrameAtTime(sourceVideoBuffer, refFrameTime);

          const videoBuffer = await regenerateWithSora2Pro(sp, referenceFrame, userId, cloneJobId);
          regeneratedScenes.push({
            sceneIndex: sp.sceneIndex,
            videoBuffer,
            strategy: "sora2pro",
          });
        } else if (sp.strategy === "veo3") {
          // Extract optional reference frame
          let referenceFrame: Buffer | null = null;
          try {
            const refFrameTime = Math.min(
              sp.referenceFrameTimestamp || sp.startSeconds + 1,
              sp.endSeconds - 0.5
            );
            referenceFrame = await extractFrameAtTime(sourceVideoBuffer, refFrameTime);
          } catch {
            console.warn(`[ClonerPipeline] Reference frame extraction failed for scene ${sp.sceneIndex}`);
          }

          const videoBuffer = await regenerateWithVeo3(sp, referenceFrame, userId, cloneJobId);
          regeneratedScenes.push({
            sceneIndex: sp.sceneIndex,
            videoBuffer,
            strategy: "veo3",
          });
        } else if (sp.strategy === "kling_mc") {
          if (!config.avatarImageUrl) {
            // No avatar provided — keep original for talking head scenes
            console.log(`[ClonerPipeline] Scene ${sp.sceneIndex}: No avatar, keeping original talking head`);
            const segmentBuffer = await extractSegment(
              sourceVideoBuffer,
              sp.startSeconds,
              sp.endSeconds
            );
            regeneratedScenes.push({
              sceneIndex: sp.sceneIndex,
              videoBuffer: segmentBuffer,
              strategy: "keep_original",
            });
          } else {
            // Extract the source segment as motion reference
            const sourceSegment = await extractSegment(
              sourceVideoBuffer,
              sp.startSeconds,
              sp.endSeconds
            );

            const videoBuffer = await regenerateWithKlingMC(
              sp,
              sourceSegment,
              config.avatarImageUrl,
              resolvedVoiceId,
              userId,
              cloneJobId
            );
            regeneratedScenes.push({
              sceneIndex: sp.sceneIndex,
              videoBuffer,
              strategy: "kling_mc",
            });
          }
        }

        console.log(
          `[ClonerPipeline] Scene ${sp.sceneIndex} complete (${sp.strategy}) — ${i + 1}/${totalScenes}`
        );
      } catch (sceneErr: any) {
        console.error(
          `[ClonerPipeline] Scene ${sp.sceneIndex} (${sp.strategy}) failed: ${sceneErr.message}`
        );

        // Fallback: use original segment on scene failure
        console.log(`[ClonerPipeline] Falling back to original segment for scene ${sp.sceneIndex}`);
        try {
          const fallbackBuffer = await extractSegment(
            sourceVideoBuffer,
            sp.startSeconds,
            sp.endSeconds
          );
          regeneratedScenes.push({
            sceneIndex: sp.sceneIndex,
            videoBuffer: fallbackBuffer,
            strategy: "keep_original",
          });
        } catch (fallbackErr: any) {
          console.error(
            `[ClonerPipeline] Fallback extraction also failed for scene ${sp.sceneIndex}: ${fallbackErr.message}`
          );
        }
      }
    }

    if (regeneratedScenes.length === 0) {
      throw new Error("No scenes were successfully regenerated");
    }

    // Sort by scene index to maintain order
    regeneratedScenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

    // ── Step 5: Stitch all scenes together ──
    await updateClonerStatus(cloneJobId, "stitching");
    console.log(
      `[ClonerPipeline] Step 5: Stitching ${regeneratedScenes.length} scenes together...`
    );

    const videoBuffers = regeneratedScenes.map((s) => s.videoBuffer);
    const stitchedVideo = await stitchVideos(
      videoBuffers,
      videoMeta.width,
      videoMeta.height,
      videoMeta.fps
    );

    console.log(
      `[ClonerPipeline] Stitched video: ${(stitchedVideo.length / 1024 / 1024).toFixed(1)}MB`
    );

    // ── Step 6: Upload final video ──
    const finalPath = `${userId}/${cloneJobId}/cloned.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(finalPath, stitchedVideo, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload final video: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from("videos").getPublicUrl(finalPath);
    const finalVideoUrl = publicUrlData.publicUrl;

    // ── Done ──
    const sceneSummary = regeneratedScenes.map(
      (s) => `scene_${s.sceneIndex}:${s.strategy}`
    );

    await updateClonerStatus(cloneJobId, "completed", {
      cloned_video_url: finalVideoUrl,
      completed_at: new Date().toISOString(),
      clone_blueprint: JSON.stringify({
        totalScenes,
        regenerated: regeneratedScenes.filter((s) => s.strategy !== "keep_original").length,
        kept: regeneratedScenes.filter((s) => s.strategy === "keep_original").length,
        sceneSummary,
      }),
    });

    console.log(`[ClonerPipeline] Job ${cloneJobId} completed: ${finalVideoUrl}`);
    console.log(`[ClonerPipeline] Scene summary: ${sceneSummary.join(", ")}`);
  } catch (error: any) {
    console.error(`[ClonerPipeline] Job ${cloneJobId} failed:`, error.message);

    await updateClonerStatus(cloneJobId, "failed", {
      error_message: error.message || "Advanced clone pipeline failed",
    });

    // Refund credits
    try {
      const { data: job } = await supabase
        .from("clone_jobs")
        .select("credits_cost")
        .eq("id", cloneJobId)
        .single();

      const creditsCost = (job as any)?.credits_cost || 50;
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
        console.log(`[ClonerPipeline] Refunded ${creditsCost} credits to user ${userId}`);
      }
    } catch (refundErr: any) {
      console.error(`[ClonerPipeline] Credit refund failed: ${refundErr.message}`);
    }
  }
}
