import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { getSupabaseAdmin } from '../lib/supabase';
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from '../lib/fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';
// Using native fetch (Node.js 18+) instead of node-fetch to avoid ESM compatibility issues
import { transcribeWithTimestamps, wordsToCaptionPhrases } from './transcription';
import { execSync } from 'child_process';

// Get available CPU cores for Remotion concurrency (max out at available cores)
const getAvailableConcurrency = (): number => {
  const cpuCount = os.cpus().length;
  // Use all available cores, minimum 1
  return Math.max(1, cpuCount);
};

interface CaptionStyleConfig {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  strokeWidth: number;
  alignment: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'middle' | 'bottom';
  yOffset: number;
  maxWordsPerPhrase: number;
  // Extended style options
  styleType?: 'clean' | 'pop' | 'native' | 'highlight' | 'white-bg' | 'black-bg' | 'red-bg' | 'outline' | 'plain-white';
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  boxDecorationBreak?: boolean;
}

interface TextOverlay {
  text_content: string;
  position_x: number;
  position_y: number;
  start_time: number;
  duration: number;
  style_config: CaptionStyleConfig;
  layer_order?: number;
}

interface ReplyOverlayConfig {
  enabled: boolean;
  avatar_url: string | null;
  person_name: string;
  comment_text: string;
  position_x: number;
  position_y: number;
  start_time: number;
  duration: number;
}

interface CaptionPhrase {
  text: string;
  startTime: number;
  duration: number;
}

// Default "Pop" style for backward compatibility
const DEFAULT_CAPTION_STYLE: CaptionStyleConfig = {
  fontFamily: 'TikTok-Sans-Bold',
  fontSize: 72,
  fontColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 8,
  alignment: 'center',
  verticalPosition: 'middle',
  yOffset: 0,
  maxWordsPerPhrase: 3,
  styleType: 'pop',
  shadowColor: 'rgba(0,0,0,0.3)',
  shadowBlur: 4,
  shadowOffsetX: 0,
  shadowOffsetY: 4,
};

/** Override config for non-jobs-table callers (e.g. dubbing pipeline) */
export interface CaptionOverrideConfig {
  captionEnabled: boolean;
  captionStyle: CaptionStyleConfig | null;
  captionPosition: { x: number; y: number } | null;
}

/**
 * Apply captions and text overlays using Remotion
 *
 * NEW SIMPLIFIED FLOW:
 * - caption_style: Full style config stored directly in jobs table (no template lookup)
 * - text_overlays: Array of text overlay configs stored directly in jobs table
 *
 * When overrideConfig is provided, skips DB read and uses passed-in config directly.
 * This allows the dubbing pipeline to call this without needing a `jobs` table row.
 */
