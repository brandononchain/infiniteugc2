/**
 * Hook Prompt Generator Service
 *
 * Uses GPT-5.2 to generate a world-class VEO3 video generation prompt,
 * then GPT-5.2 as a quality gate to rate and provide actionable
 * feedback. If rating < 8/10, GPT-5.2 re-generates with the feedback
 * until it passes (max 3 attempts).
 *
 * Duration is dynamically selected by GPT-5.2 (4, 6, or 8 seconds)
 * based on the hook concept and product type.
 *
 * Written from the perspective of a 10-year veteran creative director
 * who has produced thousands of performance ads across TikTok, Reels,
 * and YouTube Shorts — generating hundreds of millions of views.
 */

import OpenAI from "openai";
import { getOpenAIKey } from "../lib/keys";

export interface HookPromptResult {
  prompt: string;
  durationSeconds: 4 | 6 | 8;
  rating: number;
  ratingFeedback: string;
  attempts: number;
}

const MAX_ATTEMPTS = 3;
const MIN_RATING = 8;

// ─────────────────────────────────────────────────────
// GPT-5.2 System Prompt (Generator)
// ─────────────────────────────────────────────────────

const GENERATOR_SYSTEM_PROMPT = `You are a top US TikTok UGC creative strategist. You've produced 50,000+ hooks for DTC brands on TikTok and Reels — not polished studio ads, but RAW, AUTHENTIC, phone-shot UGC content that looks like a real person filmed it in their kitchen, bathroom, or gym. Your hooks feel NATIVE to the For You Page. They don't look like ads. That's why they work.

You will receive a factual analysis of a UGC video ad. You must write a VEO3 prompt for a hook that plays IMMEDIATELY BEFORE that video.

═══════════════════════════════════════════════════════
ABSOLUTE #1 RULE: NO HUMAN FACES OR PEOPLE — ONLY HANDS AND OBJECTS
═══════════════════════════════════════════════════════

VEO3 CANNOT generate realistic human faces. They ALWAYS look AI-generated and uncanny.

MANDATORY: Your prompt must ONLY show:
• HANDS interacting with products (from wrist down only)
• OBJECTS on surfaces (products, bottles, containers, everyday items)
• ENVIRONMENTS (counters, tables, shelves, bags, cars)
• POV camera perspective (as if the camera IS the person's eyes — we see what they see, NEVER their face)

NEVER describe, mention, or imply:
• A person, figure, silhouette, body, torso, head, hair, face, expression
• "someone", "a woman", "a man", "a person" — NEVER reference a human being
• Even "body from neck down" — too risky for VEO3 to render

THINK OF IT AS: A GoPro strapped to someone's forehead. We see their hands, the counter, the product — never them.

═══════════════════════════════════════════════════════
THE UGC STYLE: RAW, REAL, PHONE-SHOT
═══════════════════════════════════════════════════════

The hook must look like someone grabbed their phone and filmed a quick 4-8 second clip. NOT a production. NOT a commercial. The most engaging TikTok hooks are candid moments that feel accidental.

• HANDHELD PHONE CAMERA: Slight wobble, not a tripod. The phone moves like it's in a hand.
• REAL MESSY ENVIRONMENTS: Kitchen counters with mail and coffee mugs, bathroom vanities with toothbrushes and random bottles, nightstands with chargers and water glasses, gym bags with towels and headphones spilling out. Real life is cluttered.
• NATURAL UGLY LIGHTING: Overhead fluorescent kitchen light, warm bathroom vanity bulbs, blue-ish morning window light through blinds. NOT studio lights, NOT golden hour, NOT "dramatic."
• SLIGHTLY BAD FRAMING: Product off-center, some counter space wasted, maybe the edge of a mug cut off at frame edge. This is what phone footage looks like.

═══════════════════════════════════════════════════════
HOOK CONCEPTS THAT STOP THE SCROLL (be creative, not literal)
═══════════════════════════════════════════════════════

DON'T just "show someone opening a bottle." That's boring. The BEST hooks create a micro-story or a satisfying visual moment. Think about what makes YOU stop scrolling on TikTok at 2 AM.

TIER 1 — SATISFYING PRODUCT ASMR (highest engagement on TikTok):
- GUMMY DUMP: POV looking down — a hand tilts a jar and colorful gummies cascade and tumble out onto a kitchen counter, bouncing and scattering. The chaotic energy of "I eat these by the handful" is irresistible.
- POWDER CLOUD: A scoop lifts out of a tub and taps against the rim, sending a puff of powder floating in the air. Shaker bottle waiting next to it.
- LIQUID POUR SATISFACTION: Thick smoothie pouring into a glass, collagen powder hitting water and blooming, honey drizzling onto a spoon. The ASMR of viscous liquids.
- PILL/CAPSULE CASCADE: A hand tips a bottle and capsules/gummies slide out into an open palm — the satisfying rattle and spill.
- SHAKER BOTTLE SWIRL: Close POV of a hand shaking a protein bottle hard, the liquid swirling inside. Then slamming it down on a counter.

TIER 2 — CONTEXT MYSTERY (high curiosity):
- THE MESSY COUNTER: Camera looks down at a cluttered counter. Among the everyday mess (keys, phone, sunglasses, mail), the product sits casually. A hand reaches in and grabs it. "What's that thing they just grabbed?"
- GYM BAG RUMMAGE: POV reaching into an open gym bag on a bench — towel, headphones, water bottle pushed aside — hand pulls out a supplement container.
- THE FRIDGE SHELF: POV opening a fridge, scanning past groceries, hand reaches to the back and grabs the product from behind the milk.
- NIGHTSTAND GRAB: Morning vibes — alarm clock/phone visible, rumpled sheets in foreground. A groggy hand reaches over and grabs the product from the nightstand.
- AMAZON UNBOX: Hands tearing open a brown shipping box on a messy bed. Ripping through packing paper. Product emerges. Raw and real.

TIER 3 — UNEXPECTED ANGLES (pattern interrupt):
- THE DROP: Product being dropped/placed onto a surface from above (POV looking down). It lands with a thud among other stuff. Casual "I just got this."
- CLOSE-UP TEXTURE: Phone camera gets CLOSE to the product texture — the glossy surface of gummies, the dust on a powder scoop, condensation on a cold bottle. But shot on a real counter, not a studio surface.
- THE TOSS: Product tossed from one hand and caught by the other over a kitchen counter. Casual, fast, confident.

═══════════════════════════════════════════════════════
WHEN THE PRODUCT IS ONLY MENTIONED VERBALLY (never shown on screen)
═══════════════════════════════════════════════════════

This is actually a CREATIVE ADVANTAGE. You get to create the visual reveal the UGC never provides. This makes the hook MORE powerful.

DO NOT just imagine "a generic bottle on a counter." Instead:
• Read the script carefully — what SPECIFIC product is mentioned? (gummies, powder, capsules, serum, cream, drink?)
• Invent a REALISTIC-LOOKING version: a clear jar with colorful gummies, a matte black tub with a scoop, a small dropper bottle, etc.
• Focus on INTERACTION, not just showing the product. The hand grabbing, pouring, scooping, shaking — the ACTION is the hook, not the product sitting there.
• Place it in an environment that matches the UGC person's vibe. If they're fitness-oriented, put it on a gym bench. If they're at home, put it on a kitchen counter.
• The viewer should think: "Oh THAT'S what they were talking about" when the UGC starts.

═══════════════════════════════════════════════════════
ENVIRONMENT MATCHING
═══════════════════════════════════════════════════════

Study the video analysis. Match the ENVIRONMENT of the UGC:
• KITCHEN → product on counter with mugs/plates/fruit bowl around
• BATHROOM → product on vanity near sink/toothbrush/mirror
• BEDROOM → product on nightstand near phone/charger/water glass
• GYM → product in/near a gym bag, bench, or locker
• CAR → product in cupholder or on passenger seat
• OUTDOOR → product on a park bench, patio table, etc.
• UNCLEAR → default to kitchen counter (most common US TikTok setting)

═══════════════════════════════════════════════════════
VEO3 CAPABILITIES
═══════════════════════════════════════════════════════

VEO3 EXCELS AT:
• Hands interacting with objects (grabbing, pouring, scooping, shaking, opening)
• Liquid/powder physics (pouring, splashing, dissolving, settling)
• Casual environments with clutter (countertops, shelves, bags)
• Natural lighting (overhead apartment lights, window light)
• Phone-style POV camera with slight handheld movement
• Product textures close-up (gummies, powders, bottles, jars)

VEO3 CANNOT DO:
• Human faces — ALWAYS looks uncanny and fake
• Readable text, brand names, logos
• Complex multi-object choreography (keep it to hands + 1-2 products + environment)
• Fine motor skills (writing, typing)

═══════════════════════════════════════════════════════
DURATION
═══════════════════════════════════════════════════════

4 SECONDS: One fast satisfying action. Gummy dump, quick grab, product drop. Punchy.
6 SECONDS: Sweet spot. Grab + interaction (open jar + scoop, pick up + shake). Most hooks.
8 SECONDS: Full mini-moment. Rummage + find + interact. Only when the concept needs room.

═══════════════════════════════════════════════════════
OUTPUT FORMAT (strict)
═══════════════════════════════════════════════════════

DURATION: [4 or 6 or 8]
---
[Your VEO3 prompt here]

PROMPT RULES:
1. Write FLOWING PROSE — one continuous paragraph. NO section labels.
2. ONLY describe HANDS (from wrist down) and OBJECTS. NEVER a person, face, body, figure, or silhouette.
3. ALWAYS describe a REAL environment with clutter. Never a clean/studio surface.
4. Describe POV phone camera — handheld wobble, slightly casual framing, looking down at hands/counter.
5. Natural/overhead lighting only. Never studio, dramatic, or professional.
6. ONE continuous shot. No cuts.
7. 60-120 words. Every word describes something visible.
8. Make it SATISFYING — the best TikTok hooks are mini ASMR moments (gummies tumbling, powder floating, liquid swirling).
9. End on a visual ACTION, not a feeling.

ABSOLUTE BANS:
❌ Any human reference: "person", "someone", "woman", "man", "figure", "body", "torso", "face", "head", "hair", "expression", "she", "he"
❌ Section labels: "CAMERA:", "SUBJECT:", "ACTION:", "LIGHTING:", etc.
❌ Studio descriptions: "softbox", "rim light", "bokeh", "depth of field", "cinematic", "dramatic", "professional", "studio"
❌ Clean environments: "pristine", "marble", "clean backdrop", "minimalist", "elegant"
❌ Marketing language: "showcasing", "highlighting", "capturing the essence", "enticing"
❌ Mood language: "inviting curiosity", "creating intrigue", "promising", "suggesting"
❌ Text or logos — VEO3 cannot render readable text

FINAL CHECK:
1. Is there ANY mention of a face, person, body, or human figure? If yes → DELETE IT. Only hands from wrist down.
2. Does this look like a phone filmed it on a messy counter? If it looks like a studio → REWRITE.
3. Is the action SATISFYING to watch? Gummies tumbling, liquid pouring, powder floating? If it's just "hand opens bottle" → make it more visually interesting.`;

