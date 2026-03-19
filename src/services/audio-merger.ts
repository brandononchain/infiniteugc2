/**
 * Audio-video merger utility.
 * Merges TTS audio onto a silent video and trims to speech duration.
 * Uses fluent-ffmpeg (already a project dependency via frame-extractor).
 */

import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";

/**
 * Get the duration of an audio buffer in seconds using ffprobe.
 */
export async function getAudioDuration(audioBuffer: Buffer): Promise<number> {
  const tempPath = path.join("/tmp", `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

  try {
    fs.writeFileSync(tempPath, audioBuffer);

    return await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tempPath, (err, metadata) => {
        if (err) {
          console.warn(`[AudioMerger] ffprobe failed: ${err.message}, estimating from buffer size`);
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
 * Merge TTS audio onto a (silent) video buffer and optionally trim.
 *
 * - Replaces whatever audio track the video had with the TTS audio
 * - Trims the output to `trimDuration` seconds (eliminates stale video)
 * - Uses -c:v copy for speed (no video re-encoding)
 *
 * @param videoBuffer   The video file buffer (from Sora 2 Pro, may be silent)
 * @param audioBuffer   The TTS audio buffer (MP3 from ElevenLabs)
 * @param trimDuration  Max output duration in seconds (speech duration + buffer)
 * @returns             Merged video buffer with audio
 */
export async function mergeAudioOntoVideo(
  videoBuffer: Buffer,
  audioBuffer: Buffer,
  trimDuration?: number
): Promise<Buffer> {
  const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tempVideoIn = path.join("/tmp", `merge_vin_${uid}.mp4`);
  const tempAudioIn = path.join("/tmp", `merge_ain_${uid}.mp3`);
  const tempOutput = path.join("/tmp", `merge_out_${uid}.mp4`);

  try {
    fs.writeFileSync(tempVideoIn, videoBuffer);
    fs.writeFileSync(tempAudioIn, audioBuffer);

    await new Promise<void>((resolve, reject) => {
      let cmd = ffmpeg()
        .input(tempVideoIn)
        .input(tempAudioIn)
        .outputOptions([
          "-c:v copy",          // no video re-encoding (fast)
          "-c:a aac",           // encode TTS to AAC
          "-b:a 192k",          // high quality audio
          "-map 0:v:0",         // video from input 0
          "-map 1:a:0",         // audio from input 1 (TTS)
          "-movflags +faststart", // web-optimized MP4
          "-shortest",          // stop when the shorter stream ends
        ]);

      if (trimDuration && trimDuration > 0) {
        cmd = cmd.outputOptions(`-t ${trimDuration.toFixed(2)}`);
      }

      cmd
        .output(tempOutput)
        .on("end", () => resolve())
        .on("error", (err) => reject(new Error(`[AudioMerger] FFmpeg merge failed: ${err.message}`)))
        .run();
    });

    if (!fs.existsSync(tempOutput)) {
      throw new Error("[AudioMerger] FFmpeg did not produce output file");
    }

    const outputBuffer = fs.readFileSync(tempOutput);

    if (outputBuffer.length === 0) {
      throw new Error("[AudioMerger] FFmpeg output file is empty");
    }

    console.log(
      `[AudioMerger] Merged: video=${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB + audio=${(audioBuffer.length / 1024).toFixed(0)}KB → ${(outputBuffer.length / 1024 / 1024).toFixed(1)}MB` +
        (trimDuration ? ` (trimmed to ${trimDuration.toFixed(1)}s)` : "")
    );

    return outputBuffer;
  } finally {
    // Cleanup all temp files
    for (const f of [tempVideoIn, tempAudioIn, tempOutput]) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // non-fatal
      }
    }
  }
}
