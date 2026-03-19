import crypto from "crypto";

const BYTEPLUS_API_BASE = "https://cv.byteplusapi.com";
const SERVICE = "cv";
const REGION = "ap-singapore-1";
const VERSION = "2024-06-06";
const REQ_KEY = "realman_avatar_picture_omni15_cv";

export interface BytePlusCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

interface SubmitTaskResponse {
  ResponseMetadata: {
    RequestId: string;
    Action: string;
    Version: string;
    Service: string;
    Region: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
  data?: {
    task_id: string;
  };
}

interface GetResultResponse {
  ResponseMetadata: {
    RequestId: string;
    Action: string;
    Version: string;
    Service: string;
    Region: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
  data?: {
    status: string; // "running" | "done" | "failed"
    resp_data?: string | Record<string, unknown>; // JSON string or object containing video result
    task_id?: string;
  };
}

interface VideoResultData {
  video_url?: string;
  video_urls?: string[];
}

export type OmniHumanResolution = "720p" | "1080p";

export interface OmniHumanTaskOptions {
  imageUrl: string;
  audioUrl: string;
  prompt?: string; // Optional text prompt for controlling animations, gestures, camera movements
  resolution?: OmniHumanResolution; // "720p" (better quality, up to 60s) or "1080p" (up to 30s). Defaults to "720p"
}

/**
 * Derive the HMAC-SHA256 signing key for BytePlus API requests.
 * Key derivation chain: SecretKey -> Date -> Region -> Service -> "request"
 */
function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = crypto
    .createHmac("sha256", key)
    .update(dateStamp)
    .digest();
  const kRegion = crypto
    .createHmac("sha256", kDate)
    .update(regionName)
    .digest();
  const kService = crypto
    .createHmac("sha256", kRegion)
    .update(serviceName)
    .digest();
  const kSigning = crypto
    .createHmac("sha256", kService)
    .update("request")
    .digest();
  return kSigning;
}

/**
 * Sign a request using BytePlus HMAC-SHA256 authentication.
 *
 * Signed headers: content-type, host, x-content-sha256, x-date
 * Non-signed headers (added separately): Service, Region
 *
 * Reference: https://docs.byteplus.com/en/docs/byteplus-platform/reference-example
 */
function signRequest(
  method: string,
  url: string,
  body: string,
  credentials: BytePlusCredentials
): Record<string, string> {
  const now = new Date();
  // Format: YYYYMMDDTHHmmssZ (e.g. 20241231T120000Z)
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = xDate.slice(0, 8);

  const parsedUrl = new URL(url);
  const canonicalUri = parsedUrl.pathname || "/";

  // Query parameters must be sorted alphabetically for canonical request
  const sortedParams = [...parsedUrl.searchParams.entries()].sort(
    (a, b) => a[0].localeCompare(b[0])
  );
  const canonicalQuerystring = sortedParams
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    )
    .join("&");

  const contentHash = crypto.createHash("sha256").update(body).digest("hex");

  // Headers to sign - must be lowercase and sorted alphabetically
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host: parsedUrl.host,
    "x-content-sha256": contentHash,
    "x-date": xDate,
  };

  const signedHeaderKeys = Object.keys(headers).sort();
  const signedHeaders = signedHeaderKeys.join(";");

  // Each header: lowercase-name:value\n
  const canonicalHeaders = signedHeaderKeys
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");

  // Canonical request structure per BytePlus docs
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    contentHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/request`;

  // String to sign: Algorithm + \n + Date + \n + CredentialScope + \n + Hash(CanonicalRequest)
  const stringToSign = [
    "HMAC-SHA256",
    xDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signingKey = getSignatureKey(
    credentials.secretAccessKey,
    dateStamp,
    REGION,
    SERVICE
  );

  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const authorization = `HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    Authorization: authorization,
  };
}

/**
 * Make a signed API request to BytePlus Vision AI.
 * Handles both CVSubmitTask, CVGetResult, and CVCancelTask actions.
 */
