import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { processBRollGeneration, getBRollCreditCost } from "../services/broll-generator";

const router = Router();

const VALID_MODELS = ["kling-2.6", "kling-3.0", "seeddance-1.0-fast", "seeddance-1.5-pro"] as const;

const generateBRollSchema = z.object({
  name: z.string().min(1).max(255).default("Untitled B-Roll"),
  prompt: z.string().min(1).max(2500),
  image_url: z.string().url(),
  model: z.enum(VALID_MODELS),
  config: z.object({
    duration: z.string().optional(),
    aspect_ratio: z.string().optional(),
    resolution: z.string().optional(),
    mode: z.string().optional(),
    sound: z.boolean().optional(),
    fixed_lens: z.boolean().optional(),
    generate_audio: z.boolean().optional(),
  }).optional(),
});

// POST /broll/generate — Create and start a B-Roll generation job
router.post(
  "/generate",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = generateBRollSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { name, prompt, image_url, model, config } = parseResult.data;
      const supabase = getSupabaseAdmin();
      const creditsCost = getBRollCreditCost(model);

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

      // Create B-Roll job
      const { data: brollJob, error: insertError } = await supabase
        .from("broll_jobs")
        .insert({
          user_id: userId,
          name,
          prompt,
          image_url,
          model,
          model_config: config || {},
          credits_cost: creditsCost,
          status: "pending",
        })
        .select()
        .single();

      if (insertError || !brollJob) {
        console.error("[BRoll] Failed to create job:", insertError);
        // Refund credits
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("id", userId);
        res.status(500).json({ error: "Failed to create B-Roll job" });
        return;
      }

      console.log(`[BRoll] Created job ${brollJob.id} for user ${userId} (model: ${model})`);

      // Fire pipeline (async, don't await)
      processBRollGeneration(brollJob.id).catch((err) => {
        console.error(`[BRoll] Pipeline failed for ${brollJob.id}:`, err);
      });

      res.json({
        success: true,
        job_id: brollJob.id,
        credits_remaining: profile.credits - creditsCost,
      });
    } catch (error) {
      console.error("[BRoll] Generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /broll/jobs — List all B-Roll jobs for the authenticated user
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

      const { data: jobs, count, error } = await supabase
        .from("broll_jobs")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res.status(500).json({ error: "Failed to fetch B-Roll jobs" });
        return;
      }

      res.json({ jobs: jobs || [], total: count || 0, page, limit });
    } catch (error) {
      console.error("[BRoll] List error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /broll/jobs/:id — Get a single B-Roll job
router.get(
  "/jobs/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const { data: job, error } = await supabase
        .from("broll_jobs")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();

      if (error || !job) {
        res.status(404).json({ error: "B-Roll job not found" });
        return;
      }

      res.json(job);
    } catch (error) {
      console.error("[BRoll] Get error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /broll/upload-image — Upload a reference image for B-Roll generation
router.post(
  "/upload-image",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      // Expect base64 image in body
      const { image, content_type } = req.body as {
        image: string;
        content_type: string;
      };

      if (!image || !content_type) {
        res.status(400).json({ error: "Missing image or content_type" });
        return;
      }

      const buffer = Buffer.from(image, "base64");
      const ext = content_type.includes("png") ? "png" : content_type.includes("webp") ? "webp" : "jpg";
      const fileName = `broll-images/${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, buffer, {
          contentType: content_type,
          upsert: true,
        });

      if (uploadError) {
        res.status(500).json({ error: `Failed to upload image: ${uploadError.message}` });
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(fileName);

      res.json({ url: publicUrl });
    } catch (error) {
      console.error("[BRoll] Upload image error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
