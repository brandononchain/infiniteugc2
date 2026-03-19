/**
 * Clone Analyzer Service
 *
 * Uses Gemini 2.5 Flash as an ultra-forensic video deconstruction engine.
 * Unlike the hook analyzer (which focuses on product/script for hook creation),
 * the clone analyzer extracts the COMPLETE DNA of a video — every visual,
 * structural, pacing, and stylistic decision — so a clone prompt generator
 * can recreate the same "feel" with entirely new content.
 *
 * This is the most detailed video analysis prompt in the system.
 */

import { GoogleGenAI } from "@google/genai";
import { getGeminiKey } from "../lib/keys";
import { resolveVideoUrl } from "./video-url-resolver";
import * as fs from "fs";
import * as path from "path";

const CLONE_ANALYSIS_PROMPT = `You are the world's most meticulous video reverse-engineer. Your job is to deconstruct a video into its absolute DNA — every creative decision, every visual choice, every pacing beat — so that another AI can recreate the EXACT SAME STYLE with completely different content.

You are NOT summarizing the video. You are creating a forensic BLUEPRINT that another creator could follow frame-by-frame to produce a video with the same energy, style, and impact — but about a totally different topic.

Analyze with OBSESSIVE precision:

═══════════════════════════════════════════════════════
1. VIDEO STRUCTURE & PACING BLUEPRINT
═══════════════════════════════════════════════════════

Break down the video into EXACT segments with timestamps:
- How many distinct "scenes" or "beats" are there?
- What happens in each beat? (e.g., "0:00-0:03 = hook/attention grab, 0:03-0:08 = problem statement, 0:08-0:15 = solution reveal...")
- What is the PACING RHYTHM? (fast cuts? slow builds? constant energy? escalating? punchy?)
- Are there any pauses, breaths, or deliberate silences?
- What is the TOTAL duration?
- What is the average shot/beat duration?
- Is there a narrative arc? (problem→solution, before→after, story→reveal, list format, etc.)

═══════════════════════════════════════════════════════
2. CAMERA & CINEMATOGRAPHY DNA
═══════════════════════════════════════════════════════

For EACH distinct shot/segment:
- Camera type: selfie/front-facing, rear camera, screen recording, drone, gimbal, tripod, handheld?
- Shot type: extreme close-up, close-up, medium close-up, medium, medium-wide, wide, extreme wide?
- Camera angle: eye-level, low angle (looking up), high angle (looking down), dutch angle, bird's eye, POV?
- Camera movement: static, pan left/right, tilt up/down, dolly in/out, tracking, handheld shake, zoom in/out?
- Movement speed: slow, medium, fast, whip pan?
- Depth of field: shallow (blurred background), deep (everything sharp), rack focus?
- Aspect ratio: 9:16 (portrait/vertical), 16:9 (landscape), 1:1 (square), 4:5?

═══════════════════════════════════════════════════════
3. VISUAL STYLE & COLOR GRADING
═══════════════════════════════════════════════════════

- Overall color temperature: warm, cool, neutral?
- Color grading style: natural/ungraded, warm film grain, cool teal-orange, desaturated, high contrast, vintage, moody?
- Saturation level: vivid, natural, muted, desaturated?
- Contrast level: high, medium, low, flat?
- Dominant color palette: list the 5-7 most prominent colors with descriptive names (e.g., "dusty rose", "charcoal grey", "warm honey")
- Any color SHIFTS throughout the video? (e.g., cool opening → warm middle)
- Film grain or texture overlays?
- Any filters or visual effects? (blur, vignette, lens flare, light leaks)

═══════════════════════════════════════════════════════
4. LIGHTING FORENSICS
═══════════════════════════════════════════════════════

- Primary light source: natural window light, ring light, overhead room light, studio softbox, outdoor sun, neon/colored, screen glow?
- Light direction: front, side (left/right), back/rim, top-down, bottom-up?
- Light quality: hard (sharp shadows), soft (diffused), mixed?
- Shadow intensity: harsh, soft, minimal, dramatic?
- Time of day feeling: morning golden hour, midday harsh, afternoon warm, evening blue hour, night/indoor?
- Any practical lights visible? (lamps, screens, candles, LEDs)
- Does lighting change throughout the video?

═══════════════════════════════════════════════════════
5. SUBJECT & PERFORMANCE DETAILS
═══════════════════════════════════════════════════════

- Is there a human subject? How many people?
- Framing of subject: centered, rule of thirds, off-center?
- Subject's position relative to camera: distance, angle?
- Performance style: talking to camera, voiceover with b-roll, demonstrating, reacting, storytelling?
- Energy level: calm, conversational, excited, urgent, educational, comedic, dramatic?
- Facial expressions: neutral, smiling, serious, expressive, animated?
- Body language: still, gesturing, moving, demonstrating?
- Eye contact: direct to camera, looking away, alternating?
- Speaking pace: slow and deliberate, conversational, rapid-fire, varying?

═══════════════════════════════════════════════════════
6. ENVIRONMENT & SET DESIGN
═══════════════════════════════════════════════════════

- Location type: home (kitchen/bedroom/bathroom/living room), office, studio, outdoor, car, gym, store, restaurant?
- Background complexity: clean/minimal, moderately decorated, busy/cluttered?
- Key background elements: list every visible prop, furniture piece, decoration
- Surface materials: wood, marble, concrete, carpet, tile?
- Wall treatment: painted (color), wallpaper, brick, plain?
- Depth of space: flat/close wall behind, medium room depth, deep/open space?
- Any set dressing that feels intentional vs. authentic?

═══════════════════════════════════════════════════════
7. TEXT, GRAPHICS & OVERLAYS
═══════════════════════════════════════════════════════

- Are there text overlays/captions? What style? (font, size, color, position, animation)
- Caption style: word-by-word highlight, full sentences, subtitles, kinetic typography?
- Any graphics, logos, or branded elements?
- Lower thirds, name tags, or labels?
- Emojis or stickers?
- Where are overlays positioned? (top, center, bottom, custom)

═══════════════════════════════════════════════════════
8. AUDIO LANDSCAPE
═══════════════════════════════════════════════════════

- Primary audio: voiceover, direct speech to camera, no dialogue, music only?
- Voice characteristics: gender, age range, tone (warm, authoritative, casual, excited), accent?
- Speaking style: scripted, natural/unscripted, teleprompter?
- Background music: genre, tempo (BPM estimate), energy, mood?
- Music volume relative to voice: loud, subtle, equal?
- Sound effects: whooshes, pops, dings, transitions sounds?
- Ambient sounds: room tone, outdoor noise, keyboard clicks?
- Audio quality: professional mic, phone mic, slightly echo-y, clean?

═══════════════════════════════════════════════════════
9. EDITING & TRANSITIONS
═══════════════════════════════════════════════════════

- Cut style: hard cuts, jump cuts, smooth transitions, crossfades, whip transitions?
- Cut frequency: how many cuts per 10 seconds?
- B-roll usage: none, occasional, heavy? What type of b-roll?
- Zoom edits: punch-in zooms on key words? How aggressive?
- Speed ramping: any slow-motion or speed-up moments?
- Split screen or picture-in-picture?
- Any visual rhythm synced to audio/music beats?

═══════════════════════════════════════════════════════
10. CONTENT STRATEGY & FORMAT
═══════════════════════════════════════════════════════

- Content format: talking head, tutorial, demo, testimonial, story time, reaction, list/tips, before-after, unboxing, review, day-in-life, get-ready-with-me?
- Hook strategy: what technique grabs attention in the first 2 seconds?
- Call-to-action: explicit, subtle, none?
- Information density: packed with info, moderate, light/entertainment-focused?
- Engagement triggers: questions, controversy, relatability, humor, shock, FOMO?
- Platform optimization: feels native to TikTok, Instagram, YouTube Shorts, or general?

═══════════════════════════════════════════════════════
11. FULL SCRIPT/DIALOGUE TRANSCRIPTION
═══════════════════════════════════════════════════════

Write out the COMPLETE spoken script word-for-word including:
- Filler words (um, uh, like, you know)
- Pauses [PAUSE]
- Emphasis [EMPHASIS on specific words]
- Tone shifts [TONE: excited → serious]
- Any on-screen text that appears

═══════════════════════════════════════════════════════
12. THE "FEEL" — INTANGIBLE QUALITIES
═══════════════════════════════════════════════════════

- What FEELING does this video create? (trustworthy, exciting, relatable, aspirational, educational, urgent, calming?)
- What makes this video WORK? What's the secret sauce?
- Who is the target audience? (demographics, psychographics)
- What platform "language" is it speaking? (TikTok native, Instagram polished, YouTube educational?)
- If you had to describe this video's vibe in 3 words, what would they be?
- Production quality level: raw/phone-shot UGC, semi-polished, fully produced, professional?

═══════════════════════════════════════════════════════

OUTPUT EVERYTHING. Leave nothing out. Your analysis should be so detailed that someone could recreate this video's exact style, energy, and structure with completely different content.

Write in clear, structured sections using the exact headers above. Be SPECIFIC — not "nice lighting" but "warm 3200K side-lit from camera-left window, soft shadows on right side of face, slight golden tint suggesting late afternoon."`;

