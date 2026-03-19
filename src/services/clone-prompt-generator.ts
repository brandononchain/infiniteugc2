/**
 * Clone Prompt Generator Service
 *
 * Two-phase AI pipeline for video cloning:
 *
 * Phase 1 — BLUEPRINT EXTRACTION (Claude Sonnet 4):
 *   Takes the raw Gemini forensic analysis and distills it into a structured
 *   "Clone Blueprint" — a reusable creative DNA template that captures the
 *   exact style, pacing, camera work, energy, and structure of the source
 *   video, abstracted away from the specific content.
 *
 * Phase 2 — CLONE PROMPT GENERATION (GPT-5.2 + Quality Gate):
 *   Takes the Clone Blueprint + user's new content idea and generates a
 *   VEO3-optimized prompt that recreates the source video's DNA with the
 *   user's new topic. GPT-5.2 quality gate ensures the clone prompt is
 *   faithful to the original style while being fresh content.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getAnthropicKey, getOpenAIKey } from "../lib/keys";

export interface ClonePromptResult {
  blueprint: string;
  prompt: string;
  durationSeconds: number;
  rating: number;
  ratingFeedback: string;
  attempts: number;
}

const MAX_ATTEMPTS = 3;
const MIN_RATING = 8;

// ─────────────────────────────────────────────────────
// Phase 1: Claude Blueprint Extraction
// ─────────────────────────────────────────────────────

const BLUEPRINT_SYSTEM_PROMPT = `You are a master video reverse-engineer and creative director with 15 years of experience deconstructing viral videos. You take raw forensic video analyses and distill them into a reusable CLONE BLUEPRINT — a creative DNA template that captures every stylistic decision, stripped of specific content.

Your blueprint must be so precise that a video generator AI can recreate the EXACT SAME FEEL, ENERGY, and STYLE with completely different content.

OUTPUT FORMAT — You must produce a structured blueprint with ALL of the following sections:

═══ CLONE BLUEPRINT ═══

STRUCTURE:
- Total duration target: [Xs]
- Number of beats: [N]
- Beat map: [Beat 1: 0-Xs = purpose | Beat 2: Xs-Xs = purpose | ...]
- Narrative arc: [problem→solution / before→after / hook→build→payoff / etc.]
- Pacing rhythm: [describe the energy curve — e.g., "punchy open, steady middle, escalating close"]

CAMERA DNA:
- Primary shot type: [close-up / medium / wide / mixed]
- Camera perspective: [selfie / tripod / handheld / POV / mixed]
- Movement pattern: [static / slow pan / handheld wobble / tracking / zoom punches]
- Angle: [eye-level / slightly above / slightly below / dynamic]
- Aspect ratio: [9:16 / 16:9 / 1:1]

VISUAL STYLE:
- Color temperature: [warm / cool / neutral]
- Color grade: [natural / warm film / cool teal / desaturated / high contrast / vintage]
- Saturation: [vivid / natural / muted]
- Contrast: [high / medium / low]
- Dominant palette: [list 3-5 key colors]
- Production level: [raw phone-shot / semi-polished / fully produced]
- Texture: [clean / film grain / slightly noisy]

LIGHTING:
- Primary source: [natural window / ring light / overhead / studio / outdoor]
- Direction: [front / side / back-rim / top-down / mixed]
- Quality: [hard / soft / mixed]
- Time-of-day feel: [morning / midday / afternoon / evening / night-indoor]

PERFORMANCE STYLE:
- Delivery: [talking to camera / voiceover / demonstration / reaction / narration]
- Energy: [1-10 scale] — [descriptor]
- Speaking pace: [slow / conversational / rapid / varying]
- Tone: [casual / authoritative / excited / educational / funny / serious / vulnerable]
- Eye contact: [direct / intermittent / none]
- Body language: [still / gesturing / animated / demonstrating]

ENVIRONMENT:
- Setting type: [kitchen / bedroom / office / outdoor / studio / car / gym / etc.]
- Background style: [minimal / moderate / cluttered / decorated]
- Key environmental elements: [list props and set pieces that define the vibe]
- Space depth: [flat/close / medium / deep/open]

EDITING STYLE:
- Cut frequency: [cuts per 10 seconds estimate]
- Cut type: [hard cuts / jump cuts / smooth / crossfade / whip]
- B-roll: [none / light / heavy] — [type if present]
- Zoom edits: [none / subtle / aggressive punch-ins]
- Speed effects: [none / slow-mo / speed ramps]
- Visual rhythm: [synced to audio / independent / occasional sync]

AUDIO DNA:
- Voice style: [describe ideal voice characteristics for cloning this format]
- Music: [genre / tempo / energy / mood] or [none]
- Music-to-voice ratio: [music dominant / balanced / voice dominant / no music]
- Sound design: [minimal / moderate / heavy]

TEXT & OVERLAYS:
- Caption style: [none / subtitles / word-by-word highlight / kinetic typography]
- Text position: [top / center / bottom]
- Graphics: [none / minimal / branded]

THE SECRET SAUCE:
- What makes this video WORK: [2-3 sentences on the core creative strategy]
- Target audience: [demographic + psychographic]
- Platform native to: [TikTok / Instagram / YouTube Shorts / general]
- 3-word vibe: [three words that capture the entire feel]

═══ END BLUEPRINT ═══

RULES:
1. ABSTRACT away from specific content — the blueprint should work for ANY topic
2. Be extremely SPECIFIC in your descriptions — not "nice camera work" but "handheld slight wobble, medium close-up at chest level, occasional 1.5x punch-in zoom on key words"
3. Include EVERY section above — missing sections make the blueprint useless
4. The blueprint should read like a creative brief that any director could follow
5. Output ONLY the blueprint. No conversational filler before or after.`;

// ─────────────────────────────────────────────────────
// Phase 2: GPT-5.2 Clone Prompt Generation
// ─────────────────────────────────────────────────────

const CLONE_GENERATOR_SYSTEM_PROMPT = `You are the world's best AI video prompt engineer. You specialize in taking a "Clone Blueprint" (the creative DNA of a source video) and a user's new content idea, then fusing them into a single VEO3-optimized video generation prompt.

Your goal: The generated video should feel like it was made by the SAME CREATOR in the SAME STYLE as the source video — but with completely different content based on the user's prompt.

═══════════════════════════════════════════════════════
HOW TO CLONE A VIDEO'S DNA
═══════════════════════════════════════════════════════

1. STRUCTURE CLONING: Match the exact beat map, pacing rhythm, and narrative arc. If the source had 5 beats (hook→problem→solution→proof→CTA), your clone must have 5 beats with the same energy curve.

2. CAMERA CLONING: Match shot types, angles, and movements EXACTLY. If the source was handheld selfie with occasional zoom punches, your clone must specify the same.

3. VISUAL CLONING: Match color temperature, grading style, saturation, and contrast. If the source was warm, slightly desaturated with film grain, your clone must specify this.

4. LIGHTING CLONING: Match light source type, direction, and quality. Same time-of-day feel.

5. PERFORMANCE CLONING: Match energy level, speaking pace, tone, and delivery style. The "character" should FEEL the same even if it's about a different topic.

6. ENVIRONMENT CLONING: Match the TYPE of environment (if source was in a kitchen, clone should be in a similar casual home setting — unless the user's content requires otherwise).

7. EDITING CLONING: Match cut frequency, transition types, and zoom edit patterns.

═══════════════════════════════════════════════════════
VEO3 CAPABILITIES & LIMITS
═══════════════════════════════════════════════════════

VEO3 EXCELS AT:
• Single-person talking head videos with natural speech
• Casual environments with realistic detail
• Natural lighting and color
• Handheld camera feel
• Product interactions (hands, objects)
• Liquid/powder physics
• Emotional facial expressions and body language

VEO3 CANNOT DO:
• Readable text, brand names, or logos on screen
• Multiple camera angles/cuts within one generation (it produces ONE continuous shot)
• Complex multi-person scenes
• Fine motor skills (writing, typing)
• Exact brand product recreation

CRITICAL VEO3 CONSTRAINT: VEO3 generates ONE continuous shot. It CANNOT do cuts, transitions, or multiple camera angles. Your prompt must describe a single flowing scene. If the source video had multiple cuts, you must adapt the ENERGY and PACING into a single continuous shot that FEELS like it has the same rhythm.

═══════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════

DURATION: [number in seconds — match source video duration, cap at 8]
---
[Your VEO3 prompt — a single dense paragraph, 100-250 words]

PROMPT RULES:
1. Single flowing paragraph — NO section labels, NO bullet points, NO line breaks
2. Start with scene/environment setup and camera perspective
3. Then subject appearance, position, and what they're doing
4. Then lighting and color grading details
5. Then the action/performance/dialogue
6. Then pacing and energy details
7. End with negative constraints: "No text overlays, no captions, no watermarks, no abrupt cuts, no multiple camera angles"
8. EVERY detail from the Clone Blueprint must be represented
9. The user's content/topic must be naturally woven into the scene
10. 100-250 words. Dense. Every word visual or actionable.

ABSOLUTE BANS:
❌ Section labels (CAMERA:, LIGHTING:, etc.)
❌ Bullet points or lists
❌ Text/logos/brand names rendered on screen
❌ Multiple cuts or camera angles
❌ Markdown formatting
❌ Meta-commentary about the prompt`;

const CLONE_RATER_SYSTEM_PROMPT = `You are a senior creative director who specializes in video cloning quality assurance. You rate AI-generated clone prompts on how faithfully they reproduce a source video's style DNA while incorporating new content.

You will receive:
1. The Clone Blueprint (DNA of the source video)
2. The user's content idea
3. The generated VEO3 clone prompt
4. The target duration

Rate on these 6 criteria (each out of 10, then average):

1. **STYLE FIDELITY** — Does the clone prompt match the source video's camera work, color grading, lighting, and visual style?
   - 10: Indistinguishable style DNA — someone would think the same creator made it
   - 7-9: Strong match with minor style deviations
   - 4-6: Loosely similar but noticeably different
   - 1-3: Completely different style

2. **STRUCTURE FIDELITY** — Does the clone follow the same pacing, beat map, and narrative arc?
   - 10: Same rhythm, energy curve, and structural beats
   - 7-9: Similar structure with minor pacing differences
   - 4-6: Different structure but similar energy
   - 1-3: Completely different structure

3. **CONTENT INTEGRATION** — Is the user's new content naturally woven into the cloned style?
   - 10: Content feels native to the style — seamless fusion
   - 7-9: Content works well within the style
   - 4-6: Content feels forced or awkward in this style
   - 1-3: Content and style are fighting each other

4. **VEO3 FEASIBILITY** — Can VEO3 actually generate this well?
   - 10: Perfectly within VEO3's strengths
   - 7-9: Mostly feasible
   - 4-6: Risky elements
   - 1-3: Impossible for VEO3

5. **PROMPT QUALITY** — Is the prompt well-written, dense, and specific?
   - 10: Every word is visual, specific, and necessary
   - 7-9: Strong prompt with minor improvements possible
   - 4-6: Vague or padded with filler
   - 1-3: Poorly written, generic, or confusing

6. **OVERALL IMPACT** — Would this video be engaging and effective?
   - 10: Would stop the scroll and hold attention
   - 7-9: Strong content that most viewers would watch
   - 4-6: Average, forgettable
   - 1-3: Boring or off-putting

RESPOND IN EXACTLY THIS FORMAT:

SCORE: [final average, one decimal]
STYLE: [1-10]
STRUCTURE: [1-10]
CONTENT: [1-10]
FEASIBILITY: [1-10]
PROMPT_QUALITY: [1-10]
IMPACT: [1-10]
---
[2-3 sentences of specific, actionable feedback. If score < 8, explain exactly what needs to change. If >= 8, note what makes it strong.]`;

// ─────────────────────────────────────────────────────
// Parsing Utilities
// ─────────────────────────────────────────────────────

interface ParsedCloneGeneration {
  prompt: string;
  durationSeconds: number;
}

interface ParsedCloneRating {
  score: number;
  feedback: string;
}

function parseCloneGeneratorResponse(raw: string): ParsedCloneGeneration {
  // Extract DURATION: N
  const durationMatch = raw.match(/^DURATION:\s*(\d+)/im);
  let durationSeconds = 8; // default

  if (durationMatch) {
    const parsed = parseInt(durationMatch[1], 10);
    if (parsed >= 4 && parsed <= 8) {
      durationSeconds = parsed;
    }
  }

  // Extract prompt (everything after ---)
  let prompt = raw;
  const separatorIndex = raw.indexOf("---");
  if (separatorIndex !== -1) {
    prompt = raw.substring(separatorIndex + 3).trim();
  } else if (durationMatch) {
    prompt = raw.replace(/^DURATION:\s*\d+\s*/im, "").trim();
  }

  // Clean up markdown/quotes
  prompt = prompt
    .replace(/^```[\s\S]*?```$/gm, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  return { prompt, durationSeconds };
}

