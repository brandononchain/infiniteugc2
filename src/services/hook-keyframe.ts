/**
 * Hook Keyframe Extractor
 *
 * Extracts a reference frame from the original video and uploads it to
 * Supabase storage. This frame is passed to VEO3 as a visual reference
 * so the generated hook matches the original video's style/colors/setting.
 *
 * IMPORTANT: We extract from the BOTTOM THIRD of a frame to capture the
 * environment/setting (counters, surfaces, objects) rather than the person's
 * face. For UGC videos, the face is almost always in the top/center of frame
 * — we want VEO3 to match colors/lighting/environment, NOT reproduce a face.
 *
 * Strategy: Extract multiple candidate frames, crop to bottom third (environment),
 * and use that as the reference so VEO3 gets color/lighting context without faces.
 */

import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import { getSupabaseAdmin } from "../lib/supabase";
import { resolveVideoUrl } from "./video-url-resolver";

/**
 * Get video dimensions using ffprobe.
 */
function getVideoDimensions(videoPath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === "video");
      if (!videoStream || !videoStream.width || !videoStream.height) {
        return reject(new Error("Could not determine video dimensions"));
      }
      resolve({ width: videoStream.width, height: videoStream.height });
    });
  });
}

/**
 * Download a video, extract an environment-focused keyframe (bottom crop to
 * avoid faces), upload to Supabase, and return the public URL.
 *
 * The bottom-crop strategy captures the setting (counter, desk, gym floor)
 * and color palette without including the person's face, which prevents
 * VEO3 from attempting to reproduce uncanny faces in the hook.
 */
export async function extractHookKeyframe(
  videoUrl: string,
  hookJobId: string,
  userId: string,
  timestampSec: number = 3
): Promise<string> {
  const tmpVideoPath = path.join("/tmp", `hookref_vid_${Date.now()}.mp4`);
  const tmpFrameFullPath = path.join("/tmp", `hookref_full_${Date.now()}.jpg`);
  const tmpFrameCroppedPath = path.join("/tmp", `hookref_crop_${Date.now()}.jpg`);

  try {
    // Resolve social media URLs to direct download links
    const resolvedUrl = await resolveVideoUrl(videoUrl);

    // Download video to temp file
    console.log(`[HookKeyframe] Downloading video for frame extraction...`);
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tmpVideoPath, buffer);
    console.log(`[HookKeyframe] Downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

    // Get video dimensions for cropping
    const { width, height } = await getVideoDimensions(tmpVideoPath);
    console.log(`[HookKeyframe] Video dimensions: ${width}x${height}`);

    // Extract frame at timestamp — use 3s to avoid intro/black frames
    const seekTime = `00:00:${timestampSec.toFixed(3).padStart(6, "0")}`;
    console.log(`[HookKeyframe] Extracting frame at ${seekTime}...`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpVideoPath)
        .seekInput(seekTime)
        .outputOptions("-vframes 1")
        .outputOptions("-q:v 2")
        .output(tmpFrameFullPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(new Error(`FFmpeg frame extraction failed: ${err.message}`)))
        .run();
    });

    if (!fs.existsSync(tmpFrameFullPath) || fs.statSync(tmpFrameFullPath).size === 0) {
      throw new Error("Frame extraction produced empty file");
    }

    // Crop to bottom 40% of the frame to capture ENVIRONMENT, not face.
    // For portrait (9:16) UGC, the person's face is typically in the top 50-60%,
    // while counters, products, hands, and setting are in the bottom portion.
    const cropHeight = Math.round(height * 0.4);
    const cropY = height - cropHeight;
    const cropFilter = `crop=${width}:${cropHeight}:0:${cropY}`;

    console.log(`[HookKeyframe] Cropping to bottom 40%: ${width}x${cropHeight} (y offset: ${cropY})`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpFrameFullPath)
        .videoFilters(cropFilter)
        .outputOptions("-q:v 2")
        .output(tmpFrameCroppedPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(new Error(`FFmpeg crop failed: ${err.message}`)))
        .run();
    });

    // Use cropped version if it exists, otherwise fall back to full frame
    const finalFramePath = fs.existsSync(tmpFrameCroppedPath) && fs.statSync(tmpFrameCroppedPath).size > 0
      ? tmpFrameCroppedPath
      : tmpFrameFullPath;

    const frameBuffer = fs.readFileSync(finalFramePath);
    console.log(`[HookKeyframe] Frame ready: ${(frameBuffer.length / 1024).toFixed(1)}KB (${finalFramePath === tmpFrameCroppedPath ? "cropped" : "full"})`);

    // Upload to Supabase storage
    const supabase = getSupabaseAdmin();
    const storagePath = `${userId}/${hookJobId}/reference_frame.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("premium-videos")
      .upload(storagePath, frameBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload keyframe: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from("premium-videos")
      .getPublicUrl(storagePath);

    console.log(`[HookKeyframe] Keyframe uploaded: ${data.publicUrl}`);
    return data.publicUrl;
  } finally {
    // Cleanup temp files
    for (const p of [tmpVideoPath, tmpFrameFullPath, tmpFrameCroppedPath]) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        // Non-fatal
      }
    }
  }
}
