/**
 * Product Swap Service
 *
 * Uses Gemini 2.5 Flash to generate scene-specific prompts that replace
 * a competitor's product with the user's product in each video scene.
 *
 * For each scene identified by the Scene Analyzer, this service:
 * 1. Takes the scene description + product detection data
 * 2. Takes the user's product info (name, description, image)
 * 3. Generates a per-scene prompt optimized for the target video model
 *    (Sora 2 Pro for B-roll/product shots, Kling MC for talking heads)
 *
 * The prompt preserves the original scene's camera work, lighting,
 * environment, and motion — only the product changes.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "../lib/keys";
import { parseLlmJson } from "../lib/parse-llm-json";
import { SceneSegment, SceneType } from "./scene-analyzer";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface UserProduct {
  name: string;
  description: string; // Physical description: color, shape, packaging
  imageUrl?: string; // Optional reference image of the user's product
  brandName?: string;
  category?: string; // e.g., "skincare", "supplement", "beverage"
}

export interface SceneSwapPrompt {
  sceneIndex: number;
  sceneType: SceneType;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  strategy: "sora2pro" | "kling_mc" | "veo3" | "keep_original";
  prompt: string; // The generation prompt for this scene
  motionReference: boolean; // Whether to use original video as motion reference
  avatarSwap: boolean; // Whether this scene needs avatar replacement
  lipSync: boolean; // Whether this scene needs lip-sync
  dialogueText: string; // Script for this scene (for TTS/lip-sync)
  referenceFrameTimestamp: number; // Best timestamp to extract reference frame
  notes: string; // Implementation notes
}

export interface ProductSwapPlan {
  totalScenes: number;
  scenesToRegenerate: number;
  scenesToKeep: number;
  estimatedDurationSeconds: number;
  scenePrompts: SceneSwapPrompt[];
  newScript: string; // Full revised script with product name swapped
}

// ─────────────────────────────────────────────
// Prompt Templates
// ─────────────────────────────────────────────

function buildSwapPrompt(
  scenes: SceneSegment[],
  userProduct: UserProduct,
  originalScript: string,
  newScript: string | null
): string {
  const scenesJson = scenes.map((s) => ({
    index: s.index,
    type: s.type,
    startSeconds: s.startSeconds,
    endSeconds: s.endSeconds,
    durationSeconds: s.durationSeconds,
    description: s.description,
    cameraWork: s.cameraWork,
    lighting: s.lighting,
    environment: s.environment,
    subject: s.subject,
    dialogue: s.dialogue,
    products: s.products,
    motionDescription: s.motionDescription,
    colorPalette: s.colorPalette,
    energy: s.energy,
    isSwappable: s.isSwappable,
    swapDifficulty: s.swapDifficulty,
    swapNotes: s.swapNotes,
  }));

  return `You are an expert AI video production engineer specializing in product placement and video cloning.

Your task: Given a scene-by-scene breakdown of a competitor's video and the user's product details, generate per-scene video generation prompts that recreate each scene with the USER'S PRODUCT instead of the competitor's product.

═══ USER'S PRODUCT ═══
Name: ${userProduct.name}
Description: ${userProduct.description}
${userProduct.brandName ? `Brand: ${userProduct.brandName}` : ""}
${userProduct.category ? `Category: ${userProduct.category}` : ""}
${userProduct.imageUrl ? `Reference image available: YES` : "Reference image available: NO"}

═══ ORIGINAL SCRIPT ═══
${originalScript}

═══ NEW SCRIPT (if provided) ═══
${newScript || "Not provided — adapt the original script to reference the user's product instead."}

═══ SCENE BREAKDOWN ═══
${JSON.stringify(scenesJson, null, 2)}

═══ YOUR TASK ═══
For EACH scene, decide the best regeneration strategy and generate an optimized prompt.

STRATEGY RULES:
1. "talking_head" scenes → strategy: "kling_mc"
   - These need Kling Motion Control (to copy the speaker's motion) + Sync.so lip-sync
   - The prompt should describe the visual environment and what the subject looks like
   - Set avatarSwap=true, lipSync=true
   - Set motionReference=true (uses original video clip as motion reference)

2. "product_shot" scenes → strategy: "sora2pro"
   - These need Sora 2 Pro image-to-video with the user's product image as reference
   - The prompt must describe the EXACT SAME camera angle, lighting, and action but with the NEW product
   - Set motionReference=false
   - Max 12 seconds per Sora 2 Pro chunk

3. "broll" scenes:
   - If product-related (product in hand, on counter, being used): strategy: "sora2pro"
   - If generic environment/lifestyle: strategy: "keep_original" (no need to regenerate)
   - If the B-roll is critical to the product narrative: strategy: "veo3"

4. "transition" scenes → strategy: "keep_original"
   - Transitions don't need regeneration

PROMPT RULES for Sora 2 Pro:
- Single dense paragraph, 50-150 words
- Describe the scene from the camera's perspective
- Include: environment, lighting, color palette, subject action, product interaction
- Replace ALL references to the competitor's product with the user's product
- Preserve exact camera work, motion, and energy
- End with: "No text overlays, no watermarks, no abrupt transitions"

PROMPT RULES for Kling Motion Control:
- Shorter prompt, 30-80 words
- Focus on the subject's appearance and environment
- The motion will come from the reference video, so don't describe specific movements
- Describe what the person LOOKS LIKE and where they are

PROMPT RULES for VEO3:
- Single dense paragraph, 100-200 words
- Full scene description with all visual details
- Include camera, lighting, environment, action

SCRIPT ADAPTATION:
- Replace every mention of the competitor's product name with the user's product name
- Keep the same structure, emphasis, and tone
- Adapt claims/benefits to be generic or match the user's product category

OUTPUT: Return ONLY valid JSON with this schema:
{
  "newScript": "<Full revised script with product name swapped throughout>",
  "totalScenes": <number>,
  "scenesToRegenerate": <number of scenes being regenerated>,
  "scenesToKeep": <number of scenes kept as-is>,
  "estimatedDurationSeconds": <total estimated output duration>,
  "scenePrompts": [
    {
      "sceneIndex": <number>,
      "sceneType": "<talking_head | broll | product_shot | transition>",
      "startSeconds": <number>,
      "endSeconds": <number>,
      "durationSeconds": <number>,
      "strategy": "<sora2pro | kling_mc | veo3 | keep_original>",
      "prompt": "<The generation prompt for this scene>",
      "motionReference": <boolean>,
      "avatarSwap": <boolean>,
      "lipSync": <boolean>,
      "dialogueText": "<The script text for this scene segment>",
      "referenceFrameTimestamp": <best timestamp to extract a reference frame from original>,
      "notes": "<Implementation notes or warnings>"
    }
  ]
}`;
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

/**
 * Generate a complete product swap plan with per-scene prompts.
 *
 * Takes the scene analysis + user's product details and produces
 * optimized prompts for each scene that need regeneration.
 *
 * @param scenes         Scene segments from the scene analyzer
 * @param userProduct    User's product details
 * @param originalScript Full script from the original video
 * @param newScript      Optional user-provided replacement script
 * @returns              Complete swap plan with per-scene prompts
 */