export async function applyCaptionsWithRemotion(
  videoUrl: string,
  jobId: string,
  userId: string,
  scriptText: string,
  overrideConfig?: CaptionOverrideConfig
): Promise<Buffer> {
  console.log('[REMOTION-CAPTION] Starting caption processing for job:', jobId);

  let captionEnabled: boolean;
  let captionStyle: CaptionStyleConfig | null;
  let captionPosition: { x: number; y: number } | null;
  let textOverlays: TextOverlay[] = [];
  let replyOverlay: ReplyOverlayConfig | null = null;

  if (overrideConfig) {
    // Use passed-in config (dubbing pipeline path)
    captionEnabled = overrideConfig.captionEnabled;
    captionStyle = overrideConfig.captionStyle;
    captionPosition = overrideConfig.captionPosition;
    console.log('[REMOTION-CAPTION] Using override config (dubbing pipeline)');
  } else {
    // Read config from jobs table (standard video generation path)
    const supabase = getSupabaseAdmin();

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('caption_enabled, caption_style, caption_position, text_overlays, reply_overlay, draft_job_id')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('[REMOTION-CAPTION] Failed to fetch job config:', jobError);
      throw new Error('Failed to fetch job configuration');
    }

    captionEnabled = job.caption_enabled;
    captionStyle = job.caption_style as CaptionStyleConfig | null;
    captionPosition = job.caption_position as { x: number; y: number } | null;
    textOverlays = (job.text_overlays || []) as TextOverlay[];
    replyOverlay = job.reply_overlay as ReplyOverlayConfig | null;

    // If this job has a draft reference and no caption config, use the draft's config
    if (job.draft_job_id && !job.caption_enabled && !job.caption_style) {
      const { data: draftJob } = await supabase
        .from('jobs')
        .select('caption_enabled, caption_style, caption_position, text_overlays, reply_overlay')
        .eq('id', job.draft_job_id)
        .single();

      if (draftJob) {
        captionEnabled = draftJob.caption_enabled;
        captionStyle = draftJob.caption_style as CaptionStyleConfig | null;
        captionPosition = draftJob.caption_position as { x: number; y: number } | null;
        textOverlays = (draftJob.text_overlays || []) as TextOverlay[];
        replyOverlay = draftJob.reply_overlay as ReplyOverlayConfig | null;
      console.log('[REMOTION-CAPTION] Using caption config from draft job:', job.draft_job_id);
    }
  }
  } // end else (jobs table path)

  // Check if any processing is needed
  if (!captionEnabled && textOverlays.length === 0 && !replyOverlay?.enabled) {
    console.log('[REMOTION-CAPTION] No captions, text overlays, or reply overlay, downloading original video');
    return await downloadVideoBuffer(videoUrl);
  }

  console.log('[REMOTION-CAPTION] Caption enabled:', captionEnabled);
  console.log('[REMOTION-CAPTION] Caption style:', captionStyle?.styleType || 'none');
  console.log('[REMOTION-CAPTION] Caption position:', captionPosition);
  console.log('[REMOTION-CAPTION] Text overlays count:', textOverlays.length);
  console.log('[REMOTION-CAPTION] Reply overlay:', replyOverlay?.enabled ? 'enabled' : 'none');

  let videoBuffer: Buffer;
  try {
    videoBuffer = await downloadVideoBuffer(videoUrl);
  } catch (downloadErr) {
    const msg = downloadErr instanceof Error ? downloadErr.message : String(downloadErr);
    console.error('[REMOTION-CAPTION] Video download failed:', msg);
    throw downloadErr;
  }

  const tempInputPath = `/tmp/input_${Date.now()}.mp4`;
  const tempOutputPath = `/tmp/output_${Date.now()}.mp4`;

  await fs.promises.writeFile(tempInputPath, videoBuffer);
  console.log('[REMOTION-CAPTION] Downloaded video to:', tempInputPath);

  // Get video duration early - needed for caption generation
  const videoDuration = await getVideoDuration(tempInputPath);
  console.log('[REMOTION-CAPTION] Video duration:', videoDuration, 'seconds');

  // Generate captions if enabled
  let captions: CaptionPhrase[] = [];
  const effectiveCaptionStyle = captionEnabled ? (captionStyle || DEFAULT_CAPTION_STYLE) : null;

  if (captionEnabled && effectiveCaptionStyle) {
    const maxWords = effectiveCaptionStyle.maxWordsPerPhrase || 3;

    // Try to use Whisper transcription for accurate word-level timestamps
    try {
      console.log('[REMOTION-CAPTION] Attempting Whisper transcription for accurate timing...');
      const transcription = await transcribeWithTimestamps(videoUrl);
      captions = wordsToCaptionPhrases(transcription.words, maxWords);
      console.log('[REMOTION-CAPTION] Using Whisper transcription:', captions.length, 'phrases');
    } catch (transcriptionError) {
      // Fallback to script-based timing if transcription fails
      console.log('[REMOTION-CAPTION] Whisper transcription failed, using script-based timing');
      captions = generateCaptionsFromScript(scriptText, effectiveCaptionStyle, videoDuration);
      console.log('[REMOTION-CAPTION] Using script-based timing:', captions.length, 'phrases');
    }
  }

  // Convert text overlays to the format expected by Remotion
  const textLayers = textOverlays.map((overlay) => ({
    text_content: overlay.text_content,
    position_x: overlay.position_x,
    position_y: overlay.position_y,
    start_time: overlay.start_time,
    duration: overlay.duration,
    style_config: overlay.style_config,
  }));

  try {
    // Bundle Remotion composition
    console.log('[REMOTION-CAPTION] Bundling Remotion composition...');
    const remotionEntryPoint = path.resolve(__dirname, '../../src/remotion/Root.tsx');
    console.log('[REMOTION-CAPTION] Entry point:', remotionEntryPoint);
    const bundleLocation = await bundle({
      entryPoint: remotionEntryPoint,
      webpackOverride: (config) => config,
    });
    console.log('[REMOTION-CAPTION] Bundle created at:', bundleLocation);

    // Select composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'CaptionedVideo',
      inputProps: {
        videoUrl: videoUrl,
        captions,
        captionStyle: effectiveCaptionStyle,
        captionPosition: captionPosition || { x: 0.5, y: 0.5 },
        textLayers,
        replyOverlay: replyOverlay?.enabled ? replyOverlay : null,
      },
    });

    // Override duration to match video
    const fps = 30;
    const durationInFrames = Math.ceil(videoDuration * fps);

    console.log('[REMOTION-CAPTION] Rendering video with Remotion...');
    console.log('[REMOTION-CAPTION] Duration:', durationInFrames, 'frames at', fps, 'fps');
    console.log('[REMOTION-CAPTION] Using video URL:', videoUrl);

    // Render video with optimized settings for smooth playback
    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps,
      },
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: tempOutputPath,
      inputProps: {
        videoUrl: videoUrl,
        captions,
        captionStyle: effectiveCaptionStyle,
        captionPosition: captionPosition || { x: 0.5, y: 0.5 },
        textLayers,
        replyOverlay: replyOverlay?.enabled ? replyOverlay : null,
      },
      crf: 18,
      pixelFormat: 'yuv420p',
      concurrency: getAvailableConcurrency(),
      chromiumOptions: {
        disableWebSecurity: true,
      },
    });

    console.log('[REMOTION-CAPTION] Rendering complete');

    // Only run FFmpeg to add faststart flag (no re-encoding)
    const optimizedPath = `/tmp/optimized_${Date.now()}.mp4`;
    console.log('[REMOTION-CAPTION] Adding faststart flag for web playback...');

    try {
      execSync(`ffmpeg -i "${tempOutputPath}" -c copy -movflags +faststart "${optimizedPath}" -y`, {
        stdio: 'inherit',
        timeout: 60000,
      });

      console.log('[REMOTION-CAPTION] Faststart optimization complete');

      const outputBuffer = await fs.promises.readFile(optimizedPath);
      console.log('[REMOTION-CAPTION] Output video size:', outputBuffer.length, 'bytes');

      // Cleanup all temp files
      await fs.promises.unlink(tempInputPath).catch(() => {});
      await fs.promises.unlink(tempOutputPath).catch(() => {});
      await fs.promises.unlink(optimizedPath).catch(() => {});

      return outputBuffer;
    } catch (ffmpegError) {
      console.log('[REMOTION-CAPTION] Faststart optimization failed, using original render:', ffmpegError);

      const outputBuffer = await fs.promises.readFile(tempOutputPath);
      console.log('[REMOTION-CAPTION] Output video size:', outputBuffer.length, 'bytes');

      // Cleanup
      await fs.promises.unlink(tempInputPath).catch(() => {});
      await fs.promises.unlink(tempOutputPath).catch(() => {});
      await fs.promises.unlink(optimizedPath).catch(() => {});

      return outputBuffer;
    }
  } catch (error) {
    // Cleanup on error
    await fs.promises.unlink(tempInputPath).catch(() => {});
    await fs.promises.unlink(tempOutputPath).catch(() => {});

    console.error('[REMOTION-CAPTION] Rendering failed:', error);
    console.log('[REMOTION-CAPTION] Falling back to original video');

    return videoBuffer;
  }
}

