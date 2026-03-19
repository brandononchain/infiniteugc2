import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "../lib/keys";

/**
 * Uses Gemini Vision to analyze a video frame and produce a detailed visual description.
 * This description is injected into the next chunk's VEO3 prompt to ensure
 * the next video starts from the exact same visual state.
 *
 * @param frameBuffer - JPEG buffer of the last frame from a video chunk
 * @returns Detailed visual description of the frame for VEO3 continuity
 */
export async function analyzeFrame(frameBuffer: Buffer): Promise<string> {
  try {
    const geminiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a cinematography expert analyzing a video frame for visual continuity in video generation.

Describe this frame in precise detail so another AI video generator can recreate this EXACT scene as its starting frame. Focus on:

1. CAMERA: Exact camera angle (eye-level, low angle, high angle, dutch angle), shot type (close-up, medium, wide, extreme wide), camera position
2. SUBJECT: What/who is in frame, their exact position, pose, body language, facial expression, what they're wearing
3. ENVIRONMENT: Setting, background elements, foreground elements, lighting direction and quality (warm/cool, harsh/soft, time of day)
4. COLORS: Dominant color palette, color temperature, any color grading
5. COMPOSITION: Where subjects are placed in frame (rule of thirds position), depth of field, any motion blur suggesting movement direction
6. MOOD: Overall atmosphere and visual tone

Write it as a single dense paragraph, maximum 150 words. Do NOT use bullet points. Do NOT say "the image shows" — write it as a direct scene description that could be used as a video generation prompt. Be extremely specific about spatial positions (left/right/center, foreground/background).`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: frameBuffer.toString("base64"),
        },
      },
    ]);

    const description = result.response.text().trim();
    console.log(`[Frame Analyzer] Generated visual description (${description.length} chars)`);
    return description;
  } catch (error: any) {
    console.warn(`[Frame Analyzer] Failed to analyze frame: ${error.message}`);
    // Return empty string on failure — the system falls back to reference image only
    return "";
  }
}
