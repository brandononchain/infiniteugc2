import { getSupabaseAdmin } from "../lib/supabase";
import { withKeyRotation } from "../lib/keys";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";
import { applyCaptionsWithRemotion } from "./remotion-caption-processor";

const HEYGEN_API_BASE = "https://api.heygen.com";
const POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_POLL_ATTEMPTS = 60; // ~30 min max wait

// ── Types ──────────────────────────────────────────────────

interface TranslateResponse {
  code: number;
  data: {
    video_translate_id: string;
  };
  message?: string;
}

interface TranslateStatusResponse {
  code: number;
  data: {
    video_translate_id: string;
    status: "pending" | "processing" | "completed" | "failed" | "success" | "error";
    url?: string;
    title?: string;
    message?: string;
  };
}

interface LanguageItem {
  code: string;
  label: string;
}

// ── In-memory language cache ───────────────────────────────

let cachedLanguages: LanguageItem[] | null = null;
let languageCacheExpiry = 0;
const LANGUAGE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// HeyGen uses plain language names as codes (e.g. "Spanish", not "es-ES")
const FALLBACK_LANGUAGES: LanguageItem[] = [
  { code: "Spanish", label: "Spanish" },
  { code: "French", label: "French" },
  { code: "German", label: "German" },
  { code: "Hindi", label: "Hindi" },
  { code: "Japanese", label: "Japanese" },
  { code: "Portuguese", label: "Portuguese" },
  { code: "Mandarin", label: "Mandarin" },
  { code: "Arabic", label: "Arabic" },
  { code: "Italian", label: "Italian" },
  { code: "Korean", label: "Korean" },
  { code: "Dutch", label: "Dutch" },
  { code: "Polish", label: "Polish" },
];

// ── API Functions ──────────────────────────────────────────

/**
 * List supported dubbing languages from HeyGen API with in-memory cache.
 * Falls back to hardcoded list on failure.
 */
export async function listSupportedLanguages(
  apiKey: string
): Promise<LanguageItem[]> {
  if (cachedLanguages && Date.now() < languageCacheExpiry) {
    return cachedLanguages;
  }

  try {
    // HeyGen uses /target_languages endpoint
    const response = await fetch(
      `${HEYGEN_API_BASE}/v2/video_translate/target_languages`,
      {
        headers: { "x-api-key": apiKey },
      }
    );

    if (!response.ok) {
      console.warn(
        `[DUBBING] Failed to fetch languages: ${response.status}, using fallback`
      );
      return FALLBACK_LANGUAGES;
    }

    const result: any = await response.json();
    console.log("[DUBBING] Raw languages response:", JSON.stringify(result).slice(0, 2000));

    // Normalize response — HeyGen may return various structures
    let parsed: LanguageItem[] | null = null;

    if (result.data && Array.isArray(result.data)) {
      parsed = result.data.map((lang: any) => ({
        code: lang.code || lang.language_code || lang.locale || lang.value,
        label: lang.label || lang.language || lang.name,
      }));
    } else if (result.data && typeof result.data === "object") {
      // Could be { languages: [...] } or similar nested structure
      const arr = result.data.languages || result.data.target_languages || Object.values(result.data);
      if (Array.isArray(arr) && arr.length > 0) {
        parsed = arr.map((lang: any) =>
          typeof lang === "string"
            ? { code: lang, label: lang }
            : { code: lang.code || lang.language_code || lang.locale || lang.value, label: lang.label || lang.language || lang.name || lang.code }
        );
      }
    }

    if (parsed && parsed.length > 0) {
      cachedLanguages = parsed;
    } else {
      cachedLanguages = FALLBACK_LANGUAGES;
    }
    languageCacheExpiry = Date.now() + LANGUAGE_CACHE_TTL_MS;
    return cachedLanguages!;
  } catch (err) {
    console.warn("[DUBBING] Language fetch failed, using fallback:", err);
    return FALLBACK_LANGUAGES;
  }
}

/**
 * Submit a video translation job to HeyGen.
 */
export async function createTranslation(params: {
  apiKey: string;
  videoUrl: string;
  outputLanguage: string;
  title: string;
  mode?: "fast" | "quality";
}): Promise<string> {
  const { apiKey, videoUrl, outputLanguage, title, mode = "quality" } = params;

  console.log(
    `[DUBBING] Creating translation: lang=${outputLanguage}, mode=${mode}, title="${title}"`
  );

  const body: Record<string, unknown> = {
    video_url: videoUrl,
    output_language: outputLanguage, // HeyGen expects plain language names e.g. "Spanish", "French"
    title,
  };

  // Only include mode if quality (fast is default)
  if (mode === "quality") {
    body.mode = "quality";
  }

  const response = await fetch(`${HEYGEN_API_BASE}/v2/video_translate`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HeyGen translate error: ${response.status} - ${text}`
    );
  }

  const result = (await response.json()) as TranslateResponse;
  const translateId = result.data?.video_translate_id;

  if (!translateId) {
    throw new Error(
      "[DUBBING] No video_translate_id returned from HeyGen"
    );
  }

  console.log(`[DUBBING] Translation submitted: ${translateId}`);
  return translateId;
}

/**
 * Check the status of a HeyGen translation job.
 */
export async function checkTranslationStatus(
  translateId: string,
  apiKey: string
): Promise<{
  status: string;
  videoUrl?: string;
  message?: string;
}> {
  const response = await fetch(
    `${HEYGEN_API_BASE}/v2/video_translate/${translateId}`,
    {
      headers: { "x-api-key": apiKey },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HeyGen translate status error: ${response.status} - ${text}`
    );
  }

  const result = (await response.json()) as TranslateStatusResponse;
  return {
    status: result.data.status,
    videoUrl: result.data.url,
    message: result.data.message,
  };
}

