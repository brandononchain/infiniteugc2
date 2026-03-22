import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import { getSupabaseAdmin } from "../lib/supabase";
import { withKlingRotation, getSyncApiKey } from "../lib/keys";
import { generateAudio, cloneVoice } from "./elevenlabs";
import { createSyncGeneration, pollSyncCompletion } from "./sync";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const KLING_API_BASE = "https://api.klingai.com";
const POLL_INTERVAL_MS = 15_000; // 15s
const MAX_POLL_ATTEMPTS = 80; // ~20 min max

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type MotionMode = "std" | "pro";

interface MotionControlConfig {
  duration?: "5" | "10" | "30";
  mode?: MotionMode;
  character_orientation?: "video" | "image";
  keep_original_sound?: string; // "yes" or "no"
  character_id?: number;
}

// Credit costs: std = 15, pro = 25
const CREDIT_COSTS: Record<MotionMode, number> = {
  std: 15,
  pro: 25,
};

export function getMotionControlCreditCost(mode: string): number {
  return CREDIT_COSTS[mode as MotionMode] || 15;
}

// Lip-sync credit cost
const LIPSYNC_CREDIT_COST = 10;

export function getLipSyncCreditCost(): number {
  return LIPSYNC_CREDIT_COST;
}

// Unified pipeline: motion + lip-sync combined
export function getUnifiedPipelineCreditCost(mode: string): number {
  return getMotionControlCreditCost(mode) + LIPSYNC_CREDIT_COST;
}

// ─────────────────────────────────────────────
// Audio extraction helper (ffmpeg)
// ─────────────────────────────────────────────

async function extractAudioFromVideo(videoBuffer: Buffer): Promise<Buffer> {
  const tmpVideo = path.join("/tmp", `mc_video_${Date.now()}.mp4`);
  const tmpAudio = path.join("/tmp", `mc_audio_${Date.now()}.mp3`);

  try {
    fs.writeFileSync(tmpVideo, videoBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpVideo)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate(128)
        .duration(60) // Max 60 seconds for voice cloning sample
        .output(tmpAudio)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    const audioBuffer = fs.readFileSync(tmpAudio);
    console.log(`[MC-UNIFIED] Extracted audio: ${audioBuffer.length} bytes`);
    return audioBuffer;
  } finally {
    try { fs.unlinkSync(tmpVideo); } catch {}
    try { fs.unlinkSync(tmpAudio); } catch {}
  }
}

// ─────────────────────────────────────────────
// Kling API: Create motion control task
// ─────────────────────────────────────────────

