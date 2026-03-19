import { Router } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { splitScript, calculateTotalChunks } from "../services/script-splitter";
import {
  calculatePremiumVideoCost,
  calculatePremiumChunks,
  getWordCount,
} from "../lib/credits";
import {
  generateVideo,
  waitForVideoCompletion,
  downloadVideo,
  ImageRejectedError,
  InsufficientCreditsError,
} from "../services/veo3";
import {
  generateSora2ProChunk,
  Sora2ProTimeoutError,
  Sora2ProContentPolicyError,
  pollTaskCompletion as pollSora2ProTask,
} from "../services/kie-sora2pro";
import { getKieApiKey, getBytePlusCredentials } from "../lib/keys";
import { generateAudio } from "../services/elevenlabs";
import {
  submitOmniHumanTask,
  pollOmniHumanCompletion,
  uploadAudioAndGetUrl,
  uploadImageAndGetUrl,
} from "../services/omnihuman";
import { triggerStitching } from "../services/lambda-invoker";
import { extractLastFrame } from "../services/frame-extractor";
import { uploadFrame } from "../services/frame-uploader";
import { analyzeFrame } from "../services/frame-analyzer";
import { buildVEO3UGCPrompt } from "../services/prompt-builder";
import { splitAudioByDuration, estimateAudioChunks } from "../services/audio-splitter";

const router = Router();

// Buffer: if overflow is ≤ BUFFER_WORDS, keep as one chunk instead of splitting
const BUFFER_WORDS = 5;

const createJobSchema = z.object({
  script_content: z.string().min(1).max(5000),
  keyframe_image_url: z.string().url().optional(),
  campaign_name: z.string().max(255).optional(),
  instructions: z.string().max(2000).optional(),
  video_provider: z.enum(["veo3", "sora2pro", "sora2pro_openai", "omnihuman"]).default("veo3"),
  voice_id: z.string().uuid().optional(),
});

const generateJobSchema = z.object({
  preview_splits: z.boolean().optional(),
});

