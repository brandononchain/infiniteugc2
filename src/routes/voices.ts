import { Router, Request, Response } from "express";
import multer from "multer";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { getElevenLabsKey } from "../lib/keys";
import { remixVoice } from "../services/elevenlabs";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only MP3 and WAV files are supported"));
    }
  },
});

router.post(
  "/clone",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const name = req.body.name as string;
      const file = req.file;

      if (!name || !file) {
        res.status(400).json({ error: "Name and audio file are required" });
        return;
      }

      const supabase = getSupabaseAdmin();

      const timestamp = Date.now();
      const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50);
      const fileExt =
        file.originalname.split(".").pop()?.toLowerCase() || "mp3";
      const storagePath = `${userId}/${timestamp}-${sanitizedName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("voice-samples")
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        res.status(500).json({ error: "Failed to upload audio file" });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-samples").getPublicUrl(storagePath);

      const elevenLabsApiKey = await getElevenLabsKey();

      const elevenLabsFormData = new FormData();
      elevenLabsFormData.append("name", name);
      elevenLabsFormData.append(
        "files",
        new Blob([file.buffer] as any, { type: file.mimetype }),
        file.originalname
      );
      elevenLabsFormData.append("remove_background_noise", "false");

      const elevenLabsResponse = await fetch(
        "https://api.elevenlabs.io/v1/voices/add",
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsApiKey,
          },
          body: elevenLabsFormData,
        }
      );

      if (!elevenLabsResponse.ok) {
        await supabase.storage.from("voice-samples").remove([storagePath]);

        const errorData = await elevenLabsResponse.json().catch(() => ({}));
        console.error("ElevenLabs API error:", errorData);
        res.status(elevenLabsResponse.status).json({
          error:
            (errorData as { detail?: { message?: string } }).detail?.message ||
            "Failed to clone voice with ElevenLabs",
        });
        return;
      }

      const elevenLabsData = await elevenLabsResponse.json();
      const voiceId = (elevenLabsData as { voice_id?: string }).voice_id;

      if (!voiceId) {
        await supabase.storage.from("voice-samples").remove([storagePath]);
        res
          .status(500)
          .json({ error: "ElevenLabs did not return a voice ID" });
        return;
      }

      const { data: voice, error: dbError } = await supabase
        .from("voices")
        .insert({
          user_id: userId,
          elevenlabs_voice_id: voiceId,
          name: name.trim(),
          sample_url: publicUrl,
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from("voice-samples").remove([storagePath]);
        console.error("Database insert error:", dbError);
        res.status(500).json({ error: "Failed to save voice record" });
        return;
      }

      res.json({ success: true, voice });
    } catch (error) {
      console.error("Voice clone error:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "File must be smaller than 10MB" });
          return;
        }
      }
      if (error instanceof Error && error.message.includes("Only MP3")) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ──────────────────────────────────────────────────────────
// GET /voices/remix-templates - Get active remix templates
// ──────────────────────────────────────────────────────────
router.get(
  "/remix-templates",
  authMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("voice_remix_templates")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Failed to fetch remix templates:", error);
        res.status(500).json({ error: "Failed to fetch templates" });
        return;
      }

      res.json({ templates: data });
    } catch (error) {
      console.error("Remix templates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ──────────────────────────────────────────────────────────
// POST /voices/remix - Generate a remix preview (not saved)
// ──────────────────────────────────────────────────────────
router.post(
  "/remix",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { voice_id, prompt, prompt_strength } = req.body;

      if (!voice_id || !prompt) {
        res
          .status(400)
          .json({ error: "voice_id and prompt are required" });
        return;
      }

      const supabase = getSupabaseAdmin();

      // Look up the voice and verify ownership
      const { data: voice, error: voiceError } = await supabase
        .from("voices")
        .select("id, elevenlabs_voice_id, user_id")
        .eq("id", voice_id)
        .single();

      if (voiceError || !voice) {
        res.status(404).json({ error: "Voice not found" });
        return;
      }

      if (voice.user_id !== userId) {
        res.status(403).json({ error: "Not authorized to remix this voice" });
        return;
      }

      // Call ElevenLabs remix API
      const preview = await remixVoice(
        voice.elevenlabs_voice_id,
        prompt,
        {
          promptStrength:
            typeof prompt_strength === "number" ? prompt_strength : undefined,
        }
      );

      res.json({
        audio_base_64: preview.audio_base_64,
        generated_voice_id: preview.generated_voice_id,
        duration_secs: preview.duration_secs,
      });
    } catch (error) {
      console.error("Voice remix error:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to remix voice",
      });
    }
  }
);

// ──────────────────────────────────────────────────────────
// POST /voices/remix/save - Save a remixed voice
// ──────────────────────────────────────────────────────────
router.post(
  "/remix/save",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const {
        source_voice_id,
        prompt,
        template_id,
        generated_voice_id,
        audio_base_64,
        name,
      } = req.body;

      if (!source_voice_id || !generated_voice_id || !audio_base_64 || !name) {
        res.status(400).json({
          error:
            "source_voice_id, generated_voice_id, audio_base_64, and name are required",
        });
        return;
      }

      const supabase = getSupabaseAdmin();

      // Verify source voice ownership
      const { data: sourceVoice, error: voiceErr } = await supabase
        .from("voices")
        .select("id, user_id")
        .eq("id", source_voice_id)
        .single();

      if (voiceErr || !sourceVoice || sourceVoice.user_id !== userId) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      // Decode base64 audio and upload to storage
      const audioBuffer = Buffer.from(audio_base_64, "base64");
      const timestamp = Date.now();
      const sanitizedName = name
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 50);
      const storagePath = `${userId}/${timestamp}-remix-${sanitizedName}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from("voice-remixes")
        .upload(storagePath, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("Remix storage upload error:", uploadError);
        res.status(500).json({ error: "Failed to upload remix audio" });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-remixes").getPublicUrl(storagePath);

      // Insert into voice_remixes table
      const { error: remixDbError } = await supabase
        .from("voice_remixes")
        .insert({
          user_id: userId,
          source_voice_id,
          prompt: prompt || "",
          template_id: template_id || null,
          elevenlabs_generated_voice_id: generated_voice_id,
          audio_url: publicUrl,
          name: name.trim(),
        });

      if (remixDbError) {
        await supabase.storage.from("voice-remixes").remove([storagePath]);
        console.error("Remix DB insert error:", remixDbError);
        res.status(500).json({ error: "Failed to save remix record" });
        return;
      }

      // Also insert into voices table so the remix appears in the voice list
      const { data: newVoice, error: voiceInsertErr } = await supabase
        .from("voices")
        .insert({
          user_id: userId,
          elevenlabs_voice_id: generated_voice_id,
          name: name.trim(),
          sample_url: publicUrl,
        })
        .select()
        .single();

      if (voiceInsertErr) {
        console.error("Voice insert error:", voiceInsertErr);
        res.status(500).json({ error: "Failed to save voice" });
        return;
      }

      res.json({ success: true, voice: newVoice });
    } catch (error) {
      console.error("Remix save error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