async function createMotionControlTask(
  jwtToken: string,
  imageUrl: string,
  videoUrl: string | null,
  presetMotion: string | null,
  prompt: string,
  config: MotionControlConfig = {}
): Promise<string> {
  const body: Record<string, unknown> = {
    model_name: "kling-v3",
    image_url: imageUrl,
    prompt: prompt || "",
    duration: config.duration || "30",
    mode: config.mode || "pro",
    cfg_scale: 0.5,
    character_orientation:
      config.character_orientation ??
      (videoUrl ? "video" : "image"),
    // Kling API expects string "yes"/"no", NOT boolean
    keep_original_sound: config.keep_original_sound || "yes",
  };

  if (videoUrl) {
    body.video_url = videoUrl;
  } else if (presetMotion) {
    body.preset_motion = presetMotion;
  }

  if (config.character_id !== undefined && config.character_id > 0) {
    body.character_id = config.character_id;
  }

  console.log(
    `[MOTION-CTRL] Creating task: mode=${config.mode || "std"}, image_url=${imageUrl?.substring(0, 60)}...`
  );
  console.log(`[MOTION-CTRL] Request body:`, JSON.stringify(body));

  const response = await fetch(`${KLING_API_BASE}/v1/videos/motion-control`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[MOTION-CTRL] API error ${response.status}:`, errorText);

    if (errorText.includes("balance not enough") || errorText.includes("1102")) {
      throw new Error(
        "[MOTION-CTRL] Kling account balance is empty. Please top up at klingai.com/global/dev/pricing"
      );
    }

    throw new Error(`[MOTION-CTRL] Create task failed (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();

  if (result.code !== 0 || !result.data?.task_id) {
    throw new Error(
      `[MOTION-CTRL] Create task failed: ${result.message || "No task ID returned"}`
    );
  }

  console.log(`[MOTION-CTRL] Task created: ${result.data.task_id}`);
  return result.data.task_id;
}

// ─────────────────────────────────────────────
// Kling API: Poll task status
// ─────────────────────────────────────────────

async function pollMotionControlTask(
  jwtToken: string,
  taskId: string,
  maxAttempts: number = MAX_POLL_ATTEMPTS
): Promise<{ videoUrl: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${KLING_API_BASE}/v1/videos/motion-control/${taskId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${jwtToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `[MOTION-CTRL] Get task status failed (${response.status}): ${errorText}`
      );
    }

    const result: any = await response.json();

    if (result.code !== 0) {
      throw new Error(
        `[MOTION-CTRL] Get task status error: ${result.message || "Unknown error"}`
      );
    }

    const taskData = result.data;
    const status = taskData?.task_status || taskData?.status;

    if (attempt === 1 || attempt % 5 === 0 || attempt === maxAttempts) {
      console.log(
        `[MOTION-CTRL] Poll ${attempt}/${maxAttempts}: status="${status}" (task=${taskId.substring(0, 16)}…)`
      );
    }

    if (status === "Completed" || status === "completed" || status === "succeed") {
      const videoUrl =
        taskData?.output?.video_url ||
        taskData?.task_result?.videos?.[0]?.url ||
        taskData?.works?.[0]?.resource?.resource;
      if (!videoUrl) {
        console.error(
          "[MOTION-CTRL] No video URL found in response:",
          JSON.stringify(result, null, 2)
        );
        throw new Error("[MOTION-CTRL] Task completed but no video URL in response");
      }
      console.log(`[MOTION-CTRL] Task ${taskId} completed successfully`);
      return { videoUrl };
    }

    if (status === "Failed" || status === "failed" || status === "fail") {
      const errorMsg =
        taskData?.error?.message ||
        taskData?.task_status_msg ||
        "Motion control generation failed";
      throw new Error(`[MOTION-CTRL] ${errorMsg}`);
    }

    // Pending or Processing — keep polling
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `[MOTION-CTRL] Generation timed out after ${maxAttempts} attempts (~${Math.round(
      (maxAttempts * POLL_INTERVAL_MS) / 60000
    )} min)`
  );
}

// ─────────────────────────────────────────────
// Download video
// ─────────────────────────────────────────────

async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log(`[MOTION-CTRL] Downloading video from: ${videoUrl.substring(0, 60)}...`);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`[MOTION-CTRL] Failed to download video: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`[MOTION-CTRL] Downloaded video: ${buffer.length} bytes`);
  return buffer;
}

// ─────────────────────────────────────────────
// Main orchestrator (legacy — motion control only)
// ─────────────────────────────────────────────

export async function processMotionControlGeneration(jobId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch job details
  const { data: job, error: fetchError } = await supabase
    .from("motion_control_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    console.error(`[MOTION-CTRL] Job ${jobId} not found:`, fetchError);
    return;
  }

  console.log(`[MOTION-CTRL] Starting generation for job ${jobId}`);

  // Update status to processing
  await supabase
    .from("motion_control_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const config: MotionControlConfig = (job.config as MotionControlConfig) || {};

    const videoUrl = await withKlingRotation(async (jwtToken: string) => {
      const taskId = await createMotionControlTask(
        jwtToken,
        job.image_url,
        job.video_url,
        job.preset_motion,
        job.prompt || "",
        config
      );

      // Save task ID
      await supabase
        .from("motion_control_jobs")
        .update({ task_id: taskId, updated_at: new Date().toISOString() })
        .eq("id", jobId);

      const result = await pollMotionControlTask(jwtToken, taskId);
      return result.videoUrl;
    });

    // Download video
    const videoBuffer = await downloadVideo(videoUrl);

    // Upload to Supabase Storage
    const fileName = `motion-control/${job.user_id}/${jobId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`[MOTION-CTRL] Failed to upload video: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("videos").getPublicUrl(fileName);

    // Update job as completed
    await supabase
      .from("motion_control_jobs")
      .update({
        status: "completed",
        output_video_url: publicUrl,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[MOTION-CTRL] Job ${jobId} completed: ${publicUrl}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MOTION-CTRL] Job ${jobId} failed:`, errorMessage);

    // Update job as failed
    await supabase
      .from("motion_control_jobs")
      .update({
        status: "failed",
        error_message: "Motion control generation failed",
        error_details: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Refund credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", job.user_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits + job.credits_cost })
        .eq("id", job.user_id);
    }
  }
}

// ─────────────────────────────────────────────
// Lip-Sync orchestrator (legacy — standalone)
// ElevenLabs TTS → Sync.so lip-sync → final video
// ─────────────────────────────────────────────

