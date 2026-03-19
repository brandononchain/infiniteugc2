const KIE_API_BASE = "https://api.kie.ai/api/v1";
const POLL_INTERVAL_MS = 30_000; // 30s — matches VEO3 / Kie.ai recommendation
const MAX_POLL_ATTEMPTS = 40;    // 40 × 30s = 20 min
const EXTENDED_POLL_ATTEMPTS = 20; // 20 × 30s = 10 min extra on timeout recovery

// ─────────────────────────────────────────────
// Error classes
// ─────────────────────────────────────────────

/**
 * Thrown when polling times out but the task is still generating.
 * Carries the taskId so the caller can continue polling instead of
 * creating a brand-new task (which wastes credits).
 */
export class Sora2ProTimeoutError extends Error {
  public readonly taskId: string;
  constructor(taskId: string, attempts: number) {
    super(
      `[KIE-SORA2PRO] Task ${taskId} still generating after ${attempts} poll attempts (${((attempts * POLL_INTERVAL_MS) / 60_000).toFixed(0)} min)`
    );
    this.name = "Sora2ProTimeoutError";
    this.taskId = taskId;
  }
}

/**
 * Thrown when Kie.ai rejects the task for content policy violation.
 * Same prompt will always be rejected — never retry these.
 */
export class Sora2ProContentPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Sora2ProContentPolicyError";
  }
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CreateTaskRequest {
  model: string;
  input: {
    prompt: string;
    image_urls: string[];
    aspect_ratio: "portrait" | "landscape";
    n_frames: "10" | "15";
    size: "standard" | "high";
    remove_watermark: boolean;
    upload_method: "s3" | "oss";
  };
  callBackUrl?: string;
}

interface CreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface TaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "generating" | "success" | "fail";
    param: string;
    resultJson: string;
    failCode: string | null;
    failMsg: string | null;
    costTime: number | null;
    completeTime: number | null;
    createTime: number;
  };
}

// ─────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────

import { buildSoraProUGCPrompt } from "./prompt-builder";

// ─────────────────────────────────────────────
// Task creation
// ─────────────────────────────────────────────

async function createSoraProTask(
  apiKey: string,
  prompt: string,
  imageUrls: string[],
  options: {
    aspectRatio?: "portrait" | "landscape";
    duration?: "10" | "15";
    quality?: "standard" | "high";
    removeWatermark?: boolean;
  } = {}
): Promise<string> {
  const requestBody: CreateTaskRequest = {
    model: "sora-2-pro-image-to-video",
    input: {
      prompt,
      image_urls: imageUrls,
      aspect_ratio: options.aspectRatio || "portrait",
      n_frames: options.duration || "10",
      size: options.quality || "standard",
      remove_watermark: options.removeWatermark ?? true,
      upload_method: "s3",
    },
  };

  console.log(`[KIE-SORA2PRO] Creating task with prompt: "${prompt.substring(0, 80)}..."`);

  const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[KIE-SORA2PRO] Create task failed (${response.status}): ${errorText}`
    );
  }

  const result: CreateTaskResponse = await response.json();

  if (result.code !== 200 || !result.data?.taskId) {
    throw new Error(
      `[KIE-SORA2PRO] Create task failed: ${result.msg || "No task ID returned"}`
    );
  }

  console.log(`[KIE-SORA2PRO] Task created: ${result.data.taskId}`);
  return result.data.taskId;
}

// ─────────────────────────────────────────────
// Task status
// ─────────────────────────────────────────────

async function getTaskStatus(
  apiKey: string,
  taskId: string
): Promise<TaskStatusResponse["data"]> {
  const response = await fetch(
    `${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[KIE-SORA2PRO] Get task status failed (${response.status}): ${errorText}`
    );
  }

  const result: TaskStatusResponse = await response.json();

  if (result.code !== 200) {
    throw new Error(
      `[KIE-SORA2PRO] Get task status failed: ${result.msg || "Unknown error"}`
    );
  }

  return result.data;
}

// ─────────────────────────────────────────────
// Polling
// ─────────────────────────────────────────────

/**
 * Poll a Kie.ai Sora 2 Pro task until success, fail, or timeout.
 *
 * On timeout throws `Sora2ProTimeoutError` (carries taskId) so the caller
 * can continue polling without creating a new task.
 *
 * Exported so the caller can resume polling an existing task.
 */
export async function pollTaskCompletion(
  apiKey: string,
  taskId: string,
  maxAttempts: number = MAX_POLL_ATTEMPTS
): Promise<{ videoUrl: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const taskData = await getTaskStatus(apiKey, taskId);

    // Log every 5th attempt + first + last to reduce spam
    if (attempt === 1 || attempt % 5 === 0 || attempt === maxAttempts) {
      console.log(
        `[KIE-SORA2PRO] Poll ${attempt}/${maxAttempts}: state="${taskData.state}" (task=${taskId.substring(0, 12)}…)`
      );
    }

    if (taskData.state === "success") {
      console.log(`[KIE-SORA2PRO] Task ${taskId} completed successfully`);

      let resultUrls: string[] = [];
      try {
        const resultJson = JSON.parse(taskData.resultJson || "{}");
        resultUrls = resultJson.resultUrls || [];
      } catch (parseError: any) {
        throw new Error(
          `[KIE-SORA2PRO] Failed to parse result JSON: ${parseError.message}`
        );
      }

      if (!resultUrls || resultUrls.length === 0) {
        throw new Error("[KIE-SORA2PRO] No video URL in task result");
      }

      const videoUrl = resultUrls[0];
      console.log(`[KIE-SORA2PRO] Video URL: ${videoUrl}`);
      return { videoUrl };
    }

    if (taskData.state === "fail") {
      const errorMsg =
        taskData.failMsg ||
        taskData.failCode ||
        "Sora 2 Pro video generation failed";

      // Content policy rejection — throw specific error so caller doesn't retry
      if (/suggestive|racy|policy|inappropriate|nsfw|prohibited/i.test(errorMsg)) {
        throw new Sora2ProContentPolicyError(
          `[KIE-SORA2PRO] Content policy: ${errorMsg}`
        );
      }

      throw new Error(`[KIE-SORA2PRO] ${errorMsg}`);
    }

    // "waiting" | "generating" | any other state → keep polling
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Timed out — throw specific error so caller can continue polling
  throw new Sora2ProTimeoutError(taskId, maxAttempts);
}

// ─────────────────────────────────────────────
// Download
// ─────────────────────────────────────────────

async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log(`[KIE-SORA2PRO] Downloading video from: ${videoUrl.substring(0, 60)}...`);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(
      `[KIE-SORA2PRO] Failed to download video: ${response.status}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`[KIE-SORA2PRO] Downloaded video: ${buffer.length} bytes`);
  return buffer;
}

