import { Router } from "express";
import { z } from "zod";
import { internalAuthMiddleware } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";

const router = Router();

const callbackSchema = z.object({
  premiumJobId: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  videoUrl: z.string().optional(),
  error: z.string().optional(),
});

router.post("/premium-callback", internalAuthMiddleware, async (req, res) => {
  try {
    const validation = callbackSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { premiumJobId, status, videoUrl, error } = validation.data;
    const supabase = getSupabaseAdmin();

    const { data: job, error: fetchError } = await supabase
      .from("premium_jobs")
      .select("user_id, status, credits_cost")
      .eq("id", premiumJobId)
      .single();

    if (fetchError || !job) {
      console.error("Job not found:", premiumJobId);
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== "stitching") {
      console.warn(`Job ${premiumJobId} is not in stitching state, current: ${job.status}`);
    }

    if (status === "completed") {
      if (!videoUrl) {
        return res.status(400).json({ error: "Video URL required for completed status" });
      }

      const { error: updateError } = await supabase
        .from("premium_jobs")
        .update({
          status: "completed",
          final_video_url: videoUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", premiumJobId);

      if (updateError) {
        console.error("Failed to update job:", updateError);
        return res.status(500).json({ error: "Failed to update job" });
      }

      console.log(`Premium job ${premiumJobId} completed successfully`);
      return res.json({ message: "Job completed" });
    } else {
      const { error: updateError } = await supabase
        .from("premium_jobs")
        .update({
          status: "failed",
          error_message: error || "Stitching failed",
        })
        .eq("id", premiumJobId);

      if (updateError) {
        console.error("Failed to update job:", updateError);
        return res.status(500).json({ error: "Failed to update job" });
      }

      await supabase.rpc("increment_credits", {
        user_id: job.user_id,
        amount: job.credits_cost,
      });

      console.log(`Premium job ${premiumJobId} failed, credits refunded`);
      return res.json({ message: "Job failed, credits refunded" });
    }
  } catch (error: any) {
    console.error("Premium callback error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
