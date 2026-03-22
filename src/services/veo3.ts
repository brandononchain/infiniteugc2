/**
 * VEO 3.1 Video Generation via Kie.ai API
 * Docs: https://docs.kie.ai/veo3-api/generate-veo-3-video
 *
 * Replaces direct Google GenAI SDK with Kie.ai's managed wrapper
 * which provides better moderation handling, automatic retries,
 * and 1080p output by default.
 */

import { getKieApiKey } from "../lib/keys";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";

const KIE_API_BASE = "https://api.kie.ai";
const KIE_FILE_UPLOAD_BASE = "https://kieai.redpandaai.co";
const POLL_INTERVAL_MS = 30_000; // Kie.ai recommends 30s polling
const MAX_POLL_ATTEMPTS = 40; // 40 * 30s = 20 min max

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VEO3Config {
  aspectRatio?: "16:9" | "9:16";
  resolution?: "720p" | "1080p" | "4k";
  durationSeconds?: 4 | 6 | 8;
  referenceImageUrl?: string;
}

export interface KieGenerateResponse {
  code: number;
  msg: string;
  data?: { taskId: string };
}

export interface KieRecordInfoResponse {
  code: number;
  msg: string;
  data?: {
    taskId: string;
    successFlag: number; // 0=generating, 1=success, 2=failed, 3=generation failed
    response?: {
      taskId: string;
      resultUrls: string[];
      originUrls?: string[];
      resolution?: string;
    };
    errorCode?: number | null;
    errorMessage?: string;
    completeTime?: string;
    createTime?: string;
    fallbackFlag?: boolean;
  };
}

export interface KieFileUploadResponse {
  success: boolean;
  code: number;
  msg: string;
  data?: {
    fileName: string;
    filePath: string;
    downloadUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  };
}

/**
 * Mirrors the old VEO3Operation interface so premium-jobs.ts can
 * work with a similar shape. Now wraps Kie.ai taskId.
 */
export interface VEO3Operation {
  name: string; // Kie.ai taskId
  done: boolean;
  response?: any;
}

// ---------------------------------------------------------------------------
// Custom Error
// ---------------------------------------------------------------------------

/**
 * Thrown when VEO3 / Kie.ai rejects the reference image due to safety filters.
 */
export class ImageRejectedError extends Error {
  public readonly isImageRejection = true;

  constructor(message: string) {
    super(message);
    this.name = "ImageRejectedError";
  }
}

/**
 * Thrown when Kie.ai account has insufficient credits.
 * Should NOT be retried — user needs to top up.
 */
export class InsufficientCreditsError extends Error {
  public readonly isInsufficientCredits = true;