/**
 * Download a video from a URL to a temp file.
 */
async function downloadToTemp(videoUrl: string): Promise<string> {
  const tempPath = path.join("/tmp", `clone_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempPath, buffer);

  console.log(`[CloneAnalyzer] Downloaded video: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${tempPath}`);
  return tempPath;
}

/**
 * Perform an ultra-deep forensic analysis of a video for cloning purposes.
 *
 * Downloads the video, uploads to Gemini Files API, waits for processing,
 * then sends to Gemini 2.5 Flash with the clone analysis prompt.
 *
 * Returns the most detailed video analysis possible — the clone blueprint.
 */
export async function analyzeVideoForCloning(videoUrl: string): Promise<string> {
  let tempPath: string | null = null;

  try {
    const geminiKey = await getGeminiKey();
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    // Resolve social media URLs to direct download links
    const resolvedUrl = await resolveVideoUrl(videoUrl);

    // Download video to temp file
    tempPath = await downloadToTemp(resolvedUrl);

    // Upload video to Gemini Files API
    console.log("[CloneAnalyzer] Uploading video to Gemini Files API...");
    const uploadResult = await ai.files.upload({
      file: tempPath,
      config: { mimeType: "video/mp4" },
    });

    if (!uploadResult.name) {
      throw new Error("Gemini file upload returned no file name");
    }

    console.log(`[CloneAnalyzer] File uploaded: ${uploadResult.name}, state: ${uploadResult.state}`);

    // Poll until file is ACTIVE (processed)
    let file = uploadResult;
    let pollAttempts = 0;
    const maxPollAttempts = 60; // 60 * 5s = 5 min max

    while (file.state === "PROCESSING" && pollAttempts < maxPollAttempts) {
      await new Promise((r) => setTimeout(r, 5000));
      pollAttempts++;
      file = await ai.files.get({ name: file.name! });
      console.log(`[CloneAnalyzer] Poll ${pollAttempts}: state=${file.state}`);
    }

    if (file.state !== "ACTIVE") {
      throw new Error(`Gemini file processing failed: state=${file.state}`);
    }

    // Analyze with Gemini 2.5 Flash
    console.log("[CloneAnalyzer] Sending to Gemini 2.5 Flash for deep clone analysis...");
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
            { text: CLONE_ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const analysis = response.text?.trim();

    if (!analysis) {
      throw new Error("Gemini returned empty analysis");
    }

    console.log(`[CloneAnalyzer] Clone analysis complete: ${analysis.length} chars`);

    // Clean up the uploaded file from Gemini
    try {
      await ai.files.delete({ name: file.name! });
    } catch {
      // Non-fatal: Gemini auto-deletes after 48h
    }

    return analysis;
  } catch (error: any) {
    console.error(`[CloneAnalyzer] Failed to analyze video: ${error.message}`);
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
