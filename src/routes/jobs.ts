import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../lib/supabase";
import { calculateVideoCost } from "../lib/credits";

const router = Router();

router.post(
  "/:id/cancel",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const jobId = req.params.id;
      const supabase = getSupabaseAdmin();

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("*, scripts(*)")
        .eq("id", jobId)
        .eq("user_id", userId)
        .in("status", ["queued", "processing"])
        .single();

      if (jobError || !job) {
        res.status(404).json({ error: "Job not found or already completed" });
        return;
      }

      const refundAmount = job.scripts
        ? calculateVideoCost(job.scripts.content)
        : 0;

      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      await Promise.all([
        supabase.from("jobs").delete().eq("id", jobId),
        refundAmount > 0 && profile
          ? supabase
              .from("profiles")
              .update({ credits: profile.credits + refundAmount })
              .eq("id", userId)
          : Promise.resolve(),
      ]);

      res.json({ success: true, refunded: refundAmount });
    } catch (error) {
      console.error("Cancel job error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
