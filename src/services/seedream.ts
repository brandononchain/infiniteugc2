import { getSupabaseAdmin } from "../lib/supabase";

const ARK_API_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
const MODEL = "seedream-4-5-251128";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;

interface SeedreamOptions {
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  referenceImageUrls?: string[];
}

/**
 * Map aspect ratio + resolution to Seedream size.
 * Seedream supports simplified "1K", "2K", "4K" (for 1:1) and
 * specific pixel sizes like "1920x1080", "1080x1920", etc.
 * We use known valid sizes from the API docs.
 */
function mapToSeedreamSize(aspectRatio: string, resolution: string): string {
  // Seedream requires minimum 3,686,400 pixels (~1920x1920).
  // All sizes must meet that floor. 1K maps to ~2K to satisfy the minimum.
  const sizeMap: Record<string, Record<string, string>> = {
    "1:1": { "1K": "1920x1920", "2K": "2048x2048", "4K": "4096x4096" },
    "16:9": { "1K": "2560x1440", "2K": "2560x1440", "4K": "3840x2160" },
    "9:16": { "1K": "1440x2560", "2K": "1440x2560", "4K": "2160x3840" },
    "4:3": { "1K": "2240x1680", "2K": "2240x1680", "4K": "4096x3072" },
    "3:4": { "1K": "1680x2240", "2K": "1680x2240", "4K": "3072x4096" },
  };

  const ratioSizes = sizeMap[aspectRatio] || sizeMap["1:1"];
  return ratioSizes[resolution] || ratioSizes["2K"];
}

interface SeedreamCreateResponse {
  created?: number;
  id?: string;
  status?: string;
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Generate an image using Seedream 4.5 (BytePlus Ark API).
 * The API may return synchronously (with data) or asynchronously (with task id).
 */
export async function generateSeedreamImage(
  options: SeedreamOptions,
  arkApiKey: string,
  userId: string,
  jobId: string
): Promise<string> {
  console.log("[SEEDREAM] Generating image...");
  console.log("  Prompt:", options.prompt.substring(0, 120));
  console.log("  Reference Images:", options.referenceImageUrls?.length || 0);

  const size = mapToSeedreamSize(
    options.aspectRatio || "1:1",
    options.resolution || "2K"
  );
  console.log("  Size:", size);

  // Include reference images for style-guided generation (Seedream supports up to 14, combined with n <= 15)
  const refUrls = (options.referenceImageUrls || []).slice(0, 14);

  // When reference images are provided, use an edit-style prompt.
  // Seedream treats image_urls as input for image editing — the prompt should describe
  // what to change/keep, NOT ask it to "generate" or "study" something new.
  const enrichedPrompt = refUrls.length > 0
    ? `Use the provided reference image as the base. Keep the same person, face, pose, body position, product, clothing, background, setting, colors, lighting, and composition exactly as they appear. Only apply this edit: ${options.prompt}`
    : options.prompt;

  const body: Record<string, any> = {
    model: MODEL,
    prompt: enrichedPrompt,
    size,
    n: 1,
    response_format: "url",
    watermark: false,
  };

  if (refUrls.length > 0) {
    try {
      console.log(`[SEEDREAM] Downloading ${refUrls.length} reference image(s) for base64 encoding...`);
      const base64Images: string[] = [];

      for (let i = 0; i < refUrls.length; i++) {
        try {
          const refResponse = await fetch(refUrls[i]);
          if (refResponse.ok) {
            const refBuffer = Buffer.from(await refResponse.arrayBuffer());
            const refBase64 = refBuffer.toString("base64");
            console.log(`[SEEDREAM] Reference image ${i + 1}: ${refBuffer.length} bytes`);
            base64Images.push(`data:image/jpeg;base64,${refBase64}`);
          } else {
            console.warn(`[SEEDREAM] Failed to download reference image ${i + 1}: ${refResponse.status}`);
          }
        } catch (refErr) {
          console.warn(`[SEEDREAM] Reference image ${i + 1} fetch error:`, refErr);
        }
      }

      if (base64Images.length > 0) {
        // Seedream API uses image_urls (plural) for reference images
        body.image_urls = base64Images;
        console.log(`[SEEDREAM] Sending ${base64Images.length} reference image(s) via image_urls`);
      }
    } catch (refErr) {
      console.warn("[SEEDREAM] Reference images processing error:", refErr);
    }
  }

  console.log("[SEEDREAM] Request body keys:", Object.keys(body));
  console.log("[SEEDREAM] Prompt sent:", enrichedPrompt.substring(0, 200));
  if (body.image_urls) {
    console.log("[SEEDREAM] image_urls count:", body.image_urls.length);
  }

  const response = await fetch(`${ARK_API_BASE}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${arkApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SEEDREAM] HTTP error ${response.status}:`, errorText);
    throw new Error(`Seedream API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as SeedreamCreateResponse;
  console.log("[SEEDREAM] Response status:", data.status, "id:", data.id);

  if (data.error) {
    throw new Error(`Seedream API error: ${data.error.code} - ${data.error.message}`);
  }

  // Synchronous response - image returned directly
  if (data.data && data.data.length > 0 && data.data[0].url) {
    const imageUrl = data.data[0].url;
    console.log(`[SEEDREAM] Got image URL directly: ${imageUrl}`);
    return await uploadSeedreamImage(imageUrl, userId, jobId);
  }

  // Async response - need to poll
  if (data.id && data.status === "pending") {
    console.log(`[SEEDREAM] Task pending: ${data.id}, polling...`);
    return await pollSeedreamTask(data.id, arkApiKey, userId, jobId);
  }

  throw new Error("Seedream returned unexpected response format");
}

async function pollSeedreamTask(
  taskId: string,
  arkApiKey: string,
  userId: string,
  jobId: string
): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    console.log(`[SEEDREAM] Polling task ${taskId} (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})`);

    const response = await fetch(`${ARK_API_BASE}/tasks/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${arkApiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SEEDREAM] Poll error ${response.status}:`, errorText);
      continue;
    }

    const data: any = await response.json();

    if (data.status === "succeeded" || data.status === "completed") {
      // Look for image URL in results
      const results = data.data || data.results || [];
      if (Array.isArray(results) && results.length > 0 && results[0].url) {
        console.log(`[SEEDREAM] Task completed: ${results[0].url}`);
        return await uploadSeedreamImage(results[0].url, userId, jobId);
      }
      throw new Error("Seedream task completed but no image URL found");
    }

    if (data.status === "failed") {
      throw new Error(data.error?.message || "Seedream image generation failed");
    }

    console.log(`[SEEDREAM] Status: ${data.status}`);
  }

  throw new Error(`Seedream timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Download image from Seedream URL and upload to Supabase Storage.
 * Seedream URLs expire after 24h, so we persist them.
 */
async function uploadSeedreamImage(
  imageUrl: string,
  userId: string,
  jobId: string
): Promise<string> {
  console.log(`[SEEDREAM] Downloading image from: ${imageUrl}`);

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download Seedream image: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const ext = contentType.includes("png") ? "png" : "jpg";
  const fileName = `image-gen/${userId}/${jobId}.${ext}`;

  console.log(`[SEEDREAM] Uploading to Supabase: ${fileName} (${imageBuffer.length} bytes)`);

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, imageBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload Seedream image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("videos")
    .getPublicUrl(fileName);

  console.log(`[SEEDREAM] Image uploaded: ${publicUrl}`);
  return publicUrl;
}
