import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import {
  processMotionControlLipSync,
  processUnifiedMotionControlPipeline,
  getUnifiedPipelineCreditCost,
  getLipSyncCreditCost,
} from "../services/motion-control";

const router = Router();

const PRESET_MOTIONS = [
  "Cute Baby Dance",
  "Nezha",
  "Heart Gesture Dance",
  "Motorcycle Dance",
  "Subject 3 Dance",
  "Ghost Step Dance",
  "Martial Arts",
  "Running",
  "Poping",
] as const;

// ─────────────────────────────────────────────
// POST /motion-control/generate — Unified pipeline
// Creates job and runs: Kling face-swap → voice clone/TTS → lip-sync
// ─────────────────────────────────────────────

const generateSchema = z
  .object({
    name: z.string().min(1).max(255).default("Untitled Motion Control"),
    prompt: z.string().max(2500).optional().default(""),
    image_url: z.string().url(),
    video_url: z.string().url().optional(),
    preset_motion: z.string().optional(),
    config: z
      .object({
        duration: z.enum(["5", "10", "30"]).optional(),
        mode: z.enum(["std", "pro"]).optional(),
        character_orientation: z.enum(["video", "image"]).optional(),
        keep_original_sound: z.boolean().optional(),
        character_id: z.number().int().min(0).max(10).optional(),
      })
      .optional(),
    // Unified pipeline fields
    script: z.string().min(1).max(5000),
    voice_source: z.enum(["clone_from_video", "existing"]).default("clone_from_video"),
    voice_id: z.string().uuid().optional(),
    lipsync_model: z.enum(["lipsync-2", "lipsync-2-pro"]).default("lipsync-2"),
  })
  .refine((data) => data.video_url || data.preset_motion, {
    message: "Either video_url or preset_motion must be provided",
  })
  .refine((data) => data.voice_source !== "existing" || data.voice_id, {
    message: "voice_id is required when using an existing voice",
  })
  .refine((data) => data.voice_source !== "clone_from_video" || data.video_url, {
    message: "video_url is required when cloning voice from video",
  });