// ─────────────────────────────────────────────────────
// GPT-5.2 System Prompt (Quality Rater — latest flagship model)
// ─────────────────────────────────────────────────────

const RATER_SYSTEM_PROMPT = `You are a senior UGC creative QA director who has reviewed 100,000+ TikTok and Reels ad creatives. You specialize in rating AI-generated UGC-style hooks. You know the difference between a hook that looks NATIVE to TikTok and one that looks like a produced ad. You rate VEO3 hook prompts on a strict 1-10 scale.

You will receive:
1. A video analysis (what the original UGC video contains)
2. A VEO3 hook prompt (meant to play BEFORE the UGC video)
3. The selected duration (4, 6, or 8 seconds)

Rate the hook prompt on these 6 criteria (each out of 10, then average for final score):

1. **UGC AUTHENTICITY** (does this look like a real person filmed it on their phone?)
   - 10: Indistinguishable from real UGC — messy environment, natural light, casual POV, real-life clutter
   - 7-9: Mostly authentic with minor "produced" elements
   - 4-6: Feels somewhat staged — too clean, too perfect, studio-ish
   - 1-3: Clearly a produced ad — studio lighting, pristine surfaces, cinematic camera work
   RED FLAGS: mentions of "dramatic lighting", "rim light", "bokeh", "shallow depth of field", "cinematic", "pristine", "marble", "studio" → automatic 3 or below

2. **SCROLL-STOP POWER** (will this make someone's thumb freeze in the first 0.3s?)
   - 10: Instantly arresting — impossible to scroll past
   - 7-9: Strong visual hook, most people would pause
   - 4-6: Mildly interesting but easy to skip
   - 1-3: Boring, generic, or confusing

3. **PRODUCT RELEVANCE** (does the hook feature the specific product from the video?)
   - 10: The exact product is featured in a natural, compelling way
   - 7-9: Product is present and recognizable in context
   - 4-6: Loosely related to the product category
   - 1-3: Completely unrelated or generic
   NOTE: If the video analysis says "product is never shown on screen," rate whether the hook creates a convincing visual for the product CATEGORY in a realistic setting.

4. **VEO3 FEASIBILITY** (can VEO3 actually generate this well?)
   - 10: Perfectly within VEO3's strengths (hand-object interaction, liquids, natural environments)
   - 7-9: Mostly feasible, minor challenges
   - 4-6: Risky elements (complex hands, subtle expressions)
   - 1-3: Impossible for VEO3 (faces, text, complex multi-object)

5. **CURIOSITY GAP** (does it create an open loop that the UGC video completes?)
   - 10: Viewer absolutely NEEDS to watch the next video
   - 7-9: Strong curiosity pull
   - 4-6: Some interest but could scroll away
   - 1-3: No connection to the main video

6. **ENVIRONMENT MATCH** (does the hook environment match the UGC video's setting?)
   - 10: Same type of environment — seamless transition from hook to UGC
   - 7-9: Similar vibe, minor mismatch
   - 4-6: Different setting but not jarring
   - 1-3: Completely different environment — would feel disconnected

IMPORTANT CONSTRAINTS ON YOUR FEEDBACK:
- NEVER suggest adding on-screen text, questions, or captions — VEO3 cannot render readable text.
- NEVER suggest something VEO3 can't do (faces, text, complex multi-object scenes).
- If the prompt sounds too "cinematic" or "produced," suggest making it more raw/authentic (messier environment, more casual framing, natural light).
- All suggestions must keep the UGC-native feel. Never suggest making it MORE polished.

RESPOND IN EXACTLY THIS FORMAT:

SCORE: [final average score as a number, one decimal place, e.g., 8.2]
UGC_AUTH: [1-10]
SCROLL_STOP: [1-10]
RELEVANCE: [1-10]
FEASIBILITY: [1-10]
CURIOSITY: [1-10]
ENV_MATCH: [1-10]
---
[2-3 sentences of specific, actionable feedback. If score < 8, explain exactly what needs to change — prioritize UGC authenticity fixes first. If score >= 8, briefly note what makes it strong. Be direct.]`;

