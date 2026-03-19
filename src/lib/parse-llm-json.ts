/**
 * Robust JSON parser for LLM (Gemini, GPT, etc.) responses.
 *
 * LLMs frequently return "almost valid" JSON with:
 * - Markdown code fences wrapping the JSON
 * - Trailing commas before } or ]
 * - Single-line comments (// ...)
 * - Extra text before/after the JSON object
 * - Unescaped control characters inside strings
 *
 * This utility handles all of those cases.
 */

/**
 * Parse a JSON object from an LLM's raw text response.
 * Throws if no valid JSON object can be extracted.
 */
export function parseLlmJson<T = unknown>(rawText: string): T {
  // Step 1: Try direct parse (fast path — LLM followed instructions)
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue to cleaning steps
  }

  // Step 2: Strip markdown code fences
  let cleaned = trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      // continue
    }
  }

  // Step 3: Extract the outermost JSON object using bracket matching
  //         (avoids the greedy regex problem that over-captures)
  const extracted = extractJsonObject(cleaned) || extractJsonObject(trimmed);
  if (extracted) {
    // Try parse as-is first
    try {
      return JSON.parse(extracted) as T;
    } catch {
      // continue to sanitization
    }

    // Step 4: Sanitize common LLM JSON mistakes
    const sanitized = sanitizeLlmJson(extracted);
    try {
      return JSON.parse(sanitized) as T;
    } catch (finalErr: any) {
      // Log for debugging
      console.error(
        `[parseLlmJson] Failed after sanitization. Error: ${finalErr.message}` +
          `\n  Raw length: ${rawText.length}, extracted length: ${extracted.length}` +
          `\n  First 300 chars of extracted: ${extracted.substring(0, 300)}`
      );
      throw new Error(`Failed to parse LLM JSON: ${finalErr.message}`);
    }
  }

  throw new Error(
    `No JSON object found in LLM response (${rawText.length} chars). ` +
      `First 200 chars: ${rawText.substring(0, 200)}`
  );
}

/**
 * Extract the outermost { ... } from text using bracket counting.
 * This is safer than a greedy regex because it stops at the matching
 * closing brace instead of the LAST brace in the string.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 1);
      }
    }
  }

  // If we never balanced, return from start to last } as fallback
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace > start) {
    return text.substring(start, lastBrace + 1);
  }

  return null;
}

/**
 * Fix common JSON mistakes that LLMs make.
 */
function sanitizeLlmJson(json: string): string {
  let result = json;

  // Remove single-line comments (// ...) that are NOT inside strings
  result = removeSingleLineComments(result);

  // Remove trailing commas: ,] or ,}
  // Only outside of strings
  result = removeTrailingCommas(result);

  // Fix unescaped control characters inside JSON strings
  result = fixControlCharsInStrings(result);

  return result;
}

/**
 * Remove // comments that are outside of JSON strings.
 */
function removeSingleLineComments(json: string): string {
  const lines = json.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    let inStr = false;
    let esc = false;
    let commentStart = -1;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (!inStr && ch === "/" && i + 1 < line.length && line[i + 1] === "/") {
        commentStart = i;
        break;
      }
    }

    cleaned.push(commentStart >= 0 ? line.substring(0, commentStart).trimEnd() : line);
  }

  return cleaned.join("\n");
}

/**
 * Remove trailing commas before ] or } (outside strings).
 */
function removeTrailingCommas(json: string): string {
  // This regex approach works for the common case:
  // match comma followed by optional whitespace then ] or }
  return json.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * Fix unescaped control characters (tabs, newlines) inside JSON string values.
 */
function fixControlCharsInStrings(json: string): string {
  // Replace literal tabs and newlines that are inside strings
  // We do a character-level scan
  let result = "";
  let inStr = false;
  let esc = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (esc) {
      result += ch;
      esc = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      esc = true;
      continue;
    }

    if (ch === '"') {
      inStr = !inStr;
      result += ch;
      continue;
    }

    if (inStr) {
      // Replace unescaped control chars with their escape sequences
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      // Other control characters (0x00-0x1F)
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        result += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
    }

    result += ch;
  }

  return result;
}
