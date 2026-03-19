import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';

/**
 * Extracts the last frame from a video buffer as a JPEG image
 *
 * @param videoBuffer - The video file as a Buffer
 * @param chunkIndex - Index of the chunk (used for temp file naming)
 * @returns Buffer containing the extracted JPEG frame
 * @throws Error if frame extraction fails
 */
export async function extractLastFrame(
  videoBuffer: Buffer,
  chunkIndex: number
): Promise<Buffer> {
  const tempVideoPath = `/tmp/chunk_${chunkIndex}_${Date.now()}.mp4`;
  const tempFramePath = `/tmp/frame_${chunkIndex}_${Date.now()}.jpg`;

  try {
    // Write video buffer to temporary file
    fs.writeFileSync(tempVideoPath, videoBuffer);

    // First, get the actual video duration using ffprobe
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
        if (err) {
          console.warn(`ffprobe failed for chunk ${chunkIndex}, using fallback 7.9s: ${err.message}`);
          resolve(7.9);
          return;
        }
        const dur = metadata.format.duration || 8;
        console.log(`[Chunk ${chunkIndex}] Actual video duration: ${dur}s`);
        resolve(dur);
      });
    });

    // Try extracting a frame with progressive fallback offsets.
    // AI-generated videos often have no decodable frame near the very end,
    // so we start at duration - 1s and fall back further if needed.
    const offsets = [1.0, 2.0, 3.0, 5.0];
    let extracted = false;

    for (const offset of offsets) {
      const seekTime = Math.max(0, duration - offset);
      const seekTimestamp = `00:00:${seekTime.toFixed(3).padStart(6, '0')}`;
      console.log(`[Chunk ${chunkIndex}] Trying frame extraction at ${seekTimestamp} (offset: -${offset}s, duration: ${duration}s)`);

      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempVideoPath)
            .seekInput(seekTimestamp)
            .outputOptions('-vframes 1') // Extract exactly 1 frame
            .outputOptions('-q:v 2') // High quality JPEG (2 = very high quality, range 2-31)
            .output(tempFramePath)
            .on('end', () => {
              resolve();
            })
            .on('error', (err) => {
              reject(new Error(`FFmpeg failed: ${err.message}`));
            })
            .run();
        });

        // Verify a non-empty frame was actually written
        if (fs.existsSync(tempFramePath) && fs.statSync(tempFramePath).size > 0) {
          console.log(`[Chunk ${chunkIndex}] Frame extraction succeeded at offset -${offset}s`);
          extracted = true;
          break;
        }

        // Frame file is empty/missing — try next offset
        console.warn(`[Chunk ${chunkIndex}] Frame file empty at offset -${offset}s, trying further back...`);
        if (fs.existsSync(tempFramePath)) fs.unlinkSync(tempFramePath);
      } catch (err: any) {
        console.warn(`[Chunk ${chunkIndex}] Frame extraction failed at offset -${offset}s: ${err.message}`);
        if (fs.existsSync(tempFramePath)) fs.unlinkSync(tempFramePath);
        // continue to next offset
      }
    }

    if (!extracted) {
      throw new Error(`Frame extraction failed at all offsets (${offsets.join(', ')}s from end) for ${duration}s video`);
    }

    // Verify frame file was created
    if (!fs.existsSync(tempFramePath)) {
      throw new Error('FFmpeg did not create output frame file');
    }

    // Read frame back to buffer
    const frameBuffer = fs.readFileSync(tempFramePath);

    if (frameBuffer.length === 0) {
      throw new Error('Extracted frame is empty');
    }

    return frameBuffer;

  } finally {
    // Cleanup temporary files (always runs, even if error occurs)
    try {
      if (fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
      if (fs.existsSync(tempFramePath)) {
        fs.unlinkSync(tempFramePath);
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup temp files:', cleanupError);
      // Don't throw - cleanup failures shouldn't break the main flow
    }
  }
}
