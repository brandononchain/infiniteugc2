import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "../lib/keys";

export interface ScriptChunk {
  index: number;
  text: string;
  wordCount: number;
}

export async function splitScript(
  scriptContent: string,
  targetWordsPerChunk: number = 25,
  buffer: number = 5
): Promise<ScriptChunk[]> {
  const words = scriptContent.trim().split(/\s+/);
  const totalWords = words.length;

  if (totalWords === 0) {
    throw new Error("Script content is empty");
  }

  // If the script fits in a single chunk (including buffer zone), don't split
  if (totalWords <= targetWordsPerChunk + buffer) {
    return [
      {
        index: 0,
        text: scriptContent.trim(),
        wordCount: totalWords,
      },
    ];
  }

  try {
    const geminiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const idealChunks = Math.max(2, Math.round(totalWords / targetWordsPerChunk));

    const chunkDuration = targetWordsPerChunk >= 40 ? "15-second" : "8-second";
    const prompt = `You are an expert video script editor. Split the following script into EXACTLY ${idealChunks} chunks for video generation. Each chunk becomes one ${chunkDuration} video clip that will be stitched together.

CRITICAL RULES:
1. Create EXACTLY ${idealChunks} chunks — no more, no less
2. Each chunk should be roughly ${targetWordsPerChunk} words (can vary by ±5 words for natural breaks)
3. NEVER split in the middle of a sentence — always break at sentence boundaries
4. Keep related thoughts together in the same chunk
5. Prefer FEWER, LARGER chunks over many small ones — this reduces visual discontinuity between video clips
6. Each chunk must make sense on its own as a standalone video scene
7. Return ONLY a JSON array of strings, no explanations

Script (${totalWords} words):
"${scriptContent}"

Return format:
["chunk 1 text", "chunk 2 text"]`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(
        "AI splitting failed, falling back to simple sentence-based splitting"
      );
      return simpleSplit(scriptContent, targetWordsPerChunk);
    }

    const chunks: string[] = JSON.parse(jsonMatch[0]);

    console.log(`[Script Splitter] ${totalWords} words → ${chunks.length} chunks (target: ${idealChunks})`);

    const mapped = chunks.map((text, index) => ({
      index,
      text: text.trim(),
      wordCount: text.trim().split(/\s+/).length,
    }));

    // Merge trailing tiny chunk to prevent glitched videos from too few words
    return mergeTrailingTinyChunk(mapped, buffer);
  } catch (error: any) {
    console.error("Script splitting error, using fallback:", error.message);
    return simpleSplit(scriptContent, targetWordsPerChunk, buffer);
  }
}

/**
 * Merge the last chunk into the previous one if it has ≤ buffer words.
 * Prevents tiny trailing chunks that produce glitched/repeated videos.
 */
function mergeTrailingTinyChunk(chunks: ScriptChunk[], buffer: number): ScriptChunk[] {
  if (chunks.length < 2) return chunks;
  const lastChunk = chunks[chunks.length - 1];
  if (lastChunk.wordCount <= buffer) {
    const prev = chunks[chunks.length - 2];
    const mergedText = `${prev.text} ${lastChunk.text}`;
    const merged = [
      ...chunks.slice(0, -2),
      {
        index: prev.index,
        text: mergedText,
        wordCount: prev.wordCount + lastChunk.wordCount,
      },
    ];
    console.log(
      `[Script Splitter] Merged trailing chunk (${lastChunk.wordCount} words) into previous chunk`
    );
    return merged;
  }
  return chunks;
}

function simpleSplit(
  scriptContent: string,
  targetWordsPerChunk: number,
  buffer: number = 5
): ScriptChunk[] {
  const sentences = scriptContent.match(/[^.!?]+[.!?]+/g) || [scriptContent];
  const chunks: ScriptChunk[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/);
    const sentenceWordCount = sentenceWords.length;

    if (
      currentWordCount > 0 &&
      currentWordCount + sentenceWordCount > targetWordsPerChunk + buffer
    ) {
      chunks.push({
        index: chunks.length,
        text: currentChunk.join(" ").trim(),
        wordCount: currentWordCount,
      });
      currentChunk = [sentence.trim()];
      currentWordCount = sentenceWordCount;
    } else {
      currentChunk.push(sentence.trim());
      currentWordCount += sentenceWordCount;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({
      index: chunks.length,
      text: currentChunk.join(" ").trim(),
      wordCount: currentWordCount,
    });
  }

  // Merge trailing tiny chunk
  return mergeTrailingTinyChunk(chunks, buffer);
}

export function calculateTotalChunks(
  scriptContent: string,
  targetWordsPerChunk: number = 25,
  buffer: number = 5
): number {
  const words = scriptContent.trim().split(/\s+/);
  if (words.length <= targetWordsPerChunk + buffer) return 1;
  let chunks = Math.max(2, Math.round(words.length / targetWordsPerChunk));
  // If the last chunk would have ≤ buffer words, merge it back
  const remainder = words.length - (chunks - 1) * targetWordsPerChunk;
  if (remainder > 0 && remainder <= buffer) {
    chunks = Math.max(1, chunks - 1);
  }
  return chunks;
}