router.post(
  "/generate",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = generateSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const {
        name, prompt, image_url, video_url, preset_motion, config,
        script, voice_source, voice_id, lipsync_model,
      } = parseResult.data;

      const supabase = getSupabaseAdmin();
      const mode = config?.mode || "std";
      const creditsCost = getUnifiedPipelineCreditCost(mode);

      // Validate voice exists and belongs to user (when using existing voice)
      if (voice_source === "existing" && voice_id) {
        const { data: voice, error: voiceError } = await supabase
          .from("voices")
          .select("id")
          .eq("id", voice_id)
          .eq("user_id", userId)
          .single();

        if (voiceError || !voice) {
          res.status(404).json({ error: "Voice not found" });
          return;
        }
      }

      // Credit check
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      if (profile.credits < creditsCost) {
        res.status(402).json({
          error: `Insufficient credits. Need ${creditsCost}, have ${profile.credits}`,
        });
        return;
      }

      // Deduct credits with optimistic locking
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - creditsCost })
        .eq("id", userId)
        .eq("credits", profile.credits);

      if (creditError) {
        res.status(500).json({ error: "Failed to process credits" });
        return;
      }

      // Create motion control job with ALL unified pipeline fields
      const { data: job, error: insertError } = await (supabase as any)
        .from("motion_control_jobs")
        .insert({
          user_id: userId,
          name,
          prompt: prompt || "",
          image_url,
          video_url: video_url || null,
          preset_motion: preset_motion || null,
          config: config || {},
          credits_cost: creditsCost,
          status: "pending",
          // Unified pipeline fields
          voice_source,
          lipsync_script: script,
          lipsync_voice_id: voice_source === "existing" ? voice_id : null,
          lipsync_model,
          lipsync_status: "pending",
          lipsync_credits_cost: getLipSyncCreditCost(),
        })
        .select()
        .single();

      if (insertError || !job) {
        console.error("[MotionControl] Failed to create job:", insertError);
        // Refund credits
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("id", userId);
        res.status(500).json({ error: "Failed to create motion control job" });
        return;
      }

      console.log(
        `[MotionControl] Created unified job ${job.id} for user ${userId} (voice_source: ${voice_source})`
      );

      // Fire unified pipeline (async, don't await)
      processUnifiedMotionControlPipeline(job.id).catch((err) => {
        console.error(`[MotionControl] Unified pipeline failed for ${job.id}:`, err);
      });

      res.json({
        success: true,
        job_id: job.id,
        credits_remaining: profile.credits - creditsCost,
      });
    } catch (error) {
      console.error("[MotionControl] Generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /motion-control/jobs — List all motion control jobs for the authenticated user
router.get(
  "/jobs",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const { data: jobs, count, error } = await (supabase as any)
        .from("motion_control_jobs")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res.status(500).json({ error: "Failed to fetch motion control jobs" });
        return;
      }

      res.json({ jobs: jobs || [], total: count || 0, page, limit });
    } catch (error) {
      console.error("[MotionControl] List error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /motion-control/jobs/:id — Get a single motion control job
router.get(
  "/jobs/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const { data: job, error } = await (supabase as any)
        .from("motion_control_jobs")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();

      if (error || !job) {
        res.status(404).json({ error: "Motion control job not found" });
        return;
      }

      res.json(job);
    } catch (error) {
      console.error("[MotionControl] Get error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/jobs/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const jobId = req.params.id;
      const supabase = getSupabaseAdmin();

      const { data: job, error: fetchError } = await (supabase as any)
        .from("motion_control_jobs")
        .select("id")
        .eq("id", jobId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !job) {
        res.status(404).json({ error: "Motion control job not found" });
        return;
      }

      const { error: deleteError } = await (supabase as any)
        .from("motion_control_jobs")
        .delete()
        .eq("id", jobId)
        .eq("user_id", userId);

      if (deleteError) {
        res.status(500).json({ error: "Failed to delete job" });
        return;
      }

      res.json({ message: "Job deleted" });
    } catch (error) {
      console.error("[MotionControl] Delete error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /motion-control/upload-video — Upload a motion reference video
router.post(
  "/upload-video",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const { video, content_type } = req.body as {
        video: string;
        content_type: string;
      };

      if (!video || !content_type) {
        res.status(400).json({ error: "Missing video or content_type" });
        return;
      }

      const buffer = Buffer.from(video, "base64");
      const ext = content_type.includes("mov") ? "mov" : "mp4";
      const fileName = `motion-control-videos/${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, buffer, {
          contentType: content_type,
          upsert: true,
        });

      if (uploadError) {
        res
          .status(500)
          .json({ error: `Failed to upload video: ${uploadError.message}` });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(fileName);

      res.json({ url: publicUrl });
    } catch (error) {
      console.error("[MotionControl] Upload video error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─────────────────────────────────────────────
// Lip-Sync: Retry/redo voice on a completed motion control video
// ─────────────────────────────────────────────

const lipsyncSchema = z.object({
  voice_id: z.string().uuid(),
  script: z.string().min(1).max(5000),
  model: z.enum(["lipsync-2", "lipsync-2-pro"]).default("lipsync-2"),
});

// POST /motion-control/jobs/:id/lipsync
router.post(
  "/jobs/:id/lipsync",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const jobId = req.params.id as string;
      const parseResult = lipsyncSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { voice_id, script, model } = parseResult.data;
      const supabase = getSupabaseAdmin();

      // Verify job exists, belongs to user, and video is completed
      const { data: job, error: jobError } = await (supabase as any)
        .from("motion_control_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", userId)
        .single();

      if (jobError || !job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      if (job.status !== "completed" || !job.output_video_url) {
        res
          .status(400)
          .json({ error: "Video must be completed before adding voice" });
        return;
      }

      // Prevent re-triggering while already in progress
      if (
        job.lipsync_status === "pending" ||
        job.lipsync_status === "processing"
      ) {
        res
          .status(409)
          .json({ error: "Lip-sync is already in progress for this job" });
        return;
      }

      // Verify voice exists and belongs to user
      const { data: voice, error: voiceError } = await supabase
        .from("voices")
        .select("id")
        .eq("id", voice_id)
        .eq("user_id", userId)
        .single();

      if (voiceError || !voice) {
        res.status(404).json({ error: "Voice not found" });
        return;
      }

      const creditsCost = getLipSyncCreditCost();

      // Credit check
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      if (profile.credits < creditsCost) {
        res.status(402).json({
          error: `Insufficient credits. Need ${creditsCost}, have ${profile.credits}`,
        });
        return;
      }

      // Deduct credits with optimistic locking
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - creditsCost })
        .eq("id", userId)
        .eq("credits", profile.credits);

      if (creditError) {
        res.status(500).json({ error: "Failed to process credits" });
        return;
      }

      // Update job with lip-sync params
      await (supabase as any)
        .from("motion_control_jobs")
        .update({
          lipsync_voice_id: voice_id,
          lipsync_script: script,
          lipsync_model: model,
          lipsync_status: "pending",
          lipsync_error: null,
          lipsync_video_url: null,
          lipsync_credits_cost: creditsCost,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      console.log(
        `[MotionControl] LipSync started for job ${jobId} (model: ${model})`
      );

      // Fire async pipeline
      processMotionControlLipSync(jobId).catch((err) => {
        console.error(
          `[MotionControl] LipSync pipeline failed for ${jobId}:`,
          err
        );
      });

      res.json({
        success: true,
        job_id: jobId,
        credits_remaining: profile.credits - creditsCost,
      });
    } catch (error) {
      console.error("[MotionControl] LipSync error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /motion-control/preset-motions — List available preset motions
router.get("/preset-motions", (_req: Request, res: Response): void => {
  res.json({ presets: PRESET_MOTIONS });
});

export default router;
