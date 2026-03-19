import { getSupabaseAdmin } from "../lib/supabase";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";

const KIE_API_BASE = "https://api.kie.ai/api/v1";
const MODEL = "sora-2-image-to-video";
const POLL_INTERVAL_MS = 15000;
const MAX_POLL_ATTEMPTS = 80; // ~20 min max wait

/**
 * Build a prompt for the Kie.ai Sora 2 image-to-video model.
 */
function buildSoraPrompt(scriptText: string): string {
  return [
    "Animate the exact character from the reference image.",
    "The character speaks directly to the camera with natural lip-sync, mouth movements, and subtle facial expressions.",
    "Keep the character's appearance, clothing, and style exactly the same as the reference image throughout the entire video.",
    "The background and setting should match the reference image.",
    "No captions, no subtitles, no text overlays, no background music.",
    "The character is saying the following dialogue:",
    `"${scriptText}"`,
  ].join(" ");
}

/**
 * Always use 15s (15 frames) for Sora 2 — handles up to ~45 words per chunk.
 */
function getFramesFromScript(_scriptText: string): string {
  return "15";
}

interface CreateTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

interface RecordInfoResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "success" | "fail";
    param: string;
    resultJson: string | null;
    failCode: string | null;
    failMsg: string | null;
    costTime: number | null;
    completeTime: number | null;
    createTime: number;
  };
}

/**
 * Create a Sora 2 image-to-video task on Kie.ai.
 */
export async function createSora2Task(
  prompt: string,
  imageUrl: string,
  apiKey: string,
  options?: { nFrames?: string; aspectRatio?: string }
): Promise<string> {
  const nFrames = options?.nFrames ?? "10";
  const aspectRatio = options?.aspectRatio ?? "portrait";

  console.log(
    `[SORA2] Creating Kie.ai task: model=${MODEL}, aspect=${aspectRatio}, frames=${nFrames}, prompt="${prompt.substring(0, 80)}..."`
  );

  const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        prompt,
        image_urls: [imageUrl],
        aspect_ratio: aspectRatio,
        n_frames: nFrames,
        remove_watermark: true,
        upload_method: "s3",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[SORA2] Kie.ai createTask failed (${response.status}): ${text}`
    );
  }

  const result: CreateTaskResponse = await response.json();

  if (result.code !== 200 || !result.data?.taskId) {
    throw new Error(
      `[SORA2] Kie.ai createTask error: ${result.msg || "unknown"}`
    );
  }

  console.log(`[SORA2] Task created with id: ${result.data.taskId}`);
  return result.data.taskId;
}

/**
 * Query the status of a Kie.ai Sora 2 task.
 */
export async function getSora2TaskStatus(
  taskId: string,
  apiKey: string
): Promise<{
  state: "waiting" | "success" | "fail";
  resultUrls?: string[];
  failMsg?: string;
}> {
  const response = await fetch(
    `${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[SORA2] Kie.ai recordInfo failed (${response.status}): ${text}`
    );
  }

  const result: RecordInfoResponse = await response.json();

  if (result.code !== 200) {
    throw new Error(
      `[SORA2] Kie.ai recordInfo error: ${result.msg || "unknown"}`
    );
  }

  let resultUrls: string[] | undefined;
  if (result.data.resultJson) {
    try {
      const parsed = JSON.parse(result.data.resultJson);
      resultUrls = parsed.resultUrls;
    } catch {
      console.warn("[SORA2] Failed to parse resultJson:", result.data.resultJson);
    }
  }

  return {
    state: result.data.state,
    resultUrls,
    failMsg: result.data.failMsg ?? undefined,
  };
}

/**
 * Poll a Kie.ai Sora 2 task until success or failure.
 * Returns the video URL from the result.
 */
export async function pollSora2Completion(
  taskId: string,
  apiKey: string
): Promise<{ videoUrl: string }> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const { state, resultUrls, failMsg } = await getSora2TaskStatus(
      taskId,
      apiKey
    );

    console.log(
      `[SORA2] Poll attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}: state=${state}`
    );

    if (state === "success") {
      if (!resultUrls || resultUrls.length === 0) {
        throw new Error("[SORA2] Task succeeded but no result URLs returned");
      }
      console.log(`[SORA2] Video completed: ${resultUrls[0]}`);
      return { videoUrl: resultUrls[0] };
    }

    if (state === "fail") {
      throw new Error(
        `[SORA2] ${failMsg || "Sora 2 video generation failed"}`
      );
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `[SORA2] Video generation timed out after ${MAX_POLL_ATTEMPTS} attempts`
  );
}

/**
 * Full flow: create Sora 2 task via Kie.ai, poll for completion,
 * download the video, and upload to Supabase Storage.
 * Returns the public URL of the stored video.
 */
export async function generateSora2VideoAndGetUrl(
  scriptText: string,
  apiKey: string,
  userId: string,
  jobId: string,
  avatarUrl?: string,
  aspectRatio?: string,
  durationSeconds?: number
): Promise<string> {
  const soraPrompt = buildSoraPrompt(scriptText);
  // Use user-selected duration if provided, else default to 15
  const nFrames = durationSeconds ? String(durationSeconds) : "15";
  console.log(`[SORA2] Built prompt: "${soraPrompt.substring(0, 120)}...", nFrames=${nFrames}`);

  if (!avatarUrl) {
    throw new Error("[SORA2] Avatar/reference image URL is required for Sora 2 image-to-video");
  }

  const taskId = await createSora2Task(soraPrompt, avatarUrl, apiKey, {
    nFrames,
    aspectRatio: aspectRatio === "16:9" ? "landscape" : "portrait",
  });

  const { videoUrl } = await pollSora2Completion(taskId, apiKey);

  // Download the video from Kie.ai's S3 and re-upload to Supabase
  console.log(`[SORA2] Downloading video from Kie.ai: ${videoUrl}`);
  const videoResponse = await fetchWithTimeout(videoUrl, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });
  if (!videoResponse.ok) {
    throw new Error(`[SORA2] Failed to download video from Kie.ai: ${videoResponse.status}`);
  }
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  console.log(`[SORA2] Downloaded video: ${videoBuffer.length} bytes`);

  const supabase = getSupabaseAdmin();
  const tempFileName = `sora2-temp/${userId}/${jobId}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(tempFileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`[SORA2] Failed to upload video: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(tempFileName);
  return publicUrl;
}

/**
 * Clean up temporary Sora 2 video files from Supabase Storage
 */
export async function cleanupSora2TempFile(
  userId: string,
  jobId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const tempFileName = `sora2-temp/${userId}/${jobId}.mp4`;

  const { error } = await supabase.storage
    .from("videos")
    .remove([tempFileName]);

  if (error) {
    console.warn(`[SORA2] Failed to cleanup temp file ${tempFileName}:`, error.message);
  } else {
    console.log(`[SORA2] Cleaned up temp file: ${tempFileName}`);
  }
}