async function makeSignedRequest(
  action: string,
  body: Record<string, unknown>,
  credentials: BytePlusCredentials
): Promise<unknown> {
  const url = `${BYTEPLUS_API_BASE}/?Action=${action}&Version=${VERSION}`;
  const bodyStr = JSON.stringify(body);

  const headers = signRequest("POST", url, bodyStr, credentials);
  // Service and Region are required headers but NOT part of signed headers
  headers["Service"] = SERVICE;
  headers["Region"] = REGION;

  console.log(`[OMNIHUMAN] Making request: ${action}`);
  console.log(`[OMNIHUMAN] Request body:`, JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OMNIHUMAN] HTTP error ${response.status}:`, errorText);
    throw new Error(
      `BytePlus API error: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();

  console.log(
    `[OMNIHUMAN] Response:`,
    JSON.stringify(data, null, 2).substring(0, 1000)
  );

  if (data.ResponseMetadata?.Error) {
    const err = data.ResponseMetadata.Error;
    console.error(`[OMNIHUMAN] API error:`, err);
    throw new Error(`BytePlus API error: ${err.Code} - ${err.Message}`);
  }

  return data;
}

/**
 * Submit an OmniHuman 1.5 video generation task.
 * Uses CVSubmitTask with req_key "realman_avatar_picture_omni15_cv".
 *
 * @param options - Task options including imageUrl, audioUrl, and optional prompt
 * @param credentials - BytePlus AK/SK credentials
 * @returns task_id for polling via getOmniHumanResult
 */
export async function submitOmniHumanTask(
  options: OmniHumanTaskOptions,
  credentials: BytePlusCredentials
): Promise<string> {
  console.log("[OMNIHUMAN] Submitting video generation task");
  console.log("  Image URL:", options.imageUrl);
  console.log("  Audio URL:", options.audioUrl);
  console.log("  Resolution:", options.resolution || "720p (default)");
  if (options.prompt) {
    console.log("  Prompt:", options.prompt);
  }

  // Default to 720p: docs say "720p mode produces faster generation and higher quality output"
  const resolution = options.resolution || "720p";

  const requestBody: Record<string, unknown> = {
    req_key: REQ_KEY,
    image_url: options.imageUrl,
    audio_url: options.audioUrl,
    resolution,
  };

  // Optional text prompt for controlling animations, gestures, camera movements, etc.
  if (options.prompt) {
    requestBody.prompt = options.prompt;
  }

  const response = (await makeSignedRequest(
    "CVSubmitTask",
    requestBody,
    credentials
  )) as SubmitTaskResponse;

  const taskId = response.data?.task_id;
  if (!taskId) {
    console.error("[OMNIHUMAN] Full submit response:", JSON.stringify(response));
    throw new Error(
      "[OMNIHUMAN] No task_id returned from submit response"
    );
  }

  console.log(`[OMNIHUMAN] Task submitted: ${taskId}`);
  return taskId;
}

/**
 * Get the result of an OmniHuman 1.5 video generation task.
 * Uses CVGetResult with the same req_key.
 *
 * @returns status and videoUrl (when done)
 */
export async function getOmniHumanResult(
  taskId: string,
  credentials: BytePlusCredentials
): Promise<{ status: string; videoUrl?: string; errorMessage?: string }> {
  const requestBody = {
    req_key: REQ_KEY,
    task_id: taskId,
  };

  const response = (await makeSignedRequest(
    "CVGetResult",
    requestBody,
    credentials
  )) as GetResultResponse;

  const status = response.data?.status || "unknown";
  const respData = response.data?.resp_data;

  if (status === "done" && respData) {
    try {
      // resp_data can be a JSON string or a direct object
      let resultData: VideoResultData;
      if (typeof respData === "string") {
        resultData = JSON.parse(respData);
      } else {
        resultData = respData as unknown as VideoResultData;
      }

      const videoUrl = resultData.video_url || resultData.video_urls?.[0];
      if (videoUrl) {
        return { status: "done", videoUrl };
      }

      console.warn(
        "[OMNIHUMAN] Task done but no video URL found in resp_data:",
        JSON.stringify(resultData)
      );
      return { status: "done" };
    } catch (parseErr) {
      console.error(
        "[OMNIHUMAN] Failed to parse resp_data:",
        respData
      );
      return { status: "done" };
    }
  }

  if (status === "failed") {
    let errorMessage = "OmniHuman video generation failed";
    if (respData) {
      try {
        const errorData =
          typeof respData === "string" ? JSON.parse(respData) : respData;
        errorMessage = `OmniHuman failed: ${JSON.stringify(errorData)}`;
      } catch {
        errorMessage = `OmniHuman failed: ${String(respData)}`;
      }
    }
    return { status: "failed", errorMessage };
  }

  return { status };
}

