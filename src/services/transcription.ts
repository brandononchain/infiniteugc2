import OpenAI from 'openai';
// Using native fetch (Node.js 18+) instead of node-fetch to avoid ESM compatibility issues
import fs from 'fs';
import { getOpenAIKey } from '../lib/keys';

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface TranscriptionResult {
  text: string;
  words: WordTimestamp[];
  duration: number;
}

/**
 * Caption phrase with FRAME-BASED timing
 * Using frames instead of floating-point seconds eliminates boundary ambiguity
 */
export interface FrameBasedCaption {
  text: string;
  startFrame: number;  // Inclusive
  endFrame: number;    // Inclusive (this frame belongs to THIS caption)
}

/**
 * Transcribe audio/video using OpenAI Whisper with word-level timestamps
 */
export async function transcribeWithTimestamps(
  mediaUrl: string
): Promise<TranscriptionResult> {
  let openaiKey: string;
  try {
    openaiKey = await getOpenAIKey();
  } catch {
    console.log('[TRANSCRIPTION] No OpenAI key available, falling back to script-based timing');
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  console.log('[TRANSCRIPTION] Downloading media for transcription:', mediaUrl);

  // Download the video/audio file
  const response = await fetch(mediaUrl);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const tempPath = `/tmp/transcribe_${Date.now()}.mp4`;
  await fs.promises.writeFile(tempPath, Buffer.from(buffer));

  console.log('[TRANSCRIPTION] Media downloaded, starting Whisper transcription...');

  try {
    // Use Whisper API with word timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    console.log('[TRANSCRIPTION] Whisper transcription complete');

    // Extract word-level timestamps
    const words: WordTimestamp[] = (transcription as any).words?.map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    })) || [];

    // Calculate duration from last word
    const duration = words.length > 0
      ? words[words.length - 1].end
      : (transcription as any).duration || 0;

    console.log(`[TRANSCRIPTION] Got ${words.length} words over ${duration}s`);

    // Cleanup
    await fs.promises.unlink(tempPath).catch(() => {});

    return {
      text: transcription.text,
      words,
      duration,
    };
  } catch (error) {
    // Cleanup on error
    await fs.promises.unlink(tempPath).catch(() => {});
    throw error;
  }
}

/**
 * Convert word timestamps to FRAME-BASED caption phrases using NATURAL speech breaks
 *
 * CRITICAL: This function guarantees:
 * 1. NO FRAME OVERLAPS
 * 2. FIRST CAPTION STARTS AT FRAME 0 (fixes early-frame lag)
 * 3. Every frame from 0 to end maps to exactly ONE caption
 *
 * NATURAL GROUPING:
 * - Uses Whisper's word timing gaps to detect natural speech pauses
 * - Groups 3-6 words based on natural breaks (commas, pauses, sentence structure)
 * - Falls back to maxWordsPerPhrase only when no natural break is found
 */
