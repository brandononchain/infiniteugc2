/**
 * World-class UGC prompt builder.
 *
 * Security model:
 *   - All user-supplied content is sanitized before embedding in prompts
 *   - JSON instructions: any keys accepted, all key-value pairs serialized as
 *     a natural-language visual direction block (no hardcoded key mapping)
 *   - Plain text instructions: sanitized and appended as-is
 *   - The UGC base template is fixed and authoritative — user instructions
 *     ADD direction on top, they do not replace the base template
 */

// ─────────────────────────────────────────────
// Sanitization
// ─────────────────────────────────────────────

/**
 * Patterns that signal prompt injection attempts.
 * Replaced with "***" before embedding in any prompt.
 */
const INJECTION_PATTERN =
  /\b(ignore|forget|disregard|override|jailbreak|bypass|system:|new instruction|act as|you are now|dan|unrestricted|no restrictions|without restrictions|pretend you|roleplay as)\b/gi;

/**
 * Sanitize a user-supplied string value before embedding in a prompt.
 * - Strips control characters
 * - Converts double-quotes to single-quotes (prevents breaking prompt structure)
 * - Removes common prompt injection trigger phrases
 * - Normalizes whitespace
 * - Truncates to maxLength
 */
function sanitizeValue(value: string, maxLength = 200): string {
  return value
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/"/g, "'")
    .replace(/`/g, "'")
    .replace(INJECTION_PATTERN, "***")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a JSON key before using it in natural language output.
 * Only allows alphanumeric, spaces, underscores, hyphens.
 */
function sanitizeKey(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9_\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

// ─────────────────────────────────────────────
// Instruction parsing
// ─────────────────────────────────────────────

type InstructionsResult =
  | { type: "json"; pairs: Array<[string, string]> }
  | { type: "text"; value: string }
  | { type: "none" };

/**
 * Parses and sanitizes the instructions field.
 *
 * - If the trimmed input starts with '{', attempts JSON.parse
 * - On success: extracts ALL string/number key-value pairs (any keys, not a
 *   hardcoded whitelist), sanitizes each key and value
 * - On failure or plain text: sanitizes as a single plain text value
 */
export function parseInstructions(
  instructions: string | null | undefined
): InstructionsResult {
  if (!instructions || !instructions.trim()) {
    return { type: "none" };
  }

  const trimmed = instructions.trim();

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const pairs: Array<[string, string]> = Object.entries(parsed)
          .filter(([, v]) => typeof v === "string" || typeof v === "number")
          .map(([k, v]): [string, string] => [
            sanitizeKey(k),
            sanitizeValue(String(v)),
          ])
          .filter(([k, v]) => k.length > 0 && v.length > 0);

        if (pairs.length > 0) {
          return { type: "json", pairs };
        }
        // JSON parsed but all values were empty/invalid — treat as none
        return { type: "none" };
      }
    } catch {
      // fall through to plain text
    }
  }

  return { type: "text", value: sanitizeValue(trimmed, 1000) };
}

/**
 * Converts sanitized JSON pairs into a concise natural language directive.
 * e.g. [["mood","happy"],["setting","kitchen"]] → "mood: happy; setting: kitchen"
 */
function pairsToDirective(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => `${k}: ${v}`).join("; ");
}

// ─────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────

/**
 * Build a world-class UGC prompt for VEO3 (Kie.ai text-to-video).
 *
 * VEO3 generates native audio alongside video — every descriptor primes
 * both visual AND audio rendering simultaneously.
 *
 * Design: the UGC base template is fixed and authoritative. User instructions
 * are appended as a USER VISUAL DIRECTION block. JSON keys can be anything.
 *
 * @param scriptSegment            Dialogue for this chunk (sanitized here)
 * @param instructions             User-provided plain text or JSON instructions
 * @param previousVisualDescription  Gemini Vision analysis of previous chunk's last frame
 */
export function buildVEO3UGCPrompt(
  scriptSegment: string,
  instructions?: string | null,
  previousVisualDescription?: string | null
): string {
  const parsed = parseInstructions(instructions);

  // Build the user direction block — appended after the base template
  let userDirectionBlock = "";
  if (parsed.type === "json") {
    userDirectionBlock = `\nUSER VISUAL DIRECTION: ${pairsToDirective(parsed.pairs)}\n`;
  } else if (parsed.type === "text") {
    userDirectionBlock = `\nUSER VISUAL DIRECTION: ${parsed.value}\n`;
  }

  // Continuity block — only populated for chunks after the first
  let continuityBlock = "";
  if (previousVisualDescription && previousVisualDescription.trim()) {
    const safeDesc = sanitizeValue(previousVisualDescription.trim(), 400);
    continuityBlock = `\nSCENE CONTINUATION: This continues directly from the previous clip with no cut. Same person, same position, same lighting, same background. The previous frame showed: '${safeDesc}'. Begin in exact visual continuity from that state — no jump, no reposition, no scene change.\n`;
  }

  // Script segment: sanitize control chars and escape quotes only — do NOT
  // strip words since this is the dialogue the model must speak
  const safeScript = scriptSegment
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/"/g, "'")
    .trim();

  return `Raw authentic UGC video. No color grading, no post-processing, no filters. Shot on a personal smartphone in portrait mode (9:16).

SUBJECT: Real person, natural appearance and proportions, authentic human features — no AI-smoothed skin. Holds the phone at natural selfie angle — slightly above eye level, 3–5 degree tilt. Looks directly into the front-facing camera lens with genuine eye contact. Their face shows real human micro-expressions throughout: natural blink every 3–5 seconds (full eyelid close, genuine duration), subtle eyebrow raises and furrows tracking the emotional beats of speech, slight nostril movement on breath, corners of mouth responding to intonation. Real skin: visible pores, natural imperfections, authentic undertones, subsurface scattering — not AI-smoothed. Hair moves slightly from breathing. Neck and shoulders have relaxed, subtle movement while speaking. Breathing is visible.

CAMERA: Personal iPhone, handheld. Slight natural handheld shake. Composition drifts slightly as the hold shifts — head in center-to-upper frame, shoulders barely visible. Natural smartphone lens softness — not cinema sharpness. Slight chromatic aberration at frame edges. Autofocus locked but imperfectly sharp.

ENVIRONMENT: Their own home — a genuinely lived-in space, not a set. Organic home background with personal items visible. Depth of field puts background gently out of focus with authentic environmental details showing.
${continuityBlock}${userDirectionBlock}
DELIVERY: Genuine, direct, conversational energy — like talking to a close friend. Completely authentic, zero teleprompter stiffness. The person is present, not performing. Every facial movement feels spontaneous.

WORDS SPOKEN: "${safeScript}"

NO captions. NO subtitles. NO text overlays. NO letterboxing. NO watermarks. NO transitions.`;
}

/**
 * Build a world-class UGC prompt for Sora 2 Pro (Kie.ai image-to-video).
 *
 * Sora 2 Pro is image-to-video — the reference frame already establishes
 * the person's appearance. Template focuses on motion/animation behavior.
 * Describing the person's appearance here causes visual drift artifacts, so
 * the base template deliberately omits subject description.
 *
 * @param scriptSegment            Dialogue for this chunk (sanitized here)
 * @param instructions             User-provided plain text or JSON instructions
 * @param previousVisualDescription  Gemini Vision analysis of previous chunk's last frame
 */
export function buildSoraProUGCPrompt(
  scriptSegment: string,
  instructions?: string | null,
  previousVisualDescription?: string | null
): string {
  const parsed = parseInstructions(instructions);

  let userDirectionBlock = "";
  if (parsed.type === "json") {
    userDirectionBlock = `\nUSER VISUAL DIRECTION: ${pairsToDirective(parsed.pairs)}\n`;
  } else if (parsed.type === "text") {
    userDirectionBlock = `\nUSER VISUAL DIRECTION: ${parsed.value}\n`;
  }

  let continuityBlock = "";
  if (previousVisualDescription && previousVisualDescription.trim()) {
    const safeDesc = sanitizeValue(previousVisualDescription.trim(), 400);
    continuityBlock = `\nCONTINUITY FROM PREVIOUS CLIP: Continue seamlessly — same person, same frame, same environment. The previous clip ended with: '${safeDesc}'. Maintain exact visual continuity. No jump cut, no scene change, no repositioning.\n`;
  }

  const safeScript = scriptSegment
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/"/g, "'")
    .trim();

  return `Animate the reference image into authentic, raw UGC-style video. No production value, no color grading, no filters.
${continuityBlock}
PERFORMANCE ANIMATION: Bring the subject to life with genuine human micro-expressions. Natural blink patterns — full eyelid close every 3–5 seconds, natural duration. Eyebrows track the emotional content of the dialogue: raise on questions, furrow on emphasis, relax at neutral. Natural facial expression changes activate authentically. Lip sync is precise and perfectly matched to the spoken audio — correct mouth shapes, clear articulation on consonants, natural open vowels. Natural jaw and mouth movement. Texture stays photorealistic throughout — natural color and lighting on skin. Eyes have natural catchlights and lifelike gaze.

HEAD & BODY: Slight natural head sway — not rigid, not locked. Subtle nods at phrase boundaries. Shoulders show breathing — slight rise on inhale. Body language is relaxed, uncontrived. No puppet-like movement.

CAMERA: Handheld smartphone, slight natural drift, imperfect centering. Slight composition drift over time as hand position subtly shifts. Not perfectly static.

ENVIRONMENT: Real, personal everyday environment. Authentic lived-in background, softly out of focus. Natural ambient light, authentic and uneven. Consistent with reference image environment throughout.
${userDirectionBlock}
DIALOGUE (conversational energy, precise lip sync): "${safeScript}"

NO captions. NO subtitles. NO text overlays. NO watermarks.`;
}
