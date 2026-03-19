import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";
import fs from "fs";
import path from "path";

// Resolve from the project root so the path is correct in both dev (ts-node,
// __dirname = src/services) and production (node dist/index.js, __dirname =
// dist/services — where the markdown files are NOT copied).
const IMAGE_AGENTS_DIR = path.resolve(process.cwd(), "src/agents/image-generation/sub-agents");
const VIDEO_AGENTS_DIR = path.resolve(process.cwd(), "src/agents/video-generation/sub-agents");

export const agentActivityEmitter = new EventEmitter();

/**
 * Locate an agent's directory within baseDir.
 * Tries an exact match first, then falls back to a case-insensitive scan so
 * that a templateId like "selfie-ugc" still finds a folder named "Selfie-UGC"
 * (or vice-versa) on case-sensitive Linux filesystems.
 */
function resolveAgentDir(baseDir: string, templateId: string): string {
  const exact = path.join(baseDir, templateId);
  if (fs.existsSync(exact)) return exact;

  // Case-insensitive fallback
  const lower = templateId.toLowerCase();
  if (fs.existsSync(baseDir)) {
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.toLowerCase() === lower) {
        return path.join(baseDir, entry.name);
      }
    }
  }

  throw new Error(`Agent directory not found: ${templateId}`);
}

/**
 * Read markdown files from a sub-agent directory and build the hardcore system prompt.
 */
function buildSystemPrompt(templateId: string, agentType: "image" | "video" = "image"): string {
  const baseDir = agentType === "video" ? VIDEO_AGENTS_DIR : IMAGE_AGENTS_DIR;
  const agentDir = resolveAgentDir(baseDir, templateId);

  // Required files
  const rulesPath = path.join(agentDir, "Rules.md");
  const templatesPath = path.join(agentDir, "Templates.md");

  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Required file missing: ${templateId}/Rules.md`);
  }
  if (!fs.existsSync(templatesPath)) {
    throw new Error(`Required file missing: ${templateId}/Templates.md`);
  }

  const rulesContent = fs.readFileSync(rulesPath, "utf-8");
  const templatesContent = fs.readFileSync(templatesPath, "utf-8");

  if (agentType === "video") {
    return `You are a Principal AI Prompt Engineer specializing in AI video generation.
Your ONLY job is to take a raw user intent and perfectly map it into our highly structured Master Template — then OUTPUT the result as a dense, single-paragraph natural language video generation prompt.

Here is the Master Template and the exact formatting rules you MUST follow:
---
RULES:
${rulesContent}

TEMPLATES & EXAMPLES:
${templatesContent}
---

CRITICAL INSTRUCTIONS:
1. Read the user's raw intent.
2. INTERNALIZE every field from the Master Template: shot composition, camera movement, pacing, mood, lighting, dialogue integration, and transitions.
3. Blend the user's intent into the scene and subject details while strictly obeying the style rules and creative direction.
4. OUTPUT FORMAT: A single dense natural language paragraph. NOT JSON. The downstream model is a video generator (Sora/VEO3) that cannot parse JSON.
   - Start with the overall scene description and mood
   - Then camera movement and shot composition (e.g. "Slow dolly forward through a warm-lit space...")
   - Then subject details (appearance, clothing, expression, body language, actions)
   - Then environment/setting and lighting details
   - Then pacing and transition guidance
   - Then dialogue or voiceover direction if applicable
   - End with negative instructions: "No text overlays, no captions, no watermarks, no abrupt cuts..."
5. Include ALL the detail and specificity shown in the template variations — every field must be represented in natural language.
6. HARD CHARACTER LIMIT: Your output MUST NOT exceed 12000 characters. The downstream video generator has a prompt limit. Compress where needed but preserve all critical details.
7. Output ONLY the prompt. Zero conversational filler. No markdown. No headers. No explanation.`;
  }

  return `You are a Principal AI Prompt Engineer specializing in photorealistic image generation.
Your ONLY job is to take a raw user intent and perfectly map it into our highly structured Master Template — then OUTPUT the result as a dense, single-paragraph natural language image generation prompt.

Here is the Master Template and the exact formatting rules you MUST follow:
---
RULES:
${rulesContent}

TEMPLATES & EXAMPLES:
${templatesContent}
---

CRITICAL INSTRUCTIONS:
1. Read the user's raw intent.
2. INTERNALIZE every field from the Master Template: the "priority_order", "core_output_identity", "hard_locks", "avatar_block", "environment_block", "camera_spec", "realism_and_lighting", "body_language_and_expression", "product_integration", and "hard_negative_prompt".
3. Blend the user's intent into the avatar and environment details while strictly obeying the anti-glamor, realism, and camera rules.
4. OUTPUT FORMAT: A single dense natural language paragraph. NOT JSON. The downstream model is an image generator (Gemini Flash) that cannot parse JSON.
   - Start with the shot type and camera spec (e.g. "Direct front camera conversational portrait from a modern iPhone...")
   - Then subject details (appearance, clothing, expression, body language)
   - Then environment/setting details
   - Then lighting and realism rules
   - Then product placement if applicable
   - End with negative instructions: "NOT a mirror selfie, NOT glamorized, NOT studio lighting, NO visible phone..."
5. Include ALL the detail and specificity shown in the template variations — every field must be represented in natural language.
6. HARD CHARACTER LIMIT: Your output MUST NOT exceed 12000 characters. The downstream image generator has a 15000 character limit. Compress where needed but preserve all critical details.
7. Output ONLY the prompt. Zero conversational filler. No markdown. No headers. No explanation.`;
}

/**
 * Refine a user prompt using a sub-agent's markdown files as Claude's system prompt.
 * Falls back to the original prompt on any failure.
 */
export async function refinePromptWithAgent(
  templateId: string,
  userPrompt: string,
  anthropicKey: string,
  agentType: "image" | "video" = "image",
  jobId?: string
): Promise<string> {
  try {
    if (jobId) {
      agentActivityEmitter.emit("activity", { type: "agent_start", jobId, templateId, agentType, timestamp: Date.now() });
    }

    const systemPrompt = buildSystemPrompt(templateId, agentType);

    if (jobId) {
      agentActivityEmitter.emit("activity", { type: "system_prompt_loaded", jobId, templateId, charCount: systemPrompt.length, timestamp: Date.now() });
    }

    const client = new Anthropic({ apiKey: anthropicKey });

    if (jobId) {
      agentActivityEmitter.emit("activity", { type: "claude_call_started", jobId, templateId, model: "claude-sonnet-4-20250514", timestamp: Date.now() });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    let refined = textBlock.text;
    if (refined.length > 12000) {
      console.warn(`[AGENT-ORCH] Refined prompt too long (${refined.length} chars), truncating to 12000`);
      refined = refined.slice(0, 12000);
    }
    console.log(`[AGENT-ORCH] Refined prompt for "${templateId}" (${refined.length} chars): ${refined.slice(0, 120)}...`);

    if (jobId) {
      agentActivityEmitter.emit("activity", { type: "refinement_complete", jobId, templateId, charCount: refined.length, timestamp: Date.now() });
    }

    return refined;
  } catch (error) {
    console.error(
      `[AGENT-ORCH] Failed to refine prompt (falling back to raw):`,
      error instanceof Error ? error.message : error
    );
    return userPrompt;
  }
}
