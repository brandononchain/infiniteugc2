/**
 * Video Stitcher Service
 *
 * FFmpeg-based utilities for the video cloning pipeline:
 *
 * 1. extractSegment() — Extract a time range from a source video (for isolating scenes)
 * 2. extractFrameAtTime() — Extract a single frame at a specific timestamp
 * 3. stitchVideos() — Concatenate multiple video buffers into one seamless video
 * 4. getVideoDuration() — Get the duration of a video buffer
 * 5. extractAudioFromSegment() — Extract audio from a specific time range
 *
 * These utilities are the backbone of the scene-by-scene cloning pipeline,
 * enabling per-scene extraction, regeneration, and reassembly.
 */

import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function tmpPath(prefix: string, ext: string): string {
  return path.join("/tmp", `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}

function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // non-fatal
    }
  }
}

// ─────────────────────────────────────────────
// Get video duration
// ─────────────────────────────────────────────

/**
 * Get the duration of a video buffer in seconds using ffprobe.
 */
export async function getVideoDuration(videoBuffer: Buffer): Promise<number> {
  const tmp = tmpPath("dur", "mp4");

  try {
    fs.writeFileSync(tmp, videoBuffer);

    return await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tmp, (err, metadata) => {
        if (err) {
          console.warn(`[VideoStitcher] ffprobe failed: ${err.message}`);
          reject(err);
          return;
        }
        const duration = metadata.format.duration || 0;
        resolve(duration);
      });
    });
  } finally {
    cleanup(tmp);
  }
}

/**
 * Get video metadata (duration, dimensions, codec) from a buffer.
 */
export async function getVideoMetadata(videoBuffer: Buffer): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> {
  const tmp = tmpPath("meta", "mp4");

  try {
    fs.writeFileSync(tmp, videoBuffer);

    return await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tmp, (err, metadata) => {
        if (err) return reject(err);
        const videoStream = metadata.streams.find((s) => s.codec_type === "video");
        const fps = videoStream?.r_frame_rate
          ? eval(videoStream.r_frame_rate) // e.g. "30/1" → 30
          : 30;

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream?.width || 1080,
          height: videoStream?.height || 1920,
          fps: typeof fps === "number" ? fps : 30,
        });
      });
    });
  } finally {
    cleanup(tmp);
  }
}

// ─────────────────────────────────────────────
// Extract segment from video
// ─────────────────────────────────────────────

/**
 * Extract a time range from a video buffer.
 * Uses -c copy for speed when possible, re-encodes only when needed.
 *
 * @param videoBuffer  Source video buffer
 * @param startSec     Start time in seconds
 * @param endSec       End time in seconds
 * @returns            Extracted segment as a buffer
 */
export async function extractSegment(
  videoBuffer: Buffer,
  startSec: number,
  endSec: number
): Promise<Buffer> {
  const tmpIn = tmpPath("seg_in", "mp4");
  const tmpOut = tmpPath("seg_out", "mp4");

  try {
    fs.writeFileSync(tmpIn, videoBuffer);
    const duration = endSec - startSec;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpIn)
        .inputOptions([`-ss ${startSec.toFixed(3)}`])
        .outputOptions([
          `-t ${duration.toFixed(3)}`,
          "-c:v libx264",
          "-preset fast",
          "-crf 18",
          "-c:a aac",
          "-b:a 192k",
          "-movflags +faststart",
        ])
        .output(tmpOut)
        .on("end", () => resolve())
        .on("error", (err) =>
          reject(new Error(`[VideoStitcher] Segment extraction failed: ${err.message}`))
        )
        .run();
    });

    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) {
      throw new Error("[VideoStitcher] Segment extraction produced empty output");
    }

    const result = fs.readFileSync(tmpOut);
    console.log(
      `[VideoStitcher] Extracted segment ${startSec.toFixed(1)}s-${endSec.toFixed(1)}s: ${(result.length / 1024 / 1024).toFixed(1)}MB`
    );

    return result;
  } finally {
    cleanup(tmpIn, tmpOut);
  }
}

// ─────────────────────────────────────────────
// Extract frame at specific time
// ─────────────────────────────────────────────

/**
 * Extract a single frame at a specific timestamp as JPEG.
 *
 * @param videoBuffer   Source video buffer
 * @param timestampSec  Time in seconds to extract the frame
 * @returns             JPEG buffer of the extracted frame
 */
export async function extractFrameAtTime(
  videoBuffer: Buffer,
  timestampSec: number
): Promise<Buffer> {
  const tmpIn = tmpPath("frame_in", "mp4");
  const tmpOut = tmpPath("frame_out", "jpg");

  try {
    fs.writeFileSync(tmpIn, videoBuffer);
    const seekTime = `00:00:${timestampSec.toFixed(3).padStart(6, "0")}`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpIn)
        .seekInput(seekTime)
        .outputOptions("-vframes 1")
        .outputOptions("-q:v 2")
        .output(tmpOut)
        .on("end", () => resolve())
        .on("error", (err) =>
          reject(new Error(`[VideoStitcher] Frame extraction failed: ${err.message}`))
        )
        .run();
    });

    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) {
      throw new Error("[VideoStitcher] Frame extraction produced empty output");
    }

    return fs.readFileSync(tmpOut);
  } finally {
    cleanup(tmpIn, tmpOut);
  }
}

// ─────────────────────────────────────────────
// Extract audio from segment
// ─────────────────────────────────────────────

/**
 * Extract audio from a specific time range of a video.
 *
 * @param videoBuffer  Source video buffer
 * @param startSec     Start time in seconds
 * @param endSec       End time in seconds
 * @returns            MP3 audio buffer
 */
export async function extractAudioFromSegment(
  videoBuffer: Buffer,
  startSec: number,
  endSec: number
): Promise<Buffer> {
  const tmpIn = tmpPath("audio_in", "mp4");
  const tmpOut = tmpPath("audio_out", "mp3");

  try {
    fs.writeFileSync(tmpIn, videoBuffer);
    const duration = endSec - startSec;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpIn)
        .inputOptions([`-ss ${startSec.toFixed(3)}`])
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate(192)
        .outputOptions([`-t ${duration.toFixed(3)}`])
        .output(tmpOut)
        .on("end", () => resolve())
        .on("error", (err) =>
          reject(new Error(`[VideoStitcher] Audio extraction failed: ${err.message}`))
        )
        .run();
    });

    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) {
      throw new Error("[VideoStitcher] Audio extraction produced empty output");
    }

    return fs.readFileSync(tmpOut);
  } finally {
    cleanup(tmpIn, tmpOut);
  }
}

// ─────────────────────────────────────────────
// Stitch multiple videos together
// ─────────────────────────────────────────────

/**
 * Concatenate multiple video buffers into a single seamless video.
 * All inputs are first re-encoded to the same format/resolution for clean concatenation.
 *
 * @param videoBuffers  Array of video buffers in order
 * @param targetWidth   Target width (default 1080)
 * @param targetHeight  Target height (default 1920 for 9:16)
 * @param targetFps     Target FPS (default 30)
 * @returns             Concatenated video buffer
 */
export async function stitchVideos(
  videoBuffers: Buffer[],
  targetWidth: number = 1080,
  targetHeight: number = 1920,
  targetFps: number = 30
): Promise<Buffer> {
  if (videoBuffers.length === 0) {
    throw new Error("[VideoStitcher] No videos to stitch");
  }

  if (videoBuffers.length === 1) {
    return videoBuffers[0];
  }

  const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const normalizedPaths: string[] = [];
  const concatListPath = path.join("/tmp", `concat_${uid}.txt`);
  const outputPath = path.join("/tmp", `stitched_${uid}.mp4`);

  try {
    // Step 1: Normalize all input videos to the same format
    console.log(
      `[VideoStitcher] Normalizing ${videoBuffers.length} videos to ${targetWidth}x${targetHeight}@${targetFps}fps...`
    );

    for (let i = 0; i < videoBuffers.length; i++) {
      const inputPath = path.join("/tmp", `stitch_in_${uid}_${i}.mp4`);
      const normalizedPath = path.join("/tmp", `stitch_norm_${uid}_${i}.mp4`);

      fs.writeFileSync(inputPath, videoBuffers[i]);
      normalizedPaths.push(inputPath);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoFilters([
            `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
            `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`,
            `fps=${targetFps}`,
          ])
          .outputOptions([
            "-c:v libx264",
            "-preset fast",
            "-crf 18",
            "-c:a aac",
            "-b:a 192k",
            "-ar 44100",
            "-ac 2",
            "-movflags +faststart",
          ])
          .output(normalizedPath)
          .on("end", () => resolve())
          .on("error", (err) =>
            reject(
              new Error(`[VideoStitcher] Normalization of video ${i} failed: ${err.message}`)
            )
          )
          .run();
      });

      if (!fs.existsSync(normalizedPath) || fs.statSync(normalizedPath).size === 0) {
        throw new Error(`[VideoStitcher] Normalization of video ${i} produced empty output`);
      }

      normalizedPaths.push(normalizedPath);
      console.log(
        `[VideoStitcher] Normalized video ${i}: ${(fs.statSync(normalizedPath).size / 1024 / 1024).toFixed(1)}MB`
      );
    }

    // Step 2: Create concat list file
    const normalizedFiles = normalizedPaths.filter((p) => p.includes("norm"));
    const concatContent = normalizedFiles.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatContent);

    // Step 3: Concatenate using FFmpeg concat demuxer
    console.log(`[VideoStitcher] Concatenating ${normalizedFiles.length} normalized videos...`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy", "-movflags +faststart"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err) =>
          reject(new Error(`[VideoStitcher] Concatenation failed: ${err.message}`))
        )
        .run();
    });

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error("[VideoStitcher] Concatenation produced empty output");
    }

    const result = fs.readFileSync(outputPath);
    console.log(
      `[VideoStitcher] Stitched ${videoBuffers.length} videos: ${(result.length / 1024 / 1024).toFixed(1)}MB`
    );

    return result;
  } finally {
    // Cleanup all temp files
    cleanup(concatListPath, outputPath, ...normalizedPaths);
  }
}

/**
 * Download a video from a URL and return as a buffer.
 */
export async function downloadVideoBuffer(videoUrl: string): Promise<Buffer> {
  console.log(`[VideoStitcher] Downloading: ${videoUrl.substring(0, 80)}...`);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`[VideoStitcher] Download failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`[VideoStitcher] Downloaded: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
  return buffer;
}