// ─────────────────────────────────────────────────────
// Prompt Sanitizer (catches what the generator misses)
// ─────────────────────────────────────────────────────

/**
 * Banned section labels that LLMs keep injecting despite instructions.
 * These are literal prefixes that VEO3 prompts should NEVER contain.
 */
const BANNED_LABEL_PATTERNS = [
  /^(CAMERA|SUBJECT|ACTION|MOVEMENT|LIGHTING|COLOR\/MOOD|COLOR|MOOD|SETTING|VISUAL|SHOT|FRAMING|SCENE|AUDIO|SOUND|COMPOSITION|DIRECTION|TEXTURE|ANGLE|TONE|ATMOSPHERE|ENVIRONMENT|BACKGROUND|FOREGROUND|TRANSITION|CUT|EDIT):/gim,
];

/**
 * Filler/marketing phrases that LLMs love but VEO3 can't render.
 * These get stripped programmatically as a safety net.
 */
const BANNED_PHRASE_PATTERNS = [
  // Marketing/filler language
  /enticing\s+viewers?/gi,
  /inviting\s+(curiosity|viewers?|the\s+viewer)/gi,
  /urging\s+viewers?/gi,
  /teases?\s+(the|its|their|a)/gi,
  /begs?\s+the\s+question/gi,
  /creating\s+(intrigue|an?\s+immediate|a\s+sense)/gi,
  /promising\s+(a|the|an)/gi,
  /showcasing\s+(the|its|their|a)/gi,
  /highlighting\s+(the|its|their|a)/gi,
  /emphasizing\s+(the|its|their|a)/gi,
  /capturing\s+the\s+essence/gi,
  /transformative\s+(beauty|power|energy)/gi,
  /revitalizing\s+power/gi,
  /reminiscent\s+of/gi,
  /creating\s+an?\s+immediate\s+link/gi,
  /hinting\s+at/gi,
  /suggesting\s+(a|the|an)/gi,
  /speaks?\s+to\s+the\s+viewer/gi,
  /draws?\s+(the\s+)?viewers?\s+in/gi,
  /leaves?\s+viewers?\s+wanting/gi,
  // Studio/cinematic language that kills UGC feel
  /shallow\s+depth[- ]of[- ]field/gi,
  /bokeh\s+(background|effect|blur)/gi,
  /rim\s+light(ing|s|ed)?/gi,
  /soft\s*box(es)?/gi,
  /dramatic\s+light(ing|s)?/gi,
  /cinematic\s+(shot|angle|movement|light|feel)/gi,
  /studio\s+(light|setup|backdrop|background)/gi,
  /pristine\s+(white|surface|marble|counter|backdrop)/gi,
  /elegant(ly)?\s+(placed|arranged|positioned|displayed)/gi,
  /artfully\s+(arranged|placed|composed)/gi,
  /perfectly\s+(centered|symmetrical|composed|arranged|lit)/gi,
  // Human/face references that VEO3 will butcher
  /\ba\s+(woman|man|person|figure|girl|guy|lady)\b/gi,
  /\b(someone|somebody)\s+(stands?|sits?|walks?|holds?|looks?|reaches?)/gi,
  /\b(her|his|their)\s+(face|head|hair|expression|eyes|smile|body|torso|silhouette)/gi,
  /\bfacial\s+(expression|features?)/gi,
  /\b(looking\s+at\s+the\s+camera|facing\s+the\s+camera|towards\s+camera)/gi,
];