function parseCloneRaterResponse(raw: string): ParsedCloneRating {
  const scoreMatch = raw.match(/^SCORE:\s*([\d.]+)/im);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;

  let feedback = "";
  const separatorIndex = raw.indexOf("---");
  if (separatorIndex !== -1) {
    feedback = raw.substring(separatorIndex + 3).trim();
  }

  return {
    score: Math.min(10, Math.max(0, score)),
    feedback,
  };
}

// ─────────────────────────────────────────────────────
// Phase 1: Extract Blueprint with Claude
// ─────────────────────────────────────────────────────

async function extractBlueprint(videoAnalysis: string): Promise<string> {
  const anthropicKey = await getAnthropicKey();
  const client = new Anthropic({ apiKey: anthropicKey });

  console.log("[ClonePromptGen] Extracting clone blueprint with Claude Sonnet 4...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the raw forensic video analysis. Extract the Clone Blueprint:\n\n${videoAnalysis}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude blueprint response");
  }

  const blueprint = textBlock.text.trim();
  console.log(`[ClonePromptGen] Blueprint extracted: ${blueprint.length} chars`);

  return blueprint;
}

// ─────────────────────────────────────────────────────
// Phase 2: Generate Clone Prompt with GPT-5.2
// ─────────────────────────────────────────────────────

