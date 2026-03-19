const HEYGEN_API_BASE = "https://api.heygen.com";
const HEYGEN_UPLOAD_BASE = "https://upload.heygen.com";

interface AudioUploadResponse {
  code: number;
  data: {
    id: string;
    name: string;
    file_type: string;
    url: string;
  };
  msg: string | null;
  message: string | null;
}

interface ImageUploadResponse {
  code: number;
  data: {
    id: string;
    name: string;
    file_type: string;
    folder_id: string;
    created_ts: number;
    url: string;
    image_key: string | null;
  };
  msg: string | null;
  message: string | null;
}

interface CreateVideoResponse {
  data: {
    video_id: string;
  };
}

interface VideoStatusResponse {
  data: {
    status: "pending" | "processing" | "completed" | "failed";
    video_url?: string;
    error?: string;
  };
}

export async function uploadAudioAsset(
  audioBuffer: Buffer,
  apiKey: string
): Promise<string> {
  console.log("[HEYGEN] Uploading audio to HeyGen:");
  console.log("  Audio size:", audioBuffer.length, "bytes");
  console.log("  Endpoint:", `${HEYGEN_UPLOAD_BASE}/v1/asset`);

  const response = await fetch(`${HEYGEN_UPLOAD_BASE}/v1/asset`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "audio/mpeg",
    },
    body: audioBuffer as any,
  });

  console.log("[HEYGEN] Audio upload response status:", response.status);

  if (!response.ok) {
    const responseText = await response.text();
    console.log("[HEYGEN] Audio upload error response:", responseText);
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { raw: responseText };
    }
    throw new Error(
      `HeyGen upload audio error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const responseText = await response.text();
  console.log("[HEYGEN] Audio upload success response:", responseText);
  
  const data = JSON.parse(responseText) as AudioUploadResponse;
  console.log("[HEYGEN] Audio asset ID:", data.data.id);
  return data.data.id;
}

export async function uploadImageAsset(
  imageUrl: string,
  apiKey: string
): Promise<string> {
  console.log("[HEYGEN] Uploading image asset to HeyGen:");
  console.log("  Image URL:", imageUrl);
  console.log("  Endpoint:", `${HEYGEN_UPLOAD_BASE}/v1/asset`);

  // Download the image first
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image from ${imageUrl}: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get("content-type") || "image/png";
  console.log("  Image downloaded:", imageBuffer.byteLength, "bytes, type:", contentType);

  // Upload as raw binary data (same as audio upload)
  const response = await fetch(`${HEYGEN_UPLOAD_BASE}/v1/asset`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": contentType,
    },
    body: imageBuffer,
  });

  console.log("[HEYGEN] Image upload response status:", response.status);

  if (!response.ok) {
    const responseText = await response.text();
    console.log("[HEYGEN] Image upload error response:", responseText);
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { raw: responseText };
    }
    throw new Error(
      `HeyGen upload image error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const responseText = await response.text();
  console.log("[HEYGEN] Image upload success response:", responseText);

  const data = JSON.parse(responseText) as ImageUploadResponse;
  const imageKey = data.data.image_key;
  if (!imageKey) {
    throw new Error("[HEYGEN] No image_key returned from image upload response");
  }
  console.log("[HEYGEN] Image key:", imageKey);
  return imageKey;
}

export async function createVideo(
  imageKey: string,
  audioAssetId: string,
  apiKey: string,
  aspectRatio: string = "9:16"
): Promise<string> {
  const requestBody = {
    image_key: imageKey,
    video_title: `video_${Date.now()}`,
    audio_asset_id: audioAssetId,
    aspect_ratio: (["16:9", "1:1", "9:16"].includes(aspectRatio) ? aspectRatio : "9:16"),
  };

  console.log("[HEYGEN] Creating Avatar v4 video:");
  console.log("  Image key:", imageKey);
  console.log("  Audio asset ID:", audioAssetId);
  console.log("  Payload:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${HEYGEN_API_BASE}/v2/video/av4/generate`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("[HEYGEN] Avatar v4 generation response status:", response.status);

  if (!response.ok) {
    const responseText = await response.text();
    console.log("[HEYGEN] Avatar v4 generation error response:", responseText);
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      errorData = { raw: responseText };
    }
    throw new Error(
      `HeyGen create Avatar v4 video error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const responseText = await response.text();
  console.log("[HEYGEN] Avatar v4 generation success response:", responseText);

  const data = JSON.parse(responseText) as CreateVideoResponse;
  console.log("[HEYGEN] Video ID:", data.data.video_id);
  return data.data.video_id;
}

export async function checkVideoStatus(
  videoId: string,
  apiKey: string
): Promise<{ status: string; videoUrl?: string; error?: string }> {
  const response = await fetch(
    `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`,
    {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `HeyGen status check error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as VideoStatusResponse;
  return {
    status: data.data.status,
    videoUrl: data.data.video_url,
    error: data.data.error,
  };
}

export async function pollVideoCompletion(
  videoId: string,
  apiKey: string,
  maxAttempts: number = 30
): Promise<{ videoUrl: string }> {
  console.log("[HEYGEN] Waiting 90 seconds before first status check...");
  await new Promise((resolve) => setTimeout(resolve, 90000));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`[HEYGEN] Checking video status (attempt ${attempt + 1}/${maxAttempts})...`);
    const result = await checkVideoStatus(videoId, apiKey);

    if (result.status === "completed" && result.videoUrl) {
      console.log(`[HEYGEN] Video completed: ${result.videoUrl}`);
      return { videoUrl: result.videoUrl };
    }

    if (result.status === "failed") {
      throw new Error(
        `Video generation failed: ${result.error || "Unknown error"}`
      );
    }

    console.log(
      `[HEYGEN] Status: ${result.status}, waiting 60 seconds before retry...`
    );
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }

  throw new Error("Video generation timed out after all retries");
}