export function wordsToCaptionPhrases(
  words: WordTimestamp[],
  maxWordsPerPhrase: number = 5,
  fps: number = 30
): Array<{ text: string; startTime: number; duration: number }> {
  if (words.length === 0) {
    return [];
  }

  // STEP 1: Build raw phrases using NATURAL speech breaks from Whisper timing
  const rawPhrases: Array<{
    text: string;
    rawStartTime: number;
    rawEndTime: number;
  }> = [];

  // Configuration for natural phrase detection
  const MIN_WORDS_PER_PHRASE = 2;  // Minimum words before looking for a break
  const MAX_WORDS_PER_PHRASE = Math.max(maxWordsPerPhrase, 6); // Allow up to 6 words
  const PAUSE_THRESHOLD = 0.25; // 250ms gap indicates a natural pause
  const LONG_PAUSE_THRESHOLD = 0.4; // 400ms gap is definitely a break

  // Punctuation that suggests a natural break point
  const BREAK_PUNCTUATION = /[,;:.!?]$/;

  let currentPhraseWords: WordTimestamp[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentPhraseWords.push(word);

    const wordCount = currentPhraseWords.length;
    const isLastWord = i === words.length - 1;

    // Decide if we should end the current phrase here
    let shouldBreak = false;

    if (isLastWord) {
      // Always break on last word
      shouldBreak = true;
    } else if (wordCount >= MAX_WORDS_PER_PHRASE) {
      // Force break at max words
      shouldBreak = true;
    } else if (wordCount >= MIN_WORDS_PER_PHRASE) {
      const nextWord = words[i + 1];
      const gapToNextWord = nextWord.start - word.end;

      // Check for natural break conditions:
      // 1. Long pause (400ms+) - definitely a break
      if (gapToNextWord >= LONG_PAUSE_THRESHOLD) {
        shouldBreak = true;
      }
      // 2. Medium pause (250ms+) with punctuation - likely a break
      else if (gapToNextWord >= PAUSE_THRESHOLD && BREAK_PUNCTUATION.test(word.word)) {
        shouldBreak = true;
      }
      // 3. Punctuation with reasonable pause (150ms+)
      else if (gapToNextWord >= 0.15 && BREAK_PUNCTUATION.test(word.word)) {
        shouldBreak = true;
      }
      // 4. At comfortable length (4+ words) with any noticeable pause
      else if (wordCount >= 4 && gapToNextWord >= 0.2) {
        shouldBreak = true;
      }
    }

    if (shouldBreak && currentPhraseWords.length > 0) {
      const firstWord = currentPhraseWords[0];
      const lastWord = currentPhraseWords[currentPhraseWords.length - 1];

      rawPhrases.push({
        text: currentPhraseWords.map(w => w.word).join(' ').trim(),
        rawStartTime: firstWord.start,
        rawEndTime: lastWord.end,
      });

      currentPhraseWords = [];
    }
  }

  // Handle any remaining words (shouldn't happen, but safety net)
  if (currentPhraseWords.length > 0) {
    const firstWord = currentPhraseWords[0];
    const lastWord = currentPhraseWords[currentPhraseWords.length - 1];

    rawPhrases.push({
      text: currentPhraseWords.map(w => w.word).join(' ').trim(),
      rawStartTime: firstWord.start,
      rawEndTime: lastWord.end,
    });
  }

  console.log(`[TRANSCRIPTION] Natural grouping created ${rawPhrases.length} phrases from ${words.length} words`);

  // STEP 2: Convert to frame-based timing with NO OVERLAPS
  // CRITICAL: First caption MUST start at frame 0
  const frameBasedPhrases: FrameBasedCaption[] = [];

  for (let i = 0; i < rawPhrases.length; i++) {
    const phrase = rawPhrases[i];

    // CRITICAL FIX: First caption starts at frame 0, not at Whisper timestamp
    // This ensures frames 0,1,2,... all have a caption owner
    let startFrame: number;
    if (i === 0) {
      startFrame = 0; // ALWAYS start at frame 0
    } else {
      // Subsequent captions start right after previous ends
      startFrame = frameBasedPhrases[i - 1].endFrame + 1;
    }

    // End frame: calculate based on natural timing, but ensure no gaps
    let endFrame: number;

    if (i < rawPhrases.length - 1) {
      // Use the natural duration from Whisper, but aligned to frames
      const naturalEndFrame = Math.floor(phrase.rawEndTime * fps);
      const nextNaturalStartFrame = Math.floor(rawPhrases[i + 1].rawStartTime * fps);

      // End exactly 1 frame before next caption's natural start
      // But never before our own startFrame
      endFrame = Math.max(startFrame, nextNaturalStartFrame - 1);
    } else {
      // Last phrase: use its natural end time + small buffer
      endFrame = Math.floor(phrase.rawEndTime * fps) + 15; // +0.5s buffer at 30fps
    }

    // Ensure minimum duration of 1 frame
    if (endFrame < startFrame) {
      endFrame = startFrame;
    }

    frameBasedPhrases.push({
      text: phrase.text,
      startFrame,
      endFrame,
    });
  }

  // STEP 3: Validate no overlaps and no gaps at start
  if (frameBasedPhrases.length > 0 && frameBasedPhrases[0].startFrame !== 0) {
    console.warn(`[TRANSCRIPTION] First caption didn't start at 0! Forcing to 0.`);
    frameBasedPhrases[0].startFrame = 0;
  }

  for (let i = 0; i < frameBasedPhrases.length - 1; i++) {
    const current = frameBasedPhrases[i];
    const next = frameBasedPhrases[i + 1];

    // Check for overlap
    if (current.endFrame >= next.startFrame) {
      console.warn(`[TRANSCRIPTION] Frame overlap detected! Caption ${i} ends at ${current.endFrame}, Caption ${i+1} starts at ${next.startFrame}. Fixing...`);
      frameBasedPhrases[i].endFrame = next.startFrame - 1;
    }

    // Check for gap (frames with no caption owner)
    if (next.startFrame > current.endFrame + 1) {
      console.warn(`[TRANSCRIPTION] Frame gap detected! Caption ${i} ends at ${current.endFrame}, Caption ${i+1} starts at ${next.startFrame}. Closing gap...`);
      // Extend current caption to close the gap
      frameBasedPhrases[i].endFrame = next.startFrame - 1;
    }
  }

  // STEP 4: Convert back to time-based format (for backward compatibility)
  const phrases = frameBasedPhrases.map((fp) => {
    const startTime = fp.startFrame / fps;
    const duration = (fp.endFrame - fp.startFrame + 1) / fps;

    return {
      text: fp.text,
      startTime: parseFloat(startTime.toFixed(4)),
      duration: parseFloat(duration.toFixed(4)),
      // Include frame data for Remotion
      _startFrame: fp.startFrame,
      _endFrame: fp.endFrame,
    };
  });

  // Log phrase details for debugging natural grouping
  const wordCounts = phrases.map(p => p.text.split(' ').length);
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  console.log(`[TRANSCRIPTION] Created ${phrases.length} NATURAL caption phrases from ${words.length} words`);
  console.log(`[TRANSCRIPTION] Word distribution: min=${Math.min(...wordCounts)}, max=${Math.max(...wordCounts)}, avg=${avgWords.toFixed(1)}`);
  console.log(`[TRANSCRIPTION] FRAME 0 OWNERSHIP: Caption "${phrases[0]?.text}" owns frames 0-${(phrases[0] as any)?._endFrame}`);

  // Log first few phrases to show natural grouping
  phrases.slice(0, 5).forEach((p, i) => {
    console.log(`[TRANSCRIPTION]   Phrase ${i + 1}: "${p.text}" (${p.text.split(' ').length} words)`);
  });

  return phrases;
}