async function callCloneGenerator(
  openai: OpenAI,
  blueprint: string,
  userPrompt: string,
  previousAttempt?: { prompt: string; duration: number; feedback: string }
): Promise<ParsedCloneGeneration> {
  let userContent = `═══ CLONE BLUEPRINT (Source Video DNA) ═══
${blueprint}

═══ USER'S NEW CONTENT IDEA ═══
${userPrompt}

═══ YOUR TASK ═══
Generate a VEO3 video prompt that CLONES the style, energy, and structure from the blueprint above — but uses the user's new content idea as the topic.

The result should feel like the SAME CREATOR made it in the SAME STYLE — just about a different topic.

CRITICAL REQUIREMENTS:
1. Match the CAMERA DNA exactly (shot type, angle, movement, perspective)
2. Match the VISUAL STYLE exactly (color temperature, grading, saturation)
3. Match the LIGHTING exactly (source type, direction, quality)
4. Match the PACING and ENERGY exactly (beat structure, rhythm)
5. Match the PERFORMANCE STYLE (delivery, tone, energy level)
6. Weave the user's content NATURALLY into this style
7. Stay within VEO3's capabilities (one continuous shot, no text on screen)
8. 100-250 words, single dense paragraph`;

  if (previousAttempt) {
    userContent += `

═══ PREVIOUS ATTEMPT (rejected by quality reviewer) ═══

Your previous prompt (${previousAttempt.duration}s):
"${previousAttempt.prompt}"

REVIEWER FEEDBACK:
${previousAttempt.feedback}

Write a COMPLETELY NEW prompt that addresses ALL the feedback. The reviewer is extremely experienced. You need 8+/10 to pass.`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: CLONE_GENERATOR_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: previousAttempt ? 0.92 : 0.85,
    max_completion_tokens: 600,
  });

  const rawContent = response.choices[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("GPT-5.2 returned empty clone prompt");
  }

  return parseCloneGeneratorResponse(rawContent);
}

