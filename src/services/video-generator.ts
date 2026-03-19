import { getSupabaseAdmin } from "../lib/supabase";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";
import { generateAudio } from "./elevenlabs";
import {
  uploadImageAsset,
  uploadAudioAsset,
  createVideo,
  pollVideoCompletion,
} from "./heygen";
import {
  submitOmniHumanTask,
  pollOmniHumanCompletion,
  uploadAudioAndGetUrl,
  uploadImageAndGetUrl,
} from "./omnihuman";
import { generateSora2VideoAndGetUrl, cleanupSora2TempFile } from "./sora2";
import { generateOpenAISora2VideoAndGetUrl, cleanupOpenAISora2TempFile } from "./openai-sora";
import { generateSeedanceVideoAndGetUrl } from "./seedance";
import {
  generateHedraVideoAndGetUrl,
  cleanupHedraTempFile,
} from "./hedra";
import type { HedraModel } from "./hedra";
import {
  generateVideo as generateVeo3Video,
  waitForVideoCompletion as waitForVeo3Completion,
  downloadVideo as downloadVeo3Video,
} from "./veo3";
import { generateSora2ProChunk } from "./kie-sora2pro";
import { applyCaptionsWithRemotion } from "./remotion-caption-processor";
import { getKieApiKey, getRotatedKey, getHedraKey, getArkApiKey, getBytePlusCredentials, getOpenAIKey } from "../lib/keys";

type VideoProvider = "heygen" | "omnihuman" | "sora2" | "sora2pro" | "sora2_openai" | "sora2pro_openai" | "seedance" | "hedra_avatar" | "hedra_omnia" | "veo3";

interface JobDetails {
  id: string;
  user_id: string;
  script_text: string;
  avatar_url: string;
  voice_id: string;
  heygen_api_key: string;
  video_provider?: VideoProvider;
  omnihuman_credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  kie_api_key?: string;
  ark_api_key?: string;
  hedra_api_key?: string;
  aspect_ratio?: string;
  duration_seconds?: number | null;
  custom_prompt?: string | null;
  is_agent_refined?: boolean;
}

async function downloadAndStoreVideo(
  videoUrl: string,
  userId: string,
  jobId: string
): Promise<string> {
  const supabase = getSupabaseAdmin();

  console.log(`[VIDEO-GEN] Downloading video from: ${videoUrl}`);
  const videoResponse = await fetchWithTimeout(videoUrl, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });

  if (!videoResponse.ok) {
    throw new Error(`Failed to download video: ${videoResponse.status}`);
  }

  const videoBuffer = await videoResponse.arrayBuffer();
  const fileName = `${userId}/${jobId}.mp4`;

  console.log(`[VIDEO-GEN] Uploading to Supabase Storage: ${fileName}`);
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    console.error("[VIDEO-GEN] Upload error:", uploadError);
    throw new Error(`Failed to upload video: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(fileName);

  console.log(`[VIDEO-GEN] Video stored at: ${publicUrl}`);
  return publicUrl;
}

async function uploadProcessedVideo(
  videoBuffer: Buffer,
  userId: string,
  jobId: string
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const fileName = `${userId}/${jobId}.mp4`;

  console.log(`[VIDEO-GEN] Uploading processed video to Supabase Storage: ${fileName}`);
  console.log(`[VIDEO-GEN] Video size: ${videoBuffer.length} bytes`);

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(fileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    console.error("[VIDEO-GEN] Upload error:", uploadError);
    throw new Error(`Failed to upload processed video: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("videos").getPublicUrl(fileName);

  console.log(`[VIDEO-GEN] Processed video stored at: ${publicUrl}`);
  return publicUrl;
}

async function updateJobStatus(
  jobId: string,
  status: "completed" | "failed",
  data: { videoUrl?: string; errorMessage?: string; errorDetails?: string }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const updateData: Record<string, unknown> = { status };

  if (status === "completed" && data.videoUrl) {
    updateData.video_url = data.videoUrl;
    updateData.completed_at = new Date().toISOString();
  }

  if (status === "failed") {
    updateData.error_message = data.errorMessage || "Something went wrong";
    if (data.errorDetails) {
      updateData.error_details = data.errorDetails;
    }
  }

  const { error } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", jobId);

  if (error) {
    console.error("[VIDEO-GEN] Failed to update job status:", error);
  }
}

