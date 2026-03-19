import { getSupabaseAdmin } from "../lib/supabase";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";
import { generateAudio } from "./elevenlabs";

const SYNC_API_BASE = "https://api.sync.so/v2";
const POLL_INTERVAL_MS = 10000;
const MAX_POLL_ATTEMPTS = 120; // ~20 min max wait

type SyncModel = "lipsync-2" | "lipsync-2-pro" | "react-1";
type SyncStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REJECTED";

// Default ElevenLabs voices that Sync.so's built-in TTS can access
const DEFAULT_ELEVENLABS_VOICES = new Set([
  "pNInz6obpgDQGcFmaJgB", // Adam
  "ErXwobaYiN019PkySvjV", // Antoni
  "TxGEqnHWrfWFTfGW9XjX", // Josh
  "VR6AewLTigWG4xSOukaG", // Arnold
  "yoZ06aMxZJJ28mfd3POQ", // Sam
  "21m00Tcm4TlvDq8ikWAM", // Rachel
  "EXAVITQu4vr4xnSDxMaL", // Bella
  "MF3mGyEYCl7XYWbV9V6O", // Elli
  "AZnzlk1XvdvUeBnXmlld", // Domi
]);

interface CreateGenerationParams {
  apiKey: string;
  videoUrl: string;
  script: string;
  voiceId?: string;
  audioUrl?: string; // Pre-generated audio URL (used for cloned voices)
  model: SyncModel;
  options?: {
    sync_mode?: string;
    model_mode?: string;
    prompt?: string;
  };
}

interface GenerationResponse {
  id: string;
  status: SyncStatus;
  model: string;
  outputUrl?: string;
  outputDuration?: number;
  error?: string;
  error_code?: string;
}

/**
 * Create a lip-sync generation on Sync.so.
 * If audioUrl is provided, uses pre-generated audio (for cloned voices).
 * Otherwise, uses Sync.so's built-in ElevenLabs TTS.
 */
export async function createSyncGeneration(
  params: CreateGenerationParams
): Promise<{ id: string; status: SyncStatus }> {
  const { apiKey, videoUrl, script, voiceId, audioUrl, model, options } = params;

  const input: any[] = [
    { type: "video", url: videoUrl },
  ];

  if (audioUrl) {
    // Use pre-generated audio (for cloned/custom voices)
    console.log("[SYNC] Using pre-generated audio URL for cloned voice");
    input.push({ type: "audio", url: audioUrl });
  } else {
    // Use Sync.so's built-in ElevenLabs TTS (for default voices)
    input.push({
      type: "text",
      provider: {
        name: "elevenlabs",
        voiceId: voiceId || "pNInz6obpgDQGcFmaJgB", // Default: Adam voice
        script,
      },
    });
  }

  const body: any = { model, input };

  if (options) {
    body.options = {};
    if (options.sync_mode) body.options.sync_mode = options.sync_mode;
    if (options.model_mode) body.options.model_mode = options.model_mode;
    if (options.prompt) body.options.prompt = options.prompt;
  }

  console.log(
    `[SYNC] Creating generation: model=${model}, script="${script.substring(0, 80)}..."`,
    `\n[SYNC] Video URL: ${videoUrl.substring(0, 120)}...`,
    `\n[SYNC] Request body:`, JSON.stringify(body, null, 2)
  );

  const response = await fetch(`${SYNC_API_BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[SYNC] Create generation failed (${response.status}): ${text}`
    );
  }

  const result: GenerationResponse = await response.json();
  console.log(`[SYNC] Generation created: id=${result.id}, status=${result.status}`);
  return { id: result.id, status: result.status };
}

/**
 * Get the status of a Sync.so generation.
 */
export async function getSyncGenerationStatus(
  apiKey: string,
  generationId: string
): Promise<GenerationResponse> {
  const response = await fetch(`${SYNC_API_BASE}/generate/${generationId}`, {
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `[SYNC] Get generation failed (${response.status}): ${text}`
    );
  }

  return response.json();
}

/**
 * Poll a Sync.so generation until completion or failure.
 */
