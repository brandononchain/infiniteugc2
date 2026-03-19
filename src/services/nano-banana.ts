import { GoogleGenAI } from "@google/genai";
import { getSupabaseAdmin } from "../lib/supabase";

export type NanoBananaModel = "nano_banana_pro" | "nano_banana_2";

const GEMINI_MODELS: Record<NanoBananaModel, string> = {
  nano_banana_pro: "gemini-3-pro-image-preview",
  nano_banana_2: "gemini-3.1-flash-image-preview",
};

interface NanoBananaOptions {
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  referenceImageUrls?: string[];
  nanoBananaModel?: NanoBananaModel;
}

/**
 * Map our aspect ratio strings to Gemini-supported values.
 * Gemini supports: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
 */
function mapAspectRatio(ar: string): string {
  const mapping: Record<string, string> = {
    "1:1": "1:1",
    "16:9": "16:9",
    "9:16": "9:16",
    "4:3": "4:3",
    "3:4": "3:4",
    "3:2": "3:2",
    "2:3": "2:3",
  };
  return mapping[ar] || "1:1";
}

function mapResolution(res: string): string {
  const mapping: Record<string, string> = {
    "1K": "1K",
    "2K": "2K",
    "4K": "4K",
    "8K": "2K",
  };
  return mapping[res] || "2K";
}

/**
 * Generate an image using Gemini (Nano Banana Pro).
 * Returns base64 image data which is then uploaded to Supabase Storage.
 */
export async function generateNanoBananaImage(
  options: NanoBananaOptions,
  geminiApiKey: string,
  userId: string,
  jobId: string
): Promise<string> {
  console.log("[NANO-BANANA] Generating image...");
  console.log("  Prompt:", options.prompt.substring(0, 120));
  console.log("  Aspect Ratio:", options.aspectRatio);
  console.log("  Resolution:", options.resolution);
  console.log("  Reference Images:", options.referenceImageUrls?.length || 0);

  const selectedModel = GEMINI_MODELS[options.nanoBananaModel || "nano_banana_pro"];
  console.log(`[NANO-BANANA] Using model: ${selectedModel} (${options.nanoBananaModel || "nano_banana_pro"})`);

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // Build contents — text prompt, optionally with reference images (max 3 for Gemini)
  let contents: any;

  const refUrls = (options.referenceImageUrls || []).slice(0, 3); // Gemini supports max 3 input images

  if (refUrls.length > 0) {
    try {
      console.log(`[NANO-BANANA] Downloading ${refUrls.length} reference image(s)...`);
      const imageParts: any[] = [];

      for (let i = 0; i < refUrls.length; i++) {
        try {
          const refResponse = await fetch(refUrls[i]);
          if (refResponse.ok) {
            const refBuffer = Buffer.from(await refResponse.arrayBuffer());
            const refMimeType = refResponse.headers.get("content-type") || "image/jpeg";
            const refBase64 = refBuffer.toString("base64");
            console.log(`[NANO-BANANA] Reference image ${i + 1}: ${refBuffer.length} bytes, ${refMimeType}`);
            imageParts.push({
              inlineData: {
                mimeType: refMimeType,
                data: refBase64,
              },
            });
          } else {
            console.warn(`[NANO-BANANA] Failed to download reference image ${i + 1}: ${refResponse.status}`);
          }
        } catch (refErr) {
          console.warn(`[NANO-BANANA] Reference image ${i + 1} fetch error:`, refErr);
        }
      }

      if (imageParts.length > 0) {
        const refLabel = imageParts.length === 1 ? "the reference image" : `the ${imageParts.length} reference images`;
        contents = [
          ...imageParts,
          {
            text: `Study ${refLabel} carefully. Keep the same people, faces, poses, products, clothing, setting, colors, lighting, composition, and overall visual style. Generate a new image that closely matches the look and feel of the reference while applying this direction: ${options.prompt}`,
          },
        ];
      } else {
        console.warn("[NANO-BANANA] All reference image downloads failed, proceeding without them");
        contents = options.prompt;
      }
    } catch (refErr) {
      console.warn("[NANO-BANANA] Reference images processing error:", refErr);
      contents = options.prompt;
    }
  } else {
    contents = options.prompt;
  }

  const response = await ai.models.generateContent({
    model: selectedModel,
    contents,
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: {
        aspectRatio: mapAspectRatio(options.aspectRatio || "1:1") as any,
      },
    },
  });

  console.log("[NANO-BANANA] Response candidates:", JSON.stringify(response.candidates?.length));

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    // Log the full response for debugging
    const finishReason = response.candidates?.[0]?.finishReason;
    console.error("[NANO-BANANA] No parts. finishReason:", finishReason,
      "Full response:", JSON.stringify(response).substring(0, 500));
    throw new Error(`Nano Banana returned no content (finishReason: ${finishReason || "unknown"})`);
  }

  console.log("[NANO-BANANA] Parts count:", parts.length,
    "Types:", parts.map((p: any) => p.text ? "text" : p.inlineData ? "image" : "other").join(","));

  // Find the image part
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart || !imagePart.inlineData) {
    const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join(" ");
    console.error("[NANO-BANANA] No image part found. Text response:", textParts.substring(0, 300));
    throw new Error(`Nano Banana returned no image data. Response: ${textParts.substring(0, 100)}`);
  }

  const base64Data = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType || "image/png";

  if (!base64Data) {
    throw new Error("Nano Banana returned empty image data");
  }

  // Upload to Supabase Storage
  const imageBuffer = Buffer.from(base64Data, "base64");
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const fileName = `image-gen/${userId}/${jobId}.${ext}`;

  console.log(`[NANO-BANANA] Uploading to Supabase: ${fileName} (${imageBuffer.length} bytes)`);

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("videos")
    .getPublicUrl(fileName);

  console.log(`[NANO-BANANA] Image uploaded: ${publicUrl}`);
  return publicUrl;
}
