import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { calculateVideoCost } from "../lib/credits";
import { getRotatedKey, getKieApiKey, getArkApiKey, getHedraKey, getBytePlusCredentials } from "../lib/keys";
import { processVideoGeneration, triggerNextQueuedJobs } from "../services/video-generator";

const router = Router();

const MAX_CONCURRENT_PROCESSING = 2;

const createCampaignSchema = z.object({
  avatar_id: z.string().uuid("Invalid avatar ID").optional(),
  script_id: z.string().uuid("Invalid script ID").optional(),
  campaign_name: z.string().min(1, "Campaign name is required").max(255),
  custom_prompt: z.string().max(2000).nullable().optional().default(null),
  reference_image_url: z.string().url().nullable().optional().default(null),
  video_provider: z.enum(["heygen", "omnihuman", "sora2", "sora2_openai", "sora2pro", "sora2pro_openai", "seedance", "hedra_avatar", "hedra_omnia", "veo3"]).optional().default("heygen"),
  aspect_ratio: z.string().optional().default("9:16"),
  duration_seconds: z.number().int().positive().nullable().optional().default(null),
  caption_enabled: z.boolean().optional(),
  caption_style: z.any().nullable().optional(),
  caption_position: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  text_overlays: z.array(z.any()).optional(),
});

const updateCampaignSchema = z.object({
  avatar_id: z.string().uuid("Invalid avatar ID").optional(),
  script_id: z.string().uuid("Invalid script ID").optional(),
  campaign_name: z.string().min(1).max(255).optional(),
  custom_prompt: z.string().max(2000).nullable().optional(),
  reference_image_url: z.string().url().nullable().optional(),
  video_provider: z.enum(["heygen", "omnihuman", "sora2", "sora2_openai", "sora2pro", "sora2pro_openai", "seedance", "hedra_avatar", "hedra_omnia", "veo3"]).optional(),
  aspect_ratio: z.string().optional(),
  duration_seconds: z.number().int().positive().nullable().optional(),
  caption_enabled: z.boolean().optional(),
  caption_style: z.any().nullable().optional(),
  caption_position: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  text_overlays: z.array(z.any()).optional(),
});

const batchRunSchema = z.object({
  campaign_ids: z.array(z.string().uuid()).min(1).max(5),
});