async function refundCredits(
  userId: string,
  scriptContent: string,
  videoProvider?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const wordCount = scriptContent.trim().split(/\s+/).filter(Boolean).length;
  let refundAmount = Math.max(1, Math.ceil((wordCount / 150) * 10));
  if (videoProvider === "sora2" || videoProvider === "sora2_openai" || videoProvider === "sora2pro" || videoProvider === "sora2pro_openai" || videoProvider === "veo3") {
    refundAmount = refundAmount * 3;
  } else if (videoProvider === "seedance") {
    refundAmount = refundAmount * 2;
  } else if (videoProvider === "hedra_avatar") {
    refundAmount = refundAmount * 2;
  } else if (videoProvider === "hedra_omnia") {
    refundAmount = refundAmount * 3;
  }

  console.log(`[VIDEO-GEN] Refunding ${refundAmount} credits to user ${userId}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ credits: profile.credits + refundAmount })
      .eq("id", userId);
  }
}

async function processWithHeyGen(job: JobDetails, audioBuffer: Buffer): Promise<string> {
  console.log("[VIDEO-GEN] Using HeyGen provider");

  console.log("[VIDEO-GEN] Step 2: Uploading assets to HeyGen");
  const [imageKey, audioAssetId] = await Promise.all([
    uploadImageAsset(job.avatar_url, job.heygen_api_key),
    uploadAudioAsset(audioBuffer, job.heygen_api_key),
  ]);
  console.log("[VIDEO-GEN] Assets uploaded:", { imageKey, audioAssetId });

  console.log("[VIDEO-GEN] Step 3: Creating Avatar v4 video");
  const videoId = await createVideo(
    imageKey,
    audioAssetId,
    job.heygen_api_key,
    job.aspect_ratio
  );
  console.log(`[VIDEO-GEN] Video creation started: ${videoId}`);

  console.log("[VIDEO-GEN] Step 4: Polling for completion");
  const { videoUrl } = await pollVideoCompletion(videoId, job.heygen_api_key);
  console.log(`[VIDEO-GEN] Video completed: ${videoUrl}`);

  return videoUrl;
}

async function processWithOmniHuman(job: JobDetails, audioBuffer: Buffer): Promise<string> {
  console.log("[VIDEO-GEN] Using OmniHuman 1.5 provider");

  if (!job.omnihuman_credentials) {
    throw new Error("OmniHuman credentials not provided");
  }

  // Upload both image and audio to Supabase to get clean public URLs
  // OmniHuman requires directly accessible URLs without redirects or query params
  console.log("[VIDEO-GEN] Step 2: Uploading image and audio to get public URLs");
  const [imageUrl, audioUrl] = await Promise.all([
    uploadImageAndGetUrl(job.avatar_url, job.user_id, job.id),
    uploadAudioAndGetUrl(audioBuffer, job.user_id, job.id),
  ]);

  console.log("[VIDEO-GEN] Step 3: Submitting OmniHuman task");
  const taskId = await submitOmniHumanTask(
    {
      imageUrl,
      audioUrl,
      resolution: "1080p",
    },
    job.omnihuman_credentials
  );
  console.log(`[VIDEO-GEN] OmniHuman task submitted: ${taskId}`);

  console.log("[VIDEO-GEN] Step 4: Polling for completion");
  const { videoUrl } = await pollOmniHumanCompletion(
    taskId,
    job.omnihuman_credentials
  );
  console.log(`[VIDEO-GEN] Video completed: ${videoUrl}`);

  return videoUrl;
}

async function processWithSora2(job: JobDetails): Promise<string> {
  console.log("[VIDEO-GEN] Using Sora 2 provider (Kie.ai)");

  if (!job.kie_api_key) {
    throw new Error("Kie.ai API key not provided for Sora 2");
  }

  console.log("[VIDEO-GEN] Step 2: Creating and polling Sora 2 video via Kie.ai (with avatar as reference image)");
  const videoUrl = await generateSora2VideoAndGetUrl(
    job.script_text,
    job.kie_api_key,
    job.user_id,
    job.id,
    job.avatar_url,
    job.aspect_ratio,
    job.duration_seconds ?? undefined
  );
  console.log(`[VIDEO-GEN] Sora 2 video completed: ${videoUrl}`);
  return videoUrl;
}

async function processWithVeo3(job: JobDetails): Promise<string> {
  console.log("[VIDEO-GEN] Using VEO3 provider (Kie.ai)");

  // If the agent already composed a complete video prompt, use it directly
  const prompt = job.is_agent_refined
    ? job.script_text
    : [
        "Animate the exact character from the reference image.",
        "The character speaks directly to the camera with natural lip-sync, mouth movements, and subtle facial expressions.",
        "Keep the character's appearance, clothing, and style exactly the same as the reference image throughout the entire video.",
        "The background and setting should match the reference image.",
        "No captions, no subtitles, no text overlays, no background music.",
        "The character is saying the following dialogue:",
        `"${job.script_text}"`,
      ].join(" ");

  console.log("[VIDEO-GEN] Step 2: Generating VEO3 video via Kie.ai");
  const operation = await generateVeo3Video(prompt, {
    aspectRatio: job.aspect_ratio === "16:9" ? "16:9" : "9:16",
    referenceImageUrl: job.avatar_url || undefined,
    durationSeconds: (job.duration_seconds as 4 | 6 | 8) || undefined,
  });

  const completed = await waitForVeo3Completion(operation);
  const resultUrls = completed.response?.resultUrls;
  if (!resultUrls || resultUrls.length === 0) {
    throw new Error("[VEO3] No video URL in response");
  }

  const videoBuffer = await downloadVeo3Video(resultUrls[0]);

  // Upload to Supabase
  const supabase = getSupabaseAdmin();
  const tempFileName = `veo3-temp/${job.user_id}/${job.id}.mp4`;
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(tempFileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`[VEO3] Failed to upload video: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(tempFileName);
  console.log(`[VIDEO-GEN] VEO3 video stored at: ${publicUrl}`);
  return publicUrl;
}

async function processWithSora2Pro(job: JobDetails): Promise<string> {
  console.log("[VIDEO-GEN] Using Sora 2 Pro provider (Kie.ai)");

  if (!job.kie_api_key) {
    throw new Error("[SORA2PRO] Kie.ai API key is required");
  }

  const result = await generateSora2ProChunk(job.script_text, job.kie_api_key, {
    instructions: undefined,
    referenceImageUrl: job.avatar_url || undefined,
    size: "720x1280",
    seconds: "15",
    aspectRatio: job.aspect_ratio,
    durationOverride: job.duration_seconds ?? undefined,
  });

  // Upload to Supabase
  const supabase = getSupabaseAdmin();
  const tempFileName = `sora2pro-temp/${job.user_id}/${job.id}.mp4`;
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(tempFileName, result.videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`[SORA2PRO] Failed to upload video: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(tempFileName);
  console.log(`[VIDEO-GEN] Sora 2 Pro video stored at: ${publicUrl}`);
  return publicUrl;
}

async function processWithSora2OpenAI(job: JobDetails): Promise<string> {
  console.log("[VIDEO-GEN] Using Sora 2 provider (OpenAI direct)");
  const openaiKey = await getOpenAIKey();
  const videoUrl = await generateOpenAISora2VideoAndGetUrl(
    job.script_text,
    openaiKey,
    job.user_id,
    job.id,
    job.avatar_url,
    job.aspect_ratio,
    job.duration_seconds ?? undefined
  );
  console.log(`[VIDEO-GEN] Sora 2 (OpenAI) video completed: ${videoUrl}`);
  return videoUrl;
}

async function processWithSora2ProOpenAI(job: JobDetails): Promise<string> {
  console.log("[VIDEO-GEN] Using Sora 2 Pro provider (OpenAI direct)");
  const openaiKey = await getOpenAIKey();
  const { generateOpenAISora2ProChunk } = await import("./openai-sora");
  const result = await generateOpenAISora2ProChunk(job.script_text, openaiKey, {
    referenceImageUrl: job.avatar_url || undefined,
    aspectRatio: job.aspect_ratio,
    durationOverride: job.duration_seconds ?? undefined,
  });

  const supabase = getSupabaseAdmin();
  const tempFileName = `sora2pro-openai-temp/${job.user_id}/${job.id}.mp4`;
  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(tempFileName, result.videoBuffer, { contentType: "video/mp4", upsert: true });

  if (uploadError) throw new Error(`[SORA2PRO-OPENAI] Failed to upload video: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(tempFileName);
  console.log(`[VIDEO-GEN] Sora 2 Pro (OpenAI) video stored at: ${publicUrl}`);
  return publicUrl;
}

async function processWithSeedance(job: JobDetails): Promise<string> {
  console.log("[VIDEO-GEN] Using Seedance 1.5 Pro provider");

  if (!job.ark_api_key) {
    throw new Error("ARK API key not provided for Seedance");
  }

  console.log("[VIDEO-GEN] Step 2: Creating and polling Seedance video (with avatar as reference image)");
  const videoUrl = await generateSeedanceVideoAndGetUrl(
    job.script_text,
    job.ark_api_key,
    job.user_id,
    job.id,
    job.avatar_url,
    job.aspect_ratio,
    job.duration_seconds ?? undefined
  );
  console.log(`[VIDEO-GEN] Seedance video completed: ${videoUrl}`);
  return videoUrl;
}

async function processWithHedra(job: JobDetails, model: HedraModel, audioBuffer?: Buffer): Promise<string> {
  console.log(`[VIDEO-GEN] Using Hedra provider: ${model}`);

  if (!job.hedra_api_key) {
    throw new Error("Hedra API key not provided");
  }

  console.log("[VIDEO-GEN] Step 2: Generating video via Hedra (with inline TTS)");
  const videoUrl = await generateHedraVideoAndGetUrl(
    job.script_text,
    job.hedra_api_key,
    job.user_id,
    job.id,
    job.avatar_url,
    model,
    undefined, // voiceId — Hedra will pick a default voice for inline TTS
    audioBuffer
  );
  console.log(`[VIDEO-GEN] Hedra video completed: ${videoUrl}`);
  return videoUrl;
}

export async function processVideoGeneration(job: JobDetails): Promise<void> {
  const provider = job.video_provider || "heygen";
  const supabase = getSupabaseAdmin();
  console.log(`[VIDEO-GEN] Starting video generation for job: ${job.id} (provider: ${provider})`);

  try {
    let videoUrl: string;
    const { data: jobRecord } = await supabase
      .from("jobs")
      .select("source_video_url, is_caption_job")
      .eq("id", job.id)
      .single();

    if (jobRecord?.is_caption_job && jobRecord?.source_video_url) {
      console.log(`[VIDEO-GEN] Caption-only job detected, skipping video generation`);
      console.log(`[VIDEO-GEN] Source video: ${jobRecord.source_video_url}`);
      videoUrl = jobRecord.source_video_url;
    } else if (provider === "veo3") {
      videoUrl = await processWithVeo3(job);
    } else if (provider === "sora2pro") {
      videoUrl = await processWithSora2Pro(job);
    } else if (provider === "sora2pro_openai") {
      videoUrl = await processWithSora2ProOpenAI(job);
    } else if (provider === "sora2") {
      videoUrl = await processWithSora2(job);
    } else if (provider === "sora2_openai") {
      videoUrl = await processWithSora2OpenAI(job);
    } else if (provider === "seedance") {
      videoUrl = await processWithSeedance(job);
    } else if (provider === "hedra_avatar" || provider === "hedra_omnia") {
      // Hedra handles TTS internally via inline audio_generation
      // We generate ElevenLabs audio as a fallback, then upload to Hedra
      console.log("[VIDEO-GEN] Step 1: Generating audio via ElevenLabs for Hedra");
      const audioBuffer = await generateAudio(job.script_text, job.voice_id);
      console.log(`[VIDEO-GEN] Audio generated: ${audioBuffer.length} bytes`);
      videoUrl = await processWithHedra(job, provider, audioBuffer);
    } else {
      console.log("[VIDEO-GEN] Step 1: Generating audio via ElevenLabs");
      const audioBuffer = await generateAudio(job.script_text, job.voice_id);
      console.log(`[VIDEO-GEN] Audio generated: ${audioBuffer.length} bytes`);

      if (provider === "omnihuman") {
        videoUrl = await processWithOmniHuman(job, audioBuffer);
      } else {
        videoUrl = await processWithHeyGen(job, audioBuffer);
      }
    }

    console.log("[VIDEO-GEN] Step 4.5: Applying captions and text overlays with Remotion");
    const processedVideoBuffer = await applyCaptionsWithRemotion(
      videoUrl,
      job.id,
      job.user_id,
      job.script_text
    );

    console.log("[VIDEO-GEN] Step 5: Storing processed video in Supabase");
    const storedUrl = await uploadProcessedVideo(
      processedVideoBuffer,
      job.user_id,
      job.id
    );

    if (provider === "sora2") {
      await cleanupSora2TempFile(job.user_id, job.id);
    } else if (provider === "sora2_openai") {
      const supabaseCleanup = getSupabaseAdmin();
      const path = `sora2-openai-temp/${job.user_id}/${job.id}.mp4`;
      await supabaseCleanup.storage.from("videos").remove([path]).catch(() => {});
    } else if (provider === "sora2pro") {
      const supabaseCleanup = getSupabaseAdmin();
      const sora2proTempFile = `sora2pro-temp/${job.user_id}/${job.id}.mp4`;
      await supabaseCleanup.storage.from("videos").remove([sora2proTempFile]).catch(() => {});
    } else if (provider === "sora2pro_openai") {
      const supabaseCleanup = getSupabaseAdmin();
      const path = `sora2pro-openai-temp/${job.user_id}/${job.id}.mp4`;
      await supabaseCleanup.storage.from("videos").remove([path]).catch(() => {});
    } else if (provider === "veo3") {
      const supabaseCleanup = getSupabaseAdmin();
      const veo3TempFile = `veo3-temp/${job.user_id}/${job.id}.mp4`;
      await supabaseCleanup.storage.from("videos").remove([veo3TempFile]).catch(() => {});
    } else if (provider === "hedra_avatar" || provider === "hedra_omnia") {
      await cleanupHedraTempFile(job.user_id, job.id);
    }

    console.log("[VIDEO-GEN] Step 6: Updating job status to completed");
    await updateJobStatus(job.id, "completed", { videoUrl: storedUrl });

    console.log(`[VIDEO-GEN] Job ${job.id} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[VIDEO-GEN] Job ${job.id} failed:`, errorMessage);

    const isDescriptive =
      errorMessage.startsWith("Video download failed:") ||
      errorMessage.startsWith("Download timed out") ||
      errorMessage.startsWith("Failed to download video") ||
      errorMessage.startsWith("Failed to upload video");
    await updateJobStatus(job.id, "failed", {
      errorMessage: isDescriptive ? errorMessage : "Something went wrong",
      errorDetails: errorMessage,
    });

    const { data: jobRow } = await supabase
      .from("jobs")
      .select("is_caption_job")
      .eq("id", job.id)
      .single();
    if (jobRow?.is_caption_job) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", job.user_id)
        .single();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits + 25 })
          .eq("id", job.user_id);
      }
    } else {
      await refundCredits(job.user_id, job.script_text, provider);
    }
  }
}