async function callCloneRater(
  openai: OpenAI,
  blueprint: string,
  userPrompt: string,
  clonePrompt: string,
  durationSeconds: number
): Promise<ParsedCloneRating> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: CLONE_RATER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `═══ CLONE BLUEPRINT (Source Video DNA) ═══
${blueprint}

═══ USER'S CONTENT IDEA ═══
${userPrompt}

═══ CLONE PROMPT (${durationSeconds} seconds) ═══
${clonePrompt}

Rate this clone prompt strictly. A bad clone wastes expensive VEO3 credits and disappoints the user.`,
      },
    ],
    temperature: 0.3,
    max_completion_tokens: 300,
  });

  const rawContent = response.choices[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("GPT-5.2 clone rater returned empty response");
  }

  return parseCloneRaterResponse(rawContent);
}

// ─────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────

/**
 * Generate a clone prompt from a video analysis + user's content idea.
 *
 * Full pipeline:
 * 1. Claude Sonnet 4 extracts a Clone Blueprint from the forensic analysis
 * 2. GPT-5.2 generates a VEO3 clone prompt fusing the blueprint + user content
 * 3. GPT-5.2 quality gate rates the clone prompt (6 criteria)
 * 4. If rating < 8, re-generates with feedback (up to 3 attempts)
 * 5. Returns the best result
 */