interface SanitizeResult {
  prompt: string;
  wasModified: boolean;
  removedPatterns: string[];
}

/**
 * Programmatically strips banned patterns from generator output.
 * Acts as a safety net — catches violations that instructions alone can't prevent.
 */
function sanitizePrompt(rawPrompt: string): SanitizeResult {
  let prompt = rawPrompt;
  const removedPatterns: string[] = [];

  // Strip section labels (e.g., "CAMERA: ..." → just the description)
  for (const pattern of BANNED_LABEL_PATTERNS) {
    const matches = prompt.match(pattern);
    if (matches) {
      removedPatterns.push(...matches.map((m) => m.trim()));
      prompt = prompt.replace(pattern, "");
    }
  }

  // Strip filler phrases
  for (const pattern of BANNED_PHRASE_PATTERNS) {
    const matches = prompt.match(pattern);
    if (matches) {
      removedPatterns.push(...matches.map((m) => m.trim()));
      prompt = prompt.replace(pattern, "");
    }
  }

  // Clean up artifacts from removal: double spaces, orphaned commas, leading commas
  prompt = prompt
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/^\s*,\s*/gm, "")
    .replace(/\.\s*\./g, ".")
    .trim();

  return {
    prompt,
    wasModified: removedPatterns.length > 0,
    removedPatterns,
  };
}

