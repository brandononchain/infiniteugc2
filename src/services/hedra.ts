import { getSupabaseAdmin } from "../lib/supabase";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS, IMAGE_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";

const HEDRA_API_BASE = "https://api.hedra.com/web-app/public";
const POLL_INTERVAL_MS = 15000;
const MAX_POLL_ATTEMPTS = 120; // ~30 min max wait

// Hedra model IDs
const HEDRA_AVATAR_MODEL_ID = "26f0fc66-152b-40ab-abed-76c43df99bc8";
const HEDRA_OMNIA_MODEL_ID = "ab372b84-432f-44f5-bacc-c2542465f712";

export type HedraModel = "hedra_avatar" | "hedra_omnia";

interface HedraAssetResponse {
  id: string;
  name: string;
  type: string;
  upload_url?: string | null;
}

interface HedraGenerationResponse {
  id: string;
  asset_id?: string | null;
  status: string;
  progress: number;
  eta_sec?: number | null;
}

interface HedraStatusResponse {
  id: string;
  asset_id?: string | null;
  type: string;
  status: "queued" | "processing" | "finalizing" | "complete" | "error";
  progress: number;
  eta_sec?: number | null;
  error_message?: string | null;
  url?: string | null;
  download_url?: string | null;
  streaming_url?: string | null;
}

interface HedraVoice {
  id: string;
  name: string;
  type: string;
  asset?: {
    external_id?: string | null;
    labels?: Array<{ name: string; value: string }>;
    preview_url?: string | null;
    source?: string | null;
  };
}

function getModelId(model: HedraModel): string {
  return model === "hedra_omnia" ? HEDRA_OMNIA_MODEL_ID : HEDRA_AVATAR_MODEL_ID;
}

/**
 * Create an asset record on Hedra (step 1 of 2 for uploads).
 */
export async function createAssetRecord(
  name: string,
  type: "image" | "audio" | "video",
  apiKey: string
): Promise<HedraAssetResponse> {
  console.log(`[HEDRA] Creating asset record: name=${name}, type=${type}`);

  const response = await fetch(`${HEDRA_API_BASE}/assets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ name, type }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[HEDRA] Create asset failed (${response.status}): ${text}`);
  }

  const data: HedraAssetResponse = (await response.json()) as HedraAssetResponse;
  console.log(`[HEDRA] Asset record created: ${data.id}`);
  return data;
}

/**
 * Upload a file to a previously created asset record (step 2 of 2).
 */
export async function uploadAssetFile(
  assetId: string,
  fileBuffer: Buffer,
  fileName: string,
  apiKey: string
): Promise<void> {
  console.log(`[HEDRA] Uploading file to asset ${assetId}: ${fileName} (${fileBuffer.length} bytes)`);

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append("file", blob, fileName);

  const response = await fetch(`${HEDRA_API_BASE}/assets/${assetId}/upload`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[HEDRA] Upload asset failed (${response.status}): ${text}`);
  }

  console.log(`[HEDRA] File uploaded successfully to asset ${assetId}`);
}

/**
 * Upload an image from a URL to Hedra.
 * Downloads the image, creates an asset record, and uploads it.
 * Returns the Hedra asset ID.
 */
export async function uploadImageToHedra(
  imageUrl: string,
  apiKey: string
): Promise<string> {
  console.log(`[HEDRA] Downloading image from: ${imageUrl}`);
  const imageResponse = await fetchWithTimeout(imageUrl, { timeoutMs: IMAGE_DOWNLOAD_TIMEOUT_MS });

  if (!imageResponse.ok) {
    throw new Error(`[HEDRA] Failed to download image: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type") || "image/png";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const fileName = `portrait.${ext}`;

  const asset = await createAssetRecord(fileName, "image", apiKey);
  await uploadAssetFile(asset.id, imageBuffer, fileName, apiKey);

  return asset.id;
}

/**
 * Upload an audio buffer to Hedra.
 * Creates an asset record and uploads the audio.
 * Returns the Hedra asset ID.
 */
export async function uploadAudioToHedra(
  audioBuffer: Buffer,
  apiKey: string
): Promise<string> {
  const fileName = "audio.mp3";
  const asset = await createAssetRecord(fileName, "audio", apiKey);
  await uploadAssetFile(asset.id, audioBuffer, fileName, apiKey);
  return asset.id;
}

/**
 * Start a video generation on Hedra.
 * Supports both Avatar (talking-head, up to 10 min) and Omnia (full-body, up to 8s) models.
 *
 * Uses inline TTS (audio_generation) with script text — Hedra handles TTS internally.
 */
export async function createHedraGeneration(options: {
  model: HedraModel;
  imageAssetId: string;
  scriptText: string;
  voiceId?: string;
  audioAssetId?: string;
  aspectRatio?: string;
  resolution?: string;
}, apiKey: string): Promise<string> {
  const modelId = getModelId(options.model);

  console.log(`[HEDRA] Creating generation: model=${options.model} (${modelId})`);

  const body: Record<string, unknown> = {
    type: "video",
    ai_model_id: modelId,
    start_keyframe_id: options.imageAssetId,
    generated_video_inputs: {
      text_prompt: options.model === "hedra_omnia"
        ? "A person gesturing expressively while speaking directly to the camera"
        : "A person speaking naturally to the camera with clear lip-sync",
      aspect_ratio: options.aspectRatio || "9:16",
      resolution: options.resolution || "720p",
    },
  };

  // Use pre-uploaded audio if provided, otherwise use inline TTS
  if (options.audioAssetId) {
    body.audio_id = options.audioAssetId;
  } else if (options.voiceId) {
    body.audio_generation = {
      type: "text_to_speech",
      voice_id: options.voiceId,
      text: options.scriptText,
    };
  } else {
    throw new Error("[HEDRA] Either audioAssetId or voiceId must be provided");
  }

  const response = await fetch(`${HEDRA_API_BASE}/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[HEDRA] Create generation failed (${response.status}): ${text}`);
  }

  const data: HedraGenerationResponse = (await response.json()) as HedraGenerationResponse;

  if (!data.id) {
    throw new Error("[HEDRA] No generation ID returned");
  }

  console.log(`[HEDRA] Generation started: ${data.id} (status: ${data.status})`);
  return data.id;
}