router.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = createCampaignSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { avatar_id, script_id, campaign_name, custom_prompt, reference_image_url, video_provider, aspect_ratio, duration_seconds, caption_enabled, caption_style, caption_position, text_overlays } = parseResult.data;
      const supabase = getSupabaseAdmin();

      // Avatar validation (optional for caption-only flows)
      if (avatar_id) {
        const { data: avatar, error: avatarError } = await supabase
          .from("avatars")
          .select("id, voice_id")
          .eq("id", avatar_id)
          .eq("user_id", userId)
          .single();

        if (avatarError || !avatar) {
          res.status(404).json({ error: "Avatar not found" });
          return;
        }

        // Voice required for HeyGen and OmniHuman (Sora 2/Sora 2 Pro/Seedance/VEO3 use avatar as image ref only)
        if (video_provider !== "sora2" && video_provider !== "sora2_openai" && video_provider !== "sora2pro" && video_provider !== "sora2pro_openai" && video_provider !== "seedance" && video_provider !== "veo3" && !avatar.voice_id) {
          res.status(400).json({ error: "Avatar has no voice assigned" });
          return;
        }
      }

      // Script validation (optional for caption-only flows)
      if (script_id) {
        const { data: script, error: scriptError } = await supabase
          .from("scripts")
          .select("id")
          .eq("id", script_id)
          .eq("user_id", userId)
          .single();

        if (scriptError || !script) {
          res.status(404).json({ error: "Script not found" });
          return;
        }
      }

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: userId,
          avatar_id: avatar_id || null,
          script_id: script_id || null,
          campaign_name: campaign_name.trim(),
          custom_prompt: custom_prompt || null,
          reference_image_url: reference_image_url || null,
          video_provider,
          aspect_ratio: aspect_ratio || "9:16",
          duration_seconds: duration_seconds || null,
          status: "draft",
          heygen_id: null,
          video_url: null,
          error_message: null,
          caption_enabled: caption_enabled || false,
          caption_style: caption_style || null,
          caption_position: caption_position || null,
          text_overlays: text_overlays || [],
        })
        .select()
        .single();

      if (jobError || !job) {
        res.status(500).json({ error: "Failed to create campaign" });
        return;
      }

      res.json({ success: true, campaign_id: job.id });
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const campaignId = req.params.id;
      const parseResult = updateCampaignSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const updates = parseResult.data;
      const supabase = getSupabaseAdmin();

      const { data: campaign, error: fetchError } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .eq("status", "draft")
        .single();

      if (fetchError || !campaign) {
        res.status(404).json({ error: "Campaign not found" });
        return;
      }

      if (updates.avatar_id) {
        const { data: avatar, error: avatarError } = await supabase
          .from("avatars")
          .select("id, voice_id")
          .eq("id", updates.avatar_id)
          .eq("user_id", userId)
          .single();

        if (avatarError || !avatar) {
          res.status(404).json({ error: "Avatar not found" });
          return;
        }

        if (!avatar.voice_id) {
          res.status(400).json({ error: "Avatar has no voice assigned" });
          return;
        }
      }

      if (updates.script_id) {
        const { data: script, error: scriptError } = await supabase
          .from("scripts")
          .select("id")
          .eq("id", updates.script_id)
          .eq("user_id", userId)
          .single();

        if (scriptError || !script) {
          res.status(404).json({ error: "Script not found" });
          return;
        }
      }

      const updateData: Record<string, unknown> = {};
      if (updates.avatar_id) updateData.avatar_id = updates.avatar_id;
      if (updates.script_id) updateData.script_id = updates.script_id;
      if (updates.campaign_name)
        updateData.campaign_name = updates.campaign_name.trim();
      if (updates.custom_prompt !== undefined) updateData.custom_prompt = updates.custom_prompt;
      if (updates.video_provider) updateData.video_provider = updates.video_provider;
      if (updates.caption_enabled !== undefined) updateData.caption_enabled = updates.caption_enabled;
      if (updates.caption_style !== undefined) updateData.caption_style = updates.caption_style;
      if (updates.caption_position !== undefined) updateData.caption_position = updates.caption_position;
      if (updates.text_overlays !== undefined) updateData.text_overlays = updates.text_overlays;

      const { error: updateError } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", campaignId);

      if (updateError) {
        res.status(500).json({ error: "Failed to update campaign" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const campaignId = req.params.id;
      const supabase = getSupabaseAdmin();

      const { data: campaign, error: fetchError } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .eq("status", "draft")
        .single();

      if (fetchError || !campaign) {
        res.status(404).json({ error: "Campaign not found" });
        return;
      }

      const { error: deleteError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", campaignId);

      if (deleteError) {
        res.status(500).json({ error: "Failed to delete campaign" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/:id/run",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const campaignId = req.params.id;
      const supabase = getSupabaseAdmin();

      const { data: campaign, error: campaignError } = await supabase
        .from("jobs")
        .select("*, avatars(*), scripts(*)")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .eq("status", "draft")
        .single();

      if (campaignError || !campaign) {
        res.status(404).json({ error: "Campaign not found" });
        return;
      }

      const avatar = campaign.avatars;
      const script = campaign.scripts;
      const videoProvider = campaign.video_provider || "heygen";
      const isCaptionJob = campaign.is_caption_job === true;

      // Sora/VEO3 don't need avatar or script (prompt-driven)
      const isPromptDriven = ["sora2", "sora2_openai", "sora2pro", "sora2pro_openai", "veo3"].includes(videoProvider);

      // Caption jobs need script; non-prompt-driven engines need avatar + script
      if (isCaptionJob && !script) {
        res.status(400).json({ error: "Campaign script missing" });
        return;
      }
      if (!isCaptionJob && !isPromptDriven && (!avatar || !script)) {
        res.status(400).json({ error: "Campaign assets missing" });
        return;
      }

      // Voice required for HeyGen/OmniHuman (TTS), not for Sora 2/Sora 2 Pro/Seedance/VEO3 or caption jobs
      let voiceId = "";
      if (!isCaptionJob && !isPromptDriven && videoProvider !== "seedance" && avatar) {
        const { data: voice, error: voiceError } = await supabase
          .from("voices")
          .select("elevenlabs_voice_id")
          .eq("id", avatar.voice_id)
          .single();

        if (voiceError || !voice) {
          res.status(404).json({ error: "Voice not found" });
          return;
        }
        voiceId = voice.elevenlabs_voice_id;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }

      // Caption jobs have a fixed cost of 25 credits (Whisper + Remotion processing)
      const cost = isCaptionJob ? 25 : calculateVideoCost(script?.content || "", videoProvider);

      if (profile.credits < cost) {
        res.status(402).json({
          error: `Insufficient credits. Need ${cost}, have ${profile.credits}`,
        });
        return;
      }

      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - cost })
        .eq("id", userId)
        .eq("credits", profile.credits);

      if (creditError) {
        res.status(500).json({ error: "Failed to process credits" });
        return;
      }

      const { count: processingCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "processing");

      const currentProcessing = processingCount || 0;
      const shouldTriggerNow = currentProcessing < MAX_CONCURRENT_PROCESSING;

      // Create job with all caption config from draft
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: userId,
          avatar_id: campaign.avatar_id || null,
          script_id: campaign.script_id,
          campaign_name: campaign.campaign_name,
          custom_prompt: campaign.custom_prompt || null,
          reference_image_url: campaign.reference_image_url || null,
          video_provider: videoProvider,
          aspect_ratio: campaign.aspect_ratio || "9:16",
          duration_seconds: campaign.duration_seconds || null,
          status: shouldTriggerNow ? "processing" : "queued",
          heygen_id: null,
          video_url: null,
          error_message: null,
          caption_enabled: campaign.caption_enabled || false,
          caption_style: campaign.caption_style || null,
          caption_position: campaign.caption_position || { x: 0.5, y: 0.5 },
          text_overlays: campaign.text_overlays || [],
          draft_job_id: campaignId,
          source_video_url: campaign.source_video_url || null,
          is_caption_job: isCaptionJob,
        })
        .select()
        .single();

      if (jobError || !job) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("id", userId);

        res.status(500).json({ error: "Failed to create job" });
        return;
      }

      const { count: queuedCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["queued", "processing"]);

      if (shouldTriggerNow) {
        if (isCaptionJob) {
          // Caption jobs don't need API keys — they just run Remotion
          processVideoGeneration({
            id: job.id,
            user_id: userId,
            script_text: script.content,
            avatar_url: "",
            voice_id: "",
            heygen_api_key: "",
            video_provider: "heygen",
          })
            .then(() => triggerNextQueuedJobs(userId))
            .catch((err) => {
              console.error("[RUN] Error in caption job processing:", err);
            });
        } else {
          let heygenApiKey = "";
          let omnihumanCredentials: { accessKeyId: string; secretAccessKey: string } | undefined;
          let kieApiKey = "";
          let arkApiKey = "";
          let hedraApiKey = "";

          if (videoProvider === "hedra_avatar" || videoProvider === "hedra_omnia") {
            try {
              hedraApiKey = await getHedraKey();
            } catch {
              await Promise.all([
                supabase
                  .from("profiles")
                  .update({ credits: profile.credits })
                  .eq("id", userId),
                supabase
                  .from("jobs")
                  .update({
                    status: "failed",
                    error_message: "Something went wrong",
                    error_details: "Hedra API key not configured",
                  })
                  .eq("id", job.id),
              ]);
              res.status(503).json({
                error: "Hedra not configured. Contact support.",
              });
              return;
            }
          } else if (videoProvider === "seedance") {
            try {
              arkApiKey = await getArkApiKey();
            } catch {
              await Promise.all([
                supabase
                  .from("profiles")
                  .update({ credits: profile.credits })
                  .eq("id", userId),
                supabase
                  .from("jobs")
                  .update({
                    status: "failed",
                    error_message: "Something went wrong",
                    error_details: "ARK API key not configured for Seedance",
                  })
                  .eq("id", job.id),
              ]);
              res.status(503).json({
                error: "Seedance not configured. Contact support.",
              });
              return;
            }
          } else if (videoProvider === "sora2" || videoProvider === "sora2pro" || videoProvider === "veo3") {
            try {
              kieApiKey = await getKieApiKey();
            } catch {
              await Promise.all([
                supabase
                  .from("profiles")
                  .update({ credits: profile.credits })
                  .eq("id", userId),
                supabase
                  .from("jobs")
                  .update({
                    status: "failed",
                    error_message: "Something went wrong",
                    error_details: "Kie.ai API key not configured",
                  })
                  .eq("id", job.id),
              ]);
              const label = videoProvider === "veo3" ? "VEO3" : videoProvider === "sora2pro" ? "Sora 2 Pro" : "Sora 2";
              res.status(503).json({ error: `${label} is not configured. Contact support.` });
              return;
            }
          } else if (videoProvider === "sora2_openai" || videoProvider === "sora2pro_openai") {
          } else if (videoProvider === "omnihuman") {
            try {
              omnihumanCredentials = await getBytePlusCredentials();
            } catch {
              await Promise.all([
                supabase
                  .from("profiles")
                  .update({ credits: profile.credits })
                  .eq("id", userId),
                supabase
                  .from("jobs")
                  .update({
                    status: "failed",
                    error_message: "Something went wrong",
                    error_details: "BytePlus credentials not configured",
                  })
                  .eq("id", job.id),
              ]);
              res.status(503).json({
                error: "OmniHuman not configured. Contact support.",
              });
              return;
            }
          } else {
            try {
              heygenApiKey = (await getRotatedKey("heygen")).apiKey;
            } catch {
              await Promise.all([
                supabase
                  .from("profiles")
                  .update({ credits: profile.credits })
                  .eq("id", userId),
                supabase
                  .from("jobs")
                  .update({
                    status: "failed",
                    error_message: "Something went wrong",
                    error_details: "No HeyGen API keys available",
                  })
                  .eq("id", job.id),
              ]);
              res.status(503).json({
                error: "No HeyGen API keys available. Contact support.",
              });
              return;
            }
          }

          processVideoGeneration({
            id: job.id,
            user_id: userId,
            script_text: script?.content || "",
            avatar_url: avatar?.image_url || campaign.reference_image_url || "",
            voice_id: voiceId,
            heygen_api_key: heygenApiKey,
            video_provider: videoProvider as "heygen" | "omnihuman" | "sora2" | "sora2_openai" | "sora2pro" | "sora2pro_openai" | "seedance" | "hedra_avatar" | "hedra_omnia" | "veo3",
            omnihuman_credentials: omnihumanCredentials,
            kie_api_key: kieApiKey || undefined,
            ark_api_key: arkApiKey || undefined,
            hedra_api_key: hedraApiKey || undefined,
            aspect_ratio: campaign.aspect_ratio || "9:16",
            duration_seconds: campaign.duration_seconds || null,
            custom_prompt: campaign.custom_prompt || null,
          })
            .then(() => triggerNextQueuedJobs(userId))
            .catch((err) => {
              console.error("[RUN] Error in background processing:", err);
            });
        }
      }

      res.json({
        success: true,
        job_id: job.id,
        queue_position: queuedCount || 1,
        cost,
        status: shouldTriggerNow ? "processing" : "queued",
      });
    } catch (error) {
      console.error("Run campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/batch-run",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = batchRunSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { campaign_ids } = parseResult.data;
      const supabase = getSupabaseAdmin();

      const { data: campaigns, error: campaignsError } = await supabase
        .from("jobs")
        .select("*, avatars(*), scripts(*)")
        .in("id", campaign_ids)
        .eq("user_id", userId)
        .eq("status", "draft");

      if (campaignsError || !campaigns || campaigns.length === 0) {
        res.status(404).json({ error: "No valid campaigns found" });
        return;
      }

      let totalCost = 0;
      for (const campaign of campaigns) {
        if (campaign.scripts?.content) {
          totalCost += calculateVideoCost(campaign.scripts.content, campaign.video_provider || "heygen");
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (!profile || profile.credits < totalCost) {
        res.status(402).json({
          error: `Insufficient credits. Need ${totalCost}, have ${profile?.credits || 0}`,
        });
        return;
      }

      await supabase
        .from("profiles")
        .update({ credits: profile.credits - totalCost })
        .eq("id", userId);

      // Check current processing count for concurrency control
      const { count: processingCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "processing");

      let slotsUsed = processingCount || 0;

      const results: {
        campaign_id: string;
        job_id: string;
        status: string;
      }[] = [];

      for (const campaign of campaigns) {
        const avatar = campaign.avatars;
        const script = campaign.scripts;
        const videoProvider = campaign.video_provider || "heygen";
        const batchIsPromptDriven = ["sora2", "sora2_openai", "sora2pro", "sora2pro_openai", "veo3"].includes(videoProvider);

        if (!batchIsPromptDriven && (!avatar || !script)) {
          results.push({
            campaign_id: campaign.id,
            job_id: "",
            status: "skipped - missing assets",
          });
          continue;
        }

        // Voice required for HeyGen/OmniHuman (TTS), not for Sora 2/Sora 2 Pro/Seedance/VEO3 (built-in audio)
        let voiceId = "";
        if (!batchIsPromptDriven && videoProvider !== "seedance" && avatar) {
          const { data: voice } = await supabase
            .from("voices")
            .select("elevenlabs_voice_id")
            .eq("id", avatar.voice_id)
            .single();

          if (!voice) {
            results.push({
              campaign_id: campaign.id,
              job_id: "",
              status: "skipped - no voice",
            });
            continue;
          }
          voiceId = voice.elevenlabs_voice_id;
        }

        // Respect concurrency limit: queue excess jobs
        const shouldTriggerNow = slotsUsed < MAX_CONCURRENT_PROCESSING;

        // Create job with all caption config from draft
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .insert({
            user_id: userId,
            avatar_id: campaign.avatar_id,
            script_id: campaign.script_id,
            campaign_name: campaign.campaign_name,
            custom_prompt: campaign.custom_prompt || null,
            reference_image_url: campaign.reference_image_url || null,
            video_provider: videoProvider,
            aspect_ratio: campaign.aspect_ratio || "9:16",
            duration_seconds: campaign.duration_seconds || null,
            status: shouldTriggerNow ? "processing" : "queued",
            caption_enabled: campaign.caption_enabled || false,
            caption_style: campaign.caption_style || null,
            caption_position: campaign.caption_position || { x: 0.5, y: 0.5 },
            text_overlays: campaign.text_overlays || [],
            draft_job_id: campaign.id,
          })
          .select()
          .single();

        if (jobError || !job) {
          results.push({
            campaign_id: campaign.id,
            job_id: "",
            status: "failed - job creation",
          });
          continue;
        }

        if (!shouldTriggerNow) {
          results.push({
            campaign_id: campaign.id,
            job_id: job.id,
            status: "queued",
          });
          continue;
        }

        let heygenApiKey = "";
        let omnihumanCredentials: { accessKeyId: string; secretAccessKey: string } | undefined;
        let kieApiKey = "";
        let arkApiKey = "";
        let hedraApiKey = "";

        if (videoProvider === "hedra_avatar" || videoProvider === "hedra_omnia") {
          try {
            hedraApiKey = await getHedraKey();
          } catch {
            results.push({
              campaign_id: campaign.id,
              job_id: job.id,
              status: "failed - Hedra not configured",
            });
            continue;
          }
        } else if (videoProvider === "seedance") {
          try {
            arkApiKey = await getArkApiKey();
          } catch {
            results.push({
              campaign_id: campaign.id,
              job_id: job.id,
              status: "failed - Seedance not configured",
            });
            continue;
          }
        } else if (videoProvider === "sora2" || videoProvider === "sora2pro" || videoProvider === "veo3") {
          try {
            kieApiKey = await getKieApiKey();
          } catch {
            const label = videoProvider === "veo3" ? "VEO3" : videoProvider === "sora2pro" ? "Sora 2 Pro" : "Sora 2";
            results.push({
              campaign_id: campaign.id,
              job_id: job.id,
              status: `failed - ${label} not configured`,
            });
            continue;
          }
        } else if (videoProvider === "sora2_openai" || videoProvider === "sora2pro_openai") {
        } else if (videoProvider === "omnihuman") {
          try {
            omnihumanCredentials = await getBytePlusCredentials();
          } catch {
            results.push({
              campaign_id: campaign.id,
              job_id: job.id,
              status: "failed - BytePlus credentials not configured",
            });
            continue;
          }
        } else {
          try {
            heygenApiKey = (await getRotatedKey("heygen")).apiKey;
          } catch {
            results.push({
              campaign_id: campaign.id,
              job_id: job.id,
              status: "failed - no API key",
            });
            continue;
          }
        }

        slotsUsed++;

        processVideoGeneration({
          id: job.id,
          user_id: userId,
          script_text: script?.content || "",
          avatar_url: avatar?.image_url || campaign.reference_image_url || "",
          voice_id: voiceId,
          heygen_api_key: heygenApiKey,
          video_provider: videoProvider as "heygen" | "omnihuman" | "sora2" | "sora2_openai" | "sora2pro" | "sora2pro_openai" | "seedance" | "hedra_avatar" | "hedra_omnia" | "veo3",
          omnihuman_credentials: omnihumanCredentials,
          kie_api_key: kieApiKey || undefined,
          ark_api_key: arkApiKey || undefined,
          hedra_api_key: hedraApiKey || undefined,
          aspect_ratio: campaign.aspect_ratio || "9:16",
          duration_seconds: campaign.duration_seconds || null,
          custom_prompt: campaign.custom_prompt || null,
        }).catch((err) => {
          console.error("[BATCH-RUN] Error processing job:", err);
        });

        results.push({
          campaign_id: campaign.id,
          job_id: job.id,
          status: "triggered",
        });
      }

      res.json({
        success: true,
        total_cost: totalCost,
        results,
      });
    } catch (error) {
      console.error("Batch run error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
