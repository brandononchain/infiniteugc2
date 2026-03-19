import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middleware/auth";
import { adminMiddleware } from "../middleware/admin";
import { getSupabaseAdmin } from "../lib/supabase";
import sharp from "sharp";

const router = Router();

// Helper: build email map from user IDs
async function getEmailMap(supabase: any, userIds: string[]) {
  if (userIds.length === 0) return {};
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);
  const map: Record<string, string> = {};
  for (const p of profiles || []) map[p.id] = p.email;
  return map;
}

// Helper: pagination params
function getPaginationParams(query: any) {
  const page = parseInt(query.page as string) || 1;
  const limit = Math.min(parseInt(query.limit as string) || 50, 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// --- Public admin check (only needs auth, not admin) ---

router.get("/check", authMiddleware, async (req, res: Response) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  res.json({ is_admin: data?.is_admin === true });
});

// --- All routes below require auth + admin ---

router.use(authMiddleware);
router.use(adminMiddleware);

// ──────────────────────────────────────────────────────────
// GET /admin/stats - Aggregate dashboard statistics + analytics
// ──────────────────────────────────────────────────────────
router.get("/stats", async (_req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();

    // Try RPC first for performance (single query instead of 14)
    const [{ data: rpcData, error: rpcError }, { data: analyticsData }] = await Promise.all([
      supabase.rpc("admin_get_stats"),
      supabase.rpc("admin_get_analytics"),
    ]);

    if (!rpcError && rpcData) {
      // If RPC doesn't include broll_jobs (old RPC version), fetch counts separately
      if (!rpcData.broll_jobs) {
        const statuses = ["completed", "failed", "processing", "queued", "pending"];
        const countResults = await Promise.all([
          supabase.from("broll_jobs").select("*", { count: "exact", head: true }),
          ...statuses.map(s => supabase.from("broll_jobs").select("*", { count: "exact", head: true }).eq("status", s)),
        ]);
        const brollCounts: Record<string, number> = { total: countResults[0].count || 0 };
        statuses.forEach((s, i) => { brollCounts[s] = countResults[i + 1].count || 0; });
        rpcData.broll_jobs = brollCounts;
      }
      res.json({ ...rpcData, analytics: analyticsData || null });
      return;
    }

    // Fallback: parallel queries (using head:true count where possible)
    console.warn("[ADMIN] RPC fallback for stats:", rpcError?.message);

    // For job tables, we still need status breakdowns — fetch only status column with limit
    const [
      usersResult, jobsResult, premiumResult, massJobsResult,
      hookResult, imageResult, brollResult, keysResult, creditsResult,
      avatarsResult, voicesResult, scriptsResult, massCampaignsResult,
      editorResult, analyticsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("status").limit(10000),
      supabase.from("premium_jobs").select("status").limit(10000),
      supabase.from("mass_jobs").select("status").limit(10000),
      supabase.from("hook_jobs").select("status").limit(10000),
      supabase.from("image_generation_jobs").select("status").limit(10000),
      supabase.from("broll_jobs").select("status").limit(10000),
      supabase.from("system_keys").select("provider, is_active"),
      supabase.from("profiles").select("credits").limit(10000),
      supabase.from("avatars").select("*", { count: "exact", head: true }),
      supabase.from("voices").select("*", { count: "exact", head: true }),
      supabase.from("scripts").select("*", { count: "exact", head: true }),
      supabase.from("mass_campaigns").select("*", { count: "exact", head: true }),
      supabase.from("editor_projects").select("*", { count: "exact", head: true }),
      supabase.rpc("admin_get_analytics"),
    ]);

    const countByStatus = (rows: { status: string }[] | null) => {
      const counts: Record<string, number> = {};
      let total = 0;
      for (const row of rows || []) {
        counts[row.status] = (counts[row.status] || 0) + 1;
        total++;
      }
      return { total, ...counts };
    };

    const keysByProvider: Record<string, { active: number; inactive: number }> = {};
    let activeKeys = 0, inactiveKeys = 0;
    for (const key of keysResult.data || []) {
      if (!keysByProvider[key.provider]) keysByProvider[key.provider] = { active: 0, inactive: 0 };
      if (key.is_active) { keysByProvider[key.provider].active++; activeKeys++; }
      else { keysByProvider[key.provider].inactive++; inactiveKeys++; }
    }

    const totalCredits = (creditsResult.data || []).reduce(
      (sum: number, p: { credits: number }) => sum + (p.credits || 0), 0
    );

    res.json({
      users: { total: usersResult.count || 0 },
      jobs: countByStatus(jobsResult.data),
      premium_jobs: countByStatus(premiumResult.data),
      mass_jobs: countByStatus(massJobsResult.data),
      hook_jobs: countByStatus(hookResult.data),
      image_jobs: countByStatus(imageResult.data),
      broll_jobs: countByStatus(brollResult.data),
      system_keys: { total: (keysResult.data || []).length, active: activeKeys, inactive: inactiveKeys, by_provider: keysByProvider },
      credits: { total_distributed: totalCredits },
      avatars: { total: avatarsResult.count || 0 },
      voices: { total: voicesResult.count || 0 },
      scripts: { total: scriptsResult.count || 0 },
      mass_campaigns: { total: massCampaignsResult.count || 0 },
      editor_projects: { total: editorResult.count || 0 },
      analytics: analyticsResult.data || null,
    });
  } catch (error: any) {
    console.error("[ADMIN] Stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/analytics - Dedicated analytics endpoint
// ──────────────────────────────────────────────────────────
router.get("/analytics", async (_req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("admin_get_analytics");
    if (error) { res.status(500).json({ error: "Failed to fetch analytics" }); return; }
    res.json(data);
  } catch (error: any) {
    console.error("[ADMIN] Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/users - Paginated user list with job counts
// ──────────────────────────────────────────────────────────
router.get("/users", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const search = (req.query.search as string) || "";

    // Try RPC first (single query instead of 5)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_users_list", {
      p_page: page, p_limit: limit, p_search: search || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback: multiple queries
    console.warn("[ADMIN] RPC fallback for users:", rpcError?.message);
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) query = query.ilike("email", `%${search}%`);

    const { data: profiles, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch users" }); return; }

    const userIds = (profiles || []).map((p: any) => p.id);
    if (userIds.length === 0) { res.json({ users: [], total: 0, page, limit }); return; }

    const [jobCounts, premiumCounts, massCounts, hookCounts] = await Promise.all([
      supabase.from("jobs").select("user_id, status").in("user_id", userIds),
      supabase.from("premium_jobs").select("user_id, status").in("user_id", userIds),
      supabase.from("mass_jobs").select("user_id, status").in("user_id", userIds),
      supabase.from("hook_jobs").select("user_id, status").in("user_id", userIds),
    ]);

    const aggregateByUser = (rows: { user_id: string; status: string }[] | null) => {
      const map: Record<string, { total: number; completed: number; failed: number }> = {};
      for (const row of rows || []) {
        if (!map[row.user_id]) map[row.user_id] = { total: 0, completed: 0, failed: 0 };
        map[row.user_id].total++;
        if (row.status === "completed") map[row.user_id].completed++;
        if (row.status === "failed") map[row.user_id].failed++;
      }
      return map;
    };

    const jobMap = aggregateByUser(jobCounts.data);
    const premiumMap = aggregateByUser(premiumCounts.data);
    const massMap = aggregateByUser(massCounts.data);
    const hookMap = aggregateByUser(hookCounts.data);

    const users = (profiles || []).map((p: any) => {
      const j = jobMap[p.id] || { total: 0, completed: 0, failed: 0 };
      const pr = premiumMap[p.id] || { total: 0, completed: 0, failed: 0 };
      const m = massMap[p.id] || { total: 0, completed: 0, failed: 0 };
      const h = hookMap[p.id] || { total: 0, completed: 0, failed: 0 };
      return {
        id: p.id, email: p.email, credits: p.credits, is_admin: p.is_admin, created_at: p.created_at,
        job_count: j.total + pr.total + m.total + h.total,
        completed_count: j.completed + pr.completed + m.completed + h.completed,
        failed_count: j.failed + pr.failed + m.failed + h.failed,
      };
    });

    res.json({ users, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/users/:id - Full user detail via RPC
// ──────────────────────────────────────────────────────────
router.get("/users/:id", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = req.params.id;

    // Try RPC first for efficiency
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_user_detail", { p_user_id: userId });

    if (!rpcError && rpcData) {
      if (!rpcData.profile) { res.status(404).json({ error: "User not found" }); return; }
      res.json(rpcData);
      return;
    }

    // Fallback: expanded parallel queries
    console.warn("[ADMIN] RPC fallback for user detail:", rpcError?.message);
    const [
      profileResult, avatarsResult, voicesResult, scriptsResult,
      scriptGroupsResult, avatarGroupsResult, editorResult,
      massCampaignsResult, jobsResult, premiumResult, massResult,
      hookResult, imageResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("avatars").select("*, voices(name, elevenlabs_voice_id, sample_url)").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("voices").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("scripts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("script_groups").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("avatar_groups").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("editor_projects").select("id, name, thumbnail, duration, created_at, updated_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("mass_campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
      supabase.from("premium_jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("mass_jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("hook_jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
      supabase.from("image_generation_jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    ]);

    if (profileResult.error || !profileResult.data) { res.status(404).json({ error: "User not found" }); return; }

    // Enrich jobs + mass_jobs with avatar/script data (mirrors what RPC does)
    const rawJobs = jobsResult.data || [];
    const rawMassJobs = massResult.data || [];
    const allJobLike = [...rawJobs, ...rawMassJobs];
    const avatarIds = [...new Set(allJobLike.map((j: any) => j.avatar_id).filter(Boolean))];
    const scriptIds = [...new Set(allJobLike.map((j: any) => j.script_id).filter(Boolean))];

    const [avatarLookup, scriptLookup] = await Promise.all([
      avatarIds.length > 0
        ? supabase.from("avatars").select("id, name, image_url").in("id", avatarIds)
        : { data: [] },
      scriptIds.length > 0
        ? supabase.from("scripts").select("id, name, content").in("id", scriptIds)
        : { data: [] },
    ]);

    const avatarMap = new Map((avatarLookup.data || []).map((a: any) => [a.id, a]));
    const scriptMap = new Map((scriptLookup.data || []).map((s: any) => [s.id, s]));

    const enrichJob = (job: any) => {
      const avatar = avatarMap.get(job.avatar_id);
      const script = scriptMap.get(job.script_id);
      return {
        ...job,
        avatar_name: avatar?.name || null,
        avatar_image_url: avatar?.image_url || null,
        script_name: script?.name || null,
        script_content_preview: script?.content ? script.content.substring(0, 200) : null,
        processing_time_seconds: job.completed_at && job.created_at
          ? (new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000
          : null,
      };
    };

    const enrichedJobs = rawJobs.map(enrichJob);
    const enrichedMassJobs = rawMassJobs.map(enrichJob);

    // Enrich avatars with voice info
    const enrichedAvatars = (avatarsResult.data || []).map((a: any) => {
      const voice = a.voices;
      return {
        ...a,
        voice_name: voice?.name || null,
        voice_sample_url: voice?.sample_url || null,
        voices: undefined,
      };
    });

    res.json({
      profile: profileResult.data,
      avatars: enrichedAvatars,
      voices: voicesResult.data || [],
      scripts: scriptsResult.data || [],
      script_groups: scriptGroupsResult.data || [],
      avatar_groups: avatarGroupsResult.data || [],
      editor_projects: editorResult.data || [],
      mass_campaigns: massCampaignsResult.data || [],
      jobs: enrichedJobs,
      premium_jobs: premiumResult.data || [],
      mass_jobs: enrichedMassJobs,
      hook_jobs: hookResult.data || [],
      image_jobs: imageResult.data || [],
    });
  } catch (error: any) {
    console.error("[ADMIN] User detail error:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// ──────────────────────────────────────────────────────────
// POST /admin/users/:id/credits - Adjust user credits
// ──────────────────────────────────────────────────────────
router.post("/users/:id/credits", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const userId = req.params.id;
    const { action, amount } = req.body;

    if (!action || typeof amount !== "number" || amount < 0) {
      res.status(400).json({ error: "Invalid request. Provide action (add|set) and amount (number >= 0)" });
      return;
    }

    if (action === "set") {
      const { error } = await supabase.from("profiles").update({ credits: amount }).eq("id", userId);
      if (error) { res.status(500).json({ error: "Failed to set credits" }); return; }
    } else if (action === "add") {
      const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).single();
      if (!profile) { res.status(404).json({ error: "User not found" }); return; }
      const { error } = await supabase.from("profiles").update({ credits: profile.credits + amount }).eq("id", userId);
      if (error) { res.status(500).json({ error: "Failed to add credits" }); return; }
    } else {
      res.status(400).json({ error: "Action must be 'add' or 'set'" }); return;
    }

    const { data: updated } = await supabase.from("profiles").select("id, email, credits").eq("id", userId).single();
    res.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error("[ADMIN] Credits error:", error);
    res.status(500).json({ error: "Failed to adjust credits" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/jobs - All jobs (enriched with avatar/script)
// ──────────────────────────────────────────────────────────
router.get("/jobs", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const status = req.query.status as string;
    const videoProvider = req.query.video_provider as string;
    const userId = req.query.user_id as string;
    const search = req.query.search as string;

    // Try RPC first (single query instead of 4)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_jobs_list", {
      p_page: page, p_limit: limit,
      p_status: status || null, p_provider: videoProvider || null,
      p_user_id: userId || null, p_search: search || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback: multiple queries
    console.warn("[ADMIN] RPC fallback for jobs:", rpcError?.message);
    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (videoProvider) query = query.eq("video_provider", videoProvider);
    if (userId) query = query.eq("user_id", userId);
    if (search) query = query.ilike("campaign_name", `%${search}%`);

    const { data: jobs, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch jobs" }); return; }

    // Batch join user emails, avatar names, script names
    const userIds = [...new Set((jobs || []).map((j: any) => j.user_id))];
    const avatarIds = [...new Set((jobs || []).filter((j: any) => j.avatar_id).map((j: any) => j.avatar_id))];
    const scriptIds = [...new Set((jobs || []).filter((j: any) => j.script_id).map((j: any) => j.script_id))];

    const [emailMap, avatarsResult, scriptsResult] = await Promise.all([
      getEmailMap(supabase, userIds),
      avatarIds.length > 0 ? supabase.from("avatars").select("id, name, image_url").in("id", avatarIds) : { data: [] },
      scriptIds.length > 0 ? supabase.from("scripts").select("id, name").in("id", scriptIds) : { data: [] },
    ]);

    const avatarMap: Record<string, { name: string; image_url: string | null }> = {};
    for (const a of avatarsResult.data || []) avatarMap[a.id] = { name: a.name, image_url: a.image_url };
    const scriptMap: Record<string, string> = {};
    for (const s of scriptsResult.data || []) scriptMap[s.id] = s.name;

    const enriched = (jobs || []).map((j: any) => ({
      ...j,
      user_email: emailMap[j.user_id] || "Unknown",
      avatar_name: j.avatar_id ? avatarMap[j.avatar_id]?.name : null,
      avatar_image_url: j.avatar_id ? avatarMap[j.avatar_id]?.image_url : null,
      script_name: j.script_id ? scriptMap[j.script_id] : null,
      processing_time_seconds: j.completed_at
        ? (new Date(j.completed_at).getTime() - new Date(j.created_at).getTime()) / 1000
        : null,
    }));

    res.json({ jobs: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Jobs error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/jobs/:id - Single job full detail
// ──────────────────────────────────────────────────────────
router.get("/jobs/:id", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const jobId = req.params.id;

    const { data: job, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (error || !job) { res.status(404).json({ error: "Job not found" }); return; }

    const [emailMap, avatarResult, scriptResult] = await Promise.all([
      getEmailMap(supabase, [job.user_id]),
      job.avatar_id ? supabase.from("avatars").select("*").eq("id", job.avatar_id).single() : { data: null },
      job.script_id ? supabase.from("scripts").select("*").eq("id", job.script_id).single() : { data: null },
    ]);

    res.json({
      job: {
        ...job,
        user_email: emailMap[job.user_id] || "Unknown",
        avatar: avatarResult.data || null,
        script: scriptResult.data || null,
        processing_time_seconds: job.completed_at
          ? (new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000
          : null,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN] Job detail error:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/premium-jobs - All premium jobs
// ──────────────────────────────────────────────────────────
router.get("/premium-jobs", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const status = req.query.status as string;
    const videoProvider = req.query.video_provider as string;

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_premium_jobs_list", {
      p_page: page, p_limit: limit,
      p_status: status || null, p_provider: videoProvider || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback
    console.warn("[ADMIN] RPC fallback for premium-jobs:", rpcError?.message);
    let query = supabase
      .from("premium_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (videoProvider) query = query.eq("video_provider", videoProvider);

    const { data: jobs, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch premium jobs" }); return; }

    const userIds = [...new Set((jobs || []).map((j: any) => j.user_id))];
    const emailMap = await getEmailMap(supabase, userIds);

    const enriched = (jobs || []).map((j: any) => ({
      ...j,
      user_email: emailMap[j.user_id] || "Unknown",
    }));

    res.json({ premium_jobs: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Premium jobs error:", error);
    res.status(500).json({ error: "Failed to fetch premium jobs" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/premium-jobs/:id - Single premium job + chunks
// ──────────────────────────────────────────────────────────
router.get("/premium-jobs/:id", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const jobId = req.params.id;

    const [jobResult, chunksResult] = await Promise.all([
      supabase.from("premium_jobs").select("*").eq("id", jobId).single(),
      supabase.from("video_chunks").select("*").eq("premium_job_id", jobId).order("chunk_index", { ascending: true }),
    ]);

    if (jobResult.error || !jobResult.data) { res.status(404).json({ error: "Premium job not found" }); return; }

    const job = jobResult.data;
    const emailMap = await getEmailMap(supabase, [job.user_id]);

    let templateJob = null;
    if (job.template_job_id) {
      const { data } = await supabase.from("premium_jobs").select("id, campaign_name, final_video_url").eq("id", job.template_job_id).single();
      templateJob = data;
    }

    res.json({
      premium_job: {
        ...job,
        user_email: emailMap[job.user_id] || "Unknown",
      },
      chunks: chunksResult.data || [],
      template_job: templateJob,
    });
  } catch (error: any) {
    console.error("[ADMIN] Premium job detail error:", error);
    res.status(500).json({ error: "Failed to fetch premium job" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/hook-jobs - All hook jobs
// ──────────────────────────────────────────────────────────
router.get("/hook-jobs", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const status = req.query.status as string;

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_hook_jobs_list", {
      p_page: page, p_limit: limit, p_status: status || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback
    console.warn("[ADMIN] RPC fallback for hook-jobs:", rpcError?.message);
    let query = supabase
      .from("hook_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data: jobs, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch hook jobs" }); return; }

    const userIds = [...new Set((jobs || []).map((j: any) => j.user_id))];
    const emailMap = await getEmailMap(supabase, userIds);

    const enriched = (jobs || []).map((j: any) => ({
      ...j,
      user_email: emailMap[j.user_id] || "Unknown",
    }));

    res.json({ hook_jobs: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Hook jobs error:", error);
    res.status(500).json({ error: "Failed to fetch hook jobs" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/hook-jobs/:id - Single hook job + source refs
// ──────────────────────────────────────────────────────────
router.get("/hook-jobs/:id", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const jobId = req.params.id;

    const { data: job, error } = await supabase.from("hook_jobs").select("*").eq("id", jobId).single();
    if (error || !job) { res.status(404).json({ error: "Hook job not found" }); return; }

    const emailMap = await getEmailMap(supabase, [job.user_id]);

    // Resolve source reference
    let sourceRef = null;
    if (job.source_job_id) {
      const { data } = await supabase.from("jobs").select("id, campaign_name, video_url, video_provider, status").eq("id", job.source_job_id).single();
      sourceRef = data ? { type: "job", ...data } : null;
    } else if (job.source_premium_job_id) {
      const { data } = await supabase.from("premium_jobs").select("id, campaign_name, final_video_url, video_provider, status").eq("id", job.source_premium_job_id).single();
      sourceRef = data ? { type: "premium_job", ...data } : null;
    } else if (job.source_mass_job_id) {
      const { data } = await supabase.from("mass_jobs").select("id, video_url, video_provider, status").eq("id", job.source_mass_job_id).single();
      sourceRef = data ? { type: "mass_job", ...data } : null;
    }

    res.json({
      hook_job: {
        ...job,
        user_email: emailMap[job.user_id] || "Unknown",
      },
      source_ref: sourceRef,
    });
  } catch (error: any) {
    console.error("[ADMIN] Hook job detail error:", error);
    res.status(500).json({ error: "Failed to fetch hook job" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/image-jobs - All image generation jobs
// ──────────────────────────────────────────────────────────
router.get("/image-jobs", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const status = req.query.status as string;
    const model = req.query.model as string;

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_image_jobs_list", {
      p_page: page, p_limit: limit, p_status: status || null, p_model: model || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback
    console.warn("[ADMIN] RPC fallback for image-jobs:", rpcError?.message);
    let query = supabase
      .from("image_generation_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (model) query = query.eq("model", model);

    const { data: jobs, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch image jobs" }); return; }

    const userIds = [...new Set((jobs || []).map((j: any) => j.user_id))];
    const emailMap = await getEmailMap(supabase, userIds);

    const enriched = (jobs || []).map((j: any) => ({
      ...j,
      user_email: emailMap[j.user_id] || "Unknown",
    }));

    res.json({ image_jobs: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Image jobs error:", error);
    res.status(500).json({ error: "Failed to fetch image jobs" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/avatars - All avatars across all users
// ──────────────────────────────────────────────────────────
router.get("/avatars", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const search = req.query.search as string;

    let countQuery = supabase.from("avatars").select("*", { count: "exact", head: true });
    let query = supabase.from("avatars").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    if (search) {
      countQuery = countQuery.ilike("name", `%${search}%`);
      query = query.ilike("name", `%${search}%`);
    }

    const [{ count }, { data: avatars, error }] = await Promise.all([countQuery, query]);
    if (error) throw error;

    // Get user emails + voice names
    const userIds = [...new Set((avatars || []).map((a: any) => a.user_id))];
    const voiceIds = [...new Set((avatars || []).filter((a: any) => a.voice_id).map((a: any) => a.voice_id))];

    const [emailMap, voiceResult] = await Promise.all([
      getEmailMap(supabase, userIds),
      voiceIds.length > 0
        ? supabase.from("voices").select("id, name, sample_url").in("id", voiceIds)
        : { data: [] },
    ]);

    const voiceMap: Record<string, any> = {};
    for (const v of voiceResult.data || []) voiceMap[v.id] = v;

    const enriched = (avatars || []).map((a: any) => ({
      ...a,
      user_email: emailMap[a.user_id] || "Unknown",
      voice_name: a.voice_id ? voiceMap[a.voice_id]?.name || null : null,
      voice_sample_url: a.voice_id ? voiceMap[a.voice_id]?.sample_url || null : null,
    }));

    res.json({ avatars: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Avatars error:", error);
    res.status(500).json({ error: "Failed to fetch avatars" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/mass-campaigns - All mass campaigns
// ──────────────────────────────────────────────────────────
router.get("/mass-campaigns", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const status = req.query.status as string;

    // Try RPC first (single query instead of 3)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_mass_campaigns_list", {
      p_page: page, p_limit: limit, p_status: status || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback
    console.warn("[ADMIN] RPC fallback for mass-campaigns:", rpcError?.message);
    let query = supabase
      .from("mass_campaigns")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);

    const { data: campaigns, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch mass campaigns" }); return; }

    const userIds = [...new Set((campaigns || []).map((c: any) => c.user_id))];
    const campaignIds = (campaigns || []).map((c: any) => c.id);
    const emailMap = await getEmailMap(supabase, userIds);

    // Batch fetch job progress for all campaigns
    let jobProgress: Record<string, { total: number; completed: number; failed: number }> = {};
    if (campaignIds.length > 0) {
      const { data: massJobs } = await supabase
        .from("mass_jobs")
        .select("mass_campaign_id, status")
        .in("mass_campaign_id", campaignIds);

      for (const mj of massJobs || []) {
        if (!jobProgress[mj.mass_campaign_id]) jobProgress[mj.mass_campaign_id] = { total: 0, completed: 0, failed: 0 };
        jobProgress[mj.mass_campaign_id].total++;
        if (mj.status === "completed") jobProgress[mj.mass_campaign_id].completed++;
        if (mj.status === "failed") jobProgress[mj.mass_campaign_id].failed++;
      }
    }

    const enriched = (campaigns || []).map((c: any) => ({
      ...c,
      user_email: emailMap[c.user_id] || "Unknown",
      progress: jobProgress[c.id] || { total: 0, completed: 0, failed: 0 },
    }));

    res.json({ mass_campaigns: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Mass campaigns error:", error);
    res.status(500).json({ error: "Failed to fetch mass campaigns" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/mass-campaigns/:id - Single mass campaign detail via RPC
// ──────────────────────────────────────────────────────────
router.get("/mass-campaigns/:id", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const campaignId = req.params.id;

    const { data, error } = await supabase.rpc("admin_get_mass_campaign_detail", { p_campaign_id: campaignId });

    if (error) {
      // Fallback to direct queries
      const [campaignResult, jobsResult] = await Promise.all([
        supabase.from("mass_campaigns").select("*").eq("id", campaignId).single(),
        supabase.from("mass_jobs").select("*").eq("mass_campaign_id", campaignId).order("created_at", { ascending: true }),
      ]);
      if (campaignResult.error || !campaignResult.data) { res.status(404).json({ error: "Campaign not found" }); return; }
      const emailMap = await getEmailMap(supabase, [campaignResult.data.user_id]);
      res.json({
        campaign: { ...campaignResult.data, user_email: emailMap[campaignResult.data.user_id] || "Unknown" },
        jobs: jobsResult.data || [],
        progress: { total: 0, completed: 0, failed: 0, queued: 0, processing: 0 },
      });
      return;
    }

    if (!data?.campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    res.json(data);
  } catch (error: any) {
    console.error("[ADMIN] Mass campaign detail error:", error);
    res.status(500).json({ error: "Failed to fetch mass campaign" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/errors - All failed items across all job tables
// ──────────────────────────────────────────────────────────
router.get("/errors", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit } = getPaginationParams(req.query);
    const table = req.query.table as string;

    // Try RPC first (single query instead of up to 5 sequential)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_errors_list", {
      p_page: page, p_limit: limit, p_table: table || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback
    console.warn("[ADMIN] RPC fallback for errors:", rpcError?.message);
    const fetchFailed = async (tableName: string, selectCols: string) => {
      const { data } = await supabase
        .from(tableName)
        .select(selectCols)
        .eq("status", "failed")
        .order("updated_at", { ascending: false })
        .limit(limit);
      return (data || []).map((row: any) => ({ ...row, source_table: tableName }));
    };

    let errors: any[] = [];

    if (!table || table === "jobs")
      errors.push(...await fetchFailed("jobs", "id, user_id, campaign_name, status, video_provider, error_message, error_details, created_at, updated_at"));
    if (!table || table === "premium_jobs")
      errors.push(...await fetchFailed("premium_jobs", "id, user_id, campaign_name, status, video_provider, error_message, created_at, updated_at"));
    if (!table || table === "mass_jobs")
      errors.push(...await fetchFailed("mass_jobs", "id, user_id, status, video_provider, error_message, error_details, created_at, updated_at"));
    if (!table || table === "hook_jobs")
      errors.push(...await fetchFailed("hook_jobs", "id, user_id, campaign_name, status, error_message, created_at, updated_at"));
    if (!table || table === "image_generation_jobs")
      errors.push(...await fetchFailed("image_generation_jobs", "id, user_id, prompt, model, status, error_message, created_at, updated_at"));

    errors.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const total = errors.length;
    const offset = (page - 1) * limit;
    errors = errors.slice(offset, offset + limit);

    const userIds = [...new Set(errors.map((e: any) => e.user_id))];
    const emailMap = await getEmailMap(supabase, userIds);

    const enriched = errors.map((e: any) => ({ ...e, user_email: emailMap[e.user_id] || "Unknown" }));

    res.json({ errors: enriched, total, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Errors error:", error);
    res.status(500).json({ error: "Failed to fetch errors" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/system-keys - API key health
// ──────────────────────────────────────────────────────────
router.get("/system-keys", async (_req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: keys, error } = await supabase
      .from("system_keys")
      .select("id, provider, api_key, is_active, failure_count, last_used_at, created_at")
      .order("provider")
      .order("last_used_at", { ascending: false });

    if (error) { res.status(500).json({ error: "Failed to fetch system keys" }); return; }

    const sanitized = (keys || []).map((k: any) => {
      let redacted = "****";
      try {
        const keyStr = typeof k.api_key === "string" ? k.api_key : JSON.stringify(k.api_key);
        redacted = `...${keyStr.slice(-4)}`;
      } catch { redacted = "****"; }
      return {
        id: k.id, provider: k.provider, api_key_hint: redacted,
        is_active: k.is_active, failure_count: k.failure_count,
        last_used_at: k.last_used_at, created_at: k.created_at,
      };
    });

    res.json({ keys: sanitized });
  } catch (error: any) {
    console.error("[ADMIN] System keys error:", error);
    res.status(500).json({ error: "Failed to fetch system keys" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/editor-projects - List all editor projects across users
// ──────────────────────────────────────────────────────────
router.get("/editor-projects", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const search = req.query.search as string;

    // Try RPC first (single query instead of 2)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_editor_projects_list", {
      p_page: page, p_limit: limit, p_search: search || null,
    });

    if (!rpcError && rpcData) {
      res.json(rpcData);
      return;
    }

    // Fallback to direct queries
    let query = supabase
      .from("editor_projects")
      .select("id, user_id, name, thumbnail, duration, created_at, updated_at", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: projects, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch editor projects" }); return; }

    const userIds = [...new Set((projects || []).map((p: any) => p.user_id))];
    const emailMap = await getEmailMap(supabase, userIds);

    const enriched = (projects || []).map((p: any) => ({
      ...p,
      user_email: emailMap[p.user_id] || "Unknown",
    }));

    res.json({ projects: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] Editor projects list error:", error);
    res.status(500).json({ error: "Failed to fetch editor projects" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/editor-projects/:id - Editor project with timeline data + signed media URLs
// ──────────────────────────────────────────────────────────
router.get("/editor-projects/:id", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const projectId = req.params.id;

    // Try RPC first (single query instead of 3)
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_editor_project_detail", {
      p_project_id: projectId,
    });

    let project: any;
    let mediaRows: any[];

    if (!rpcError && rpcData?.project) {
      project = rpcData.project;
      mediaRows = rpcData.media || [];
    } else {
      // Fallback to direct queries
      const { data: proj, error: projError } = await supabase
        .from("editor_projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projError || !proj) {
        res.status(404).json({ error: "Editor project not found" });
        return;
      }

      const emailMap = await getEmailMap(supabase, [proj.user_id]);
      project = { ...proj, user_email: emailMap[proj.user_id] || "Unknown" };

      const { data: rows } = await supabase
        .from("editor_media")
        .select("id, name, type, size, duration, width, height, storage_path, thumbnail_url")
        .eq("project_id", projectId);
      mediaRows = rows || [];
    }

    if (!project) {
      res.status(404).json({ error: "Editor project not found" });
      return;
    }

    // Generate signed URLs for media with storage_path (can't be done in SQL)
    const mediaWithUrls = await Promise.all(
      mediaRows.map(async (row: any) => {
        let signedUrl: string | null = null;
        if (row.storage_path) {
          const { data } = await supabase.storage
            .from("editor-media")
            .createSignedUrl(row.storage_path, 3600);
          signedUrl = data?.signedUrl ?? null;
        }
        return {
          id: row.id,
          name: row.name,
          type: row.type,
          size: row.size,
          duration: row.duration,
          width: row.width,
          height: row.height,
          url: signedUrl,
          thumbnail_url: row.thumbnail_url,
        };
      }),
    );

    res.json({
      project,
      media: mediaWithUrls,
    });
  } catch (error: any) {
    console.error("[ADMIN] Editor project detail error:", error);
    res.status(500).json({ error: "Failed to fetch editor project" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/broll-jobs - All B-Roll jobs across all users
// ──────────────────────────────────────────────────────────
router.get("/broll-jobs", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { page, limit, offset } = getPaginationParams(req.query);
    const status = req.query.status as string;
    const model = req.query.model as string;

    let query = supabase
      .from("broll_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (model) query = query.eq("model", model);

    const { data: jobs, count, error } = await query;
    if (error) { res.status(500).json({ error: "Failed to fetch B-Roll jobs" }); return; }

    const userIds = [...new Set((jobs || []).map((j: any) => j.user_id))];
    const emailMap = await getEmailMap(supabase, userIds);

    const enriched = (jobs || []).map((j: any) => ({
      ...j,
      user_email: emailMap[j.user_id] || "Unknown",
    }));

    res.json({ broll_jobs: enriched, total: count || 0, page, limit });
  } catch (error: any) {
    console.error("[ADMIN] B-Roll jobs error:", error);
    res.status(500).json({ error: "Failed to fetch B-Roll jobs" });
  }
});

// ──────────────────────────────────────────────────────────
// GET /admin/broll-jobs/:id - Single B-Roll job detail
// ──────────────────────────────────────────────────────────
router.get("/broll-jobs/:id", async (req, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = req.params;

    const { data: job, error } = await supabase
      .from("broll_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !job) {
      res.status(404).json({ error: "B-Roll job not found" });
      return;
    }

    // Get user email
    const emailMap = await getEmailMap(supabase, [job.user_id]);
    const enriched = { ...job, user_email: emailMap[job.user_id] || "Unknown" };

    res.json({ broll_job: enriched });
  } catch (error: any) {
    console.error("[ADMIN] B-Roll job detail error:", error);
    res.status(500).json({ error: "Failed to fetch B-Roll job" });
  }
});

// ──────────────────────────────────────────────────────────
// POST /admin/migrate-editor-thumbnails
// Compress existing base64 thumbnails and strip from timeline_data
// ──────────────────────────────────────────────────────────
router.post(
  "/migrate-editor-thumbnails",
  async (_req, res: Response) => {
    try {
      const supabase = getSupabaseAdmin();

      // Fetch all projects that have base64 thumbnails
      const { data: projects, error } = await supabase
        .from("editor_projects")
        .select("id, thumbnail, timeline_data")
        .not("thumbnail", "is", null);

      if (error) throw error;
      if (!projects || projects.length === 0) {
        return res.json({ message: "No projects to migrate", migrated: 0 });
      }

      let migrated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const project of projects) {
        try {
          const thumbnail = project.thumbnail as string | null;
          const timelineData = project.timeline_data as any;
          let needsUpdate = false;
          const updates: Record<string, any> = {};

          // Compress base64 thumbnail if it's a large data URL
          if (thumbnail && thumbnail.startsWith("data:image/")) {
            const base64Data = thumbnail.split(",")[1];
            if (base64Data && base64Data.length > 20000) {
              // >~15KB, worth compressing
              const inputBuffer = Buffer.from(base64Data, "base64");
              const compressedBuffer = await sharp(inputBuffer)
                .resize(320, undefined, { withoutEnlargement: true })
                .jpeg({ quality: 70 })
                .toBuffer();

              const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;
              updates.thumbnail = compressedBase64;
              needsUpdate = true;
            }
          }

          // Strip thumbnail from timeline_data.metadata if present
          if (
            timelineData?.metadata?.thumbnail &&
            typeof timelineData.metadata.thumbnail === "string" &&
            timelineData.metadata.thumbnail.startsWith("data:image/")
          ) {
            const cleanedTimeline = {
              ...timelineData,
              metadata: { ...timelineData.metadata, thumbnail: undefined },
            };
            updates.timeline_data = cleanedTimeline;
            needsUpdate = true;
          }

          if (needsUpdate) {
            updates.updated_at = new Date().toISOString();
            const { error: updateError } = await supabase
              .from("editor_projects")
              .update(updates)
              .eq("id", project.id);

            if (updateError) {
              errors.push(`${project.id}: ${updateError.message}`);
            } else {
              migrated++;
            }
          } else {
            skipped++;
          }
        } catch (err: any) {
          errors.push(`${project.id}: ${err.message}`);
        }
      }

      res.json({
        message: "Migration complete",
        total: projects.length,
        migrated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("[ADMIN] Thumbnail migration error:", error);
      res.status(500).json({ error: "Failed to migrate thumbnails" });
    }
  }
);

// ──────────────────────────────────────────────────────────
// Voice Remix Templates CRUD
// ──────────────────────────────────────────────────────────

router.get(
  "/voice-remix-templates",
  async (_req: Request, res: Response) => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("voice_remix_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        res.status(500).json({ error: "Failed to fetch templates" });
        return;
      }

      res.json({ templates: data });
    } catch (error: any) {
      console.error("[ADMIN] Voice remix templates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/voice-remix-templates",
  async (req: Request, res: Response) => {
    try {
      const { name, prompt, display_order, is_active } = req.body;

      if (!name || !prompt) {
        res.status(400).json({ error: "name and prompt are required" });
        return;
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("voice_remix_templates")
        .insert({
          name,
          prompt,
          display_order: display_order ?? 0,
          is_active: is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error("[ADMIN] Create template error:", error);
        res.status(500).json({ error: "Failed to create template" });
        return;
      }

      res.json({ success: true, template: data });
    } catch (error: any) {
      console.error("[ADMIN] Create template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/voice-remix-templates/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, prompt, display_order, is_active } = req.body;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (prompt !== undefined) updates.prompt = prompt;
      if (display_order !== undefined) updates.display_order = display_order;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("voice_remix_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[ADMIN] Update template error:", error);
        res.status(500).json({ error: "Failed to update template" });
        return;
      }

      res.json({ success: true, template: data });
    } catch (error: any) {
      console.error("[ADMIN] Update template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/voice-remix-templates/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from("voice_remix_templates")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[ADMIN] Delete template error:", error);
        res.status(500).json({ error: "Failed to delete template" });
        return;
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[ADMIN] Delete template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