  constructor(message: string) {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

// ---------------------------------------------------------------------------
// File Upload (for reference images)
// ---------------------------------------------------------------------------

/**
 * Upload a reference image URL to Kie.ai's file storage so it can be
 * passed as imageUrls[] in the generate request.
 */
async function uploadReferenceImage(imageUrl: string): Promise<string> {
  console.log(`[VEO3] Uploading reference image to Kie.ai: ${imageUrl.substring(0, 80)}...`);

  const res = await fetch(`${KIE_FILE_UPLOAD_BASE}/api/file-url-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getKieApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileUrl: imageUrl,
      uploadPath: "veo3-refs",
      fileName: `ref_${Date.now()}.jpg`,
    }),
  });

  const body = await res.json() as KieFileUploadResponse;

  if (!body.success || body.code !== 200 || !body.data?.downloadUrl) {
    console.warn(`[VEO3] File upload failed: ${body.msg}`);
    throw new Error(`[VEO3] File upload failed: ${body.msg}`);
  }

  console.log(`[VEO3] Reference image uploaded: ${body.data.downloadUrl}`);
  return body.data.downloadUrl;
}

// ---------------------------------------------------------------------------
// Generate Video
// ---------------------------------------------------------------------------

export async function generateVideo(
  prompt: string,
  config: VEO3Config = {}
): Promise<VEO3Operation> {
  const apiKey = await getKieApiKey();
  const aspectRatio = config.aspectRatio || "9:16";

  const payload: Record<string, any> = {
    prompt,
    model: "veo3",
    aspect_ratio: aspectRatio,
    enableTranslation: false, // prompts are already in English
  };

  if (config.durationSeconds) {
    payload.duration = config.durationSeconds;
    console.log(`[VEO3] Using duration: ${config.durationSeconds}s`);
  }

  // Upload reference image to Kie.ai file storage first, then pass as imageUrls
  if (config.referenceImageUrl) {
    try {
      const uploadedUrl = await uploadReferenceImage(config.referenceImageUrl);
      payload.imageUrls = [uploadedUrl];
      payload.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
      console.log(`[VEO3] Using reference image: ${uploadedUrl}`);
    } catch (uploadErr: any) {
      console.warn(`[VEO3] Failed to upload reference image, continuing without it: ${uploadErr.message}`);
      // Fall through to text-only generation
    }
  }

  console.log(`[VEO3] Submitting generation: model=veo3, aspect=${aspectRatio}, prompt="${prompt.substring(0, 100)}..."`);

  const res = await fetch(`${KIE_API_BASE}/api/v1/veo/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json() as KieGenerateResponse;

  if (body.code !== 200 || !body.data?.taskId) {
    const msg = body.msg || `HTTP ${res.status}`;

    // Content policy violations → ImageRejectedError
    if (body.code === 400) {
      throw new ImageRejectedError(`[VEO3] Content policy violation: ${msg}`);
    }
    if (body.code === 402) {
      throw new InsufficientCreditsError(`[VEO3] Insufficient Kie.ai credits: ${msg}`);
    }
    throw new Error(`[VEO3] Generation request failed (${body.code}): ${msg}`);
  }

  const taskId = body.data.taskId;
  console.log(`[VEO3] Task created: ${taskId}`);

  return {
    name: taskId,
    done: false,
    response: undefined,
  };
}

// ---------------------------------------------------------------------------
// Poll / Wait for Completion
// ---------------------------------------------------------------------------

async function getTaskStatus(taskId: string): Promise<KieRecordInfoResponse> {
  const res = await fetch(
    `${KIE_API_BASE}/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${await getKieApiKey()}`,
      },
    }
  );

  return await res.json() as KieRecordInfoResponse;
}

export async function waitForVideoCompletion(
  operation: VEO3Operation,
  maxAttempts: number = MAX_POLL_ATTEMPTS,
  intervalMs: number = POLL_INTERVAL_MS
): Promise<VEO3Operation> {
  const taskId = operation.name;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const info = await getTaskStatus(taskId);
    const flag = info.data?.successFlag;

    console.log(`[VEO3] Poll ${attempt}/${maxAttempts}: taskId=${taskId}, successFlag=${flag}`);

    // Still generating
    if (flag === 0) continue;

    // Success
    if (flag === 1 && info.data?.response) {
      const resultUrls = info.data.response.resultUrls || [];
      if (resultUrls.length === 0) {
        throw new Error(`[VEO3] Task ${taskId} succeeded but returned no video URLs`);
      }

      console.log(`[VEO3] Task ${taskId} completed: ${resultUrls.length} video(s)`);

      return {
        name: taskId,
        done: true,
        response: {
          resultUrls,
          originUrls: info.data.response.originUrls,
          resolution: info.data.response.resolution,
        },
      };
    }

    // Failed
    if (flag === 2 || flag === 3) {
      const errMsg = info.data?.errorMessage || info.msg || "Video generation failed";
      const errCode = info.data?.errorCode;

      // errorCode 400 = content policy / image rejection
      if (errCode === 400) {
        throw new ImageRejectedError(`[VEO3] ${errMsg}`);
      }

      throw new Error(`[VEO3] Task ${taskId} failed (errorCode=${errCode}): ${errMsg}`);
    }

    // Unexpected / HTTP-level error from record-info
    if (info.code !== 200) {
      // 422 with "record null" = task still processing or expired
      if (info.code === 422) {
        console.warn(`[VEO3] Poll got 422 — task may still be initializing, continuing...`);
        continue;
      }
      throw new Error(`[VEO3] Unexpected poll response (${info.code}): ${info.msg}`);
    }
  }

  throw new Error(
    `[VEO3] Video generation timed out after ${maxAttempts} polls (${(maxAttempts * intervalMs) / 1000}s)`
  );
}

// ---------------------------------------------------------------------------
// Download Video
// ---------------------------------------------------------------------------

export async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log(`[VEO3] Downloading video: ${videoUrl.substring(0, 80)}...`);

  const res = await fetchWithTimeout(videoUrl, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });

  if (!res.ok) {
    throw new Error(`[VEO3] Failed to download video: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`[VEO3] Downloaded video: ${buffer.length} bytes`);
  return buffer;
}

// ---------------------------------------------------------------------------
// Helpers (kept for backward compat with premium-jobs.ts)
// ---------------------------------------------------------------------------

export function getVideoUrlFromOperation(operation: VEO3Operation): string | null {
  try {
    return operation.response?.resultUrls?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * No-op: Kie.ai handles its own cleanup.
 * Kept for interface compatibility.
 */
export function cleanupOperationCache(_operationName: string): void {
  // No local cache needed with Kie.ai
}