export async function generateClonePrompt(
  videoAnalysis: string,
  userPrompt: string
): Promise<ClonePromptResult> {
  // Phase 1: Extract blueprint with Claude
  const blueprint = await extractBlueprint(videoAnalysis);

  // Phase 2: Generate + rate clone prompt with GPT-5.2
  const openaiKey = await getOpenAIKey();
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log("[ClonePromptGen] Starting clone prompt generation with quality gate...");

  let bestResult: ClonePromptResult | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[ClonePromptGen] Attempt ${attempt}/${MAX_ATTEMPTS}...`);

    // Generate
    const previousAttempt = bestResult
      ? {
          prompt: bestResult.prompt,
          duration: bestResult.durationSeconds,
          feedback: bestResult.ratingFeedback,
        }
      : undefined;

    const generation = await callCloneGenerator(openai, blueprint, userPrompt, previousAttempt);

    if (!generation.prompt) {
      console.warn(`[ClonePromptGen] Attempt ${attempt}: Empty prompt, retrying...`);
      continue;
    }

    console.log(`[ClonePromptGen] Attempt ${attempt}: Generated ${generation.prompt.length} chars, ${generation.durationSeconds}s`);

    // Rate
    const rating = await callCloneRater(openai, blueprint, userPrompt, generation.prompt, generation.durationSeconds);

    console.log(`[ClonePromptGen] Attempt ${attempt}: Score ${rating.score}/10`);
    console.log(`[ClonePromptGen] Feedback: "${rating.feedback}"`);

    const currentResult: ClonePromptResult = {
      blueprint,
      prompt: generation.prompt,
      durationSeconds: generation.durationSeconds,
      rating: rating.score,
      ratingFeedback: rating.feedback,
      attempts: attempt,
    };

    // Track best result
    if (!bestResult || rating.score > bestResult.rating) {
      bestResult = currentResult;
    }

    // Pass quality gate?
    if (rating.score >= MIN_RATING) {
      console.log(`[ClonePromptGen] Passed quality gate on attempt ${attempt} with ${rating.score}/10`);
      return currentResult;
    }

    console.log(`[ClonePromptGen] Below ${MIN_RATING}/10 threshold (got ${rating.score}), ${attempt < MAX_ATTEMPTS ? "re-iterating..." : "using best result"}`);
  }

  console.log(`[ClonePromptGen] Max attempts reached. Using best result: ${bestResult!.rating}/10 from attempt ${bestResult!.attempts}`);
  return bestResult!;
}