export async function triggerNextQueuedJobs(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const MAX_CONCURRENT_PROCESSING = 2;

  const { count: processingCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "processing");

  const currentProcessing = processingCount || 0;
  const availableSlots = MAX_CONCURRENT_PROCESSING - currentProcessing;

  if (availableSlots <= 0) {
    console.log("[VIDEO-GEN] No slots available, skipping queue trigger");
    return;
  }

  const { data: queuedJobs } = await supabase
    .from("jobs")
    .select("*, avatars(*), scripts(*)")
    .eq("user_id", userId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(availableSlots);

  if (!queuedJobs || queuedJobs.length === 0) {
    console.log("[VIDEO-GEN] No queued jobs to trigger");
    return;
  }

  console.log(`[VIDEO-GEN] Triggering ${queuedJobs.length} queued job(s)`);

  for (const queuedJob of queuedJobs) {
    const avatar = queuedJob.avatars;
    const script = queuedJob.scripts;
    const videoProvider = (queuedJob.video_provider || "heygen") as VideoProvider;
    const isCaptionJob = (queuedJob as { is_caption_job?: boolean }).is_caption_job === true;

    if (isCaptionJob && script && (queuedJob as { source_video_url?: string }).source_video_url) {
      await supabase
        .from("jobs")
        .update({ status: "processing" })
        .eq("id", queuedJob.id);
      console.log("[VIDEO-GEN] Triggering queued caption job:", queuedJob.id);
      processVideoGeneration({
        id: queuedJob.id,
        user_id: queuedJob.user_id,
        script_text: script.content,
        avatar_url: "",
        voice_id: "",
        heygen_api_key: "",
        video_provider: "heygen",
      }).catch((err) => {
        console.error("[VIDEO-GEN] Error processing queued caption job:", err);
      });
      continue;
    }

    const queueIsPromptDriven = ["sora2", "sora2_openai", "sora2pro", "sora2pro_openai", "veo3"].includes(videoProvider);
    if (!queueIsPromptDriven && (!avatar || !script)) {
      console.log("[VIDEO-GEN] Skipping job - missing assets:", queuedJob.id);
      continue;
    }

    // Voice required for HeyGen/OmniHuman/Hedra (TTS), not for Sora 2/Sora 2 Pro/Seedance/VEO3 (built-in audio)
    let voiceId = "";
    if (!queueIsPromptDriven && videoProvider !== "seedance" && avatar) {
      const { data: voice } = await supabase
        .from("voices")
        .select("elevenlabs_voice_id")
        .eq("id", avatar.voice_id)
        .single();

      if (!voice) {
        console.log("[VIDEO-GEN] Skipping job - no voice:", queuedJob.id);
        continue;
      }
      voiceId = voice.elevenlabs_voice_id;
    }

    let heygenApiKey = "";
    let omnihumanCredentials: { accessKeyId: string; secretAccessKey: string } | undefined;
    let kieApiKey = "";
    let arkApiKey = "";
    let hedraApiKey = "";

    if (videoProvider === "hedra_avatar" || videoProvider === "hedra_omnia") {
      try {
        hedraApiKey = await getHedraKey();
      } catch {
        console.error("[VIDEO-GEN] Hedra API key not configured for job:", queuedJob.id);
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: "Something went wrong",
            error_details: "Hedra API key not configured",
          })
          .eq("id", queuedJob.id);
        continue;
      }
    } else if (videoProvider === "seedance") {
      try {
        arkApiKey = await getArkApiKey();
      } catch {
        console.error("[VIDEO-GEN] ARK API key not configured for job:", queuedJob.id);
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: "Something went wrong",
            error_details: "ARK API key not configured for Seedance",
          })
          .eq("id", queuedJob.id);
        continue;
      }
    } else if (videoProvider === "sora2" || videoProvider === "sora2pro" || videoProvider === "veo3") {
      try {
        kieApiKey = await getKieApiKey();
      } catch {
        console.error("[VIDEO-GEN] Kie.ai API key not available for job:", queuedJob.id);
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: "Something went wrong",
            error_details: "Kie.ai API key not configured",
          })
          .eq("id", queuedJob.id);
        continue;
      }
    } else if (videoProvider === "sora2_openai" || videoProvider === "sora2pro_openai") {
    } else if (videoProvider === "omnihuman") {
      try {
        omnihumanCredentials = await getBytePlusCredentials();
      } catch {
        console.error("[VIDEO-GEN] BytePlus credentials not configured for job:", queuedJob.id);
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: "Something went wrong",
            error_details: "BytePlus credentials not configured",
          })
          .eq("id", queuedJob.id);
        continue;
      }
    } else {
      try {
        heygenApiKey = (await getRotatedKey("heygen")).apiKey;
      } catch {
        console.error("[VIDEO-GEN] No HeyGen API keys available for job:", queuedJob.id);
        await supabase
          .from("jobs")
          .update({
            status: "failed",
            error_message: "Something went wrong",
            error_details: "No HeyGen API keys available",
          })
          .eq("id", queuedJob.id);
        continue;
      }
    }

    await supabase
      .from("jobs")
      .update({ status: "processing" })
      .eq("id", queuedJob.id);

    console.log(`[VIDEO-GEN] Triggering queued job: ${queuedJob.id} (provider: ${videoProvider})`);

    processVideoGeneration({
      id: queuedJob.id,
      user_id: queuedJob.user_id,
      script_text: script?.content || "",
      avatar_url: avatar?.image_url || (queuedJob as { reference_image_url?: string }).reference_image_url || "",
      voice_id: voiceId,
      heygen_api_key: heygenApiKey,
      video_provider: videoProvider,
      omnihuman_credentials: omnihumanCredentials,
      kie_api_key: kieApiKey || undefined,
      ark_api_key: arkApiKey || undefined,
      hedra_api_key: hedraApiKey || undefined,
      aspect_ratio: (queuedJob as { aspect_ratio?: string }).aspect_ratio ?? "9:16",
      duration_seconds: (queuedJob as { duration_seconds?: number | null }).duration_seconds ?? null,
      custom_prompt: (queuedJob as { custom_prompt?: string | null }).custom_prompt ?? null,
    }).catch((err) => {
      console.error("[VIDEO-GEN] Error processing queued job:", err);
    });
  }
}