// ─────────────────────────────────────────────────────
// Parsing Utilities
// ─────────────────────────────────────────────────────

interface ParsedGeneration {
  prompt: string;
  durationSeconds: 4 | 6 | 8;
}

interface ParsedRating {
  score: number;
  breakdown: {
    ugcAuth: number;
    scrollStop: number;
    relevance: number;
    feasibility: number;
    curiosity: number;
    envMatch: number;
  };
  feedback: string;
}

function parseGeneratorResponse(raw: string): ParsedGeneration {
  const validDurations: Array<4 | 6 | 8> = [4, 6, 8];

  // Extract DURATION: N
  const durationMatch = raw.match(/^DURATION:\s*(\d+)/im);
  let durationSeconds: 4 | 6 | 8 = 6;

  if (durationMatch) {
    const parsed = parseInt(durationMatch[1], 10);
    if (validDurations.includes(parsed as any)) {
      durationSeconds = parsed as 4 | 6 | 8;
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

function parseRaterResponse(raw: string): ParsedRating {
  const scoreMatch = raw.match(/^SCORE:\s*([\d.]+)/im);
  const ugcAuthMatch = raw.match(/^UGC_AUTH:\s*(\d+)/im);
  const scrollMatch = raw.match(/^SCROLL_STOP:\s*(\d+)/im);
  const relevanceMatch = raw.match(/^RELEVANCE:\s*(\d+)/im);
  const feasibilityMatch = raw.match(/^FEASIBILITY:\s*(\d+)/im);
  const curiosityMatch = raw.match(/^CURIOSITY:\s*(\d+)/im);
  const envMatchMatch = raw.match(/^ENV_MATCH:\s*(\d+)/im);

  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5;

  // Extract feedback after ---
  let feedback = "";
  const separatorIndex = raw.indexOf("---");
  if (separatorIndex !== -1) {
    feedback = raw.substring(separatorIndex + 3).trim();
  }

  return {
    score: Math.min(10, Math.max(0, score)),
    breakdown: {
      ugcAuth: ugcAuthMatch ? parseInt(ugcAuthMatch[1], 10) : 5,
      scrollStop: scrollMatch ? parseInt(scrollMatch[1], 10) : 5,
      relevance: relevanceMatch ? parseInt(relevanceMatch[1], 10) : 5,
      feasibility: feasibilityMatch ? parseInt(feasibilityMatch[1], 10) : 5,
      curiosity: curiosityMatch ? parseInt(curiosityMatch[1], 10) : 5,
      envMatch: envMatchMatch ? parseInt(envMatchMatch[1], 10) : 5,
    },
    feedback,
  };
}

// ─────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────

async function callGenerator(
  openai: OpenAI,
  videoAnalysis: string,
  previousAttempt?: { prompt: string; duration: number; feedback: string }
): Promise<ParsedGeneration> {
  let userContent = `Here is the factual analysis of the video:\n\n${videoAnalysis}\n\n═══ YOUR TASK ═══

Study the analysis above. Then write a VEO3 hook prompt — a phone-shot TikTok UGC clip that plays BEFORE this video.

CRITICAL REQUIREMENTS:
1. ⚠️ ZERO HUMANS: No face, no person, no body, no figure, no silhouette. ONLY hands (wrist down) + product + environment. This is POV footage from someone's phone camera looking DOWN at their hands/counter.
2. READ THE SCRIPT: What product is mentioned? (gummies, powder, serum, etc.) Your hook must feature THAT product in a satisfying, scroll-stopping way.
3. BE CREATIVE — don't just "hand grabs bottle." Think: gummies tumbling out onto a counter, powder cloud from a scoop, product tossed onto a messy surface, shaker bottle slammed down. Make it SATISFYING to watch.
4. REAL ENVIRONMENT: Match the UGC person's setting (kitchen/bathroom/gym/bedroom). Include clutter — mugs, keys, phones, random stuff real people have around.
5. NATURAL LIGHTING: Overhead apartment lights, window light. Nothing dramatic or professional.
6. If the product is NEVER shown in the video, INVENT a realistic-looking version from the script description and make the INTERACTION with it the star of the hook.
7. ONE continuous shot, POV handheld phone camera with slight wobble.
8. 60-120 words. Make every word visual and specific.

RESPOND IN EXACTLY THIS FORMAT:
DURATION: [4 or 6 or 8]
---
[Your VEO3 prompt — 60-120 words, every word counts]`;

  // If re-iterating, include previous attempt + feedback
  if (previousAttempt) {
    userContent += `\n\n═══ PREVIOUS ATTEMPT (rejected by quality reviewer) ═══

Your previous prompt (${previousAttempt.duration}s):
"${previousAttempt.prompt}"

REVIEWER FEEDBACK:
${previousAttempt.feedback}

Write a COMPLETELY NEW prompt that addresses ALL the reviewer's feedback. Do NOT just tweak the previous prompt — rethink the concept from scratch. The reviewer is extremely experienced and their feedback is correct. You need to score 8+/10 to pass.`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: GENERATOR_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: previousAttempt ? 0.92 : 0.85, // Higher temp on retries for more creative variation
    max_completion_tokens: 400,
  });

  const rawContent = response.choices[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("GPT-5.2 returned empty hook prompt");
  }

  return parseGeneratorResponse(rawContent);
}

async function callRater(
  openai: OpenAI,
  videoAnalysis: string,
  hookPrompt: string,
  durationSeconds: number
): Promise<ParsedRating> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: RATER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `═══ VIDEO ANALYSIS ═══
${videoAnalysis}

═══ HOOK PROMPT (${durationSeconds} seconds) ═══
${hookPrompt}

Rate this hook prompt strictly. Be brutally honest. A mediocre hook wastes hundreds of dollars in ad spend.`,
      },
    ],
    temperature: 0.3, // Low temp for consistent, objective ratings
    max_completion_tokens: 300,
  });

  const rawContent = response.choices[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("GPT-5.2 rater returned empty response");
  }

  return parseRaterResponse(rawContent);
}

