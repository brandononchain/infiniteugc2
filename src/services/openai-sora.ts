import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { getSupabaseAdmin } from "../lib/supabase";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";
import { buildSoraProUGCPrompt } from "./prompt-builder";

const POLL_INTERVAL_MS = 15_000;
const MAX_POLL_ATTEMPTS = 80; // ~20 min

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

/**
 * Map aspect ratio string to OpenAI VideoSize.
 * OpenAI sizes: 720x1280 (portrait), 1280x720 (landscape), 1024x1792 (portrait tall), 1792x1024 (landscape wide)
 */
function toVideoSize(
  aspectRatio: string | undefined
): "720x1280" | "1280x720" {
  return aspectRatio === "16:9" ? "1280x720" : "720x1280";
}

/**
 * Resize image buffer to exactly match the requested video dimensions.
 * OpenAI Sora requires input_reference to match the output size exactly.
 */
async function resizeToVideoSize(imgBuffer: Buffer, size: string): Promise<Buffer> {
  const [w, h] = size.split("x").map(Number);
  return sharp(imgBuffer)
    .resize(w, h, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Map word count to OpenAI duration (4, 8, or 12 seconds).
 * ~2.5 words/sec speech rate.
 */
function toDuration(wordCount: number): "4" | "8" | "12" {
  const sec = wordCount / 2.5;
  if (sec <= 5) return "4";
  if (sec <= 10) return "8";
  return "12";
}

// ─────────────────────────────────────────────
// Single-clip generation (non-premium / sora2_openai)
// ─────────────────────────────────────────────

/**
 * Generate a Sora 2 video directly via OpenAI, upload to Supabase, return public URL.
 * Drop-in replacement for generateSora2VideoAndGetUrl() (Kie.ai).
 */
export async function generateOpenAISora2VideoAndGetUrl(
  scriptText: string,
  apiKey: string,
  userId: string,
  jobId: string,
  avatarUrl?: string,
  aspectRatio?: string,
  durationOverride?: number
): Promise<string> {
  const client = getOpenAIClient(apiKey);
  const size = toVideoSize(aspectRatio);

  const prompt = [
    "Animate the exact character from the reference image.",
    "The character speaks directly to the camera with natural lip-sync, mouth movements, and subtle facial expressions.",
    "Keep the character's appearance, clothing, and style exactly the same as the reference image throughout the entire video.",
    "The background and setting should match the reference image.",
    "No captions, no subtitles, no text overlays, no background music.",
    "The character is saying the following dialogue:",
    `"${scriptText}"`,
  ].join(" ");

  // Use explicit duration if provided, else auto-calculate from word count
  const seconds: "4" | "8" | "12" = durationOverride
    ? (String(durationOverride) as "4" | "8" | "12")
    : toDuration(scriptText.trim().split(/\s+/).length);

  console.log(
    `[OPENAI-SORA] Creating video: model=sora-2, size=${size}, seconds=${seconds}, prompt="${prompt.substring(0, 80)}..."`
  );

  const params: OpenAI.VideoCreateParams = {
    model: "sora-2",
    prompt,
    size,
    seconds,
  };

  if (avatarUrl) {
    const imgResponse = await fetchWithTimeout(avatarUrl, { timeoutMs: 30_000 });
    if (!imgResponse.ok) throw new Error(`[OPENAI-SORA] Failed to fetch avatar image: ${imgResponse.status}`);
    const rawBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const resized = await resizeToVideoSize(rawBuffer, size);
    params.input_reference = await toFile(resized, "reference.jpg", { type: "image/jpeg" });
  }

  const videoJob = await client.videos.create(params);
  console.log(`[OPENAI-SORA] Job created: ${videoJob.id}`);

  // Poll until completed
  const finalJob = await pollOpenAISoraJob(client, videoJob.id);

  // Download video bytes
  console.log(`[OPENAI-SORA] Downloading video content for job ${finalJob.id}`);
  const downloadResponse = await client.videos.downloadContent(finalJob.id);
  const videoBuffer = Buffer.from(await downloadResponse.arrayBuffer());
  console.log(`[OPENAI-SORA] Downloaded ${videoBuffer.length} bytes`);

  // Upload to Supabase
  const supabase = getSupabaseAdmin();
  const path = `sora2-openai-temp/${userId}/${jobId}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(path, videoBuffer, { contentType: "video/mp4", upsert: true });

  if (uploadError) throw new Error(`[OPENAI-SORA] Upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(path);
  return publicUrl;
}

// ─────────────────────────────────────────────
// Premium chunk generation (sora2pro_openai)
// ─────────────────────────────────────────────

/**
 * Generate one premium chunk via OpenAI Sora 2 Pro.
 * Drop-in replacement for generateSora2ProChunk() (Kie.ai).
 */
export async function generateOpenAISora2ProChunk(
  scriptSegment: string,
  apiKey: string,
  options: {
    instructions?: string | null;
    referenceImageUrl?: string;
    previousVisualDescription?: string | null;
    aspectRatio?: string;
    durationOverride?: number;
  }
): Promise<{ videoBuffer: Buffer; videoId: string }> {
  const client = getOpenAIClient(apiKey);
  const size = toVideoSize(options.aspectRatio);
  const wordCount = scriptSegment.trim().split(/\s+/).length;
  const seconds: "4" | "8" | "12" = options.durationOverride
    ? (String(options.durationOverride) as "4" | "8" | "12")
    : toDuration(wordCount);

  const prompt = buildSoraProUGCPrompt(
    scriptSegment,
    options.instructions,
    options.previousVisualDescription
  );

  console.log(
    `[OPENAI-SORA2PRO] Chunk: ${wordCount} words, size=${size}, seconds=${seconds}`
  );
  console.log(`[OPENAI-SORA2PRO] Prompt: "${prompt.substring(0, 120)}..."`);

  const params: OpenAI.VideoCreateParams = {
    model: "sora-2-pro",
    prompt,
    size,
    seconds,
  };

  if (options.referenceImageUrl) {
    const imgResponse = await fetchWithTimeout(options.referenceImageUrl, { timeoutMs: 30_000 });
    if (!imgResponse.ok) throw new Error(`[OPENAI-SORA2PRO] Failed to fetch reference image: ${imgResponse.status}`);
    const rawBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const resized = await resizeToVideoSize(rawBuffer, size);
    params.input_reference = await toFile(resized, "reference.jpg", { type: "image/jpeg" });
  }

  const videoJob = await client.videos.create(params);
  console.log(`[OPENAI-SORA2PRO] Job created: ${videoJob.id}`);

  const finalJob = await pollOpenAISoraJob(client, videoJob.id);

  const downloadResponse = await client.videos.downloadContent(finalJob.id);
  const videoBuffer = Buffer.from(await downloadResponse.arrayBuffer());
  console.log(`[OPENAI-SORA2PRO] Downloaded ${videoBuffer.length} bytes`);

  return { videoBuffer, videoId: finalJob.id };
}

// ─────────────────────────────────────────────
// Polling
// ─────────────────────────────────────────────

async function pollOpenAISoraJob(
  client: OpenAI,
  videoId: string
): Promise<OpenAI.Video> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    const job = await client.videos.retrieve(videoId);

    if (attempt === 1 || attempt % 4 === 0) {
      console.log(
        `[OPENAI-SORA] Poll ${attempt}/${MAX_POLL_ATTEMPTS}: status=${job.status}, progress=${job.progress}%`
      );
    }

    if (job.status === "completed") {
      console.log(`[OPENAI-SORA] Job ${videoId} completed`);
      return job;
    }

    if (job.status === "failed") {
      const errMsg = job.error?.message || "OpenAI Sora video generation failed";
      throw new Error(`[OPENAI-SORA] Job failed: ${errMsg}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `[OPENAI-SORA] Job ${videoId} timed out after ${MAX_POLL_ATTEMPTS} attempts`
  );
}

/**
 * Clean up temp file from Supabase Storage.
 */
export async function cleanupOpenAISora2TempFile(
  userId: string,
  jobId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const path = `sora2-openai-temp/${userId}/${jobId}.mp4`;

  const { error } = await supabase.storage.from("videos").remove([path]);

  if (error) {
    console.warn(`[OPENAI-SORA] Failed to cleanup ${path}:`, error.message);
  } else {
    console.log(`[OPENAI-SORA] Cleaned up temp file: ${path}`);
  }
}
