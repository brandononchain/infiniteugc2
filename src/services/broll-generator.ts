import { getSupabaseAdmin } from "../lib/supabase";
import { getArkApiKey, withKlingRotation } from "../lib/keys";
import { createSeedanceTask, pollSeedanceCompletion } from "./seedance";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const KLING_API_BASE = "https://api.klingai.com";
const KLING_POLL_INTERVAL_MS = 15_000; // 15s for Kling (faster API)
const KLING_MAX_POLL_ATTEMPTS = 80; // ~20 min max

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type BRollModel = "kling-2.6" | "kling-3.0" | "seeddance-1.5-pro" | "seeddance-1.0-fast";

interface ModelConfig {
  duration?: string;
  aspect_ratio?: string;
  resolution?: string;
  mode?: string;
  sound?: boolean;
  fixed_lens?: boolean;
  generate_audio?: boolean;
}

// Credit costs per model
const CREDIT_COSTS: Record<BRollModel, number> = {
  "kling-2.6": 10,
  "kling-3.0": 15,
  "seeddance-1.5-pro": 12,
  "seeddance-1.0-fast": 8,
};

// Kling API model name mapping
const KLING_MODEL_NAMES: Record<string, string> = {
  "kling-2.6": "kling-v2-6",
  "kling-3.0": "kling-v3",
};

export function getBRollCreditCost(model: string): number {
  return CREDIT_COSTS[model as BRollModel] || 10;
}

// ─────────────────────────────────────────────
// Kling API: Create image-to-video task
// ─────────────────────────────────────────────

async function createKlingTask(
  jwtToken: string,
  model: "kling-2.6" | "kling-3.0",
  prompt: string,
  imageUrl: string,
  config: ModelConfig = {}
): Promise<string> {
  const modelName = KLING_MODEL_NAMES[model];

  const body: Record<string, unknown> = {
    model_name: modelName,
    image: imageUrl,
    prompt,
    duration: config.duration || "5",
    aspect_ratio: config.aspect_ratio || "16:9",
    mode: config.mode || "std",
    cfg_scale: 0.5,
  };

  if (config.sound) {
    body.enable_audio = true;
  }

  console.log(`[BROLL-KLING] Creating task: model=${modelName}, prompt="${prompt.substring(0, 80)}..."`);

  const response = await fetch(`${KLING_API_BASE}/v1/videos/image2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[BROLL-KLING] API error ${response.status}:`, errorText);

    // Check for balance/quota errors — don't trigger key rotation for these.
    // IMPORTANT: Error message must NOT contain words that match isKeyRelatedError
    // (e.g. "insufficient", "429", "quota") to prevent unnecessary key rotation.
    if (errorText.includes("balance not enough") || errorText.includes("1102")) {
      throw new Error("[BROLL-KLING] Kling account balance is empty. Please top up at klingai.com/global/dev/pricing");
    }

    throw new Error(`[BROLL-KLING] Create task failed (${response.status}): ${errorText}`);
  }

  const result: any = await response.json();

  if (result.code !== 0 || !result.data?.task_id) {
    throw new Error(`[BROLL-KLING] Create task failed: ${result.message || "No task ID returned"}`);
  }

  console.log(`[BROLL-KLING] Task created: ${result.data.task_id}`);
  return result.data.task_id;
}

// ─────────────────────────────────────────────
// Kling API: Poll task status
// ─────────────────────────────────────────────