const DOWNLOAD_RETRY_ATTEMPTS = 2;
const DOWNLOAD_RETRY_DELAY_MS = 3000;

async function downloadVideoBuffer(videoUrl: string): Promise<Buffer> {
  console.log('[REMOTION-CAPTION] Downloading video from:', videoUrl);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= DOWNLOAD_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(videoUrl, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('[REMOTION-CAPTION] Video downloaded:', buffer.length, 'bytes');
      return buffer;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message || '';
      if (attempt < DOWNLOAD_RETRY_ATTEMPTS) {
        console.log(`[REMOTION-CAPTION] Download attempt ${attempt} failed (${msg}), retrying in ${DOWNLOAD_RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, DOWNLOAD_RETRY_DELAY_MS));
      } else {
        throw new Error(`Video download failed: ${msg}`);
      }
    }
  }
  throw new Error(`Video download failed: ${lastError?.message ?? 'unknown'}`);
}

/**
 * Generate FRAME-ALIGNED caption phrases from script text
 */
function generateCaptionsFromScript(
  scriptText: string,
  style: CaptionStyleConfig,
  videoDuration?: number,
  fps: number = 30
): CaptionPhrase[] {
  const maxWords = style.maxWordsPerPhrase || 3;
  const words = scriptText.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const totalDuration = videoDuration || words.length * 0.4;
  const totalFrames = Math.floor(totalDuration * fps);
  const phraseCount = Math.ceil(words.length / maxWords);
  const endBufferFrames = Math.floor(0.3 * fps);
  const usableFrames = Math.max(totalFrames - endBufferFrames, phraseCount);
  const framesPerPhrase = Math.floor(usableFrames / phraseCount);

  const phrases: CaptionPhrase[] = [];
  let currentFrame = 0;

  for (let i = 0; i < words.length; i += maxWords) {
    const phraseWords = words.slice(i, i + maxWords);
    const text = phraseWords.join(' ');
    const isLastPhrase = i + maxWords >= words.length;
    const isFirstPhrase = i === 0;

    const startFrame = isFirstPhrase ? 0 : currentFrame;

    let endFrame: number;
    if (isLastPhrase) {
      endFrame = totalFrames - endBufferFrames;
    } else {
      endFrame = startFrame + framesPerPhrase - 1;
    }

    if (endFrame < startFrame) {
      endFrame = startFrame;
    }

    const startTime = startFrame / fps;
    const duration = (endFrame - startFrame + 1) / fps;

    phrases.push({
      text,
      startTime: parseFloat(startTime.toFixed(4)),
      duration: parseFloat(duration.toFixed(4)),
    });

    currentFrame = endFrame + 1;
  }

  if (phrases.length > 0) {
    const firstPhrase = phrases[0];
    const lastPhrase = phrases[phrases.length - 1];
    console.log(`[REMOTION-CAPTION] Frame-aligned timing: ${phrases.length} phrases`);
    console.log(`[REMOTION-CAPTION] First caption "${firstPhrase.text}" starts at frame 0 (${firstPhrase.startTime}s)`);
    console.log(`[REMOTION-CAPTION] Last: "${lastPhrase.text}" ends @ ${(lastPhrase.startTime + lastPhrase.duration).toFixed(3)}s (video: ${totalDuration.toFixed(2)}s)`);
  }

  return phrases;
}

/**
 * Get video duration using FFmpeg
 */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const duration = parseFloat(output.trim());
    if (isNaN(duration)) {
      throw new Error('Could not parse duration');
    }
    return duration;
  } catch (error) {
    console.error('[REMOTION-CAPTION] FFprobe failed, trying fallback:', error);
    const stats = await fs.promises.stat(videoPath);
    const estimatedDuration = stats.size / 100000;
    console.log('[REMOTION-CAPTION] Estimated duration from file size:', estimatedDuration);
    return Math.max(estimatedDuration, 5);
  }
}