/**
 * Check the status of a Hedra generation.
 */
export async function getGenerationStatus(
  generationId: string,
  apiKey: string
): Promise<HedraStatusResponse> {
  const response = await fetch(
    `${HEDRA_API_BASE}/generations/${generationId}/status`,
    {
      headers: {
        "X-API-Key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[HEDRA] Get status failed (${response.status}): ${text}`);
  }

  return (await response.json()) as HedraStatusResponse;
}

/**
 * Poll a Hedra generation until completion or failure.
 * Returns the video URL.
 */
export async function pollHedraCompletion(
  generationId: string,
  apiKey: string,
  maxAttempts: number = MAX_POLL_ATTEMPTS
): Promise<{ videoUrl: string }> {
  console.log(`[HEDRA] Polling generation ${generationId} for completion...`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await getGenerationStatus(generationId, apiKey);

    console.log(
      `[HEDRA] Poll ${attempt + 1}/${maxAttempts}: status=${status.status}, progress=${(status.progress * 100).toFixed(1)}%` +
      (status.eta_sec ? `, eta=${status.eta_sec}s` : "")
    );

    if (status.status === "complete") {
      const videoUrl = status.download_url || status.url || status.streaming_url;
      if (!videoUrl) {
        throw new Error("[HEDRA] Generation completed but no video URL returned");
      }
      console.log(`[HEDRA] Generation complete: ${videoUrl}`);
      return { videoUrl };
    }

    if (status.status === "error") {
      throw new Error(
        `[HEDRA] Generation failed: ${status.error_message || "Unknown error"}`
      );
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `[HEDRA] Generation timed out after ${maxAttempts} attempts (~${Math.round((maxAttempts * POLL_INTERVAL_MS) / 60000)} minutes)`
  );
}

/**
 * List available Hedra voices.
 */
export async function listHedraVoices(apiKey: string): Promise<HedraVoice[]> {
  const response = await fetch(`${HEDRA_API_BASE}/voices`, {
    headers: {
      "X-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[HEDRA] List voices failed (${response.status}): ${text}`);
  }

  return (await response.json()) as HedraVoice[];
}

/**
 * Full Hedra pipeline:
 * 1. Upload avatar image to Hedra
 * 2. Create generation with inline TTS (Hedra handles audio)
 * 3. Poll for completion
 * 4. Download result and store in Supabase
 * Returns the Supabase public URL of the video.
 */
export async function generateHedraVideoAndGetUrl(
  scriptText: string,
  apiKey: string,
  userId: string,
  jobId: string,
  avatarUrl: string,
  model: HedraModel = "hedra_avatar",
  voiceId?: string,
  audioBuffer?: Buffer
): Promise<string> {
  if (!avatarUrl) {
    throw new Error("[HEDRA] Avatar/portrait image URL is required");
  }

  // Step 1: Upload portrait image to Hedra
  console.log("[HEDRA] Step 1: Uploading portrait image to Hedra");
  const imageAssetId = await uploadImageToHedra(avatarUrl, apiKey);

  // Step 2: Upload pre-generated audio if provided, otherwise use Hedra's inline TTS
  let audioAssetId: string | undefined;
  if (audioBuffer) {
    console.log("[HEDRA] Step 2: Uploading pre-generated audio to Hedra");
    audioAssetId = await uploadAudioToHedra(audioBuffer, apiKey);
  }

  // Step 3: Create generation
  console.log("[HEDRA] Step 3: Creating video generation");
  const generationId = await createHedraGeneration(
    {
      model,
      imageAssetId,
      scriptText,
      voiceId,
      audioAssetId,
      aspectRatio: "9:16",
      resolution: "720p",
    },
    apiKey
  );

  // Step 4: Poll for completion
  console.log("[HEDRA] Step 4: Polling for completion");
  const { videoUrl } = await pollHedraCompletion(generationId, apiKey);

  // Step 5: Download and store in Supabase
  console.log(`[HEDRA] Step 5: Downloading video from Hedra: ${videoUrl}`);
  const videoResponse = await fetchWithTimeout(videoUrl, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });
  if (!videoResponse.ok) {
    throw new Error(`[HEDRA] Failed to download video: ${videoResponse.status}`);
  }
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  console.log(`[HEDRA] Downloaded video: ${videoBuffer.length} bytes`);

  const supabase = getSupabaseAdmin();
  const tempFileName = `hedra-temp/${userId}/${jobId}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(tempFileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`[HEDRA] Failed to upload video to Supabase: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(tempFileName);

  console.log(`[HEDRA] Video stored at: ${publicUrl}`);
  return publicUrl;
}

/**
 * Clean up temporary Hedra video files from Supabase Storage.
 */
export async function cleanupHedraTempFile(
  userId: string,
  jobId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const tempFileName = `hedra-temp/${userId}/${jobId}.mp4`;

  const { error } = await supabase.storage
    .from("videos")
    .remove([tempFileName]);

  if (error) {
    console.warn(`[HEDRA] Failed to cleanup temp file ${tempFileName}:`, error.message);
  } else {
    console.log(`[HEDRA] Cleaned up temp file: ${tempFileName}`);
  }
}
