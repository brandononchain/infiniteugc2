import { Router, Request, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { calculateVideoCost } from "../lib/credits";
import { processVideoGeneration, triggerNextQueuedJobs } from "../services/video-generator";
import { getHedraKey } from "../lib/keys";

const router = Router();

const MAX_CONCURRENT_PROCESSING = 2;

const createMassCampaignSchema = z.object({
  avatar_id: z.string().uuid("Invalid avatar ID").optional(),
  script_group_id: z.string().uuid("Invalid script group ID").optional(),
  campaign_name: z.string().min(1, "Campaign name is required").max(255),
  video_provider: z.enum(["hedra_avatar", "hedra_omnia"]).optional().default("hedra_avatar"),
  caption_enabled: z.boolean().optional(),
  caption_style: z.any().nullable().optional(),
  caption_position: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  text_overlays: z.array(z.any()).optional(),
});

const updateMassCampaignSchema = z.object({
  avatar_id: z.string().uuid("Invalid avatar ID").optional(),
  script_group_id: z.string().uuid("Invalid script group ID").optional(),
  campaign_name: z.string().min(1).max(255).optional(),
  video_provider: z.enum(["hedra_avatar", "hedra_omnia"]).optional(),
  caption_enabled: z.boolean().optional(),
  caption_style: z.any().nullable().optional(),
  caption_position: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  text_overlays: z.array(z.any()).optional(),
});

// POST /mass-campaigns — Create a new mass campaign (draft)
router.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const parseResult = createMassCampaignSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const { avatar_id, script_group_id, campaign_name, video_provider, caption_enabled, caption_style, caption_position, text_overlays } = parseResult.data;
      const supabase = getSupabaseAdmin();

      // Avatar validation
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
      }

      // Script group validation
      if (script_group_id) {
        const { data: sg, error: sgError } = await supabase
          .from("script_groups")
          .select("id")
          .eq("id", script_group_id)
          .eq("user_id", userId)
          .single();

        if (sgError || !sg) {
          res.status(404).json({ error: "Script group not found" });
          return;
        }
      }

      const { data: campaign, error: campaignError } = await supabase
        .from("mass_campaigns")
        .insert({
          user_id: userId,
          avatar_id: avatar_id || null,
          script_group_id: script_group_id || null,
          campaign_name: campaign_name.trim(),
          video_provider,
          status: "draft",
          caption_enabled: caption_enabled || false,
          caption_style: caption_style || null,
          caption_position: caption_position || null,
          text_overlays: text_overlays || [],
        })
        .select()
        .single();

      if (campaignError || !campaign) {
        console.error("Create mass campaign error:", campaignError);
        res.status(500).json({ error: "Failed to create mass campaign" });
        return;
      }

      res.json({ success: true, campaign_id: campaign.id });
    } catch (error) {
      console.error("Create mass campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PATCH /mass-campaigns/:id — Update a mass campaign
router.patch(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const campaignId = req.params.id;
      const parseResult = updateMassCampaignSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: parseResult.error.issues[0]?.message || "Invalid request",
        });
        return;
      }

      const updates = parseResult.data;
      const supabase = getSupabaseAdmin();

      const { data: campaign, error: fetchError } = await supabase
        .from("mass_campaigns")
        .select("id")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .eq("status", "draft")
        .single();

      if (fetchError || !campaign) {
        res.status(404).json({ error: "Mass campaign not found" });
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
      }

      if (updates.script_group_id) {
        const { data: sg, error: sgError } = await supabase
          .from("script_groups")
          .select("id")
          .eq("id", updates.script_group_id)
          .eq("user_id", userId)
          .single();

        if (sgError || !sg) {
          res.status(404).json({ error: "Script group not found" });
          return;
        }
      }

      const updateData: Record<string, unknown> = {};
      if (updates.avatar_id) updateData.avatar_id = updates.avatar_id;
      if (updates.script_group_id) updateData.script_group_id = updates.script_group_id;
      if (updates.campaign_name) updateData.campaign_name = updates.campaign_name.trim();
      if (updates.video_provider) updateData.video_provider = updates.video_provider;
      if (updates.caption_enabled !== undefined) {
        updateData.caption_enabled = updates.caption_enabled;
        updateData.caption_style = updates.caption_enabled ? (updates.caption_style || null) : null;
        updateData.caption_position = updates.caption_enabled ? (updates.caption_position || null) : null;
      }
      if (updates.text_overlays !== undefined) updateData.text_overlays = updates.text_overlays;

      const { error: updateError } = await supabase
        .from("mass_campaigns")
        .update(updateData)
        .eq("id", campaignId);

      if (updateError) {
        res.status(500).json({ error: "Failed to update mass campaign" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Update mass campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /mass-campaigns/:id — Delete a mass campaign
router.delete(
  "/:id",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const campaignId = req.params.id;
      const supabase = getSupabaseAdmin();

      const { data: campaign, error: fetchError } = await supabase
        .from("mass_campaigns")
        .select("id")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .eq("status", "draft")
        .single();

      if (fetchError || !campaign) {
        res.status(404).json({ error: "Mass campaign not found" });
        return;
      }

      const { error: deleteError } = await supabase
        .from("mass_campaigns")
        .delete()
        .eq("id", campaignId);

      if (deleteError) {
        res.status(500).json({ error: "Failed to delete mass campaign" });
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete mass campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /mass-campaigns/:id/run — Run a mass campaign (create N jobs from script group)
router.post(
  "/:id/run",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const campaignId = req.params.id;
      const supabase = getSupabaseAdmin();

      // Fetch the mass campaign with avatar and script group
      const { data: campaign, error: campaignError } = await supabase
        .from("mass_campaigns")
        .select("*, avatars(*), script_groups(*)")
        .eq("id", campaignId)
        .eq("user_id", userId)
        .eq("status", "draft")
        .single();

      if (campaignError || !campaign) {
        res.status(404).json({ error: "Mass campaign not found" });
        return;
      }

      const avatar = campaign.avatars;
      const scriptGroup = campaign.script_groups;
      const videoProvider = campaign.video_provider || "hedra_avatar";

      if (!avatar) {
        res.status(400).json({ error: "Campaign avatar missing" });
        return;
      }

      if (!scriptGroup || !scriptGroup.script_ids || scriptGroup.script_ids.length === 0) {
        res.status(400).json({ error: "Campaign script group missing or empty" });
        return;
      }

      // Fetch all scripts in the group
      const { data: scriptsData, error: scriptsError } = await supabase
        .from("scripts")
        .select("*")
        .in("id", scriptGroup.script_ids);

      if (scriptsError || !scriptsData || scriptsData.length === 0) {
        res.status(400).json({ error: "No valid scripts found in group" });
        return;
      }

      // Get voice for Hedra (needs TTS audio)
      let voiceId = "";
      if (avatar.voice_id) {
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

      // Calculate total cost across all scripts
      const totalCost = scriptsData.reduce(
        (sum: number, script: { content: string }) => sum + calculateVideoCost(script.content, videoProvider),
        0
      );

      // Check credits
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

      // Deduct total credits atomically with optimistic lock
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - totalCost })
        .eq("id", userId)
        .eq("credits", profile.credits);

      if (creditError) {
        res.status(500).json({ error: "Failed to process credits" });
        return;
      }

      // Check Hedra API key upfront
      let hedraApiKey = "";
      try {
        hedraApiKey = await getHedraKey();
      } catch {
        // no key available
      }
      if (!hedraApiKey) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("id", userId);

        res.status(503).json({ error: "Hedra not configured. Contact support." });
        return;
      }

      // Count currently processing jobs for concurrency control
      const { count: processingCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "processing");

      let currentProcessing = processingCount || 0;

      // Create N jobs + N mass_jobs (one per script in the group)
      const jobResults: Array<{ job_id: string; script_name: string; status: string }> = [];

      for (const script of scriptsData) {
        const shouldTriggerNow = currentProcessing < MAX_CONCURRENT_PROCESSING;
        const jobStatus = shouldTriggerNow ? "processing" : "queued";

        // Create regular job for the existing video pipeline
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .insert({
            user_id: userId,
            avatar_id: campaign.avatar_id || null,
            script_id: script.id,
            campaign_name: `${campaign.campaign_name} - ${script.name}`,
            video_provider: videoProvider,
            status: jobStatus,
            heygen_id: null,
            video_url: null,
            error_message: null,
            caption_enabled: campaign.caption_enabled || false,
            caption_style: campaign.caption_style || null,
            caption_position: campaign.caption_position || { x: 0.5, y: 0.5 },
            text_overlays: campaign.text_overlays || [],
          })
          .select()
          .single();

        if (jobError || !job) {
          console.error("[MASS-RUN] Failed to create job for script:", script.id, jobError);
          jobResults.push({ job_id: "", script_name: script.name, status: "failed" });
          continue;
        }

        // Create mass_job record for tracking
        const { data: massJob } = await supabase
          .from("mass_jobs")
          .insert({
            mass_campaign_id: campaignId,
            user_id: userId,
            video_provider: videoProvider,
            avatar_id: campaign.avatar_id || null,
            script_id: script.id,
            status: jobStatus,
            caption_enabled: campaign.caption_enabled || false,
            caption_style: campaign.caption_style || null,
            caption_position: campaign.caption_position || null,
            text_overlays: campaign.text_overlays || [],
          })
          .select()
          .single();

        jobResults.push({ job_id: job.id, script_name: script.name, status: jobStatus });

        // Trigger generation if within concurrency limit
        if (shouldTriggerNow) {
          currentProcessing++;

          const currentJob = job;
          const currentMassJob = massJob;
          const currentScript = script;

          processVideoGeneration({
            id: currentJob.id,
            user_id: userId,
            script_text: currentScript.content,
            avatar_url: avatar.image_url,
            voice_id: voiceId,
            heygen_api_key: "",
            video_provider: videoProvider as "hedra_avatar" | "hedra_omnia",
            hedra_api_key: hedraApiKey,
          })
            .then(async () => {
              // Copy result from jobs to mass_jobs
              const { data: completedJob } = await supabase
                .from("jobs")
                .select("video_url, status, error_message, error_details")
                .eq("id", currentJob.id)
                .single();

              if (completedJob && currentMassJob) {
                await supabase
                  .from("mass_jobs")
                  .update({
                    video_url: completedJob.video_url,
                    status: completedJob.status,
                    error_message: completedJob.error_message,
                    error_details: completedJob.error_details,
                    completed_at: completedJob.status === "completed" ? new Date().toISOString() : null,
                  })
                  .eq("id", currentMassJob.id);
              }

              triggerNextQueuedJobs(userId);
            })
            .catch(async (err) => {
              console.error("[MASS-RUN] Error in background processing:", err);
              if (currentMassJob) {
                await supabase
                  .from("mass_jobs")
                  .update({
                    status: "failed",
                    error_message: "Processing failed",
                    error_details: err instanceof Error ? err.message : String(err),
                  })
                  .eq("id", currentMassJob.id);
              }
            });
        }
      }

      // Update campaign status to indicate it has been run
      await supabase
        .from("mass_campaigns")
        .update({ status: "running" })
        .eq("id", campaignId);

      res.json({
        success: true,
        job_count: jobResults.length,
        total_cost: totalCost,
        jobs: jobResults,
      });
    } catch (error) {
      console.error("Run mass campaign error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