async function pollKlingTask(
  jwtToken: string,
  taskId: string,
  maxAttempts: number = KLING_MAX_POLL_ATTEMPTS
): Promise<{ videoUrl: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${KLING_API_BASE}/v1/videos/image2video/${taskId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${jwtToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[BROLL-KLING] Get task status failed (${response.status}): ${errorText}`);
    }

    const result: any = await response.json();

    if (result.code !== 0) {
      throw new Error(`[BROLL-KLING] Get task status error: ${result.message || "Unknown error"}`);
    }

    const taskData = result.data;
    const status = taskData?.task_status || taskData?.status;

    if (attempt === 1 || attempt % 5 === 0 || attempt === maxAttempts) {
      console.log(
        `[BROLL-KLING] Poll ${attempt}/${maxAttempts}: status="${status}" (task=${taskId.substring(0, 16)}…)`
      );
    }

    if (status === "Completed" || status === "completed" || status === "succeed") {
      const videoUrl = taskData?.output?.video_url || taskData?.task_result?.videos?.[0]?.url || taskData?.works?.[0]?.resource?.resource;
      if (!videoUrl) {
        console.error("[BROLL-KLING] No video URL found in response:", JSON.stringify(result, null, 2));
        throw new Error("[BROLL-KLING] Task completed but no video URL in response");
      }
      console.log(`[BROLL-KLING] Task ${taskId} completed successfully`);
      return { videoUrl };
    }

    if (status === "Failed" || status === "failed" || status === "fail") {
      const errorMsg = taskData?.error?.message || taskData?.task_status_msg || "Video generation failed";
      throw new Error(`[BROLL-KLING] ${errorMsg}`);
    }

    // Pending or Processing — keep polling
    await new Promise((resolve) => setTimeout(resolve, KLING_POLL_INTERVAL_MS));
  }

  throw new Error(
    `[BROLL-KLING] Video generation timed out after ${maxAttempts} attempts (~${Math.round((maxAttempts * KLING_POLL_INTERVAL_MS) / 60000)} min)`
  );
}

// ─────────────────────────────────────────────
// Download video
// ─────────────────────────────────────────────

async function downloadBRollVideo(videoUrl: string): Promise<Buffer> {
  console.log(`[BROLL] Downloading video from: ${videoUrl.substring(0, 60)}...`);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`[BROLL] Failed to download video: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`[BROLL] Downloaded video: ${buffer.length} bytes`);
  return buffer;
}

// ─────────────────────────────────────────────
// Process with Kling (2.6 / 3.0)
// ─────────────────────────────────────────────

async function processWithKling(
  job: Record<string, any>,
  model: "kling-2.6" | "kling-3.0"
): Promise<string> {
  const config: ModelConfig = (job.model_config as ModelConfig) || {};

  return withKlingRotation(async (jwtToken: string) => {
    const taskId = await createKlingTask(jwtToken, model, job.prompt, job.image_url, config);

    // Save task ID
    const supabase = getSupabaseAdmin();
    await supabase
      .from("broll_jobs")
      .update({ task_id: taskId, updated_at: new Date().toISOString() })
      .eq("id", job.id);

    const { videoUrl } = await pollKlingTask(jwtToken, taskId);
    return videoUrl;
  });
}

// ─────────────────────────────────────────────
// Process with Seedance (1.5 Pro / 1.0 Fast)
// ─────────────────────────────────────────────

async function processWithSeedance(
  job: Record<string, any>,
  model: "seeddance-1.5-pro" | "seeddance-1.0-fast"
): Promise<string> {
  const config: ModelConfig = (job.model_config as ModelConfig) || {};
  const arkApiKey = await getArkApiKey();

  const seedanceModel = model === "seeddance-1.0-fast" ? "seedance-1.0-fast" as const : "seedance-1.5-pro" as const;

  const taskId = await createSeedanceTask(
    {
      prompt: job.prompt,
      imageUrl: job.image_url,
      duration: config.duration ? (parseInt(config.duration) as 5 | 10) : 5,
      cameraFixed: config.fixed_lens ?? false,
      model: seedanceModel,
    },
    arkApiKey
  );

  // Save task ID
  const supabase = getSupabaseAdmin();
  await supabase
    .from("broll_jobs")
    .update({ task_id: taskId, updated_at: new Date().toISOString() })
    .eq("id", job.id);

  const { videoUrl } = await pollSeedanceCompletion(taskId, arkApiKey);
  return videoUrl;
}

// ─────────────────────────────────────────────
// Main orchestrator
// ─────────────────────────────────────────────

export async function processBRollGeneration(jobId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch job details
  const { data: job, error: fetchError } = await supabase
    .from("broll_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    console.error(`[BROLL] Job ${jobId} not found:`, fetchError);
    return;
  }

  const model = job.model as BRollModel;

  console.log(`[BROLL] Starting generation for job ${jobId} (model: ${model})`);

  // Update status to processing
  await supabase
    .from("broll_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    // Route to appropriate provider
    let videoUrl: string;
    if (model === "kling-2.6" || model === "kling-3.0") {
      videoUrl = await processWithKling(job, model);
    } else {
      videoUrl = await processWithSeedance(job, model);
    }

    // Download video
    const videoBuffer = await downloadBRollVideo(videoUrl);

    // Upload to Supabase Storage
    const fileName = `broll/${job.user_id}/${jobId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`[BROLL] Failed to upload video: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(fileName);

    // Update job as completed
    await supabase
      .from("broll_jobs")
      .update({
        status: "completed",
        video_url: publicUrl,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[BROLL] Job ${jobId} completed: ${publicUrl}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[BROLL] Job ${jobId} failed:`, errorMessage);

    // Update job as failed
    await supabase
      .from("broll_jobs")
      .update({
        status: "failed",
        error_message: "B-Roll generation failed",
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
