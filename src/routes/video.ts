import { Router, Request, Response } from "express";
import { z } from "zod";
import { internalAuthMiddleware } from "../middleware/auth";
import { processVideoGeneration, triggerNextQueuedJobs } from "../services/video-generator";
import { getSupabaseAdmin } from "../lib/supabase";
import { calculateVideoCost } from "../lib/credits";
import { getKieApiKey, getArkApiKey, getHedraKey, getBytePlusCredentials, getAnthropicKey } from "../lib/keys";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";
import { refinePromptWithAgent, agentActivityEmitter } from "../services/agent-orchestrator";

const router = Router();

const generateVideoSchema = z.object({
  job_id: z.string().uuid(),
  script_text: z.string().default(""),
  avatar_url: z.string().default(""),
  voice_id: z.string().default(""),
  heygen_api_key: z.string().default(""),
  video_provider: z.enum(["heygen", "omnihuman", "sora2", "sora2pro", "sora2_openai", "sora2pro_openai", "seedance", "hedra_avatar", "hedra_omnia", "veo3"]).default("heygen"),
  aspect_ratio: z.string().optional().default("9:16"),
  duration_seconds: z.number().int().positive().nullable().optional().default(null),
  custom_prompt: z.string().max(2000).nullable().optional().default(null),
  template_id: z.string().max(100).optional(),
});

router.post(
  "/generate",
  internalAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = generateVideoSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid payload",
        });
        return;
      }

      const { job_id, script_text, avatar_url, voice_id, heygen_api_key, video_provider, aspect_ratio, duration_seconds, custom_prompt, template_id } =
        parseResult.data;

      const supabase = getSupabaseAdmin();

      const { data: job, error: fetchError } = await supabase
        .from("jobs")
        .select("id, user_id, status")
        .eq("id", job_id)
        .single();

      if (fetchError || !job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      if (job.status !== "processing") {
        res.status(400).json({ error: "Job is not in processing state" });
        return;
      }

      let kieApiKey: string | undefined;
      if (video_provider === "sora2" || video_provider === "sora2pro" || video_provider === "veo3") {
        try {
          kieApiKey = await getKieApiKey();
        } catch {
          res.status(503).json({ error: `${video_provider === "veo3" ? "VEO3" : video_provider === "sora2pro" ? "Sora 2 Pro" : "Sora 2"} is not configured. Contact support.` });
          return;
        }
      }

      let arkApiKey: string | undefined;
      if (video_provider === "seedance") {
        try {
          arkApiKey = await getArkApiKey();
        } catch {
          res.status(503).json({ error: "Seedance is not configured. Contact support." });
          return;
        }
      }

      let hedraApiKey: string | undefined;
      if (video_provider === "hedra_avatar" || video_provider === "hedra_omnia") {
        try {
          hedraApiKey = await getHedraKey();
        } catch {
          res.status(503).json({ error: "Hedra is not configured. Contact support." });
          return;
        }
      }

      let omnihumanCredentials: { accessKeyId: string; secretAccessKey: string } | undefined;
      if (video_provider === "omnihuman") {
        try {
          omnihumanCredentials = await getBytePlusCredentials();
        } catch {
          res.status(503).json({ error: "OmniHuman is not configured. Contact support." });
          return;
        }
      }

      // Agent refinement for Sora/VEO3 with a style template
      let finalScriptText = script_text;
      let isAgentRefined = false;
      if (template_id && ["sora2", "sora2pro", "veo3"].includes(video_provider)) {
        try {
          const anthropicKey = await getAnthropicKey();
          finalScriptText = await refinePromptWithAgent(template_id, script_text || custom_prompt || "", anthropicKey, "video", job_id);
          isAgentRefined = true;
          console.log(`[VIDEO] Agent-refined prompt for "${template_id}" on job ${job_id}`);
        } catch (err) {
          console.error("[VIDEO] Agent refinement failed, using original prompt:", err);
        }
      }

      if (isAgentRefined) {
        agentActivityEmitter.emit("activity", { type: "video_generation_started", jobId: job_id, timestamp: Date.now() });
      }

      processVideoGeneration({
        id: job_id,
        user_id: job.user_id,
        script_text: finalScriptText,
        avatar_url,
        voice_id,
        heygen_api_key,
        video_provider,
        omnihuman_credentials: omnihumanCredentials,
        kie_api_key: kieApiKey,
        ark_api_key: arkApiKey,
        hedra_api_key: hedraApiKey,
        aspect_ratio,
        duration_seconds,
        custom_prompt,
        is_agent_refined: isAgentRefined,
      })
        .then(() => triggerNextQueuedJobs(job.user_id))
        .catch((err) => {
          console.error("[VIDEO] Error in background processing:", err);
        });

      res.json({ success: true, message: "Video generation started" });
    } catch (error) {
      console.error("Video generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

const callbackSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  video_url: z.string().url().nullable().optional(),
  error_message: z.string().nullable().optional(),
});