export async function processMotionControlLipSync(jobId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch job
  const { data: job, error: fetchError } = await (supabase as any)
    .from("motion_control_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    console.error(`[MOTION-CTRL-LS] Job ${jobId} not found:`, fetchError);
    return;
  }

  // 2. Set lipsync_status to processing
  await (supabase as any)
    .from("motion_control_jobs")
    .update({ lipsync_status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    // 3. Look up voice's ElevenLabs ID
    const { data: voice, error: voiceError } = await supabase
      .from("voices")
      .select("elevenlabs_voice_id")
      .eq("id", job.lipsync_voice_id)
      .single();

    if (voiceError || !voice) {
      throw new Error("[MOTION-CTRL-LS] Voice not found. It may have been deleted.");
    }

    console.log(
      `[MOTION-CTRL-LS] Generating TTS for job ${jobId}: voice=${voice.elevenlabs_voice_id}, script="${(job.lipsync_script || "").substring(0, 60)}..."`
    );

    // 4. Generate TTS audio via ElevenLabs
    const audioBuffer = await generateAudio(job.lipsync_script, voice.elevenlabs_voice_id);
    console.log(`[MOTION-CTRL-LS] TTS audio generated: ${audioBuffer.length} bytes`);

    // 5. Upload TTS audio to sync-outputs bucket (temporary)
    const audioFileName = `motion-control/${job.user_id}/${jobId}-lipsync-tts.mp3`;
    const { error: audioUploadError } = await supabase.storage
      .from("sync-outputs")
      .upload(audioFileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (audioUploadError) {
      throw new Error(`[MOTION-CTRL-LS] Failed to upload TTS audio: ${audioUploadError.message}`);
    }

    // 6. Get signed URL for audio (2 hours)
    const { data: audioSignedData, error: audioSignedError } = await supabase.storage
      .from("sync-outputs")
      .createSignedUrl(audioFileName, 60 * 60 * 2);

    if (audioSignedError || !audioSignedData?.signedUrl) {
      throw new Error(
        `[MOTION-CTRL-LS] Failed to create audio signed URL: ${audioSignedError?.message}`
      );
    }

    console.log(`[MOTION-CTRL-LS] TTS audio uploaded, creating Sync.so generation...`);

    // 7. Call Sync.so with clean video + audio
    const syncApiKey = await getSyncApiKey();

    const { id: generationId } = await createSyncGeneration({
      apiKey: syncApiKey,
      videoUrl: job.output_video_url,
      script: job.lipsync_script,
      audioUrl: audioSignedData.signedUrl,
      model: (job.lipsync_model as "lipsync-2" | "lipsync-2-pro") || "lipsync-2",
    });

    console.log(`[MOTION-CTRL-LS] Sync.so generation created: ${generationId}`);

    // 8. Poll for completion
    const { outputUrl } = await pollSyncCompletion(syncApiKey, generationId);

    // 9. Download lip-synced video
    console.log(`[MOTION-CTRL-LS] Downloading lip-synced video...`);
    const videoResponse = await fetchWithTimeout(outputUrl, {
      timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
    });
    if (!videoResponse.ok) {
      throw new Error(
        `[MOTION-CTRL-LS] Failed to download lip-synced video: ${videoResponse.status}`
      );
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    console.log(`[MOTION-CTRL-LS] Downloaded lip-synced video: ${videoBuffer.length} bytes`);

    // 10. Upload to Supabase Storage
    const fileName = `motion-control/${job.user_id}/${jobId}-lipsync.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`[MOTION-CTRL-LS] Failed to upload lip-synced video: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("videos").getPublicUrl(fileName);

    // 11. Update job as completed
    await (supabase as any)
      .from("motion_control_jobs")
      .update({
        lipsync_status: "completed",
        lipsync_video_url: publicUrl,
        lipsync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[MOTION-CTRL-LS] Job ${jobId} lip-sync completed: ${publicUrl}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MOTION-CTRL-LS] Job ${jobId} lip-sync failed:`, errorMessage);

    // Update job as failed
    await (supabase as any)
      .from("motion_control_jobs")
      .update({
        lipsync_status: "failed",
        lipsync_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Refund lip-sync credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", job.user_id)
      .single();

    if (profile) {
      const refundAmount = job.lipsync_credits_cost || LIPSYNC_CREDIT_COST;
      await supabase
        .from("profiles")
        .update({ credits: profile.credits + refundAmount })
        .eq("id", job.user_id);
      console.log(`[MOTION-CTRL-LS] Refunded ${refundAmount} credits to user ${job.user_id}`);
    }
  }
}

// ─────────────────────────────────────────────
// Unified Pipeline: Face-swap + Voice clone + TTS + Lip-sync
// Single pipeline that does everything in one go
// ─────────────────────────────────────────────

export async function processUnifiedMotionControlPipeline(jobId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch job
  const { data: job, error: fetchError } = await (supabase as any)
    .from("motion_control_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    console.error(`[MC-UNIFIED] Job ${jobId} not found:`, fetchError);
    return;
  }

  console.log(`[MC-UNIFIED] Starting unified pipeline for job ${jobId}`);

  const updateStep = async (step: string) => {
    await (supabase as any)
      .from("motion_control_jobs")
      .update({ pipeline_step: step, updated_at: new Date().toISOString() })
      .eq("id", jobId);
  };

  // Set to processing
  await (supabase as any)
    .from("motion_control_jobs")
    .update({
      status: "processing",
      pipeline_step: "motion_control",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  try {
    // ── STEP 1: Kling motion control (face swap) ──
    console.log(`[MC-UNIFIED] Step 1: Kling motion control...`);
    const config: MotionControlConfig = (job.config as MotionControlConfig) || {};

    const motionVideoUrl = await withKlingRotation(async (jwtToken: string) => {
      const taskId = await createMotionControlTask(
        jwtToken,
        job.image_url,
        job.video_url,
        job.preset_motion,
        job.prompt || "",
        config
      );

      await (supabase as any)
        .from("motion_control_jobs")
        .update({ task_id: taskId, updated_at: new Date().toISOString() })
        .eq("id", jobId);

      const result = await pollMotionControlTask(jwtToken, taskId);
      return result.videoUrl;
    });

    // Download and upload clean motion video (partial result safety)
    const motionVideoBuffer = await downloadVideo(motionVideoUrl);
    const cleanFileName = `motion-control/${job.user_id}/${jobId}.mp4`;
    const { error: cleanUploadError } = await supabase.storage
      .from("videos")
      .upload(cleanFileName, motionVideoBuffer, { contentType: "video/mp4", upsert: true });

    if (cleanUploadError) {
      throw new Error(`[MC-UNIFIED] Failed to upload clean video: ${cleanUploadError.message}`);
    }

    const {
      data: { publicUrl: cleanPublicUrl },
    } = supabase.storage.from("videos").getPublicUrl(cleanFileName);

    // Save clean video immediately (even if lip-sync fails later, user has this)
    await (supabase as any)
      .from("motion_control_jobs")
      .update({ output_video_url: cleanPublicUrl, updated_at: new Date().toISOString() })
      .eq("id", jobId);

    console.log(`[MC-UNIFIED] Step 1 complete: clean video saved at ${cleanPublicUrl}`);

    // ── STEP 2: Resolve voice ──
    let elevenlabsVoiceId: string;

    if (job.voice_source === "clone_from_video") {
      // 2a. Extract audio from reference video
      await updateStep("extracting_audio");
      console.log(`[MC-UNIFIED] Step 2a: Extracting audio from reference video...`);

      const refVideoResponse = await fetchWithTimeout(job.video_url, {
        timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
      });
      if (!refVideoResponse.ok) {
        throw new Error(`[MC-UNIFIED] Failed to download reference video: ${refVideoResponse.status}`);
      }
      const refVideoBuffer = Buffer.from(await refVideoResponse.arrayBuffer());
      const extractedAudio = await extractAudioFromVideo(refVideoBuffer);

      // 2b. Clone voice via ElevenLabs
      await updateStep("cloning_voice");
      console.log(`[MC-UNIFIED] Step 2b: Cloning voice via ElevenLabs...`);

      const voiceName = `MC Clone - ${job.name || jobId.substring(0, 8)}`;
      elevenlabsVoiceId = await cloneVoice(voiceName, extractedAudio, "voice-sample.mp3");
      console.log(`[MC-UNIFIED] Voice cloned: ${elevenlabsVoiceId}`);

      // Save cloned voice to voices table for future use
      const { data: savedVoice } = await supabase
        .from("voices")
        .insert({
          user_id: job.user_id,
          elevenlabs_voice_id: elevenlabsVoiceId,
          name: voiceName,
        } as any)
        .select("id")
        .single();

      if (savedVoice) {
        await (supabase as any)
          .from("motion_control_jobs")
          .update({ lipsync_voice_id: (savedVoice as any).id, updated_at: new Date().toISOString() })
          .eq("id", jobId);
        console.log(`[MC-UNIFIED] Cloned voice saved to library: ${(savedVoice as any).id}`);
      }
    } else {
      // "existing" voice — look up ElevenLabs ID
      console.log(`[MC-UNIFIED] Step 2: Using existing voice ${job.lipsync_voice_id}...`);
      const { data: voice, error: voiceError } = await supabase
        .from("voices")
        .select("elevenlabs_voice_id")
        .eq("id", job.lipsync_voice_id)
        .single();

      if (voiceError || !voice) {
        throw new Error("[MC-UNIFIED] Selected voice not found. It may have been deleted.");
      }
      elevenlabsVoiceId = voice.elevenlabs_voice_id;
    }

    // ── STEP 3: Generate TTS ──
    await updateStep("generating_tts");
    console.log(`[MC-UNIFIED] Step 3: Generating TTS audio...`);

    const ttsAudioBuffer = await generateAudio(job.lipsync_script, elevenlabsVoiceId);
    console.log(`[MC-UNIFIED] TTS audio generated: ${ttsAudioBuffer.length} bytes`);

    // Upload TTS audio to sync-outputs bucket
    const audioFileName = `motion-control/${job.user_id}/${jobId}-tts.mp3`;
    const { error: audioUploadError } = await supabase.storage
      .from("sync-outputs")
      .upload(audioFileName, ttsAudioBuffer, { contentType: "audio/mpeg", upsert: true });

    if (audioUploadError) {
      throw new Error(`[MC-UNIFIED] Failed to upload TTS audio: ${audioUploadError.message}`);
    }

    const { data: audioSignedData, error: audioSignedError } = await supabase.storage
      .from("sync-outputs")
      .createSignedUrl(audioFileName, 60 * 60 * 2); // 2 hour signed URL

    if (audioSignedError || !audioSignedData?.signedUrl) {
      throw new Error(`[MC-UNIFIED] Failed to create audio signed URL: ${audioSignedError?.message}`);
    }

    // ── STEP 4: Lip-sync via Sync.so ──
    await updateStep("lip_syncing");
    console.log(`[MC-UNIFIED] Step 4: Lip-syncing via Sync.so...`);

    await (supabase as any)
      .from("motion_control_jobs")
      .update({ lipsync_status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    const syncApiKey = await getSyncApiKey();
    const { id: generationId } = await createSyncGeneration({
      apiKey: syncApiKey,
      videoUrl: cleanPublicUrl,
      script: job.lipsync_script,
      audioUrl: audioSignedData.signedUrl,
      model: (job.lipsync_model as "lipsync-2" | "lipsync-2-pro") || "lipsync-2",
    });

    console.log(`[MC-UNIFIED] Sync.so generation created: ${generationId}`);
    const { outputUrl } = await pollSyncCompletion(syncApiKey, generationId);

    // ── STEP 5: Download and upload final video ──
    await updateStep("uploading");
    console.log(`[MC-UNIFIED] Step 5: Downloading and uploading final video...`);

    const finalVideoResponse = await fetchWithTimeout(outputUrl, {
      timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
    });
    if (!finalVideoResponse.ok) {
      throw new Error(`[MC-UNIFIED] Failed to download lip-synced video: ${finalVideoResponse.status}`);
    }
    const finalVideoBuffer = Buffer.from(await finalVideoResponse.arrayBuffer());
    console.log(`[MC-UNIFIED] Final video downloaded: ${finalVideoBuffer.length} bytes`);

    const lipsyncFileName = `motion-control/${job.user_id}/${jobId}-lipsync.mp4`;
    const { error: lipsyncUploadError } = await supabase.storage
      .from("videos")
      .upload(lipsyncFileName, finalVideoBuffer, { contentType: "video/mp4", upsert: true });

    if (lipsyncUploadError) {
      throw new Error(`[MC-UNIFIED] Failed to upload final video: ${lipsyncUploadError.message}`);
    }

    const {
      data: { publicUrl: finalPublicUrl },
    } = supabase.storage.from("videos").getPublicUrl(lipsyncFileName);

    // ── DONE ──
    await (supabase as any)
      .from("motion_control_jobs")
      .update({
        status: "completed",
        lipsync_status: "completed",
        lipsync_video_url: finalPublicUrl,
        pipeline_step: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[MC-UNIFIED] Job ${jobId} fully completed: ${finalPublicUrl}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MC-UNIFIED] Job ${jobId} failed:`, errorMessage);

    // Update job as failed
    await (supabase as any)
      .from("motion_control_jobs")
      .update({
        status: "failed",
        lipsync_status: "failed",
        error_message: "Motion control pipeline failed",
        error_details: errorMessage,
        lipsync_error: errorMessage,
        pipeline_step: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Refund ALL credits (combined cost)
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", job.user_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits + job.credits_cost })
        .eq("id", job.user_id);
      console.log(`[MC-UNIFIED] Refunded ${job.credits_cost} credits to user ${job.user_id}`);
    }
  }
}