export async function pollSyncCompletion(
  apiKey: string,
  generationId: string
): Promise<{ outputUrl: string; outputDuration?: number }> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const result = await getSyncGenerationStatus(apiKey, generationId);

    console.log(
      `[SYNC] Poll attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}: status=${result.status}`
    );

    if (result.status === "COMPLETED") {
      if (!result.outputUrl) {
        throw new Error("[SYNC] Generation completed but no output URL returned");
      }
      console.log(`[SYNC] Generation completed: ${result.outputUrl}`);
      return { outputUrl: result.outputUrl, outputDuration: result.outputDuration };
    }

    if (result.status === "FAILED" || result.status === "REJECTED") {
      throw new Error(
        `[SYNC] Generation ${result.status.toLowerCase()}: ${result.error || "Unknown error"}`
      );
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `[SYNC] Generation timed out after ${MAX_POLL_ATTEMPTS} attempts`
  );
}

/**
 * Full orchestration: process a sync job end-to-end.
 * 1. Read the job from DB
 * 2. Create Sync.so generation
 * 3. Poll until complete
 * 4. Download output video
 * 5. Upload to Supabase Storage
 * 6. Update job status
 */
export async function processSyncJob(
  jobId: string,
  apiKey: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // 1. Read job
    const { data: job, error: fetchError } = await supabase
      .from("sync_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      throw new Error(`[SYNC] Job ${jobId} not found`);
    }

    // 2. Check if voice is a cloned/custom voice that needs pre-generated TTS
    let audioUrl: string | undefined;
    const voiceId = job.voice_id || undefined;

    if (voiceId && !DEFAULT_ELEVENLABS_VOICES.has(voiceId)) {
      // This is a cloned voice — Sync.so can't access it via their built-in TTS.
      // Generate TTS audio ourselves using our ElevenLabs account.
      console.log(`[SYNC] Cloned voice detected (${voiceId}), pre-generating TTS audio...`);

      const audioBuffer = await generateAudio(job.script, voiceId);
      console.log(`[SYNC] Generated TTS audio: ${audioBuffer.length} bytes`);

      // Upload audio to Supabase Storage temporarily
      const audioFileName = `${job.user_id}/${job.project_id}/${jobId}-tts.mp3`;
      const { error: audioUploadError } = await supabase.storage
        .from("sync-outputs")
        .upload(audioFileName, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });

      if (audioUploadError) {
        throw new Error(`[SYNC] Failed to upload TTS audio: ${audioUploadError.message}`);
      }

      // Get a signed URL for the audio (2 hours)
      const { data: audioSignedData, error: audioSignedError } = await supabase.storage
        .from("sync-outputs")
        .createSignedUrl(audioFileName, 60 * 60 * 2);

      if (audioSignedError || !audioSignedData?.signedUrl) {
        throw new Error(`[SYNC] Failed to create audio signed URL: ${audioSignedError?.message}`);
      }

      audioUrl = audioSignedData.signedUrl;
      console.log(`[SYNC] TTS audio uploaded and signed URL generated`);
    }

    // Create generation
    const { id: generationId } = await createSyncGeneration({
      apiKey,
      videoUrl: job.input_video_url,
      script: job.script,
      voiceId: voiceId,
      audioUrl,
      model: job.model as SyncModel,
      options: job.options || {},
    });

    // Update job with generation ID and status
    await supabase
      .from("sync_jobs")
      .update({
        sync_generation_id: generationId,
        status: "processing",
      })
      .eq("id", jobId);

    // 3. Poll until complete
    const { outputUrl, outputDuration } = await pollSyncCompletion(
      apiKey,
      generationId
    );

    // 4. Download output video
    console.log(`[SYNC] Downloading output video: ${outputUrl}`);
    const videoResponse = await fetchWithTimeout(outputUrl, {
      timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
    });
    if (!videoResponse.ok) {
      throw new Error(
        `[SYNC] Failed to download output video: ${videoResponse.status}`
      );
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
    console.log(`[SYNC] Downloaded video: ${videoBuffer.length} bytes`);

    // 5. Upload to Supabase Storage
    const fileName = `${job.user_id}/${job.project_id}/${jobId}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("sync-outputs")
      .upload(fileName, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`[SYNC] Failed to upload to storage: ${uploadError.message}`);
    }

    // Generate a signed URL (valid for 7 days)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("sync-outputs")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(`[SYNC] Failed to create signed URL: ${signedError?.message}`);
    }

    // 6. Update job as completed
    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        output_video_url: signedData.signedUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`[SYNC] Job ${jobId} completed successfully`);
  } catch (error: any) {
    console.error(`[SYNC] Job ${jobId} failed:`, error.message);

    // Update job as failed
    await supabase
      .from("sync_jobs")
      .update({
        status: "failed",
        error: error.message || "Unknown error",
      })
      .eq("id", jobId);
  }
}