/**
 * Cancel an OmniHuman 1.5 task.
 * Uses CVCancelTask action.
 */
export async function cancelOmniHumanTask(
  taskId: string,
  credentials: BytePlusCredentials
): Promise<void> {
  console.log(`[OMNIHUMAN] Cancelling task: ${taskId}`);

  await makeSignedRequest(
    "CVCancelTask",
    { req_key: REQ_KEY, task_id: taskId },
    credentials
  );

  console.log(`[OMNIHUMAN] Task cancelled: ${taskId}`);
}

/**
 * Poll for OmniHuman 1.5 video generation completion.
 * Waits 30s before first check, then polls every 30s.
 * Max 60 attempts = ~30 minutes total.
 */
export async function pollOmniHumanCompletion(
  taskId: string,
  credentials: BytePlusCredentials,
  maxAttempts: number = 60
): Promise<{ videoUrl: string }> {
  console.log("[OMNIHUMAN] Waiting 30 seconds before first status check...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(
      `[OMNIHUMAN] Checking task status (attempt ${attempt + 1}/${maxAttempts})...`
    );
    const result = await getOmniHumanResult(taskId, credentials);

    if (result.status === "done" && result.videoUrl) {
      console.log(`[OMNIHUMAN] Video completed: ${result.videoUrl}`);
      return { videoUrl: result.videoUrl };
    }

    if (result.status === "done" && !result.videoUrl) {
      throw new Error(
        "OmniHuman video generation completed but no video URL was returned"
      );
    }

    if (result.status === "failed") {
      throw new Error(
        result.errorMessage || "OmniHuman video generation failed"
      );
    }

    console.log(
      `[OMNIHUMAN] Status: ${result.status}, waiting 30 seconds before retry...`
    );
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }

  throw new Error(
    `OmniHuman video generation timed out after ${maxAttempts} attempts (~${Math.round((maxAttempts * 30) / 60)} minutes)`
  );
}

/**
 * Download the avatar image from its current URL and re-upload to Supabase Storage
 * to ensure OmniHuman gets a clean, directly accessible public URL.
 * This avoids issues with signed URLs, query params, or redirects that BytePlus may not handle.
 */
export async function uploadImageAndGetUrl(
  imageUrl: string,
  userId: string,
  jobId: string
): Promise<string> {
  const { getSupabaseAdmin } = await import("../lib/supabase");
  const supabase = getSupabaseAdmin();

  console.log(`[OMNIHUMAN] Downloading image from: ${imageUrl}`);
  const imageResponse = await fetch(imageUrl);

  if (!imageResponse.ok) {
    throw new Error(
      `Failed to download image for OmniHuman: ${imageResponse.status}`
    );
  }

  const contentType =
    imageResponse.headers.get("content-type") || "image/png";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const fileName = `omnihuman-images/${userId}/${jobId}.${ext}`;

  console.log(
    `[OMNIHUMAN] Re-uploading image to Supabase: ${fileName} (${imageBuffer.length} bytes, ${contentType})`
  );

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, imageBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload image for OmniHuman: ${uploadError.message}`
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(fileName);

  console.log(`[OMNIHUMAN] Image available at: ${publicUrl}`);
  return publicUrl;
}

/**
 * Upload audio buffer to Supabase Storage and return its public URL.
 * OmniHuman requires publicly accessible URLs for both image and audio inputs.
 */
export async function uploadAudioAndGetUrl(
  audioBuffer: Buffer,
  userId: string,
  jobId: string
): Promise<string> {
  const { getSupabaseAdmin } = await import("../lib/supabase");
  const supabase = getSupabaseAdmin();

  const fileName = `omnihuman-audio/${userId}/${jobId}.mp3`;

  console.log(`[OMNIHUMAN] Uploading audio to Supabase: ${fileName}`);

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload audio for OmniHuman: ${uploadError.message}`
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(fileName);

  console.log(`[OMNIHUMAN] Audio available at: ${publicUrl}`);
  return publicUrl;
}
