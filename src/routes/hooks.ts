import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { processHookGeneration } from "../services/hook-pipeline";
import { analyzeVideoForHook } from "../services/video-analyzer";
import { generateHookPrompt } from "../services/hook-prompt-generator";
import { extractHookKeyframe } from "../services/hook-keyframe";

const router = Router();

const HOOK_CREDITS_COST = 15;

const generateHookSchema = z.object({
  source_type: z.enum(["job", "premium_job", "mass_job"]),
  source_id: z.string().uuid(),
});

// POST /hooks/generate — Create and start a hook generation job
router.post(
  "/generate",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = generateHookSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { source_type, source_id } = parseResult.data;
      const supabase = getSupabaseAdmin();

      // Validate source video exists and is completed
      let sourceVideoUrl: string | null = null;
      let campaignName: string | null = null;

      if (source_type === "job") {
        const { data: job } = await supabase
          .from("jobs")
          .select("video_url, campaign_name, user_id")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();

        if (!job || job.user_id !== userId) {
          res.status(404).json({ error: "Completed video not found" });
          return;
        }
        sourceVideoUrl = job.video_url;
        campaignName = job.campaign_name;
      } else if (source_type === "premium_job") {
        const { data: job } = await supabase
          .from("premium_jobs")
          .select("final_video_url, campaign_name, user_id")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();

        if (!job || job.user_id !== userId) {
          res.status(404).json({ error: "Completed premium video not found" });
          return;
        }
        sourceVideoUrl = job.final_video_url;
        campaignName = job.campaign_name;
      } else if (source_type === "mass_job") {
        const { data: job } = await supabase
          .from("mass_jobs")
          .select("video_url, user_id, mass_campaigns(campaign_name)")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();

        if (!job || job.user_id !== userId) {
          res.status(404).json({ error: "Completed mass video not found" });
          return;
        }
        sourceVideoUrl = job.video_url;
        campaignName = (job as any).mass_campaigns?.campaign_name || null;
      }

      if (!sourceVideoUrl) {
        res.status(400).json({ error: "Source video has no URL" });
        return;
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

      if (profile.credits < HOOK_CREDITS_COST) {
        res.status(402).json({
          error: `Insufficient credits. Need ${HOOK_CREDITS_COST}, have ${profile.credits}`,
        });
        return;
      }

      // Deduct credits with optimistic locking
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - HOOK_CREDITS_COST })
        .eq("id", userId)
        .eq("credits", profile.credits);

      if (creditError) {
        res.status(500).json({ error: "Failed to process credits" });
        return;
      }

      // Create hook job
      const hookJobData: Record<string, unknown> = {
        user_id: userId,
        source_video_url: sourceVideoUrl,
        campaign_name: campaignName ? `Hook: ${campaignName}` : "Hook Video",
        credits_cost: HOOK_CREDITS_COST,
        status: "pending",
      };

      // Set the appropriate source FK
      if (source_type === "job") hookJobData.source_job_id = source_id;
      if (source_type === "premium_job") hookJobData.source_premium_job_id = source_id;
      if (source_type === "mass_job") hookJobData.source_mass_job_id = source_id;

      const { data: hookJob, error: hookError } = await supabase
        .from("hook_jobs")
        .insert(hookJobData)
        .select()
        .single();

      if (hookError || !hookJob) {
        console.error("[Hooks] Failed to create hook job:", hookError);
        // Refund credits
        await supabase.rpc("increment_credits", {
          user_id: userId,
          amount: HOOK_CREDITS_COST,
        });
        res.status(500).json({ error: "Failed to create hook job" });
        return;
      }

      console.log(`[Hooks] Created hook job ${hookJob.id} for user ${userId}`);

      // Fire pipeline (async, don't await)
      processHookGeneration(hookJob.id, userId).catch((err) => {
        console.error(`[Hooks] Pipeline failed for ${hookJob.id}:`, err);
      });

      res.json({
        hook_job_id: hookJob.id,
        credits_remaining: profile.credits - HOOK_CREDITS_COST,
        message: "Hook generation started",
      });
    } catch (error) {
      console.error("[Hooks] Generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /hooks — List all hook jobs for the authenticated user
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const { data: hookJobs, count, error } = await supabase
        .from("hook_jobs")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res.status(500).json({ error: "Failed to fetch hook jobs" });
        return;
      }

      res.json({ hook_jobs: hookJobs || [], total: count || 0, page, limit });
    } catch (error) {
      console.error("[Hooks] List error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /hooks/:id — Get a single hook job
router.get(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const { data: hookJob, error } = await supabase
        .from("hook_jobs")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();

      if (error || !hookJob) {
        res.status(404).json({ error: "Hook job not found" });
        return;
      }

      res.json(hookJob);
    } catch (error) {
      console.error("[Hooks] Get error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /hooks/preview — Stress test: run Gemini analysis + GPT-4o prompt WITHOUT VEO3 or credits
router.post(
  "/preview",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = generateHookSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { source_type, source_id } = parseResult.data;
      const supabase = getSupabaseAdmin();

      // Look up the source video URL
      let sourceVideoUrl: string | null = null;

      if (source_type === "job") {
        const { data: job } = await supabase
          .from("jobs")
          .select("video_url, user_id")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();
        if (!job || job.user_id !== userId) {
          res.status(404).json({ error: "Video not found" });
          return;
        }
        sourceVideoUrl = job.video_url;
      } else if (source_type === "premium_job") {
        const { data: job } = await supabase
          .from("premium_jobs")
          .select("final_video_url, user_id")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();
        if (!job || job.user_id !== userId) {
          res.status(404).json({ error: "Video not found" });
          return;
        }
        sourceVideoUrl = job.final_video_url;
      } else if (source_type === "mass_job") {
        const { data: job } = await supabase
          .from("mass_jobs")
          .select("video_url, user_id")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();
        if (!job || job.user_id !== userId) {
          res.status(404).json({ error: "Video not found" });
          return;
        }
        sourceVideoUrl = job.video_url;
      }

      if (!sourceVideoUrl) {
        res.status(400).json({ error: "Source video has no URL" });
        return;
      }

      console.log(`[Hooks Preview] Running analysis + prompt + keyframe for user ${userId}`);

      // Step 1: Gemini analysis
      const analysisStart = Date.now();
      const analysis = await analyzeVideoForHook(sourceVideoUrl);
      const analysisTime = Date.now() - analysisStart;

      // Step 2: GPT-4o hook prompt (with quality gate + dynamic duration)
      const promptStart = Date.now();
      const hookResult = await generateHookPrompt(analysis);
      const promptTime = Date.now() - promptStart;

      // Step 3: Extract reference keyframe (non-blocking, best effort)
      let keyframeUrl: string | null = null;
      let keyframeTime = 0;
      try {
        const kfStart = Date.now();
        const previewId = `preview_${Date.now()}`;
        keyframeUrl = await extractHookKeyframe(sourceVideoUrl, previewId, userId, 1);
        keyframeTime = Date.now() - kfStart;
      } catch (kfErr: any) {
        console.warn(`[Hooks Preview] Keyframe extraction failed: ${kfErr.message}`);
      }

      res.json({
        source_video_url: sourceVideoUrl,
        analysis: {
          full_text: analysis,
          length: analysis.length,
          time_ms: analysisTime,
        },
        hook_prompt: {
          full_text: hookResult.prompt,
          length: hookResult.prompt.length,
          time_ms: promptTime,
          duration_seconds: hookResult.durationSeconds,
          rating: hookResult.rating,
          rating_feedback: hookResult.ratingFeedback,
          attempts: hookResult.attempts,
        },
        keyframe: {
          url: keyframeUrl,
          time_ms: keyframeTime,
        },
        total_time_ms: analysisTime + promptTime + keyframeTime,
      });
    } catch (error: any) {
      console.error("[Hooks Preview] Error:", error);
      res.status(500).json({
        error: error.message || "Preview failed",
        stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
      });
    }
  }
);

export default router;
