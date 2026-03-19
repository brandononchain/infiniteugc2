import { Router, Request, Response } from "express";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { getSyncApiKey, getElevenLabsKey } from "../lib/keys";
import { processSyncJob } from "../services/sync";
import { fetchWithTimeout, VIDEO_DOWNLOAD_TIMEOUT_MS } from "../lib/fetch";

const router = Router();

const VALID_MODELS = ["lipsync-2", "lipsync-2-pro", "react-1"] as const;

const generateSchema = z.object({
  project_id: z.string().uuid(),
  media_id: z.string().min(1),
  script: z.string().min(1).max(10000),
  voice_id: z.string().optional(),
  model: z.enum(VALID_MODELS),
  options: z
    .object({
      sync_mode: z.string().optional(),
      model_mode: z.string().optional(),
      prompt: z.string().optional(),
    })
    .optional(),
});

// POST /sync/generate — Create a sync lip-sync job
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

      const { project_id, media_id, script, voice_id, model, options } =
        parseResult.data;
      const supabase = getSupabaseAdmin();

      // Look up the video in editor_media to get storage path
      const { data: mediaRow, error: mediaError } = await supabase
        .from("editor_media" as any)
        .select("storage_path")
        .eq("media_id", media_id)
        .eq("project_id", project_id)
        .single();

      if (mediaError || !mediaRow) {
        // Fallback: try to find by constructing the standard storage path
        // editor-media/{userId}/{projectId}/{mediaId}
        const fallbackPath = `${userId}/${project_id}/${media_id}`;
        const { data: signedData, error: signedError } = await supabase.storage
          .from("editor-media")
          .createSignedUrl(fallbackPath, 60 * 60 * 2); // 2 hour URL

        if (signedError || !signedData?.signedUrl) {
          res.status(404).json({
            error:
              "Video not found in cloud storage. Please wait for upload to complete and try again.",
          });
          return;
        }

        // Create job with fallback URL
        const { data: job, error: insertError } = await supabase
          .from("sync_jobs")
          .insert({
            user_id: userId,
            project_id,
            model,
            script,
            voice_id: voice_id || null,
            options: options || {},
            input_video_url: signedData.signedUrl,
            status: "pending",
          })
          .select()
          .single();

        if (insertError || !job) {
          console.error("[SYNC] Failed to create job:", insertError);
          res.status(500).json({ error: "Failed to create sync job" });
          return;
        }

        // Get API key and fire pipeline
        const apiKey = await getSyncApiKey();
        processSyncJob(job.id, apiKey).catch((err) => {
          console.error(`[SYNC] Pipeline failed for ${job.id}:`, err);
        });

        res.json({ success: true, job_id: job.id, status: "pending" });
        return;
      }

      // Generate signed URL from storage path
      const storagePath = (mediaRow as any).storage_path;
      const { data: signedData, error: signedError } = await supabase.storage
        .from("editor-media")
        .createSignedUrl(storagePath, 60 * 60 * 2);

      if (signedError || !signedData?.signedUrl) {
        res.status(500).json({ error: "Failed to generate video URL" });
        return;
      }

      // Create sync job
      const { data: job, error: insertError } = await supabase
        .from("sync_jobs")
        .insert({
          user_id: userId,
          project_id,
          model,
          script,
          voice_id: voice_id || null,
          options: options || {},
          input_video_url: signedData.signedUrl,
          status: "pending",
        })
        .select()
        .single();

      if (insertError || !job) {
        console.error("[SYNC] Failed to create job:", insertError);
        res.status(500).json({ error: "Failed to create sync job" });
        return;
      }

      console.log(
        `[SYNC] Created job ${job.id} for user ${userId} (model: ${model})`
      );

      // Get API key and fire pipeline (async)
      const apiKey = await getSyncApiKey();
      processSyncJob(job.id, apiKey).catch((err) => {
        console.error(`[SYNC] Pipeline failed for ${job.id}:`, err);
      });

      res.json({ success: true, job_id: job.id, status: "pending" });
    } catch (error) {
      console.error("[SYNC] Generate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /sync/jobs — List sync jobs for a project
router.get(
  "/jobs",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const projectId = req.query.project_id as string;
      const supabase = getSupabaseAdmin();

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      let query = supabase
        .from("sync_jobs")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data: jobs, count, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        res.status(500).json({ error: "Failed to fetch sync jobs" });
        return;
      }

      res.json({ jobs: jobs || [], total: count || 0, page, limit });
    } catch (error) {
      console.error("[SYNC] List error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /sync/jobs/:id — Get a single sync job
router.get(
  "/jobs/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const supabase = getSupabaseAdmin();

      const { data: job, error } = await supabase
        .from("sync_jobs")
        .select("*")
        .eq("id", req.params.id)
        .eq("user_id", userId)
        .single();

      if (error || !job) {
        res.status(404).json({ error: "Sync job not found" });
        return;
      }

      // If completed and output URL is a storage path, refresh signed URL
      if (job.status === "completed" && job.output_video_url) {
        const storagePath = `${job.user_id}/${job.project_id}/${job.id}.mp4`;
        const { data: signedData } = await supabase.storage
          .from("sync-outputs")
          .createSignedUrl(storagePath, 60 * 60 * 2);

        if (signedData?.signedUrl) {
          job.output_video_url = signedData.signedUrl;
        }
      }

      res.json(job);
    } catch (error) {
      console.error("[SYNC] Get error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /sync/clone-voice — Extract audio from video and clone voice via ElevenLabs
router.post(
  "/clone-voice",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { project_id, media_id, name } = req.body;

      if (!project_id || !media_id) {
        res.status(400).json({ error: "project_id and media_id are required" });
        return;
      }

      const voiceName = name || `Cloned Voice ${Date.now()}`;
      const supabase = getSupabaseAdmin();

      // Get video URL from editor-media
      const { data: mediaRow } = await supabase
        .from("editor_media" as any)
        .select("storage_path")
        .eq("media_id", media_id)
        .eq("project_id", project_id)
        .single();

      let videoUrl: string;
      if (mediaRow) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("editor-media")
          .createSignedUrl((mediaRow as any).storage_path, 60 * 60 * 2);
        if (signedError || !signedData?.signedUrl) {
          res.status(404).json({ error: "Failed to get video URL" });
          return;
        }
        videoUrl = signedData.signedUrl;
      } else {
        const fallbackPath = `${userId}/${project_id}/${media_id}`;
        const { data: signedData, error: signedError } = await supabase.storage
          .from("editor-media")
          .createSignedUrl(fallbackPath, 60 * 60 * 2);
        if (signedError || !signedData?.signedUrl) {
          res.status(404).json({ error: "Video not found in cloud storage" });
          return;
        }
        videoUrl = signedData.signedUrl;
      }

      console.log("[SYNC] Cloning voice from video...");

      // Download video
      const videoResponse = await fetchWithTimeout(videoUrl, {
        timeoutMs: VIDEO_DOWNLOAD_TIMEOUT_MS,
      });
      if (!videoResponse.ok) {
        res.status(500).json({ error: "Failed to download video" });
        return;
      }
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

      // Extract audio using ffmpeg
      const tmpVideo = path.join("/tmp", `clone_video_${Date.now()}.mp4`);
      const tmpAudio = path.join("/tmp", `clone_audio_${Date.now()}.mp3`);

      try {
        fs.writeFileSync(tmpVideo, videoBuffer);

        await new Promise<void>((resolve, reject) => {
          ffmpeg(tmpVideo)
            .noVideo()
            .audioCodec("libmp3lame")
            .audioBitrate(128)
            .duration(60) // Max 60 seconds for voice cloning sample
            .output(tmpAudio)
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });

        const audioBuffer = fs.readFileSync(tmpAudio);
        console.log(`[SYNC] Extracted audio: ${audioBuffer.length} bytes`);

        // Clone voice via ElevenLabs
        const elevenLabsApiKey = await getElevenLabsKey();
        const formData = new FormData();
        formData.append("name", voiceName);
        formData.append(
          "files",
          new Blob([audioBuffer] as any, { type: "audio/mpeg" }),
          "voice-sample.mp3"
        );
        formData.append("remove_background_noise", "false");

        const cloneResponse = await fetch(
          "https://api.elevenlabs.io/v1/voices/add",
          {
            method: "POST",
            headers: { "xi-api-key": elevenLabsApiKey },
            body: formData,
          }
        );

        if (!cloneResponse.ok) {
          const errorData = await cloneResponse.json().catch(() => ({}));
          console.error("[SYNC] ElevenLabs clone error:", errorData);
          res.status(500).json({
            error: (errorData as any)?.detail?.message || "Failed to clone voice",
          });
          return;
        }

        const cloneData = await cloneResponse.json();
        const clonedVoiceId = (cloneData as { voice_id?: string }).voice_id;

        if (!clonedVoiceId) {
          res.status(500).json({ error: "ElevenLabs did not return a voice ID" });
          return;
        }

        // Save to voices table
        const { data: voice, error: dbError } = await supabase
          .from("voices")
          .insert({
            user_id: userId,
            elevenlabs_voice_id: clonedVoiceId,
            name: voiceName,
          })
          .select()
          .single();

        if (dbError) {
          console.error("[SYNC] DB insert error:", dbError);
          res.status(500).json({ error: "Failed to save voice record" });
          return;
        }

        console.log(`[SYNC] Voice cloned: ${clonedVoiceId} (${voiceName})`);
        res.json({
          success: true,
          voice_id: clonedVoiceId,
          voice,
        });
      } finally {
        // Clean up temp files
        try { fs.unlinkSync(tmpVideo); } catch {}
        try { fs.unlinkSync(tmpAudio); } catch {}
      }
    } catch (error: any) {
      console.error("[SYNC] Clone voice error:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
);

export default router;