export async function generateProductSwapPlan(
  scenes: SceneSegment[],
  userProduct: UserProduct,
  originalScript: string,
  newScript: string | null = null
): Promise<ProductSwapPlan> {
  try {
    const geminiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildSwapPrompt(scenes, userProduct, originalScript, newScript);

    console.log("[ProductSwap] Generating product swap plan with Gemini 2.5 Flash...");

    const parts: any[] = [{ text: prompt }];

    // If user provided a product image, include it for visual context
    if (userProduct.imageUrl) {
      try {
        const imgResponse = await fetch(userProduct.imageUrl);
        if (imgResponse.ok) {
          const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
          const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";
          parts.push({
            inlineData: {
              mimeType,
              data: imgBuffer.toString("base64"),
            },
          });
          console.log("[ProductSwap] Included user product image in context");
        }
      } catch (imgErr: any) {
        console.warn(`[ProductSwap] Failed to fetch product image: ${imgErr.message}`);
      }
    }

    const result = await model.generateContent(parts);
    const rawText = result.response.text().trim();

    console.log(`[ProductSwap] Raw response: ${rawText.length} chars`);

    // Parse JSON from Gemini response (handles code fences, trailing commas, etc.)
    let parsed: ProductSwapPlan;
    try {
      parsed = parseLlmJson<ProductSwapPlan>(rawText);
    } catch (parseErr: any) {
      console.error(`[ProductSwap] Raw Gemini response (first 500 chars): ${rawText.substring(0, 500)}`);
      throw new Error(`Failed to parse product swap plan JSON: ${parseErr.message}`);
    }

    // Validate
    if (!parsed.scenePrompts || !Array.isArray(parsed.scenePrompts)) {
      throw new Error("Product swap plan missing scenePrompts array");
    }

    console.log(
      `[ProductSwap] Swap plan generated: ${parsed.scenesToRegenerate} scenes to regenerate, ${parsed.scenesToKeep} to keep`
    );

    for (const sp of parsed.scenePrompts) {
      console.log(
        `[ProductSwap]   Scene ${sp.sceneIndex}: ${sp.strategy} (${sp.sceneType}, ${sp.durationSeconds}s)` +
          `${sp.avatarSwap ? " +avatar" : ""}${sp.lipSync ? " +lipsync" : ""}${sp.motionReference ? " +motion" : ""}`
      );
    }

    return parsed;
  } catch (error: any) {
    console.error(`[ProductSwap] Failed to generate swap plan: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a simple script swap — replace product name throughout the script.
 * Used as a fallback when the full Gemini swap plan isn't needed.
 */
export function simpleScriptSwap(
  originalScript: string,
  originalProductName: string,
  newProductName: string
): string {
  if (!originalProductName || !newProductName) return originalScript;

  // Case-insensitive replacement preserving the original case pattern
  const regex = new RegExp(escapeRegex(originalProductName), "gi");
  return originalScript.replace(regex, newProductName);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