/**
 * Poll a HeyGen translation job until completion.
 */
export async function pollTranslationCompletion(
  translateId: string,
  apiKey: string
): Promise<{ videoUrl: string }> {
  console.log("[DUBBING] Waiting 60s before first status check...");
  await new Promise((r) => setTimeout(r, 60000));

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    console.log(
      `[DUBBING] Checking translation status (attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS})...`
    );

    const result = await checkTranslationStatus(translateId, apiKey);

    // HeyGen returns "success" (not "completed") when done
    if ((result.status === "success" || result.status === "completed") && result.videoUrl) {
      console.log(`[DUBBING] Translation completed: ${result.videoUrl}`);
      return { videoUrl: result.videoUrl };
    }

    if (result.status === "failed" || result.status === "error") {
      throw new Error(
        `Translation failed: ${result.message || "Unknown error"}`
      );
    }

    console.log(
      `[DUBBING] Status: ${result.status}, waiting ${POLL_INTERVAL_MS / 1000}s...`
    );
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error("Translation timed out after all retries");
}

/**
 * Full dubbing job orchestration:
 * 1. Read job from DB
 * 2. Get HeyGen key via withKeyRotation
 * 3. Submit translation to HeyGen
 * 4. Poll until complete
 * 5. Download video, upload to Supabase Storage
 * 6. Update job status
 */
export async function processDubbingJob(
  jobId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // 1. Read job
    const { data: job, error: fetchError } = await supabase
      .from("dubbing_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      throw new Error(`Dubbing job ${jobId} not found`);
    }

    // Update status to processing
    await supabase
      .from("dubbing_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    // 2-4. Submit and poll via withKeyRotation
    const { videoUrl: translatedVideoUrl } = await withKeyRotation(
      "heygen",
      "HEYGEN_API_KEY",
      async (apiKey: string) => {
        // Submit translation
        // HeyGen expects plain language names like "Spanish", "French" — use label, not code
        const translateId = await createTranslation({
          apiKey,
          videoUrl: job.source_video_url,
          outputLanguage: job.target_language_label || job.target_language,
          title: `${job.campaign_name || "Dubbed Video"} - ${job.target_language_label || job.target_language}`,
          mode: job.mode as "fast" | "quality",
        });

        // Store HeyGen translate ID
        await supabase
          .from("dubbing_jobs")
          .update({ heygen_translate_id: translateId })
          .eq("id", jobId);

        // Poll until complete
        return pollTranslationCompletion(translateId, apiKey);
      }
    );

    // 5. Download translated video and upload to Supabase Storage
    console.log(`[DUBBING] Downloading translated video...`);
    const videoResponse = await fetchWithTimeout(translatedVideoUrl, {
      timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
    });

    if (!videoResponse.ok) {
      throw new Error(
        `Failed to download translated video: ${videoResponse.status}`
      );
    }

    let videoBuffer: Buffer = Buffer.from(await videoResponse.arrayBuffer());
    console.log(
      `[DUBBING] Downloaded video: ${videoBuffer.length} bytes`
    );

    // 5b. Apply captions if enabled (Whisper transcribes dubbed audio → target-language captions)
    if (job.caption_enabled) {
      console.log(`[DUBBING] Applying captions for job ${jobId}...`);
      try {
        videoBuffer = await applyCaptionsWithRemotion(
          translatedVideoUrl,
          jobId,
          userId,
          "", // no script — Whisper transcribes the dubbed audio directly
          {
            captionEnabled: true,
            captionStyle: job.caption_style,
            captionPosition: job.caption_position,
          }
        );
        console.log(`[DUBBING] Captions applied, buffer: ${videoBuffer.length} bytes`);
      } catch (captionErr: any) {
        console.error(`[DUBBING] Caption processing failed, using uncaptioned video:`, captionErr.message);
        // Continue with original video if caption processing fails
      }
    }

    const fileName = `${userId}/dubbing/${jobId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        `Failed to upload to storage: ${uploadError.message}`
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("videos").getPublicUrl(fileName);

    // 6. Update job as completed
    await supabase
      .from("dubbing_jobs")
      .update({
        status: "completed",
        output_video_url: publicUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[DUBBING] Job ${jobId} completed successfully`);
  } catch (error: any) {
    console.error(`[DUBBING] Job ${jobId} failed:`, error.message);

    // Update job as failed
    const { error: updateError } = await supabase
      .from("dubbing_jobs")
      .update({
        status: "failed",
        error_message: error.message || "Unknown error",
      })
      .eq("id", jobId);

    if (updateError) {
      console.error(`[DUBBING] Failed to update job ${jobId} status to failed:`, updateError.message);
    } else {
      console.log(`[DUBBING] Job ${jobId} status updated to failed`);
    }

    // Refund credits
    try {
      const { data: job } = await supabase
        .from("dubbing_jobs")
        .select("credits_cost")
        .eq("id", jobId)
        .single();

      if (job?.credits_cost) {
        await supabase.rpc("increment_credits", {
          user_id: userId,
          amount: job.credits_cost,
        });
        console.log(
          `[DUBBING] Refunded ${job.credits_cost} credits to user ${userId}`
        );
      }
    } catch (refundErr) {
      console.error(`[DUBBING] Failed to refund credits:`, refundErr);
    }
  }
}