router.post(
  "/callback",
  internalAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = callbackSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid payload",
        });
        return;
      }

      const { job_id, status, video_url, error_message } = parseResult.data;
      const supabase = getSupabaseAdmin();

      const { data: job, error: fetchError } = await supabase
        .from("jobs")
        .select("id, status, user_id, scripts(content)")
        .eq("id", job_id)
        .single();

      if (fetchError || !job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      if (job.status === "completed" || job.status === "failed") {
        res.status(409).json({ error: "Job already finalized" });
        return;
      }

      const updateData: Record<string, unknown> = { status };

      if (status === "completed" && video_url) {
        let storedUrl: string | null = null;
        try {
          console.log("[CALLBACK] Downloading video from HeyGen:", video_url);
          const videoResponse = await fetchWithTimeout(video_url, { timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS });
          if (videoResponse.ok) {
            const videoBuffer = await videoResponse.arrayBuffer();
            const fileName = `${job.user_id}/${job_id}.mp4`;

            const { error: uploadError } = await supabase.storage
              .from("videos")
              .upload(fileName, videoBuffer, {
                contentType: "video/mp4",
                upsert: true,
              });

            if (!uploadError) {
              const {
                data: { publicUrl },
              } = supabase.storage.from("videos").getPublicUrl(fileName);
              storedUrl = publicUrl;
            }
          }
        } catch (downloadError) {
          console.error("[CALLBACK] Error downloading video:", downloadError);
        }
        updateData.video_url = storedUrl || video_url;
        updateData.completed_at = new Date().toISOString();
      }

      if (status === "failed") {
        updateData.error_message = "Something went wrong";
        if (error_message) {
          updateData.error_details = error_message;
        }

        const scriptData = (job as { scripts?: { content: string } | { content: string }[] }).scripts;
        const script = Array.isArray(scriptData) ? scriptData[0] : scriptData;
        if (script?.content) {
          const refundAmount = calculateVideoCost(script.content);
          console.log("[CALLBACK] Refunding", refundAmount, "credits to user", job.user_id);

          const { data: profile } = await supabase
            .from("profiles")
            .select("credits")
            .eq("id", job.user_id)
            .single();

          if (profile) {
            await supabase
              .from("profiles")
              .update({ credits: profile.credits + refundAmount })
              .eq("id", job.user_id);
          }
        }
      }

      const { error: updateError } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", job_id);

      if (updateError) {
        res.status(500).json({ error: "Failed to update job" });
        return;
      }

      await triggerNextQueuedJobs(job.user_id);

      res.json({ success: true });
    } catch (error) {
      console.error("Callback error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Trigger queue processing for a user (called after mass campaign creates queued jobs)
router.post(
  "/trigger-queue",
  internalAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = req.body;

      if (!user_id || typeof user_id !== "string") {
        res.status(400).json({ error: "user_id is required" });
        return;
      }

      console.log("[VIDEO] Triggering queue processing for user:", user_id);

      // Fire and forget — don't block the response
      triggerNextQueuedJobs(user_id).catch((err) => {
        console.error("[VIDEO] Error triggering queue:", err);
      });

      res.json({ success: true, message: "Queue trigger initiated" });
    } catch (error) {
      console.error("Trigger queue error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