// Dynamic chunk estimation using Gemini — called from frontend as user types
router.post("/estimate", authMiddleware, async (req, res) => {
  try {
    const { script_content, video_provider } = req.body;

    if (!script_content || typeof script_content !== "string") {
      return res.status(400).json({ error: "Script content is required" });
    }

    const costPerChunk = (video_provider === "sora2pro" || video_provider === "sora2pro_openai") ? 75 : video_provider === "omnihuman" ? 40 : 50;
    const isSora2Pro = video_provider === "sora2pro" || video_provider === "sora2pro_openai";
    const isOmniHuman = video_provider === "omnihuman";
    const targetWords = isSora2Pro ? 40 : isOmniHuman ? 30 : 25;
    const chunkDuration = isSora2Pro ? "15-second" : isOmniHuman ? "20-second" : "8-second";

    const wordCount = getWordCount(script_content);
    if (wordCount < 5) {
      return res.json({ chunks: 0, credits: 0, wordCount, reasoning: "Script too short" });
    }

    // OmniHuman: audio-duration-based estimation (no Gemini AI needed)
    if (isOmniHuman) {
      const chunks = estimateAudioChunks(wordCount, 60);
      const estimatedDuration = Math.round(wordCount / 2.5);
      return res.json({
        chunks,
        credits: chunks * costPerChunk,
        wordCount,
        reasoning: `Estimated ~${estimatedDuration}s of audio → ${chunks} segment${chunks > 1 ? "s" : ""} of ~20s each.`,
      });
    }

    // For very short scripts (within target + buffer), skip Gemini call
    if (wordCount <= targetWords + BUFFER_WORDS) {
      return res.json({
        chunks: 1,
        credits: costPerChunk,
        wordCount,
        reasoning: `Short script — fits in a single ${chunkDuration} video chunk.`,
      });
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const { getGeminiKey } = await import("../lib/keys");
    const geminiKey = await getGeminiKey();
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const wordRange = isSora2Pro ? "~35-45" : isOmniHuman ? "~25-35" : "~20-30";
    const prompt = `You are an expert video script editor. Analyze this script and determine the OPTIMAL number of video chunks. Each chunk becomes one ${chunkDuration} video clip that will be stitched into a final video.

ANALYSIS CRITERIA:
1. Each chunk should be ${wordRange} words — enough for natural narration in a ${chunkDuration} clip
2. NEVER split in the middle of a sentence
3. Consider scene changes, topic shifts, and natural pauses in the narrative
4. Prefer FEWER chunks — each extra chunk costs ${costPerChunk} credits and adds a potential visual transition
5. Group related sentences together for visual consistency
6. Consider pacing — dramatic moments might need their own chunk, fast exposition can be grouped

SCRIPT (${wordCount} words):
"${script_content}"

Respond with ONLY a JSON object (no markdown, no code blocks):
{"chunks": <number>, "reasoning": "<1-2 sentence explanation of your chunking decision>"}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback to formula with buffer logic
      let fallbackChunks = Math.max(2, Math.round(wordCount / targetWords));
      const fbRemainder = wordCount - (fallbackChunks - 1) * targetWords;
      if (fbRemainder > 0 && fbRemainder <= BUFFER_WORDS) {
        fallbackChunks = Math.max(1, fallbackChunks - 1);
      }
      return res.json({
        chunks: fallbackChunks,
        credits: fallbackChunks * costPerChunk,
        wordCount,
        reasoning: `Estimated based on word count (~${targetWords} words per chunk).`,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    let chunks = Math.max(1, Math.min(parsed.chunks || 1, Math.ceil(wordCount / 10))); // Safety bounds
    // Apply buffer logic: if the last chunk would have ≤ BUFFER_WORDS words, merge it back
    if (chunks >= 2) {
      const lastChunkWords = wordCount - (chunks - 1) * targetWords;
      if (lastChunkWords > 0 && lastChunkWords <= BUFFER_WORDS) {
        chunks = Math.max(1, chunks - 1);
      }
    }
    const credits = chunks * costPerChunk;

    return res.json({
      chunks,
      credits,
      wordCount,
      reasoning: parsed.reasoning || "AI-optimized chunking based on script structure.",
    });
  } catch (error: any) {
    console.error("Estimate error:", error.message);
    // Fallback to formula on any error
    const wordCount = getWordCount(req.body?.script_content || "");
    const fbProvider = req.body?.video_provider;
    const fallbackCostPerChunk = (fbProvider === "sora2pro" || fbProvider === "sora2pro_openai") ? 75 : fbProvider === "omnihuman" ? 40 : 50;
    if (fbProvider === "omnihuman") {
      const fallbackChunks = estimateAudioChunks(wordCount, 60);
      return res.json({
        chunks: fallbackChunks,
        credits: fallbackChunks * fallbackCostPerChunk,
        wordCount,
        reasoning: "Estimated based on audio duration.",
      });
    }
    const fallbackTargetWords = (fbProvider === "sora2pro" || fbProvider === "sora2pro_openai") ? 40 : 25;
    let fallbackChunks = wordCount <= fallbackTargetWords + BUFFER_WORDS ? 1 : Math.max(2, Math.round(wordCount / fallbackTargetWords));
    if (fallbackChunks >= 2) {
      const lastChunkWords = wordCount - (fallbackChunks - 1) * fallbackTargetWords;
      if (lastChunkWords > 0 && lastChunkWords <= BUFFER_WORDS) {
        fallbackChunks = Math.max(1, fallbackChunks - 1);
      }
    }
    return res.json({
      chunks: fallbackChunks,
      credits: fallbackChunks * fallbackCostPerChunk,
      wordCount,
      reasoning: "Estimated based on word count (AI unavailable).",
    });
  }
});

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const validation = createJobSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { script_content, keyframe_image_url, campaign_name, instructions, video_provider, voice_id } = validation.data;
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    const wordCount = getWordCount(script_content);
    const isOmniHuman = video_provider === "omnihuman";
    const creditsPerChunk = (video_provider === "sora2pro" || video_provider === "sora2pro_openai") ? 75 : isOmniHuman ? 40 : 50;

    let actualChunks: number;
    let chunkInserts: { premium_job_id: string; chunk_index: number; script_segment: string; status: "pending"; duration_seconds: number }[];

    if (isOmniHuman) {
      // OmniHuman: audio-duration-based chunk estimation (actual splitting at generation time)
      actualChunks = estimateAudioChunks(wordCount, 60);

      // Create placeholder chunks with proportional script text slices
      const words = script_content.trim().split(/\s+/);
      const wordsPerChunk = Math.ceil(words.length / actualChunks);
      chunkInserts = Array.from({ length: actualChunks }, (_, i) => {
        const startWord = i * wordsPerChunk;
        const endWord = Math.min(startWord + wordsPerChunk, words.length);
        return {
          premium_job_id: "", // will be set after job creation
          chunk_index: i,
          script_segment: words.slice(startWord, endWord).join(" "),
          status: "pending" as const,
          duration_seconds: 20,
        };
      });
    } else {
      // VEO3 / Sora2Pro: Gemini AI-based text splitting
      const isSora2ProVariant = video_provider === "sora2pro" || video_provider === "sora2pro_openai";
      const targetWordsPerChunk = isSora2ProVariant ? 40 : 25;
      const chunks = await splitScript(script_content, targetWordsPerChunk, BUFFER_WORDS);
      actualChunks = chunks.length;
      const chunkDurationSeconds = isSora2ProVariant ? 15 : 8;
      chunkInserts = chunks.map((chunk) => ({
        premium_job_id: "", // will be set after job creation
        chunk_index: chunk.index,
        script_segment: chunk.text,
        status: "pending" as const,
        duration_seconds: chunkDurationSeconds,
      }));
    }

    const creditsCost = actualChunks * creditsPerChunk;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", authReq.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    if (profile.credits < creditsCost) {
      return res.status(400).json({
        error: "Insufficient credits",
        required: creditsCost,
        available: profile.credits,
      });
    }

    const { data: job, error: jobError } = await supabase
      .from("premium_jobs")
      .insert({
        user_id: authReq.user.id,
        script_content,
        keyframe_image_url: keyframe_image_url || null,
        campaign_name: (campaign_name && campaign_name.trim()) ? campaign_name.trim() : null,
        instructions: (instructions && instructions.trim()) ? instructions.trim() : null,
        video_provider,
        voice_id: isOmniHuman ? (voice_id || null) : null,
        total_chunks: actualChunks,
        status: "draft",
        credits_cost: creditsCost,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Failed to create premium job:", jobError);
      return res.status(500).json({ error: "Failed to create premium job" });
    }

    // Set the job ID on chunk inserts
    chunkInserts = chunkInserts.map((c) => ({ ...c, premium_job_id: job.id }));

    const { error: chunksError } = await supabase
      .from("video_chunks")
      .insert(chunkInserts);

    if (chunksError) {
      console.error("Failed to create video chunks:", chunksError);
      await supabase.from("premium_jobs").delete().eq("id", job.id);
      return res.status(500).json({ error: "Failed to create video chunks" });
    }

    const { data: jobWithChunks } = await supabase
      .from("premium_jobs")
      .select("*, video_chunks(*)")
      .eq("id", job.id)
      .single();

    return res.status(201).json(jobWithChunks);
  } catch (error: any) {
    console.error("Create premium job error:", error);
    return res.status(500).json({ error: error.message });
  }
});

const updateJobSchema = z.object({
  script_content: z.string().min(1).max(5000).optional(),
  keyframe_image_url: z.string().url().optional().nullable(),
  campaign_name: z.string().max(255).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
  video_provider: z.enum(["veo3", "sora2pro", "sora2pro_openai", "omnihuman"]).optional(),
  voice_id: z.string().uuid().optional().nullable(),
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    const { data: existingJob, error: fetchError } = await supabase
      .from("premium_jobs")
      .select("status, template_job_id")
      .eq("id", id)
      .eq("user_id", authReq.user.id)
      .single();

    if (fetchError || !existingJob) {
      return res.status(404).json({ error: "Premium job not found" });
    }

    if (existingJob.status !== "draft") {
      return res.status(400).json({ error: "Only draft jobs can be edited" });
    }

    if (existingJob.template_job_id) {
      return res.status(400).json({ error: "Cannot edit an instance — only templates can be edited" });
    }

    const validation = updateJobSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const updates = validation.data;
    const scriptChanged = updates.script_content !== undefined;
    const providerChanged = updates.video_provider !== undefined;

    const updateFields: any = {};
    if (updates.campaign_name !== undefined) {
      updateFields.campaign_name = updates.campaign_name?.trim() || null;
    }
    if (updates.instructions !== undefined) {
      updateFields.instructions = updates.instructions?.trim() || null;
    }
    if (updates.keyframe_image_url !== undefined) {
      updateFields.keyframe_image_url = updates.keyframe_image_url || null;
    }
    if (updates.video_provider !== undefined) {
      updateFields.video_provider = updates.video_provider;
    }
    if (updates.voice_id !== undefined) {
      updateFields.voice_id = updates.voice_id || null;
    }

    if (scriptChanged || providerChanged) {
      const { data: currentJob } = await supabase
        .from("premium_jobs")
        .select("script_content, video_provider")
        .eq("id", id)
        .single();

      const scriptContent = updates.script_content ?? currentJob!.script_content;
      const videoProvider = updates.video_provider ?? currentJob!.video_provider;
      const isUpdOmniHuman = videoProvider === "omnihuman";

      let actualChunks: number;
      let chunkInserts: any[];

      if (isUpdOmniHuman) {
        // OmniHuman: audio-duration-based estimation
        const wordCount = getWordCount(scriptContent);
        actualChunks = estimateAudioChunks(wordCount, 60);
        const words = scriptContent.trim().split(/\s+/);
        const wordsPerChunk = Math.ceil(words.length / actualChunks);
        chunkInserts = Array.from({ length: actualChunks }, (_, i) => {
          const startWord = i * wordsPerChunk;
          const endWord = Math.min(startWord + wordsPerChunk, words.length);
          return {
            premium_job_id: id,
            chunk_index: i,
            script_segment: words.slice(startWord, endWord).join(" "),
            status: "pending" as const,
            duration_seconds: 20,
          };
        });
      } else {
        const isUpdSora2Pro = videoProvider === "sora2pro" || videoProvider === "sora2pro_openai";
        const updTargetWords = isUpdSora2Pro ? 40 : 25;
        const chunks = await splitScript(scriptContent, updTargetWords, BUFFER_WORDS);
        actualChunks = chunks.length;
        const updChunkDuration = isUpdSora2Pro ? 15 : 8;
        chunkInserts = chunks.map((chunk) => ({
          premium_job_id: id,
          chunk_index: chunk.index,
          script_segment: chunk.text,
          status: "pending" as const,
          duration_seconds: updChunkDuration,
        }));
      }

      const creditsPerChunk = (videoProvider === "sora2pro" || videoProvider === "sora2pro_openai") ? 75 : isUpdOmniHuman ? 40 : 50;
      const creditsCost = actualChunks * creditsPerChunk;

      updateFields.script_content = scriptContent;
      updateFields.total_chunks = actualChunks;
      updateFields.credits_cost = creditsCost;

      const { error: deleteChunksError } = await supabase
        .from("video_chunks")
        .delete()
        .eq("premium_job_id", id);

      if (deleteChunksError) {
        console.error("Failed to delete old chunks:", deleteChunksError);
        return res.status(500).json({ error: "Failed to update chunks" });
      }

      const { error: chunksError } = await supabase
        .from("video_chunks")
        .insert(chunkInserts);

      if (chunksError) {
        console.error("Failed to create new chunks:", chunksError);
        return res.status(500).json({ error: "Failed to update chunks" });
      }
    }

    const { error: updateError } = await supabase
      .from("premium_jobs")
      .update(updateFields)
      .eq("id", id);

    if (updateError) {
      console.error("Failed to update premium job:", updateError);
      return res.status(500).json({ error: "Failed to update premium job" });
    }

    const { data: updatedJob } = await supabase
      .from("premium_jobs")
      .select("*, video_chunks(*)")
      .eq("id", id)
      .single();

    return res.json(updatedJob);
  } catch (error: any) {
    console.error("Update premium job error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/:id/generate", authMiddleware, async (req, res) => {
  try {
    const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    // 1. Fetch the template with its chunks
    const { data: template, error: templateError } = await supabase
      .from("premium_jobs")
      .select("*, video_chunks(*)")
      .eq("id", templateId)
      .eq("user_id", authReq.user.id)
      .single();

    if (templateError || !template) {
      return res.status(404).json({ error: "Premium job template not found" });
    }

    // 2. Validate this is a template (not an instance) and is in draft status
    if (template.template_job_id) {
      return res.status(400).json({ error: "Cannot run an instance — only templates can be run" });
    }

    if (template.status !== "draft") {
      return res.status(400).json({ error: "Template must be in draft status" });
    }

    // 3. Credit check
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", authReq.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "User profile not found" });
    }

    if (profile.credits < template.credits_cost) {
      return res.status(400).json({
        error: "Insufficient credits",
        required: template.credits_cost,
        available: profile.credits,
      });
    }

    // 4. Deduct credits (optimistic locking)
    const { data: updatedProfile, error: deductError } = await supabase
      .from("profiles")
      .update({ credits: profile.credits - template.credits_cost })
      .eq("id", authReq.user.id)
      .eq("credits", profile.credits)
      .select()
      .single();

    if (deductError || !updatedProfile) {
      return res.status(409).json({ error: "Failed to deduct credits" });
    }

    // 5. Create a new instance row (copy template fields, link back to template)
    const { data: instance, error: instanceError } = await supabase
      .from("premium_jobs")
      .insert({
        user_id: authReq.user.id,
        script_content: template.script_content,
        keyframe_image_url: template.keyframe_image_url || null,
        campaign_name: template.campaign_name || null,
        instructions: template.instructions || null,
        video_provider: template.video_provider,
        voice_id: template.voice_id || null,
        total_chunks: template.total_chunks,
        status: "generating",
        credits_cost: template.credits_cost,
        template_job_id: templateId,
      })
      .select()
      .single();

    if (instanceError || !instance) {
      // Refund credits if instance creation fails
      await supabase.rpc("increment_credits", {
        user_id: authReq.user.id,
        amount: template.credits_cost,
      });
      console.error("Failed to create instance:", instanceError);
      return res.status(500).json({ error: "Failed to create job instance" });
    }

    // 6. Create new chunk rows for the instance (copy from template chunks)
    const templateChunks = (template.video_chunks || []).sort(
      (a: any, b: any) => a.chunk_index - b.chunk_index
    );

    const chunkInserts = templateChunks.map((chunk: any) => ({
      premium_job_id: instance.id,
      chunk_index: chunk.chunk_index,
      script_segment: chunk.script_segment,
      status: "pending" as const,
    }));

    const { error: chunksError } = await supabase
      .from("video_chunks")
      .insert(chunkInserts);

    if (chunksError) {
      // Cleanup instance + refund credits if chunks fail
      await supabase.from("premium_jobs").delete().eq("id", instance.id);
      await supabase.rpc("increment_credits", {
        user_id: authReq.user.id,
        amount: template.credits_cost,
      });
      console.error("Failed to create instance chunks:", chunksError);
      return res.status(500).json({ error: "Failed to create video chunks" });
    }

    // 7. Process the INSTANCE (not the template)
    processVideoGeneration(instance.id, authReq.user.id).catch((error) => {
      console.error("Background video generation error:", error);
    });

    // 8. Return instance info
    return res.json({
      message: "Video generation started",
      job_id: instance.id,
      template_job_id: templateId,
      credits_remaining: updatedProfile.credits,
    });
  } catch (error: any) {
    console.error("Generate premium job error:", error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Handles job completion or partial failure based on how many chunks succeeded.
 * Implements fair credit refunding: charge only for completed chunks.
 */
async function handleCompletionOrPartialFailure(
  supabase: any,
  jobId: string,
  userId: string,
  totalCreditsCost: number,
  completedChunks: number,
  totalChunksExpected: number,
  chunkUrls: string[],
  failureError: Error | null,
  videoProvider?: string
): Promise<void> {
  const creditsCostPerChunk = totalCreditsCost / totalChunksExpected;

  // Case 1: Total failure - no chunks completed
  if (completedChunks === 0) {
    console.error(`Job ${jobId}: Total failure, no chunks completed`);

    await supabase
      .from("premium_jobs")
      .update({
        status: "failed",
        error_message: failureError?.message || "Failed to generate any video chunks",
        completed_chunks: 0,
      })
      .eq("id", jobId);

    // Full refund
    await supabase.rpc("increment_credits", {
      user_id: userId,
      amount: totalCreditsCost,
    });

    console.log(`Job ${jobId}: Full refund of ${totalCreditsCost} credits`);
    return;
  }

  // Case 2 & 3: Partial or full completion (1+ chunks)
  const failedChunksCount = totalChunksExpected - completedChunks;
  const refundAmount = Math.round(failedChunksCount * creditsCostPerChunk);

  const isPartial = completedChunks < totalChunksExpected;

  console.log(
    `Job ${jobId}: ${isPartial ? "Partial" : "Full"} completion ${completedChunks}/${totalChunksExpected} chunks`
  );

  await supabase
    .from("premium_jobs")
    .update({
      status: "stitching",
      error_message: isPartial
        ? `Partial completion: ${completedChunks}/${totalChunksExpected} chunks generated. ${failureError?.message || "Generation stopped early."}`
        : null,
      completed_chunks: completedChunks,
    })
    .eq("id", jobId);

  // Partial refund (0 if all completed)
  if (refundAmount > 0) {
    await supabase.rpc("increment_credits", {
      user_id: userId,
      amount: refundAmount,
    });
    console.log(`Job ${jobId}: Partial refund of ${refundAmount} credits for ${failedChunksCount} failed chunks`);
  }

  // Trigger stitching with whatever chunks we have
  // OmniHuman chunks have audio baked in — crossfade would desync lip sync
  const fade = videoProvider === "omnihuman" ? false : undefined;
  await triggerStitching(jobId, userId, totalCreditsCost, chunkUrls, { fade });

  console.log(`Job ${jobId}: Stitching triggered with ${chunkUrls.length} chunks (fade=${fade})`);
}

async function processVideoGeneration(
  jobId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  let completedChunksCount = 0;
  let totalChunksExpected = 0;
  let partialFailureError: Error | null = null;

  try {
    const { data: job, error: jobError } = await supabase
      .from("premium_jobs")
      .select("keyframe_image_url, script_content, total_chunks, credits_cost, instructions, video_provider, voice_id, aspect_ratio")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Failed to fetch premium job");
    }

    totalChunksExpected = job.total_chunks;

    const videoProvider = job.video_provider || "veo3";

    // === OMNIHUMAN: Audio-based splitting ===
    // Generate full audio first, split by duration, then create/update chunks to match
    if (videoProvider === "omnihuman") {
      console.log(`[OmniHuman] Starting audio-based generation for job ${jobId}`);

      // 1. Resolve ElevenLabs voice ID
      const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel
      let elevenLabsVoiceId = DEFAULT_VOICE_ID;
      if (job.voice_id) {
        const { data: voice } = await supabase
          .from("voices")
          .select("elevenlabs_voice_id")
          .eq("id", job.voice_id)
          .single();
        if (voice?.elevenlabs_voice_id) {
          elevenLabsVoiceId = voice.elevenlabs_voice_id;
          console.log(`[OmniHuman] Using user voice: ${elevenLabsVoiceId}`);
        } else {
          console.warn(`[OmniHuman] Voice ${job.voice_id} not found, using default`);
        }
      }

      // 2. Generate full audio for the entire script
      console.log(`[OmniHuman] Generating full TTS audio via ElevenLabs...`);
      const fullAudioBuffer = await generateAudio(job.script_content, elevenLabsVoiceId);
      console.log(`[OmniHuman] Full audio generated: ${(fullAudioBuffer.length / 1024).toFixed(0)}KB`);

      // 3. Split audio into ~60-second segments (720p supports up to 60s)
      const audioSegments = await splitAudioByDuration(fullAudioBuffer, 60);
      console.log(`[OmniHuman] Audio split into ${audioSegments.length} segments`);

      // 4. Reconcile chunk count if different from estimate
      const creditsPerChunk = 40;
      if (audioSegments.length !== totalChunksExpected) {
        console.log(`[OmniHuman] Reconciling: estimated ${totalChunksExpected} chunks, actual ${audioSegments.length}`);
        const newCreditsCost = audioSegments.length * creditsPerChunk;
        const creditsDiff = newCreditsCost - job.credits_cost;

        if (creditsDiff > 0) {
          // Need more credits - check if user has enough
          const { data: profile } = await supabase
            .from("profiles")
            .select("credits")
            .eq("id", userId)
            .single();
          if (profile && profile.credits >= creditsDiff) {
            await supabase.rpc("increment_credits", { user_id: userId, amount: -creditsDiff });
            console.log(`[OmniHuman] Charged ${creditsDiff} extra credits`);
          }
        } else if (creditsDiff < 0) {
          // Refund excess credits
          await supabase.rpc("increment_credits", { user_id: userId, amount: Math.abs(creditsDiff) });
          console.log(`[OmniHuman] Refunded ${Math.abs(creditsDiff)} credits`);
        }

        // Delete old chunks, create new ones matching actual segments
        await supabase.from("video_chunks").delete().eq("premium_job_id", jobId);
        const words = job.script_content.trim().split(/\s+/);
        const totalDuration = audioSegments.reduce((sum, s) => sum + s.durationSeconds, 0);
        const newChunkInserts = audioSegments.map((seg) => {
          // Proportional text slice based on time
          const startFrac = seg.startSeconds / totalDuration;
          const endFrac = seg.endSeconds / totalDuration;
          const startWord = Math.floor(startFrac * words.length);
          const endWord = Math.min(Math.ceil(endFrac * words.length), words.length);
          return {
            premium_job_id: jobId,
            chunk_index: seg.index,
            script_segment: words.slice(startWord, endWord).join(" "),
            status: "pending" as const,
            duration_seconds: Math.round(seg.durationSeconds),
          };
        });
        await supabase.from("video_chunks").insert(newChunkInserts);

        // Update job
        await supabase.from("premium_jobs").update({
          total_chunks: audioSegments.length,
          credits_cost: newCreditsCost,
        }).eq("id", jobId);

        totalChunksExpected = audioSegments.length;
      }

      // 5. Fetch the (possibly updated) chunks
      const { data: omniChunks, error: omniChunksError } = await supabase
        .from("video_chunks")
        .select("*")
        .eq("premium_job_id", jobId)
        .order("chunk_index");

      if (omniChunksError || !omniChunks) {
        throw new Error("Failed to fetch video chunks after reconciliation");
      }

      // 6. Generate OmniHuman video for each audio segment
      const omniCredentials = await getBytePlusCredentials();
      const chunkUrls: string[] = [];
      const imageUrl = job.keyframe_image_url;
      if (!imageUrl) {
        throw new Error("OmniHuman requires a keyframe/reference image");
      }

      // Upload image once (same reference for all segments)
      const cleanImageUrl = await uploadImageAndGetUrl(imageUrl, userId, `${jobId}-omni`);

      for (let i = 0; i < audioSegments.length; i++) {
        const segment = audioSegments[i];
        const chunk = omniChunks[i];

        try {
          await supabase.from("video_chunks").update({ status: "generating" }).eq("id", chunk.id);
          console.log(`[OmniHuman Seg ${i}] Uploading audio segment (${segment.durationSeconds.toFixed(1)}s)...`);

          const cleanAudioUrl = await uploadAudioAndGetUrl(
            segment.audioBuffer,
            userId,
            `${jobId}-seg${segment.index}`
          );

          // Phase 1: Generate video with OmniHuman (retry re-submits task)
          const GEN_RETRIES = 3;
          let videoUrl: string | null = null;
          let providerVideoId: string | undefined;

          for (let attempt = 1; attempt <= GEN_RETRIES; attempt++) {
            try {
              console.log(`[OmniHuman Seg ${i}] Generation attempt ${attempt}/${GEN_RETRIES}...`);
              const taskId = await submitOmniHumanTask(
                { imageUrl: cleanImageUrl, audioUrl: cleanAudioUrl, resolution: "720p" },
                omniCredentials
              );
              const result = await pollOmniHumanCompletion(taskId, omniCredentials);
              videoUrl = result.videoUrl;
              providerVideoId = taskId;
              break;
            } catch (genError: any) {
              console.warn(`[OmniHuman Seg ${i}] Generation attempt ${attempt} failed: ${genError.message}`);
              if (attempt < GEN_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
              }
              throw genError;
            }
          }

          // Phase 2: Download video (retry reuses same URL, no new task)
          const DL_RETRIES = 3;
          let videoBuffer: Buffer | null = null;
          const { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } = await import("../lib/fetch");

          for (let attempt = 1; attempt <= DL_RETRIES; attempt++) {
            try {
              console.log(`[OmniHuman Seg ${i}] Download attempt ${attempt}/${DL_RETRIES}...`);
              const videoResponse = await fetchWithTimeout(videoUrl!, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });
              if (!videoResponse.ok) {
                throw new Error(`Failed to download OmniHuman video: ${videoResponse.status}`);
              }
              videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
              break;
            } catch (dlError: any) {
              console.warn(`[OmniHuman Seg ${i}] Download attempt ${attempt} failed: ${dlError.message}`);
              if (attempt < DL_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
              }
              throw dlError;
            }
          }

          // Upload chunk video
          const videoPath = `${userId}/${jobId}/chunk_${segment.index}.mp4`;
          await supabase.storage.from("premium-videos").upload(videoPath, videoBuffer!, {
            contentType: "video/mp4",
            upsert: true,
          });

          const { data: publicUrlData } = supabase.storage.from("premium-videos").getPublicUrl(videoPath);

          await supabase.from("video_chunks").update({
            status: "completed",
            video_url: publicUrlData.publicUrl,
            veo3_video_id: providerVideoId,
          }).eq("id", chunk.id);

          chunkUrls.push(publicUrlData.publicUrl);
          completedChunksCount++;
          console.log(`[OmniHuman Seg ${i}] Completed: ${publicUrlData.publicUrl}`);

        } catch (error: any) {
          console.error(`[OmniHuman Seg ${i}] Failed:`, error.message);
          await supabase.from("video_chunks").update({
            status: "failed",
            error_message: error.message,
          }).eq("id", chunk.id);
          partialFailureError = error;
          break;
        }
      }

      // Handle completion or partial failure
      const actualCreditsCost = audioSegments.length * creditsPerChunk;
      await handleCompletionOrPartialFailure(
        supabase, jobId, userId, actualCreditsCost,
        completedChunksCount, totalChunksExpected, chunkUrls, partialFailureError,
        "omnihuman"
      );
      return;
    }

    // === NON-OMNIHUMAN PROVIDERS (VEO3, Sora2Pro) ===
    const { data: chunks, error: chunksError } = await supabase
      .from("video_chunks")
      .select("*")
      .eq("premium_job_id", jobId)
      .order("chunk_index");

    if (chunksError || !chunks) {
      throw new Error("Failed to fetch video chunks");
    }

    const chunkUrls: string[] = [];
    let previousChunkDescription = "";
    let previousChunkVisualDescription = ""; // Gemini Vision analysis of last frame
    let previousChunkReferenceUrl: string | null = null;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isFirstChunk = i === 0;
      const isLastChunk = i === chunks.length - 1;

      try {
        await supabase
          .from("video_chunks")
          .update({ status: "generating" })
          .eq("id", chunk.id);

        // Determine reference image for this chunk (shared across providers)
        let referenceImageUrl: string | undefined;
        if (isFirstChunk && job.keyframe_image_url) {
          referenceImageUrl = job.keyframe_image_url;
          console.log(`[Chunk ${i}] Using user keyframe: ${job.keyframe_image_url}`);
        } else if (!isFirstChunk && previousChunkReferenceUrl) {
          referenceImageUrl = previousChunkReferenceUrl;
          console.log(`[Chunk ${i}] Using previous chunk's last frame: ${previousChunkReferenceUrl}`);
        } else if (!isFirstChunk && job.keyframe_image_url) {
          // Fallback: frame extraction failed but we have the original keyframe.
          // Sora 2 Pro (image-to-video) requires an image — use the keyframe
          // to keep visual continuity rather than failing entirely.
          referenceImageUrl = job.keyframe_image_url;
          console.log(`[Chunk ${i}] Frame extraction unavailable, falling back to original keyframe: ${job.keyframe_image_url}`);
        } else {
          console.log(`[Chunk ${i}] No reference image available, using prompt only`);
        }

        let videoBuffer: Buffer;
        let providerVideoId: string | undefined;

        if (videoProvider === "sora2pro") {
          // === SORA 2 PRO PATH (via Kie.ai API) ===
          console.log(`[Chunk ${i}] Generating with Sora 2 Pro (Kie.ai)...`);
          const apiKey = await getKieApiKey();

          const MAX_RETRIES = 2; // only retry on real failures, not timeouts
          let lastError: any = null;

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              console.log(`[Chunk ${i}] Sora 2 Pro (Kie.ai) attempt ${attempt}/${MAX_RETRIES}...`);
              const result = await generateSora2ProChunk(chunk.script_segment, apiKey, {
                instructions: job.instructions,
                referenceImageUrl,
                previousVisualDescription: previousChunkVisualDescription || undefined,
              });
              videoBuffer = result.videoBuffer;
              providerVideoId = result.videoId;
              lastError = null;
              break;
            } catch (attemptError: any) {
              // --- Content policy: don't retry (same prompt = same rejection) ---
              if (attemptError instanceof Sora2ProContentPolicyError) {
                console.error(`[Chunk ${i}] Content policy rejection — not retrying: ${attemptError.message}`);
                throw attemptError;
              }

              // --- Timeout: continue polling the SAME task (don't create new) ---
              if (attemptError instanceof Sora2ProTimeoutError) {
                const timedOutTaskId = attemptError.taskId;
                console.warn(
                  `[Chunk ${i}] Sora 2 Pro timed out on task ${timedOutTaskId} — extending polling for 10 more min...`
                );
                try {
                  const { videoUrl } = await pollSora2ProTask(apiKey, timedOutTaskId, 20); // 20 × 30s = 10 min extra
                  console.log(`[Chunk ${i}] Extended polling succeeded for task ${timedOutTaskId}`);
                  const dlResponse = await fetch(videoUrl);
                  if (!dlResponse.ok) throw new Error(`Download failed: ${dlResponse.status}`);
                  const arrBuf = await dlResponse.arrayBuffer();
                  videoBuffer = Buffer.from(arrBuf);
                  providerVideoId = timedOutTaskId;
                  lastError = null;
                  break;
                } catch (extendedError: any) {
                  console.error(
                    `[Chunk ${i}] Extended polling also failed for task ${timedOutTaskId}: ${extendedError.message}`
                  );
                  // Don't retry with new task for timeout — it wastes credits
                  throw extendedError;
                }
              }

              // --- Real failure (not timeout): retry with new task ---
              lastError = attemptError;
              console.warn(`[Chunk ${i}] Sora 2 Pro (Kie.ai) attempt ${attempt} failed: ${attemptError.message}`);
              if (attempt < MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                continue;
              }
              throw attemptError;
            }
          }

          if (lastError) throw lastError;

        } else if (videoProvider === "sora2pro_openai") {
          // === SORA 2 PRO PATH (via OpenAI direct) ===
          console.log(`[Chunk ${i}] Generating with Sora 2 Pro (OpenAI direct)...`);
          const { getOpenAIKey } = await import("../lib/keys");
          const { generateOpenAISora2ProChunk } = await import("../services/openai-sora");
          const apiKey = await getOpenAIKey();

          const result = await generateOpenAISora2ProChunk(chunk.script_segment, apiKey, {
            instructions: job.instructions,
            referenceImageUrl,
            previousVisualDescription: previousChunkVisualDescription || undefined,
            aspectRatio: job.aspect_ratio,
          });
          videoBuffer = result.videoBuffer;
          providerVideoId = result.videoId;

        } else {
          // === VEO3 PATH (via Kie.ai API) ===
          const enhancedPrompt = buildVEO3UGCPrompt(
            chunk.script_segment,
            job.instructions,
            previousChunkVisualDescription || null
          );

          console.log(`[Chunk ${i}] Generating with VEO3 (Kie.ai): ${enhancedPrompt.substring(0, 120)}...`);

          const config: any = {
            aspectRatio: "9:16",
          };

          if (referenceImageUrl) {
            config.referenceImageUrl = referenceImageUrl;
          }

          // Kie.ai moderation can still reject — retry with backoff
          const MAX_RETRIES = 3;
          let completedOperation: any;
          let lastError: any = null;

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
              console.log(`[Chunk ${i}] VEO3 attempt ${attempt}/${MAX_RETRIES}...`);
              const operation = await generateVideo(enhancedPrompt, config);
              completedOperation = await waitForVideoCompletion(operation);
              lastError = null;
              break;
            } catch (attemptError: any) {
              lastError = attemptError;
              const isImageRejection = attemptError instanceof ImageRejectedError;
              const isInsufficientCredits = attemptError instanceof InsufficientCreditsError;
              console.warn(`[Chunk ${i}] VEO3 attempt ${attempt} failed: ${attemptError.message}`);

              // Never retry on insufficient credits — user needs to top up Kie.ai
              if (isInsufficientCredits) {
                throw attemptError;
              }

              if (isImageRejection && attempt < MAX_RETRIES) {
                // On image rejection, retry WITHOUT the reference image
                console.warn(`[Chunk ${i}] VEO3 safety filter rejected image — retrying without reference image...`);
                delete config.referenceImageUrl;
                await new Promise((resolve) => setTimeout(resolve, 3000));
                continue;
              }

              if (!isImageRejection && attempt < MAX_RETRIES) {
                console.warn(`[Chunk ${i}] Non-image error — retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
                continue;
              }

              throw new Error(
                isImageRejection
                  ? `VEO3 rejected your keyframe image after ${MAX_RETRIES} attempts. Please try a different keyframe image.`
                  : attemptError.message
              );
            }
          }

          if (lastError) throw lastError;

          // Kie.ai returns resultUrls[] directly in the response
          const resultUrls = completedOperation.response?.resultUrls;
          if (!resultUrls || resultUrls.length === 0) {
            throw new Error("No video URL in VEO3 response");
          }

          const videoUrl = resultUrls[0];
          videoBuffer = await downloadVideo(videoUrl);
          providerVideoId = completedOperation.name; // Kie.ai taskId
        }

        // === SHARED: Upload chunk + update DB + frame extraction ===
        const videoPath = `${userId}/${jobId}/chunk_${chunk.chunk_index}.mp4`;
        const { error: uploadError } = await supabase.storage
          .from("premium-videos")
          .upload(videoPath, videoBuffer!, {
            contentType: "video/mp4",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload chunk video: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("premium-videos")
          .getPublicUrl(videoPath);

        await supabase
          .from("video_chunks")
          .update({
            status: "completed",
            video_url: publicUrlData.publicUrl,
            veo3_video_id: providerVideoId,
          })
          .eq("id", chunk.id);

        chunkUrls.push(publicUrlData.publicUrl);
        completedChunksCount++;
        previousChunkDescription = chunk.script_segment;

        // Extract last frame for next chunk's continuity
        if (!isLastChunk) {
          try {
            console.log(`[Chunk ${i}] Extracting last frame for continuity...`);
            const frameBuffer = await extractLastFrame(videoBuffer!, chunk.chunk_index);

            const [frameUrl, visualDescription] = await Promise.all([
              uploadFrame(frameBuffer, userId, jobId, chunk.chunk_index),
              analyzeFrame(frameBuffer),
            ]);

            console.log(`[Chunk ${i}] Frame extracted and uploaded: ${frameUrl}`);
            previousChunkReferenceUrl = frameUrl;

            if (visualDescription) {
              previousChunkVisualDescription = visualDescription;
              console.log(`[Chunk ${i}] Gemini Vision analysis: ${visualDescription.substring(0, 100)}...`);
            } else {
              previousChunkVisualDescription = "";
              console.warn(`[Chunk ${i}] Gemini Vision analysis returned empty — using reference image only`);
            }

            await supabase
              .from("video_chunks")
              .update({ reference_frame_url: frameUrl })
              .eq("id", chunk.id);

          } catch (frameError: any) {
            console.warn(`[Chunk ${i}] Frame extraction failed: ${frameError.message}`);
            console.warn(`[Chunk ${i}] Continuing without visual reference for next chunk`);
            previousChunkReferenceUrl = null;
            previousChunkVisualDescription = "";
          }
        }
      } catch (error: any) {
        console.error(`Failed to generate chunk ${chunk.chunk_index}:`, error);
        await supabase
          .from("video_chunks")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", chunk.id);

        partialFailureError = error;
        break;
      }
    }

    // Handle completion or partial failure based on how many chunks completed
    await handleCompletionOrPartialFailure(
      supabase,
      jobId,
      userId,
      job.credits_cost,
      completedChunksCount,
      totalChunksExpected,
      chunkUrls,
      partialFailureError
    );
  } catch (error: any) {
    // Catastrophic failure (DB connection, etc.) - this is separate from chunk-level failures
    console.error("Video generation catastrophic failure:", error);

    await supabase
      .from("premium_jobs")
      .update({
        status: "failed",
        error_message: `Total failure: ${error.message}`,
        completed_chunks: 0,
      })
      .eq("id", jobId);

    // Full refund for catastrophic failures
    const { data: job } = await supabase
      .from("premium_jobs")
      .select("credits_cost")
      .eq("id", jobId)
      .single();

    if (job) {
      await supabase.rpc("increment_credits", {
        user_id: userId,
        amount: job.credits_cost,
      });
    }
  }
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    const { data: jobs, error } = await supabase
      .from("premium_jobs")
      .select("*, video_chunks(*)")
      .eq("user_id", authReq.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch premium jobs" });
    }

    return res.json(jobs || []);
  } catch (error: any) {
    console.error("List premium jobs error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    const { data: job, error } = await supabase
      .from("premium_jobs")
      .select("*, video_chunks(*)")
      .eq("id", id)
      .eq("user_id", authReq.user.id)
      .single();

    if (error || !job) {
      return res.status(404).json({ error: "Premium job not found" });
    }

    return res.json(job);
  } catch (error: any) {
    console.error("Get premium job error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.post("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    const { data: job, error: fetchError } = await supabase
      .from("premium_jobs")
      .select("status, credits_cost, user_id")
      .eq("id", id)
      .eq("user_id", authReq.user.id)
      .single();

    if (fetchError || !job) {
      return res.status(404).json({ error: "Premium job not found" });
    }

    if (job.status !== "generating" && job.status !== "stitching") {
      return res.status(400).json({
        error: "Can only cancel jobs that are generating or stitching",
      });
    }

    // Mark job as failed
    await supabase
      .from("premium_jobs")
      .update({ status: "failed", error_message: "Cancelled by user" })
      .eq("id", id);

    // Mark any pending/generating chunks as failed
    await supabase
      .from("video_chunks")
      .update({ status: "failed", error_message: "Cancelled by user" })
      .eq("premium_job_id", id)
      .in("status", ["pending", "generating"]);

    // Refund credits
    const refundAmount = job.credits_cost || 0;
    if (refundAmount > 0) {
      await supabase.rpc("increment_credits", {
        user_id: authReq.user.id,
        amount: refundAmount,
      });
    }

    console.log(`[Premium] Job ${id} cancelled by user, refunded ${refundAmount} credits`);

    return res.json({ success: true, refunded: refundAmount });
  } catch (error: any) {
    console.error("Cancel premium job error:", error);
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    const { data: job, error: fetchError } = await supabase
      .from("premium_jobs")
      .select("status, credits_cost, template_job_id")
      .eq("id", id)
      .eq("user_id", authReq.user.id)
      .single();

    if (fetchError || !job) {
      return res.status(404).json({ error: "Premium job not found" });
    }

    if (job.status === "generating" || job.status === "stitching") {
      return res.status(400).json({
        error: "Cannot delete job while processing",
      });
    }

    const { error: deleteError } = await supabase
      .from("premium_jobs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return res.status(500).json({ error: "Failed to delete job" });
    }

    // No credit refund needed:
    // - Templates (draft): credits are not deducted at create time
    // - Instances: credits are refunded on failure by handleCompletionOrPartialFailure

    return res.json({ message: "Job deleted successfully" });
  } catch (error: any) {
    console.error("Delete premium job error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Create a caption-only draft job in the `jobs` table for a completed premium video
const captionJobSchema = z.object({
  caption_enabled: z.boolean().default(true),
  caption_style: z.any().nullable().optional(),
  caption_position: z
    .object({ x: z.number(), y: z.number() })
    .nullable()
    .optional(),
  text_overlays: z.array(z.any()).default([]),
  campaign_name: z.string().max(255).optional(),
});

router.post("/:id/caption-job", authMiddleware, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const authReq = req as AuthenticatedRequest;
    const supabase = getSupabaseAdmin();

    // Validate body
    const validation = captionJobSchema.safeParse(req.body);
    if (!validation.success) {
      return res
        .status(400)
        .json({ error: validation.error.errors[0].message });
    }

    const {
      caption_enabled,
      caption_style,
      caption_position,
      text_overlays,
      campaign_name,
    } = validation.data;

    // Fetch premium job — must be completed with a final video
    const { data: premiumJob, error: premiumError } = await supabase
      .from("premium_jobs")
      .select("id, script_content, final_video_url, campaign_name, status")
      .eq("id", id)
      .eq("user_id", authReq.user.id)
      .single();

    if (premiumError || !premiumJob) {
      return res.status(404).json({ error: "Premium job not found" });
    }

    if (premiumJob.status !== "completed" || !premiumJob.final_video_url) {
      return res
        .status(400)
        .json({ error: "Premium job must be completed with a video" });
    }

    // Create a script entry for the caption job (Whisper needs script_text fallback)
    const { data: script, error: scriptError } = await supabase
      .from("scripts")
      .insert({
        user_id: authReq.user.id,
        name: `Caption script for ${premiumJob.campaign_name || "Premium Video"}`,
        content: premiumJob.script_content,
      })
      .select()
      .single();

    if (scriptError || !script) {
      console.error("Failed to create script for caption job:", scriptError);
      return res
        .status(500)
        .json({ error: "Failed to create script for caption job" });
    }

    // Create draft job in the jobs table
    const jobName =
      campaign_name ||
      `Captions: ${premiumJob.campaign_name || "Premium Video"}`;

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: authReq.user.id,
        script_id: script.id,
        avatar_id: null,
        campaign_name: jobName,
        video_provider: "heygen", // not used for caption jobs
        status: "draft",
        heygen_id: null,
        video_url: null,
        error_message: null,
        source_video_url: premiumJob.final_video_url,
        is_caption_job: true,
        caption_enabled: caption_enabled,
        caption_style: caption_style || null,
        caption_position: caption_position || { x: 0.5, y: 0.5 },
        text_overlays: text_overlays || [],
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error("Failed to create caption job:", jobError);
      return res.status(500).json({ error: "Failed to create caption job" });
    }

    return res.status(201).json({
      success: true,
      job_id: job.id,
      campaign_name: jobName,
    });
  } catch (error: any) {
    console.error("Create caption job error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// TEST ENDPOINT: Re-stitch existing chunks — NO AUTH, sends directly to SQS
// curl -X POST http://localhost:4000/premium-jobs/restitch \
//   -H "Content-Type: application/json" \
//   -d '{"chunk_urls": ["https://...chunk_0.mp4", "https://...chunk_1.mp4"]}'
router.post("/restitch", async (req, res) => {
  try {
    const { chunk_urls, job_id } = req.body;

    if (!chunk_urls || !Array.isArray(chunk_urls) || chunk_urls.length === 0) {
      return res.status(400).json({
        error: 'Required: chunk_urls (string[]). Optional: job_id (string)',
        example: {
          chunk_urls: ["https://...chunk_0.mp4", "https://...chunk_1.mp4"],
          job_id: "optional-existing-job-id",
        },
      });
    }

    // Use provided job_id or generate a test one
    const testJobId = job_id || `test-restitch-${Date.now()}`;
    const testUserId = "test-user";

    const supabase = getSupabaseAdmin();

    // If a real job_id was provided, update its status
    if (job_id) {
      await supabase
        .from("premium_jobs")
        .update({ status: "stitching", error_message: null })
        .eq("id", job_id);
    }

    // Send directly to SQS for Lambda to pick up
    await triggerStitching(testJobId, testUserId, 0, chunk_urls);

    console.log(`[Restitch] Sent ${chunk_urls.length} chunks to SQS (job: ${testJobId})`);

    return res.json({
      message: "Restitch triggered — check Lambda logs for progress",
      job_id: testJobId,
      chunks: chunk_urls.length,
    });
  } catch (error: any) {
    console.error("Restitch error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
