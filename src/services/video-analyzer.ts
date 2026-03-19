/**
 * Video Analyzer Service
 *
 * Uses Gemini 2.5 Flash as a forensic video analyst to produce an
 * extremely detailed factual breakdown of video content. The analysis
 * feeds into the hook prompt generator — Gemini reports ONLY facts
 * (product details, script, visual style, sensory moments) and
 * NEVER suggests hook ideas or creative directions.
 *
 * Added in v2: KEY SENSORY DETAILS section for identifying
 * visually satisfying moments that make the best hook material.
 */

import { GoogleGenAI } from "@google/genai";
import { getGeminiKey } from "../lib/keys";
import { resolveVideoUrl } from "./video-url-resolver";
import * as fs from "fs";
import * as path from "path";

const ANALYSIS_PROMPT = `You are a forensic video analyst working for a world-class ad creative team. Your analysis will be used by a creative director to write a hook video prompt. Report ONLY facts — do NOT suggest hook ideas, creative directions, or intro concepts. Your job is to be the creative director's EYES.

Analyze with extreme precision and detail:

1. **PRODUCT/SERVICE**: What exact product, service, or topic is discussed? Brand name if visible? Physical description: exact color, shape, size, texture, material, packaging type (jar, bottle, tube, box, pouch, etc.). If it's a supplement, what form — pills, capsules, gummies, powder? Describe it as if someone needs to recreate it from your words alone.

2. **CORE MESSAGE**: What is the single main claim, promise, or pitch? One sentence, verbatim if possible.

3. **SCRIPT/DIALOGUE**: Write out the FULL spoken script word-for-word. This is the MOST IMPORTANT section — be extremely accurate. Include filler words, pauses, and verbal tics. If the speaker mentions the product name, a specific benefit, a problem they had, or a before/after transformation, flag those moments with [KEY MOMENT] tags.

4. **PRODUCT APPEARANCES** (critical for hook creation):
   - List EVERY moment the product appears on screen with approximate timestamp
   - For each appearance: How is it held? What angle? Is it opened/closed? Is the speaker interacting with it?
   - What is the product's most VISUALLY DISTINCTIVE feature? (color, texture, label design, shape, size relative to hand)
   - If the product is NEVER shown on screen, state that explicitly
   - What would make this product instantly recognizable in a close-up shot?

5. **VISUAL STYLE**:
   - Lighting: type (natural daylight/ring light/overhead/studio/warm ambient), direction, color temperature (warm/neutral/cool), any visible light sources
   - Color palette: list the 3-5 dominant colors in RGB-descriptive terms (e.g., "warm honey gold", "muted sage green", "clinical white")
   - Camera: type (selfie/tripod/handheld/gimbal), shot framing (extreme close-up/close-up/medium/medium-wide/wide), any movement
   - Grade/mood: Is the footage warm-toned, cool-toned, desaturated, vivid, natural? Does it feel polished or raw?

6. **SPEAKER/SUBJECT**: Gender, approximate age range, skin tone, hair (color, style, length), clothing (exact colors, type, brand if visible — e.g., "sage green oversized cotton hoodie"), accessories, makeup level, overall vibe/aesthetic.

7. **SETTING**: Indoor/outdoor? Specific room type? Describe every visible object, surface material, wall color/texture, furniture, props. What is the overall environment aesthetic? (minimalist, cluttered, cozy, clinical, rustic, modern, etc.)

8. **EMOTIONAL TONE & ENERGY**: What feeling does the video convey? (casual, urgent, excited, educational, testimonial, confessional, enthusiastic, skeptical-turned-believer, etc.) What is the energy level? (high energy/calm/conversational/intense)

9. **FIRST 3 SECONDS**: Describe the exact visuals in the first 3 seconds, frame by frame. What is the very first thing the viewer sees? This is critical for understanding the current opening.

10. **ASPECT RATIO AND RESOLUTION**: Portrait (9:16), Landscape (16:9), or Square (1:1)? Estimated resolution quality?

11. **KEY SENSORY DETAILS**: List any moments in the video that are visually satisfying, tactile, or sensory-rich — things being poured, opened, squeezed, applied, mixed, shaken, or any other physically engaging action. These are goldmines for hook creation.

IMPORTANT: Your job is ONLY to describe what you see with forensic accuracy. Do NOT suggest hook ideas, intro concepts, or creative directions. Be the eyes, not the brain.`;

/**
 * Download a video from a URL to a temp file.
 */
async function downloadToTemp(videoUrl: string): Promise<string> {
  const tempPath = path.join("/tmp", `analyze_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);

  console.log(`[VideoAnalyzer] Downloaded video: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${tempPath}`);
  return tempPath;
}

/**
 * Analyze a video using Gemini 2.5 Flash via the @google/genai SDK.
 *
 * Downloads the video, uploads to Gemini Files API, waits for processing,
 * then sends to gemini-2.5-flash with an analysis prompt.
 */
export async function analyzeVideoForHook(videoUrl: string): Promise<string> {
  let tempPath: string | null = null;

  try {
    const geminiKey = await getGeminiKey();
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    // Resolve social media URLs to direct download links
    const resolvedUrl = await resolveVideoUrl(videoUrl);

    // Download video to temp file
    tempPath = await downloadToTemp(resolvedUrl);

    // Upload video to Gemini Files API
    console.log("[VideoAnalyzer] Uploading video to Gemini Files API...");
    const uploadResult = await ai.files.upload({
      file: tempPath,
      config: { mimeType: "video/mp4" },
    });

    if (!uploadResult.name) {
      throw new Error("Gemini file upload returned no file name");
    }

    console.log(`[VideoAnalyzer] File uploaded: ${uploadResult.name}, state: ${uploadResult.state}`);

    // Poll until file is ACTIVE (processed)
    let file = uploadResult;
    let pollAttempts = 0;
    const maxPollAttempts = 60; // 60 * 5s = 5 min max

    while (file.state === "PROCESSING" && pollAttempts < maxPollAttempts) {
      await new Promise((r) => setTimeout(r, 5000));
      pollAttempts++;
      file = await ai.files.get({ name: file.name! });
      console.log(`[VideoAnalyzer] Poll ${pollAttempts}: state=${file.state}`);
    }

    if (file.state !== "ACTIVE") {
      throw new Error(`Gemini file processing failed: state=${file.state}`);
    }

    // Analyze with Gemini 2.5 Flash
    console.log("[VideoAnalyzer] Sending to Gemini 2.5 Flash for analysis...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: file.uri!,
                mimeType: "video/mp4",
              },
            },
            { text: ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const analysis = response.text?.trim();

    if (!analysis) {
      throw new Error("Gemini returned empty analysis");
    }

    console.log(`[VideoAnalyzer] Analysis complete: ${analysis.length} chars`);

    // Clean up the uploaded file from Gemini
    try {
      await ai.files.delete({ name: file.name! });
    } catch {
      // Non-fatal: Gemini auto-deletes after 48h
    }

    return analysis;
  } catch (error: any) {
    console.error(`[VideoAnalyzer] Failed to analyze video: ${error.message}`);
    throw error;
  } finally {
    // Clean up temp file
    if (tempPath) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {
        // Non-fatal
      }
    }
  }
}
