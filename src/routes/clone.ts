/**
 * Clone Routes
 *
 * API endpoints for the video cloning feature.
 * Users paste a video URL + their content idea, and the cloner agent
 * extracts the source video's DNA and generates a new video in the same style.
 *
 * Endpoints:
 *   POST /clone/generate       — Start a clone job (auth required, costs 25 credits)
 *   POST /clone/generate-url   — Start a clone job from a raw URL (auth required, costs 25 credits)
 *   GET  /clone                — List all clone jobs for the user
 *   GET  /clone/:id            — Get a single clone job
 *   POST /clone/preview        — Dry-run: analysis + blueprint + prompt (no VEO3, no credits)
 *
 * Advanced (God Mode) endpoints:
 *   POST /clone/advanced       — Advanced clone with scene analysis + product swap + per-scene regen
 *   POST /clone/analyze-scenes — Analyze a video's scenes (dry run, no credits)
 *   POST /clone/swap-preview   — Preview the product swap plan (dry run, no credits)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { processCloneGeneration } from "../services/clone-pipeline";
import { analyzeVideoForCloning } from "../services/clone-analyzer";
import { generateClonePrompt } from "../services/clone-prompt-generator";
import { analyzeVideoScenes } from "../services/scene-analyzer";
import { generateProductSwapPlan } from "../services/product-swap";
import { processAdvancedCloneGeneration, ClonerJobConfig } from "../services/video-cloner-pipeline";

const router = Router();

const CLONE_CREDITS_COST = 25;
const ADVANCED_CLONE_CREDITS_COST = 50;

// ── POST /clone/generate — Clone from an existing completed job ──

const generateCloneSchema = z.object({
  source_type: z.enum(["job", "premium_job", "mass_job"]),
  source_id: z.string().uuid(),
  user_prompt: z.string().min(5).max(5000),
});

router.post(
  "/generate",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = generateCloneSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { source_type, source_id, user_prompt } = parseResult.data;
      const supabase = getSupabaseAdmin();

      // Resolve source video URL
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

      // Create clone job and deduct credits
      const result = await createCloneJob(userId, sourceVideoUrl, user_prompt, campaignName, {
        source_type,
        source_id,
      });

      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("[Clone] Generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── POST /clone/generate-url — Clone from a raw video URL ──

const generateCloneUrlSchema = z.object({
  source_video_url: z.string().url(),
  user_prompt: z.string().min(5).max(5000),
});

router.post(
  "/generate-url",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = generateCloneUrlSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { source_video_url, user_prompt } = parseResult.data;

      const result = await createCloneJob(userId, source_video_url, user_prompt, null, {});

      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("[Clone] Generate-url error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── GET /clone — List all clone jobs ──

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

      const { data: cloneJobs, count, error } = await supabase
        .from("clone_jobs")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res.status(500).json({ error: "Failed to fetch clone jobs" });
        return;
      }

      res.json({ clone_jobs: cloneJobs || [], total: count || 0, page, limit });
    } catch (error) {
      console.error("[Clone] List error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── GET /clone/:id — Get a single clone job ──

router.get(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const { data: cloneJob, error } = await supabase
        .from("clone_jobs")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();

      if (error || !cloneJob) {
        res.status(404).json({ error: "Clone job not found" });
        return;
      }

      res.json(cloneJob);
    } catch (error) {
      console.error("[Clone] Get error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── POST /clone/preview — Dry run (no VEO3, no credits) ──

const previewCloneSchema = z.object({
  source_video_url: z.string().url(),
  user_prompt: z.string().min(5).max(5000),
});

router.post(
  "/preview",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = previewCloneSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { source_video_url, user_prompt } = parseResult.data;

      console.log(`[Clone Preview] Starting analysis + blueprint + prompt generation`);

      // Step 1: Gemini forensic analysis
      const analysisStart = Date.now();
      const analysis = await analyzeVideoForCloning(source_video_url);
      const analysisTime = Date.now() - analysisStart;

      // Step 2: Blueprint + clone prompt (Claude + GPT-5.2)
      const promptStart = Date.now();
      const cloneResult = await generateClonePrompt(analysis, user_prompt);
      const promptTime = Date.now() - promptStart;

      res.json({
        source_video_url,
        user_prompt,
        analysis: {
          full_text: analysis,
          length: analysis.length,
          time_ms: analysisTime,
        },
        blueprint: {
          full_text: cloneResult.blueprint,
          length: cloneResult.blueprint.length,
        },
        clone_prompt: {
          full_text: cloneResult.prompt,
          length: cloneResult.prompt.length,
          time_ms: promptTime,
          duration_seconds: cloneResult.durationSeconds,
          rating: cloneResult.rating,
          rating_feedback: cloneResult.ratingFeedback,
          attempts: cloneResult.attempts,
        },
        total_time_ms: analysisTime + promptTime,
      });
    } catch (error: any) {
      console.error("[Clone Preview] Error:", error);
      res.status(500).json({
        error: error.message || "Preview failed",
      });
    }
  }
);

// ─────────────────────────────────────────────────────
// ADVANCED (GOD MODE) ENDPOINTS
// ─────────────────────────────────────────────────────

// ── POST /clone/advanced — Full video cloning with product swap ──

const advancedCloneSchema = z.object({
  source_video_url: z.string().url(),
  product_name: z.string().min(1).max(200),
  product_description: z.string().min(5).max(2000),
  product_image_url: z.string().url().optional(),
  product_brand: z.string().max(200).optional(),
  product_category: z.string().max(100).optional(),
  new_script: z.string().max(10000).optional(),
  avatar_image_url: z.string().url().optional(),
  voice_id: z.string().uuid().optional(),
  clone_voice_from_source: z.boolean().optional().default(false),
  preferred_model: z.enum(["sora2pro", "veo3"]).optional().default("sora2pro"),
  aspect_ratio: z.enum(["9:16", "16:9"]).optional(),
});

router.post(
  "/advanced",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = advancedCloneSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const data = parseResult.data;
      const supabase = getSupabaseAdmin();

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

      if (profile.credits < ADVANCED_CLONE_CREDITS_COST) {
        res.status(402).json({
          error: `Insufficient credits. Need ${ADVANCED_CLONE_CREDITS_COST}, have ${profile.credits}`,
        });
        return;
      }

      // Deduct credits
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - ADVANCED_CLONE_CREDITS_COST })
        .eq("id", userId)
        .eq("credits", profile.credits);

      if (creditError) {
        res.status(500).json({ error: "Failed to process credits" });
        return;
      }

      // Create clone job
      const cloneJobData: Record<string, unknown> = {
        user_id: userId,
        source_video_url: data.source_video_url,
        user_prompt: `Product swap: ${data.product_name} — ${data.product_description}`,
        campaign_name: `Advanced Clone: ${data.product_name}`,
        credits_cost: ADVANCED_CLONE_CREDITS_COST,
        status: "pending",
        clone_mode: "advanced",
      };

      const { data: cloneJob, error: cloneError } = await supabase
        .from("clone_jobs")
        .insert(cloneJobData)
        .select()
        .single();

      if (cloneError || !cloneJob) {
        console.error("[Clone Advanced] Failed to create job:", cloneError);
        // Refund
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("id", userId);
        res.status(500).json({ error: "Failed to create clone job" });
        return;
      }

      // Build config
      const config: ClonerJobConfig = {
        userProduct: {
          name: data.product_name,
          description: data.product_description,
          imageUrl: data.product_image_url,
          brandName: data.product_brand,
          category: data.product_category,
        },
        newScript: data.new_script,
        avatarImageUrl: data.avatar_image_url,
        voiceId: data.voice_id,
        cloneVoiceFromSource: data.clone_voice_from_source,
        preferredModel: data.preferred_model,
        aspectRatio: data.aspect_ratio,
      };

      console.log(`[Clone Advanced] Created job ${cloneJob.id} for user ${userId}`);

      // Fire pipeline (async)
      processAdvancedCloneGeneration(cloneJob.id, userId, config).catch((err) => {
        console.error(`[Clone Advanced] Pipeline failed for ${cloneJob.id}:`, err);
      });

      res.json({
        clone_job_id: cloneJob.id,
        credits_remaining: profile.credits - ADVANCED_CLONE_CREDITS_COST,
        message: "Advanced clone generation started — scene analysis, product swap, and per-scene regeneration in progress",
        mode: "advanced",
      });
    } catch (error) {
      console.error("[Clone Advanced] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── POST /clone/analyze-scenes — Dry-run scene analysis (no credits) ──

const analyzeSceneSchema = z.object({
  source_video_url: z.string().url(),
});

router.post(
  "/analyze-scenes",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = analyzeSceneSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { source_video_url } = parseResult.data;

      console.log("[Clone AnalyzeScenes] Starting scene analysis...");
      const startTime = Date.now();

      const sceneAnalysis = await analyzeVideoScenes(source_video_url);

      const elapsed = Date.now() - startTime;

      res.json({
        source_video_url,
        resolved_video_url: sceneAnalysis.resolvedVideoUrl || source_video_url,
        analysis_time_ms: elapsed,
        total_duration: sceneAnalysis.totalDuration,
        aspect_ratio: sceneAnalysis.aspectRatio,
        scene_count: sceneAnalysis.sceneCount,
        scenes: sceneAnalysis.scenes.map((s) => ({
          index: s.index,
          type: s.type,
          start: s.startSeconds,
          end: s.endSeconds,
          duration: s.durationSeconds,
          description: s.description,
          dialogue: s.dialogue,
          products: s.products,
          is_swappable: s.isSwappable,
          swap_difficulty: s.swapDifficulty,
          swap_notes: s.swapNotes,
          energy: s.energy,
        })),
        overall_style: sceneAnalysis.overallStyle,
        speaker_profile: sceneAnalysis.speakerProfile,
        product_summary: sceneAnalysis.productSummary,
        script_full: sceneAnalysis.scriptFull,
        hook_strategy: sceneAnalysis.hookStrategy,
        target_platform: sceneAnalysis.targetPlatform,
      });
    } catch (error: any) {
      console.error("[Clone AnalyzeScenes] Error:", error);
      res.status(500).json({
        error: error.message || "Scene analysis failed",
      });
    }
  }
);

// ── POST /clone/swap-preview — Preview product swap plan (no credits) ──

const swapPreviewSceneSchema = z.object({
  index: z.number(),
  type: z.string(),
  start: z.number(),
  end: z.number(),
  duration: z.number(),
  description: z.string(),
  dialogue: z.string().optional().default(""),
  products: z.array(z.any()).optional().default([]),
  is_swappable: z.boolean().optional().default(true),
  swap_difficulty: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.enum(["easy", "medium", "hard"]).optional().default("medium")
  ),
  swap_notes: z.string().optional().default(""),
  energy: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.string().optional().default("medium")
  ),
  camera_work: z.string().optional().default(""),
  lighting: z.string().optional().default(""),
  environment: z.string().optional().default(""),
  subject: z.string().optional().default(""),
  motion_description: z.string().optional().default(""),
  color_palette: z.string().optional().default(""),
});

const swapPreviewSchema = z.object({
  source_video_url: z.string().url(),
  product_name: z.string().min(1).max(200),
  product_description: z.string().min(5).max(2000),
  product_image_url: z.string().url().optional(),
  product_brand: z.string().max(200).optional(),
  product_category: z.string().max(100).optional(),
  new_script: z.string().max(10000).optional(),
  // Optional: pass pre-analyzed scenes to skip re-analysis
  scenes: z.array(swapPreviewSceneSchema).optional(),
  script_full: z.string().optional(),
  product_summary: z.string().optional(),
  overall_style: z.string().optional(),
  total_duration: z.number().optional(),
  aspect_ratio: z.string().optional(),
});

router.post(
  "/swap-preview",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const parseResult = swapPreviewSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const data = parseResult.data;

      console.log("[Clone SwapPreview] Starting swap planning...");
      const startTime = Date.now();

      let sceneAnalysis: any;
      let analysisTime = 0;

      if (data.scenes && data.scenes.length > 0) {
        // Use pre-analyzed scenes from the frontend (avoids re-downloading the video)
        console.log("[Clone SwapPreview] Using pre-analyzed scenes from request");
        sceneAnalysis = {
          scenes: data.scenes.map((s) => ({
            index: s.index,
            type: s.type,
            startSeconds: s.start,
            endSeconds: s.end,
            durationSeconds: s.duration,
            description: s.description,
            dialogue: s.dialogue || "",
            products: s.products || [],
            isSwappable: s.is_swappable ?? true,
            swapDifficulty: s.swap_difficulty || "medium",
            swapNotes: s.swap_notes || "",
            energy: s.energy || "medium",
            cameraWork: s.camera_work || "",
            lighting: s.lighting || "",
            environment: s.environment || "",
            subject: s.subject || "",
            motionDescription: s.motion_description || "",
            colorPalette: s.color_palette || "",
          })),
          scriptFull: data.script_full || "",
          productSummary: data.product_summary || "",
          overallStyle: data.overall_style || "",
          totalDuration: data.total_duration || 0,
          aspectRatio: data.aspect_ratio || "9:16",
          sceneCount: data.scenes.length,
        };
      } else {
        // Fallback: re-analyze the video
        console.log("[Clone SwapPreview] No scenes provided, re-analyzing video...");
        const analysisStart = Date.now();
        sceneAnalysis = await analyzeVideoScenes(data.source_video_url);
        analysisTime = Date.now() - analysisStart;
      }

      // Product swap plan
      const swapStart = Date.now();
      const swapPlan = await generateProductSwapPlan(
        sceneAnalysis.scenes,
        {
          name: data.product_name,
          description: data.product_description,
          imageUrl: data.product_image_url,
          brandName: data.product_brand,
          category: data.product_category,
        },
        sceneAnalysis.scriptFull,
        data.new_script || null
      );
      const swapTime = Date.now() - swapStart;

      const totalTime = Date.now() - startTime;

      res.json({
        source_video_url: data.source_video_url,
        timing: {
          analysis_ms: analysisTime,
          swap_planning_ms: swapTime,
          total_ms: totalTime,
        },
        scene_analysis: {
          total_duration: sceneAnalysis.totalDuration,
          scene_count: sceneAnalysis.sceneCount,
          aspect_ratio: sceneAnalysis.aspectRatio,
          script: sceneAnalysis.scriptFull,
          product_summary: sceneAnalysis.productSummary,
        },
        swap_plan: {
          new_script: swapPlan.newScript,
          scenes_to_regenerate: swapPlan.scenesToRegenerate,
          scenes_to_keep: swapPlan.scenesToKeep,
          estimated_duration: swapPlan.estimatedDurationSeconds,
          scene_prompts: swapPlan.scenePrompts.map((sp) => ({
            scene_index: sp.sceneIndex,
            scene_type: sp.sceneType,
            strategy: sp.strategy,
            duration: sp.durationSeconds,
            avatar_swap: sp.avatarSwap,
            lip_sync: sp.lipSync,
            motion_reference: sp.motionReference,
            prompt_preview: sp.prompt.substring(0, 200) + (sp.prompt.length > 200 ? "..." : ""),
            notes: sp.notes,
          })),
        },
        estimated_credits: ADVANCED_CLONE_CREDITS_COST,
      });
    } catch (error: any) {
      console.error("[Clone SwapPreview] Error:", error);
      res.status(500).json({
        error: error.message || "Swap preview failed",
      });
    }
  }
);

// ─────────────────────────────────────────────────────
// Shared helper
// ─────────────────────────────────────────────────────

async function createCloneJob(
  userId: string,
  sourceVideoUrl: string,
  userPrompt: string,
  campaignName: string | null,
  sourceRef: { source_type?: string; source_id?: string }
): Promise<
  | { clone_job_id: string; credits_remaining: number; message: string }
  | { error: string; status: number }
> {
  const supabase = getSupabaseAdmin();

  // Credit check
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { error: "Profile not found", status: 404 };
  }

  if (profile.credits < CLONE_CREDITS_COST) {
    return {
      error: `Insufficient credits. Need ${CLONE_CREDITS_COST}, have ${profile.credits}`,
      status: 402,
    };
  }

  // Deduct credits with optimistic locking
  const { error: creditError } = await supabase
    .from("profiles")
    .update({ credits: profile.credits - CLONE_CREDITS_COST })
    .eq("id", userId)
    .eq("credits", profile.credits);

  if (creditError) {
    return { error: "Failed to process credits", status: 500 };
  }

  // Create clone job
  const cloneJobData: Record<string, unknown> = {
    user_id: userId,
    source_video_url: sourceVideoUrl,
    user_prompt: userPrompt,
    campaign_name: campaignName ? `Clone: ${campaignName}` : "Cloned Video",
    credits_cost: CLONE_CREDITS_COST,
    status: "pending",
  };

  if (sourceRef.source_type === "job") cloneJobData.source_job_id = sourceRef.source_id;
  if (sourceRef.source_type === "premium_job") cloneJobData.source_premium_job_id = sourceRef.source_id;
  if (sourceRef.source_type === "mass_job") cloneJobData.source_mass_job_id = sourceRef.source_id;

  const { data: cloneJob, error: cloneError } = await supabase
    .from("clone_jobs")
    .insert(cloneJobData)
    .select()
    .single();

  if (cloneError || !cloneJob) {
    console.error("[Clone] Failed to create clone job:", cloneError);
    // Refund credits
    await supabase
      .from("profiles")
      .update({ credits: profile.credits })
      .eq("id", userId);
    return { error: "Failed to create clone job", status: 500 };
  }

  console.log(`[Clone] Created clone job ${cloneJob.id} for user ${userId}`);

  // Fire pipeline (async, don't await)
  processCloneGeneration(cloneJob.id, userId).catch((err) => {
    console.error(`[Clone] Pipeline failed for ${cloneJob.id}:`, err);
  });

  return {
    clone_job_id: cloneJob.id,
    credits_remaining: profile.credits - CLONE_CREDITS_COST,
    message: "Clone generation started",
  };
}

export default router;