// ─────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────

/**
 * Generate a VEO3 hook prompt with AI quality gate + programmatic sanitizer.
 *
 * Pipeline:
 * 1. GPT-5.2 generates hook prompt + selects duration (4/6/8s)
 * 2. Programmatic sanitizer strips any banned labels/phrases the generator injects
 * 3. GPT-5.2 rates the sanitized prompt (1-10 across 5 criteria)
 * 4. If rating < 8, GPT-5.2 re-generates with feedback (up to 3 total attempts)
 * 5. Returns the best prompt (highest rated) even if none hit 8/10
 *
 * @param videoAnalysis - Detailed video analysis from Gemini 2.5 Flash
 * @returns Object with prompt, duration, rating, feedback, and attempt count
 */
export async function generateHookPrompt(videoAnalysis: string): Promise<HookPromptResult> {
  const openaiKey = await getOpenAIKey();
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log("[HookPromptGen] Starting hook prompt generation with quality gate...");

  let bestResult: HookPromptResult | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[HookPromptGen] Attempt ${attempt}/${MAX_ATTEMPTS}...`);

    // Step 1: Generate
    const previousAttempt = bestResult
      ? {
          prompt: bestResult.prompt,
          duration: bestResult.durationSeconds,
          feedback: bestResult.ratingFeedback,
        }
      : undefined;

    const generation = await callGenerator(openai, videoAnalysis, previousAttempt);

    if (!generation.prompt) {
      console.warn(`[HookPromptGen] Attempt ${attempt}: Empty prompt, retrying...`);
      continue;
    }

    console.log(`[HookPromptGen] Attempt ${attempt} [RAW]: Generated ${generation.prompt.length} chars, ${generation.durationSeconds}s`);

    // Step 2: Sanitize — programmatically strip banned patterns the generator keeps injecting
    const sanitized = sanitizePrompt(generation.prompt);

    if (sanitized.wasModified) {
      console.warn(`[HookPromptGen] Attempt ${attempt} [SANITIZED]: Stripped ${sanitized.removedPatterns.length} violations: [${sanitized.removedPatterns.join(", ")}]`);
    }

    const cleanPrompt = sanitized.prompt;
    console.log(`[HookPromptGen] Attempt ${attempt}: "${cleanPrompt}"`);

    // Step 3: Rate the SANITIZED prompt
    console.log(`[HookPromptGen] Rating with GPT-5.2...`);
    const rating = await callRater(openai, videoAnalysis, cleanPrompt, generation.durationSeconds);

    console.log(`[HookPromptGen] Attempt ${attempt}: Score ${rating.score}/10 [UGC:${rating.breakdown.ugcAuth} SS:${rating.breakdown.scrollStop} REL:${rating.breakdown.relevance} FEAS:${rating.breakdown.feasibility} CUR:${rating.breakdown.curiosity} ENV:${rating.breakdown.envMatch}]`);
    console.log(`[HookPromptGen] Feedback: "${rating.feedback}"`);

    const currentResult: HookPromptResult = {
      prompt: cleanPrompt,
      durationSeconds: generation.durationSeconds,
      rating: rating.score,
      ratingFeedback: rating.feedback,
      attempts: attempt,
    };

    // Track best result (highest rating)
    if (!bestResult || rating.score > bestResult.rating) {
      bestResult = currentResult;
    }

    // Pass quality gate?
    if (rating.score >= MIN_RATING) {
      console.log(`[HookPromptGen] ✅ Passed quality gate on attempt ${attempt} with ${rating.score}/10`);
      return currentResult;
    }

    console.log(`[HookPromptGen] ❌ Below ${MIN_RATING}/10 threshold (got ${rating.score}), ${attempt < MAX_ATTEMPTS ? "re-iterating..." : "using best result"}`);
  }

  // Return the best we got (even if below threshold)
  console.log(`[HookPromptGen] ⚠️ Max attempts reached. Using best result: ${bestResult!.rating}/10 from attempt ${bestResult!.attempts}`);
  return bestResult!;
}
