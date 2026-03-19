import { fetchWithTimeout, IMAGE_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";

const ARK_API_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks";
const MODEL_1_5_PRO = "seedance-1-5-pro-251215";
const MODEL_1_0_FAST = "seedance-1-0-pro-fast-251015";
const POLL_INTERVAL_MS = 30000;
const MAX_POLL_ATTEMPTS = 60;

export type SeedanceModel = "seedance-1.5-pro" | "seedance-1.0-fast";

export interface SeedanceTaskOptions {
  prompt: string;
  imageUrl?: string; // Reference image for image-to-video
  duration?: 5 | 10; // seconds (default: 5)
  cameraFixed?: boolean; // fixed camera or dynamic (default: false)
  model?: SeedanceModel; // which seedance model (default: 1.5-pro)
  aspectRatio?: string; // e.g. "9:16", "16:9", "1:1" — maps to Ark API "ratio" param
}

interface CreateTaskResponse {
  id: string;
  model: string;
  status: string;
  content?: Array<{
    type: string;
    video_url?: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

interface GetTaskResponse {
  id: string;
  model: string;
  status: string; // "pending" | "running" | "succeeded" | "failed" | "cancelled"
  content?: {
    video_url?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Build the text prompt with Seedance-specific flags appended.
 * Duration and camera mode are passed as flags within the text content.
 */
function buildSeedancePrompt(
  prompt: string,
  duration: number,
  cameraFixed: boolean
): string {
  return `${prompt}  --duration ${duration} --camerafixed ${cameraFixed}`;
}

/**
 * Create a Seedance 1.5 Pro video generation task.
 * Supports both text-to-video and image-to-video modes.
 *
 * @returns task ID for polling
 */
export async function createSeedanceTask(
  options: SeedanceTaskOptions,
  arkApiKey: string
): Promise<string> {
  const duration = options.duration || 5;
  const cameraFixed = options.cameraFixed ?? false;
  const textPrompt = buildSeedancePrompt(options.prompt, duration, cameraFixed);

  console.log("[SEEDANCE] Creating video generation task");
  console.log("  Prompt:", textPrompt.substring(0, 120) + "...");
  console.log("  Duration:", duration);
  console.log("  Camera Fixed:", cameraFixed);
  if (options.imageUrl) {
    console.log("  Image URL:", options.imageUrl);
  }

  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: textPrompt,
    },
  ];

  if (options.imageUrl) {
    content.push({
      type: "image_url",
      image_url: {
        url: options.imageUrl,
      },
    });
  }

  const modelId = options.model === "seedance-1.0-fast" ? MODEL_1_0_FAST : MODEL_1_5_PRO;

  // Map our aspect ratio to Seedance's ratio values; default to "adaptive" for i2v
  const ratioMap: Record<string, string> = {
    "9:16": "9:16", "16:9": "16:9", "1:1": "1:1", "4:3": "4:3", "3:4": "3:4",
  };
  const ratio = options.aspectRatio && ratioMap[options.aspectRatio]
    ? ratioMap[options.aspectRatio]
    : "adaptive";

  const body: Record<string, unknown> = {
    model: modelId,
    content,
    ratio,
  };

  const response = await fetch(ARK_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${arkApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SEEDANCE] HTTP error ${response.status}:`, errorText);
    throw new Error(`Seedance API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as CreateTaskResponse;

  console.log(
    "[SEEDANCE] Create response:",
    JSON.stringify(data, null, 2).substring(0, 1000)
  );

  if (data.error) {
    throw new Error(
      `Seedance API error: ${data.error.code} - ${data.error.message}`
    );
  }

  if (!data.id) {
    throw new Error("[SEEDANCE] No task ID returned from create response");
  }

  console.log(`[SEEDANCE] Task created: ${data.id}`);
  return data.id;
}

/**
 * Get the status and result of a Seedance task.
 */
export async function getSeedanceTaskStatus(
  taskId: string,
  arkApiKey: string
): Promise<{ status: string; videoUrl?: string; errorMessage?: string }> {
  const url = `${ARK_API_BASE}/${taskId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${arkApiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SEEDANCE] HTTP error ${response.status}:`, errorText);
    throw new Error(`Seedance status API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as GetTaskResponse;

  console.log(
    "[SEEDANCE] Status response:",
    JSON.stringify(data, null, 2).substring(0, 1000)
  );

  if (data.error) {
    return {
      status: "failed",
      errorMessage: `${data.error.code} - ${data.error.message}`,
    };
  }

  const status = data.status || "unknown";

  if (status === "succeeded" && data.content?.video_url) {
    return { status: "succeeded", videoUrl: data.content.video_url };
  }

  if (status === "failed") {
    return {
      status: "failed",
      errorMessage: "Seedance video generation failed",
    };
  }

  return { status };
}

/**
 * Poll for Seedance task completion.
 * Waits 30s before first check, then polls every 30s.
 */
export async function pollSeedanceCompletion(
  taskId: string,
  arkApiKey: string,
  maxAttempts: number = MAX_POLL_ATTEMPTS
): Promise<{ videoUrl: string }> {
  console.log("[SEEDANCE] Waiting 30 seconds before first status check...");
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(
      `[SEEDANCE] Checking task status (attempt ${attempt + 1}/${maxAttempts})...`
    );
    const result = await getSeedanceTaskStatus(taskId, arkApiKey);

    if (result.status === "succeeded" && result.videoUrl) {
      console.log(`[SEEDANCE] Video completed: ${result.videoUrl}`);
      return { videoUrl: result.videoUrl };
    }

    if (result.status === "succeeded" && !result.videoUrl) {
      throw new Error(
        "Seedance video generation completed but no video URL was returned"
      );
    }

    if (result.status === "failed") {
      throw new Error(
        result.errorMessage || "Seedance video generation failed"
      );
    }

    if (result.status === "cancelled") {
      throw new Error("Seedance video generation was cancelled");
    }

    console.log(
      `[SEEDANCE] Status: ${result.status}, waiting ${POLL_INTERVAL_MS / 1000}s before retry...`
    );
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Seedance video generation timed out after ${maxAttempts} attempts (~${Math.round((maxAttempts * POLL_INTERVAL_MS) / 60000)} minutes)`
  );
}

/**
 * Upload the avatar image to Supabase to get a clean public URL for Seedance.
 */
export async function uploadImageForSeedance(
  imageUrl: string,
  userId: string,
  jobId: string
): Promise<string> {
  const { getSupabaseAdmin } = await import("../lib/supabase");
  const supabase = getSupabaseAdmin();

  console.log(`[SEEDANCE] Downloading image from: ${imageUrl}`);
  const imageResponse = await fetchWithTimeout(imageUrl, { timeoutMs: IMAGE_DOWNLOAD_TIMEOUT_MS });

  if (!imageResponse.ok) {
    throw new Error(
      `Failed to download image for Seedance: ${imageResponse.status}`
    );
  }

  const contentType =
    imageResponse.headers.get("content-type") || "image/png";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const ext =
    contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const fileName = `seedance-images/${userId}/${jobId}.${ext}`;

  console.log(
    `[SEEDANCE] Re-uploading image to Supabase: ${fileName} (${imageBuffer.length} bytes)`
  );

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, imageBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload image for Seedance: ${uploadError.message}`
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(fileName);

  console.log(`[SEEDANCE] Image available at: ${publicUrl}`);
  return publicUrl;
}

/**
 * Full Seedance pipeline: upload image -> create task -> poll -> return video URL.
 * Uses avatar image as reference for image-to-video generation.
 */
export async function generateSeedanceVideoAndGetUrl(
  scriptText: string,
  arkApiKey: string,
  userId: string,
  jobId: string,
  avatarUrl?: string,
  aspectRatio?: string,
  durationSeconds?: number
): Promise<string> {
  let imageUrl: string | undefined;

  if (avatarUrl) {
    imageUrl = await uploadImageForSeedance(avatarUrl, userId, jobId);
  }

  // Build a prompt from the script text
  const prompt = `A person speaks directly to the camera, delivering the following message naturally with clear lip movements and expressive gestures: "${scriptText}"`;

  // Seedance supports 5 or 10 second durations; default to 5
  const duration = (durationSeconds === 10 ? 10 : 5) as 5 | 10;

  const taskId = await createSeedanceTask(
    {
      prompt,
      imageUrl,
      duration,
      cameraFixed: false,
      aspectRatio,
    },
    arkApiKey
  );

  const { videoUrl } = await pollSeedanceCompletion(taskId, arkApiKey);
  return videoUrl;
}
