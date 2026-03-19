/**
 * Audio splitting service.
 * Splits an audio buffer into fixed-duration segments using FFmpeg.
 */

import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";

export interface AudioSegment {
  index: number;
  audioBuffer: Buffer;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
}

/**
 * Get the duration of an audio buffer in seconds using ffprobe.
 */
async function getAudioDuration(audioBuffer: Buffer): Promise<number> {
  const tempPath = path.join(
    "/tmp",
    `split_dur_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`
  );

  try {
    fs.writeFileSync(tempPath, audioBuffer);

    return await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          console.warn(
            `[AudioSplitter] ffprobe failed: ${err.message}, estimating from buffer size`
          );
          // Rough estimate: MP3 at 128kbps ≈ 16KB/s
          const estimatedSeconds = audioBuffer.length / 16000;
          resolve(Math.max(1, estimatedSeconds));
          return;
        }
        const duration = metadata.format.duration || 0;
        resolve(duration);
      });
    });
  } finally {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // cleanup failure is non-fatal
    }
  }
}

/**
 * Split an audio buffer into fixed-duration segments.
 *
 * @param audioBuffer     The full audio file buffer (MP3)
 * @param segmentSeconds  Target duration per segment in seconds (default: 20)
 * @returns               Array of audio segments with buffers and timing info
 */
export async function splitAudioByDuration(
  audioBuffer: Buffer,
  segmentSeconds: number = 20
): Promise<AudioSegment[]> {
  const totalDuration = await getAudioDuration(audioBuffer);
  console.log(
    `[AudioSplitter] Total audio duration: ${totalDuration.toFixed(1)}s, segment target: ${segmentSeconds}s`
  );

  // If total duration fits in one segment, return as-is
  if (totalDuration <= segmentSeconds + 2) {
    return [
      {
        index: 0,
        audioBuffer,
        startSeconds: 0,
        endSeconds: totalDuration,
        durationSeconds: totalDuration,
      },
    ];
  }

  const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempInputPath = path.join("/tmp", `split_in_${uid}.mp3`);
  const tempOutputPaths: string[] = [];

  try {
    fs.writeFileSync(tempInputPath, audioBuffer);

    // Calculate segment boundaries
    const segments: { start: number; duration: number }[] = [];
    let offset = 0;
    while (offset < totalDuration) {
      const remaining = totalDuration - offset;
      const segDuration = Math.min(segmentSeconds, remaining);
      segments.push({ start: offset, duration: segDuration });
      offset += segDuration;
    }

    // If the last segment is very short (< 5s), merge it with the previous one
    if (segments.length >= 2) {
      const lastSeg = segments[segments.length - 1];
      if (lastSeg.duration < 5) {
        segments.pop();
        segments[segments.length - 1].duration += lastSeg.duration;
      }
    }

    console.log(
      `[AudioSplitter] Splitting into ${segments.length} segments: ${segments.map((s) => `${s.duration.toFixed(1)}s`).join(", ")}`
    );

    // Extract each segment using ffmpeg
    const results: AudioSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const outputPath = path.join("/tmp", `split_out_${uid}_${i}.mp3`);
      tempOutputPaths.push(outputPath);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .inputOptions([`-ss ${seg.start.toFixed(3)}`])
          .outputOptions([
            `-t ${seg.duration.toFixed(3)}`,
            "-codec:a", "libmp3lame",
            "-b:a", "192k",
          ])
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", (err) =>
            reject(
              new Error(
                `[AudioSplitter] FFmpeg segment ${i} failed: ${err.message}`
              )
            )
          )
          .run();
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error(
          `[AudioSplitter] FFmpeg did not produce output for segment ${i}`
        );
      }

      const segBuffer = fs.readFileSync(outputPath);
      if (segBuffer.length === 0) {
        throw new Error(
          `[AudioSplitter] FFmpeg output for segment ${i} is empty`
        );
      }

      results.push({
        index: i,
        audioBuffer: segBuffer,
        startSeconds: seg.start,
        endSeconds: seg.start + seg.duration,
        durationSeconds: seg.duration,
      });
    }

    console.log(
      `[AudioSplitter] Split complete: ${results.length} segments, total ${results.reduce((sum, s) => sum + s.audioBuffer.length, 0)} bytes`
    );

    return results;
  } finally {
    // Cleanup all temp files
    for (const f of [tempInputPath, ...tempOutputPaths]) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // non-fatal
      }
    }
  }
}

/**
 * Estimate the number of audio chunks for a given word count.
 * ElevenLabs generates ~150 words/minute = 2.5 words/second.
 *
 * @param wordCount       Number of words in the script
 * @param segmentSeconds  Target duration per segment in seconds (default: 20)
 * @returns               Estimated number of chunks
 */
export function estimateAudioChunks(
  wordCount: number,
  segmentSeconds: number = 20
): number {
  const estimatedDurationSeconds = wordCount / 2.5;
  return Math.max(1, Math.ceil(estimatedDurationSeconds / segmentSeconds));
}