/**
 * Generate frame-based captions from script text
 * Used as fallback when Whisper transcription fails
 */
export function generateFrameBasedCaptionsFromScript(
  scriptText: string,
  maxWordsPerPhrase: number,
  videoDurationSeconds: number,
  fps: number = 30
): Array<{ text: string; startTime: number; duration: number }> {
  const words = scriptText.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const totalFrames = Math.floor(videoDurationSeconds * fps);
  const phrases: Array<{ text: string; startTime: number; duration: number }> = [];

  // Calculate how many phrases we'll have
  const phraseCount = Math.ceil(words.length / maxWordsPerPhrase);

  // Distribute frames evenly across phrases with small buffers
  const startBuffer = Math.floor(0.3 * fps); // 0.3s buffer at start
  const endBuffer = Math.floor(0.5 * fps);   // 0.5s buffer at end
  const usableFrames = totalFrames - startBuffer - endBuffer;
  const framesPerPhrase = Math.floor(usableFrames / phraseCount);

  let currentFrame = startBuffer;

  for (let i = 0; i < words.length; i += maxWordsPerPhrase) {
    const phraseWords = words.slice(i, i + maxWordsPerPhrase);
    const text = phraseWords.join(' ');

    const startFrame = currentFrame;
    // End frame is 1 frame before next phrase starts (no overlap)
    const endFrame = Math.min(currentFrame + framesPerPhrase - 1, totalFrames - endBuffer);

    const startTime = startFrame / fps;
    const duration = (endFrame - startFrame + 1) / fps;

    phrases.push({
      text,
      startTime: parseFloat(startTime.toFixed(4)),
      duration: parseFloat(duration.toFixed(4)),
    });

    currentFrame = endFrame + 1; // Next phrase starts immediately after
  }

  console.log(`[TRANSCRIPTION] Generated ${phrases.length} frame-aligned captions from script`);

  return phrases;
}