// ─────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────

export async function generateSora2ProChunk(
  scriptSegment: string,
  apiKey: string,
  options: {
    instructions?: string | null;
    referenceImageUrl?: string;
    size?: string;
    seconds?: string;
    previousVisualDescription?: string | null;
    aspectRatio?: string;
    durationOverride?: number;
  }
): Promise<{ videoBuffer: Buffer; videoId: string }> {
  // === 1. Pick n_frames: use user-selected duration if provided, else auto from word count ===
  const wordCount = scriptSegment.trim().split(/\s+/).length;
  const estimatedSpeechSec = wordCount / 2.5;
  const duration: "10" | "15" = options.durationOverride
    ? (String(options.durationOverride) as "10" | "15")
    : (estimatedSpeechSec <= 8 ? "10" : "15");
  console.log(`[KIE-SORA2PRO] Script: ${wordCount} words, ~${estimatedSpeechSec.toFixed(1)}s speech → n_frames="${duration}"${options.durationOverride ? " (user override)" : ""}`);

  // === 2. Build prompt (includes explicit audio/speech instructions) + call Kie.ai ===
  const prompt = buildSoraProUGCPrompt(scriptSegment, options.instructions, options.previousVisualDescription);
  console.log(`[KIE-SORA2PRO] Premium chunk prompt: "${prompt.substring(0, 120)}..."`);

  const imageUrls = options.referenceImageUrl ? [options.referenceImageUrl] : [];

  const taskId = await createSoraProTask(apiKey, prompt, imageUrls, {
    aspectRatio: options.aspectRatio === "16:9" ? "landscape" : "portrait",
    duration,
    quality: "high",
    removeWatermark: true,
  });

  // Polls for up to 20 min. On timeout throws Sora2ProTimeoutError with taskId
  // so the caller can continue polling instead of creating a new task.
  const { videoUrl } = await pollTaskCompletion(apiKey, taskId);
  const videoBuffer = await downloadVideo(videoUrl);

  return { videoBuffer, videoId: taskId };
}

/**
 * Download a completed Sora 2 Pro task's video by taskId.
 * Used after extended polling recovers a timed-out task.
 */
export async function downloadSora2ProResult(
  apiKey: string,
  taskId: string
): Promise<Buffer> {
  const { videoUrl } = await pollTaskCompletion(apiKey, taskId, 1); // single check
  return downloadVideo(videoUrl);
}
