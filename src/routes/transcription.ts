import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import { internalAuthMiddleware } from "../middleware/auth";
import { withKeyRotation } from "../lib/keys";
import OpenAI from "openai";
import { wordsToCaptionPhrases } from "../services/transcription";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB — timeline audio can be long
  },
});

router.post(
  "/generate",
  internalAuthMiddleware,
  upload.single("audio"),
  async (req: Request, res: Response): Promise<void> => {
    const tempPath = `/tmp/caption_${Date.now()}.wav`;
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Audio file is required" });
        return;
      }

      await fs.promises.writeFile(tempPath, file.buffer);

      console.log("[TRANSCRIPTION] Starting Whisper transcription for editor...");

      const transcription = await withKeyRotation(
        "openai",
        "OPENAI_API_KEY",
        async (apiKey) => {
          const openai = new OpenAI({ apiKey });
          return openai.audio.transcriptions.create({
            file: fs.createReadStream(tempPath),
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word"],
          });
        }
      );

      console.log("[TRANSCRIPTION] Whisper complete");

      const words: Array<{ word: string; start: number; end: number }> =
        (transcription as any).words?.map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
        })) ?? [];

      if (words.length === 0) {
        res.json({ captions: [] });
        return;
      }

      const captions = wordsToCaptionPhrases(words);

      res.json({ captions });
    } catch (error: any) {
      console.error("[TRANSCRIPTION] Editor transcription error:", error);
      const message =
        error?.message || error?.error?.message || "Transcription failed";
      const status =
        error?.status === 413 || message.includes("Maximum content size")
          ? 413
          : 500;
      res.status(status).json({ error: message });
    } finally {
      await fs.promises.unlink(tempPath).catch(() => {});
    }
  }
);

export default router;
