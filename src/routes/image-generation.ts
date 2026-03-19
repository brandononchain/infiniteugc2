import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { generateNanoBananaImage, NanoBananaModel } from "../services/nano-banana";
import { generateSeedreamImage } from "../services/seedream";
import { getAnthropicKey, getArkApiKey, getGeminiKey } from "../lib/keys";
import { refinePromptWithAgent } from "../services/agent-orchestrator";

const router = Router();

const generateSchema = z.object({
  prompt: z.string().min(1),
  model: z.enum(["nano_banana_pro", "nano_banana_2", "seedream_4_5"]),
  aspectRatio: z.string().default("1:1"),
  resolution: z.string().default("2K"),
  count: z.number().int().min(1).max(8).default(1),
  referenceImageUrls: z.array(z.string().url()).max(5).optional(),
  templateId: z.string().optional(),
});

/**
 * POST /image-generation/generate
 * Creates image generation jobs and starts processing them.
 * Each image in the batch gets its own job row for independent status tracking.
 */
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

      const { prompt, model, aspectRatio, resolution, count, referenceImageUrls, templateId } = parseResult.data;
      console.log(`[IMG-GEN] Received request — templateId: ${templateId || "none"}, model: ${model}, prompt: ${prompt.slice(0, 60)}...`);
      const supabase = getSupabaseAdmin();

      // Create job rows for each image in the batch
      const jobInserts = Array.from({ length: count }, () => ({
        user_id: userId,
        prompt,
        model,
        aspect_ratio: aspectRatio,
        resolution,
        status: "processing" as const,
        reference_image_urls: referenceImageUrls && referenceImageUrls.length > 0 ? referenceImageUrls : null,
      }));

      const { data: jobs, error: insertError } = await supabase
        .from("image_generation_jobs")
        .insert(jobInserts)
        .select();

      if (insertError || !jobs || jobs.length === 0) {
        console.error("[IMG-GEN] Failed to create jobs:", insertError);
        res.status(500).json({ error: "Failed to create image generation jobs" });
        return;
      }

      // Return jobs immediately so frontend can show loading tiles
      res.json({ jobs });

      // Refine prompt ONCE before spawning parallel jobs
      let finalPrompt = prompt;
      if (templateId) {
        try {
          const anthropicKey = await getAnthropicKey();
          finalPrompt = await refinePromptWithAgent(templateId, prompt, anthropicKey);
          console.log(`[IMG-GEN] Agent-refined prompt ready, spawning ${jobs.length} jobs`);

          // Update job rows with the refined prompt so the UI shows what was actually sent
          for (const job of jobs) {
            await supabase.from("image_generation_jobs").update({ prompt: finalPrompt }).eq("id", job.id);
          }
        } catch (err) {
          console.warn(`[IMG-GEN] Agent orchestration failed, using raw prompt:`, err instanceof Error ? err.message : err);
        }
      }

      // Process each job in the background (don't await)
      for (const job of jobs) {
        processImageJob(job.id, userId, finalPrompt, model, aspectRatio, resolution, referenceImageUrls).catch(
          (err) => {
            console.error(`[IMG-GEN] Background job ${job.id} failed:`, err);
          }
        );
      }
    } catch (error) {
      console.error("[IMG-GEN] Generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /image-generation/jobs
 * List image generation jobs for the authenticated user.
 */
router.get(
  "/jobs",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
      const offset = (page - 1) * limit;

      const { data: jobs, count, error } = await supabase
        .from("image_generation_jobs")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("[IMG-GEN] List jobs error:", error);
        res.status(500).json({ error: "Failed to fetch jobs" });
        return;
      }

      res.json({ jobs: jobs || [], total: count || 0, page, limit });
    } catch (error) {
      console.error("[IMG-GEN] List error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /image-generation/jobs/:id
 * Get a single job by ID.
 */
router.get(
  "/jobs/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const jobId = req.params.id;
      const supabase = getSupabaseAdmin();

      const { data: job, error } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", userId)
        .single();

      if (error || !job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      res.json({ job });
    } catch (error) {
      console.error("[IMG-GEN] Get job error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /image-generation/poll?ids=id1,id2,...
 * Bulk poll job statuses. Used by frontend to check loading tiles.
 */
router.get(
  "/poll",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const idsParam = req.query.ids as string;

      if (!idsParam) {
        res.status(400).json({ error: "ids query parameter required" });
        return;
      }

      const ids = idsParam.split(",").filter(Boolean);
      if (ids.length === 0 || ids.length > 20) {
        res.status(400).json({ error: "Provide 1-20 job IDs" });
        return;
      }

      const supabase = getSupabaseAdmin();
      const { data: jobs, error } = await supabase
        .from("image_generation_jobs")
        .select("id, status, image_url, error_message")
        .eq("user_id", userId)
        .in("id", ids);

      if (error) {
        res.status(500).json({ error: "Failed to poll jobs" });
        return;
      }

      res.json({ jobs: jobs || [] });
    } catch (error) {
      console.error("[IMG-GEN] Poll error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Process a single image generation job in the background.
 */
async function processImageJob(
  jobId: string,
  userId: string,
  prompt: string,
  model: string,
  aspectRatio: string,
  resolution: string,
  referenceImageUrls?: string[]
): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    let imageUrl: string;

    if (model === "nano_banana_pro" || model === "nano_banana_2") {
      const geminiKey = await getGeminiKey();
      imageUrl = await generateNanoBananaImage(
        { prompt, aspectRatio, resolution, referenceImageUrls, nanoBananaModel: model as NanoBananaModel },
        geminiKey,
        userId,
        jobId
      );
    } else if (model === "seedream_4_5") {
      const arkKey = await getArkApiKey();
      imageUrl = await generateSeedreamImage(
        { prompt, aspectRatio, resolution, referenceImageUrls },
        arkKey,
        userId,
        jobId
      );
    } else {
      throw new Error(`Unknown model: ${model}`);
    }

    // Update job as completed
    const { error: updateError } = await supabase
      .from("image_generation_jobs")
      .update({
        status: "completed",
        image_url: imageUrl,
      })
      .eq("id", jobId);

    if (updateError) {
      console.error(`[IMG-GEN] Failed to update job ${jobId}:`, updateError);
    }

    console.log(`[IMG-GEN] Job ${jobId} completed: ${imageUrl}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Image generation failed";
    console.error(`[IMG-GEN] Job ${jobId} failed:`, errorMessage);

    await supabase
      .from("image_generation_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", jobId);
  }
}

export default router;
