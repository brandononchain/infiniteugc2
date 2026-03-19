import { Router, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import { randomUUID } from "crypto";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { withKeyRotation } from "../lib/keys";
import {
  listSupportedLanguages,
  processDubbingJob,
} from "../services/heygen-dubbing";

const router = Router();

const DUBBING_CREDITS_PER_LANGUAGE = 10;
const MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
});

const generateSchema = z.object({
  source_type: z.enum(["job", "premium_job", "mass_job", "upload"]),
  source_id: z.string().uuid().optional(),
  video_url: z.string().url().optional(),
  languages: z
    .array(
      z.object({
        code: z.string().min(2),
        label: z.string().min(1),
      })
    )
    .min(1)
    .max(12),
  mode: z.enum(["fast", "quality"]).default("quality"),
  caption_enabled: z.boolean().default(false),
  caption_style: z.record(z.unknown()).nullable().optional(),
  caption_position: z
    .object({ x: z.number(), y: z.number() })
    .nullable()
    .optional(),
});

// ── POST /dubbing/generate ─────────────────────────────────

router.post(
  "/generate",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = generateSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error:
            parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { source_type, source_id, video_url, languages, mode } =
        parseResult.data;

      const supabase = getSupabaseAdmin();

      // Resolve source video URL
      let sourceVideoUrl: string | null = null;
      let campaignName: string | null = null;

      if (source_type === "upload") {
        if (!video_url) {
          res
            .status(400)
            .json({ error: "video_url required for upload source type" });
          return;
        }
        sourceVideoUrl = video_url;
        campaignName = "Uploaded Video";
      } else if (source_type === "job") {
        if (!source_id) {
          res.status(400).json({ error: "source_id required" });
          return;
        }
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
        if (!source_id) {
          res.status(400).json({ error: "source_id required" });
          return;
        }
        const { data: job } = await supabase
          .from("premium_jobs")
          .select("final_video_url, campaign_name, user_id")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();

        if (!job || job.user_id !== userId) {
          res
            .status(404)
            .json({ error: "Completed premium video not found" });
          return;
        }
        sourceVideoUrl = job.final_video_url;
        campaignName = job.campaign_name;
      } else if (source_type === "mass_job") {
        if (!source_id) {
          res.status(400).json({ error: "source_id required" });
          return;
        }
        const { data: job } = await supabase
          .from("mass_jobs")
          .select("video_url, user_id, mass_campaigns(campaign_name)")
          .eq("id", source_id)
          .eq("status", "completed")
          .single();

        if (!job || job.user_id !== userId) {
          res
            .status(404)
            .json({ error: "Completed mass video not found" });
          return;
        }
        sourceVideoUrl = job.video_url;
        campaignName =
          (job as any).mass_campaigns?.campaign_name || null;
      }

      if (!sourceVideoUrl) {
        res.status(400).json({ error: "Source video has no URL" });
        return;
      }

      // Credit check
      const totalCost = languages.length * DUBBING_CREDITS_PER_LANGUAGE;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      if (profile.credits < totalCost) {
        res.status(402).json({
          error: `Insufficient credits. Need ${totalCost}, have ${profile.credits}`,
        });
        return;
      }

      // Deduct credits with optimistic locking
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - totalCost })
        .eq("id", userId)
        .eq("credits", profile.credits);

      if (creditError) {
        res.status(500).json({ error: "Failed to process credits" });
        return;
      }

      // Create one dubbing job per language
      const createdJobs: string[] = [];

      for (const lang of languages) {
        const jobData: Record<string, unknown> = {
          user_id: userId,
          source_video_url: sourceVideoUrl,
          source_type,
          source_id: source_id || null,
          campaign_name: campaignName
            ? `Dub: ${campaignName}`
            : "Dubbed Video",
          target_language: lang.code,
          target_language_label: lang.label,
          mode,
          credits_cost: DUBBING_CREDITS_PER_LANGUAGE,
          status: "pending",
          caption_enabled: parseResult.data.caption_enabled,
          caption_style: parseResult.data.caption_style || null,
          caption_position: parseResult.data.caption_position || null,
        };

        const { data: dubbingJob, error: insertError } = await supabase
          .from("dubbing_jobs")
          .insert(jobData)
          .select("id")
          .single();

        if (insertError || !dubbingJob) {
          console.error(
            `[DUBBING] Failed to create job for ${lang.code}:`,
            insertError
          );
          continue;
        }

        createdJobs.push(dubbingJob.id);

        // Fire pipeline async
        processDubbingJob(dubbingJob.id, userId).catch((err) => {
          console.error(
            `[DUBBING] Pipeline failed for ${dubbingJob.id}:`,
            err
          );
        });
      }

      if (createdJobs.length === 0) {
        // Refund all credits
        await supabase.rpc("increment_credits", {
          user_id: userId,
          amount: totalCost,
        });
        res
          .status(500)
          .json({ error: "Failed to create dubbing jobs" });
        return;
      }

      // Partial refund if some jobs failed to create
      const failedCount = languages.length - createdJobs.length;
      if (failedCount > 0) {
        await supabase.rpc("increment_credits", {
          user_id: userId,
          amount: failedCount * DUBBING_CREDITS_PER_LANGUAGE,
        });
      }

      console.log(
        `[DUBBING] Created ${createdJobs.length} dubbing jobs for user ${userId}`
      );

      res.json({
        dubbing_job_ids: createdJobs,
        credits_remaining:
          profile.credits -
          createdJobs.length * DUBBING_CREDITS_PER_LANGUAGE,
        message: `${createdJobs.length} dubbing job(s) started`,
      });
    } catch (error) {
      console.error("[DUBBING] Generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── POST /dubbing/upload ───────────────────────────────────

router.post(
  "/upload",
  authMiddleware,
  upload.single("video"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "No video file provided" });
        return;
      }

      const allowedTypes = [
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          error:
            "Invalid file type. Accepted: .mp4, .mov, .webm",
        });
        return;
      }

      const supabase = getSupabaseAdmin();
      const fileId = randomUUID();
      const ext =
        file.originalname.split(".").pop()?.toLowerCase() || "mp4";
      const fileName = `dubbing-uploads/${userId}/${fileId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("[DUBBING] Upload error:", uploadError);
        res.status(500).json({ error: "Failed to upload video" });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(fileName);

      console.log(
        `[DUBBING] Video uploaded: ${fileName} (${file.size} bytes)`
      );

      res.json({
        video_url: publicUrl,
        file_name: file.originalname,
        size_bytes: file.size,
      });
    } catch (error) {
      console.error("[DUBBING] Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── GET /dubbing ───────────────────────────────────────────

router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const page = Math.max(
        1,
        parseInt(req.query.page as string) || 1
      );
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit as string) || 50)
      );
      const offset = (page - 1) * limit;

      const {
        data: dubbingJobs,
        count,
        error,
      } = await supabase
        .from("dubbing_jobs")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res
          .status(500)
          .json({ error: "Failed to fetch dubbing jobs" });
        return;
      }

      res.json({
        dubbing_jobs: dubbingJobs || [],
        total: count || 0,
        page,
        limit,
      });
    } catch (error) {
      console.error("[DUBBING] List error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ── GET /dubbing/languages ─────────────────────────────────

router.get(
  "/languages",
  authMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const languages = await withKeyRotation(
        "heygen",
        "HEYGEN_API_KEY",
        (apiKey) => listSupportedLanguages(apiKey)
      );
      res.json({ languages });
    } catch (error) {
      console.error("[DUBBING] Languages error:", error);
      // Return fallback on any error
      res.json({
        languages: [
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
        ],
      });
    }
  }
);

// ── GET /dubbing/:id ───────────────────────────────────────

router.get(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const { data: dubbingJob, error } = await supabase
        .from("dubbing_jobs")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();

      if (error || !dubbingJob) {
        res.status(404).json({ error: "Dubbing job not found" });
        return;
      }

      res.json(dubbingJob);
    } catch (error) {
      console.error("[DUBBING] Get error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
