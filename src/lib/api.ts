import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Avatar,
  Voice,
  Script,
  ScriptGroup,
  Job,
  MassCampaign,
  MassJob,
  PremiumJob,
  HookJob,
  ImageGenerationJob,
  Profile,
  RunCampaignResponse,
  BatchRunResponse,
  RunMassCampaignResponse,
  PremiumEstimate,
  ImageGenerateResponse,
  GenerateHookResponse,
  VideoProvider,
  MassVideoProvider,
  PremiumVideoProvider,
  ImageModel,
  TextOverlay,
} from "@/types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

/* ─── Helper ─── */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status, body);
  }

  return res.json();
}

async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status, body);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/* ═══════════════════════════════════════════════════════════
   CAMPAIGNS (Draft Jobs)
   ═══════════════════════════════════════════════════════════ */

export interface CreateCampaignParams {
  campaign_name?: string;
  avatar_id?: string;
  script_id?: string;
  video_provider?: VideoProvider;
  caption_enabled?: boolean;
  caption_style?: Record<string, unknown>;
  caption_position?: { x: number; y: number };
  text_overlays?: TextOverlay[];
  source_video_url?: string;
}

export const campaigns = {
  list: () => apiFetch<Job[]>("/campaigns"),

  get: (id: string) => apiFetch<Job>(`/campaigns/${id}`),

  create: (params: CreateCampaignParams) =>
    apiFetch<Job>("/campaigns", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  update: (id: string, params: Partial<CreateCampaignParams>) =>
    apiFetch<Job>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/campaigns/${id}`, { method: "DELETE" }),

  run: (id: string) =>
    apiFetch<RunCampaignResponse>(`/campaigns/${id}/run`, { method: "POST" }),

  batchRun: (campaignIds: string[]) =>
    apiFetch<BatchRunResponse>("/campaigns/batch-run", {
      method: "POST",
      body: JSON.stringify({ campaign_ids: campaignIds }),
    }),
};

/* ═══════════════════════════════════════════════════════════
   JOBS
   ═══════════════════════════════════════════════════════════ */

export const jobs = {
  cancel: (id: string) =>
    apiFetch<{ success: boolean }>(`/jobs/${id}/cancel`, { method: "POST" }),
};

/* ═══════════════════════════════════════════════════════════
   VOICES
   ═══════════════════════════════════════════════════════════ */

export const voices = {
  clone: (name: string, audioFile: File) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("audio", audioFile);
    return apiUpload<Voice>("/voices/clone", formData);
  },
};

/* ═══════════════════════════════════════════════════════════
   IMAGE GENERATION
   ═══════════════════════════════════════════════════════════ */

export interface GenerateImageParams {
  prompt: string;
  model: ImageModel;
  aspectRatio: string;
  resolution: string;
  count: number;
  referenceImageUrls?: string[];
}

export const imageGeneration = {
  generate: (params: GenerateImageParams) =>
    apiFetch<ImageGenerateResponse>("/image-generation/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  listJobs: () => apiFetch<ImageGenerationJob[]>("/image-generation/jobs"),

  getJob: (id: string) => apiFetch<ImageGenerationJob>(`/image-generation/jobs/${id}`),

  poll: (ids: string[]) =>
    apiFetch<ImageGenerationJob[]>(`/image-generation/poll?ids=${ids.join(",")}`),
};

/* ═══════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════ */

export interface GenerateHookParams {
  source_type: "job" | "premium_job" | "mass_job";
  source_id: string;
}

export const hooks = {
  generate: (params: GenerateHookParams) =>
    apiFetch<GenerateHookResponse>("/hooks/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  list: () => apiFetch<HookJob[]>("/hooks"),

  get: (id: string) => apiFetch<HookJob>(`/hooks/${id}`),
};

/* ═══════════════════════════════════════════════════════════
   MASS CAMPAIGNS
   ═══════════════════════════════════════════════════════════ */

export interface CreateMassCampaignParams {
  campaign_name?: string;
  avatar_id?: string;
  script_group_id?: string;
  video_provider?: MassVideoProvider;
  caption_enabled?: boolean;
  caption_style?: Record<string, unknown>;
  caption_position?: { x: number; y: number };
  text_overlays?: TextOverlay[];
}

export const massCampaigns = {
  list: () => apiFetch<MassCampaign[]>("/mass-campaigns"),

  get: (id: string) => apiFetch<MassCampaign>(`/mass-campaigns/${id}`),

  create: (params: CreateMassCampaignParams) =>
    apiFetch<MassCampaign>("/mass-campaigns", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  update: (id: string, params: Partial<CreateMassCampaignParams>) =>
    apiFetch<MassCampaign>(`/mass-campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/mass-campaigns/${id}`, { method: "DELETE" }),

  run: (id: string) =>
    apiFetch<RunMassCampaignResponse>(`/mass-campaigns/${id}/run`, { method: "POST" }),

  getJobs: (id: string) => apiFetch<MassJob[]>(`/mass-campaigns/${id}/jobs`),
};

/* ═══════════════════════════════════════════════════════════
   PREMIUM JOBS
   ═══════════════════════════════════════════════════════════ */

export interface CreatePremiumJobParams {
  script_content: string;
  keyframe_image_url?: string;
  campaign_name?: string;
  instructions?: string;
  video_provider?: PremiumVideoProvider;
  voice_id?: string;
}

export const premiumJobs = {
  estimate: (script_content: string, video_provider?: PremiumVideoProvider) =>
    apiFetch<PremiumEstimate>("/premium-jobs/estimate", {
      method: "POST",
      body: JSON.stringify({ script_content, video_provider }),
    }),

  create: (params: CreatePremiumJobParams) =>
    apiFetch<PremiumJob>("/premium-jobs/create", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  get: (id: string) => apiFetch<PremiumJob>(`/premium-jobs/${id}`),

  update: (id: string, params: Partial<CreatePremiumJobParams>) =>
    apiFetch<PremiumJob>(`/premium-jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(params),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/premium-jobs/${id}`, { method: "DELETE" }),

  generate: (id: string) =>
    apiFetch<{ success: boolean }>(`/premium-jobs/${id}/generate`, { method: "POST" }),

  list: () => apiFetch<PremiumJob[]>("/premium-jobs"),
};

/* ═══════════════════════════════════════════════════════════
   DUBBING
   ═══════════════════════════════════════════════════════════ */

export interface GenerateDubbingParams {
  source_type: "job" | "premium_job" | "mass_job" | "upload";
  source_id?: string;
  video_url?: string;
  languages: Array<{ code: string; label: string }>;
  mode?: "fast" | "quality";
  caption_enabled?: boolean;
  caption_style?: Record<string, unknown>;
  caption_position?: { x: number; y: number };
}

export const dubbing = {
  generate: (params: GenerateDubbingParams) =>
    apiFetch<{ dubbing_job_ids: string[]; credits_remaining: number }>("/dubbing/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  list: () => apiFetch<{ dubbing_jobs: unknown[]; total: number }>("/dubbing"),

  get: (id: string) => apiFetch<unknown>(`/dubbing/${id}`),

  getLanguages: () => apiFetch<{ languages: Array<{ code: string; label: string }> }>("/dubbing/languages"),
};

/* ═══════════════════════════════════════════════════════════
   MOTION CONTROL
   ═══════════════════════════════════════════════════════════ */

export interface GenerateMotionControlParams {
  name?: string;
  image_url: string;
  video_url?: string;
  preset_motion?: string;
  script: string;
  voice_source?: "clone_from_video" | "existing";
  voice_id?: string;
  lipsync_model?: "lipsync-2" | "lipsync-2-pro";
  config?: {
    duration?: number;
    mode?: string;
  };
}

export const motionControl = {
  generate: (params: GenerateMotionControlParams) =>
    apiFetch<{ success: boolean; job_id: string; credits_remaining: number }>("/motion-control/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  listJobs: () => apiFetch<{ jobs: unknown[]; total: number }>("/motion-control/jobs"),

  getJob: (id: string) => apiFetch<unknown>(`/motion-control/jobs/${id}`),

  getPresets: () => apiFetch<{ presets: string[] }>("/motion-control/preset-motions"),
};

/* ═══════════════════════════════════════════════════════════
   B-ROLL
   ═══════════════════════════════════════════════════════════ */

export interface GenerateBRollParams {
  name?: string;
  prompt: string;
  image_url: string;
  model?: "kling-2.6" | "kling-3.0" | "seeddance-1.0-fast" | "seeddance-1.5-pro";
  config?: {
    duration?: number;
    aspect_ratio?: string;
  };
}

export const broll = {
  generate: (params: GenerateBRollParams) =>
    apiFetch<{ success: boolean; job_id: string; credits_remaining: number }>("/broll/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  listJobs: () => apiFetch<{ jobs: unknown[]; total: number }>("/broll/jobs"),

  getJob: (id: string) => apiFetch<unknown>(`/broll/jobs/${id}`),
};

/* ═══════════════════════════════════════════════════════════
   CLONE / KATORIP
   ═══════════════════════════════════════════════════════════ */

export interface GenerateCloneParams {
  source_type: "job" | "premium_job" | "mass_job";
  source_id: string;
  user_prompt: string;
}

export interface GenerateAdvancedCloneParams {
  source_video_url: string;
  product_name: string;
  product_description: string;
  product_image_url?: string;
  new_script?: string;
  avatar_image_url?: string;
  voice_id?: string;
  clone_voice_from_source?: boolean;
  preferred_model?: "sora2pro" | "veo3";
}

export const clone = {
  generate: (params: GenerateCloneParams) =>
    apiFetch<{ clone_job_id: string; credits_remaining: number }>("/clone/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  generateFromUrl: (source_video_url: string, user_prompt: string) =>
    apiFetch<{ clone_job_id: string; credits_remaining: number }>("/clone/generate-url", {
      method: "POST",
      body: JSON.stringify({ source_video_url, user_prompt }),
    }),

  advanced: (params: GenerateAdvancedCloneParams) =>
    apiFetch<{ clone_job_id: string; credits_remaining: number }>("/clone/advanced", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  list: () => apiFetch<{ clone_jobs: unknown[]; total: number }>("/clone"),

  get: (id: string) => apiFetch<unknown>(`/clone/${id}`),

  preview: (source_video_url: string, user_prompt: string) =>
    apiFetch<unknown>("/clone/preview", {
      method: "POST",
      body: JSON.stringify({ source_video_url, user_prompt }),
    }),
};

/* ═══════════════════════════════════════════════════════════
   LIP SYNC
   ═══════════════════════════════════════════════════════════ */

export interface GenerateSyncParams {
  project_id: string;
  media_id: string;
  script: string;
  voice_id?: string;
  model: "lipsync-2" | "lipsync-2-pro" | "react-1";
}

export const sync = {
  generate: (params: GenerateSyncParams) =>
    apiFetch<{ success: boolean; job_id: string }>("/sync/generate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  listJobs: () => apiFetch<{ jobs: unknown[]; total: number }>("/sync/jobs"),

  getJob: (id: string) => apiFetch<unknown>(`/sync/jobs/${id}`),
};

/* ═══════════════════════════════════════════════════════════
   ADMIN
   ═══════════════════════════════════════════════════════════ */

export const admin = {
  checkAdmin: () => apiFetch<{ is_admin: boolean }>("/admin/check"),
};

/* ═══════════════════════════════════════════════════════════
   SUPABASE DIRECT QUERIES (for data not exposed by backend)
   ═══════════════════════════════════════════════════════════ */

export const supabaseQueries = {
  /** Fetch user profile (credits, name, etc.) */
  getProfile: async (): Promise<Profile | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return error ? null : (data as Profile);
  },

  /** List user's avatars with pagination */
  getAvatars: async (options?: { page?: number; pageSize?: number }): Promise<{ data: Avatar[]; total: number }> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], total: 0 };

    const page = options?.page ?? 0;
    const pageSize = options?.pageSize ?? 20;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { count } = await supabase
      .from("avatars")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data } = await supabase
      .from("avatars")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    return { data: (data as Avatar[]) || [], total: count ?? 0 };
  },

  /** Create avatar */
  createAvatar: async (name: string, imageUrl: string, voiceId: string | null): Promise<Avatar | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("avatars")
      .insert({ user_id: user.id, name, image_url: imageUrl, voice_id: voiceId })
      .select()
      .single();

    return error ? null : (data as Avatar);
  },

  /** Delete avatar */
  deleteAvatar: async (id: string): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("avatars").delete().eq("id", id);
    return !error;
  },

  /** List user's voices with pagination */
  getVoices: async (options?: { page?: number; pageSize?: number }): Promise<{ data: Voice[]; total: number }> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], total: 0 };

    const page = options?.page ?? 0;
    const pageSize = options?.pageSize ?? 20;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { count } = await supabase
      .from("voices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data } = await supabase
      .from("voices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    return { data: (data as Voice[]) || [], total: count ?? 0 };
  },

  /** List user's scripts with pagination */
  getScripts: async (options?: { page?: number; pageSize?: number }): Promise<{ data: Script[]; total: number }> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], total: 0 };

    const page = options?.page ?? 0;
    const pageSize = options?.pageSize ?? 20;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { count } = await supabase
      .from("scripts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data } = await supabase
      .from("scripts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    return { data: (data as Script[]) || [], total: count ?? 0 };
  },

  /** Create script */
  createScript: async (name: string, content: string, groupId?: string): Promise<Script | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("scripts")
      .insert({
        user_id: user.id,
        name,
        content,
        group_id: groupId || null,
      })
      .select()
      .single();

    return error ? null : (data as Script);
  },

  /** Update script */
  updateScript: async (id: string, updates: { name?: string; content?: string; group_id?: string | null }): Promise<Script | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("scripts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return error ? null : (data as Script);
  },

  /** Delete script */
  deleteScript: async (id: string): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    return !error;
  },

  /** List script groups */
  getScriptGroups: async (): Promise<ScriptGroup[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("script_groups")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return (data as ScriptGroup[]) || [];
  },

  /** Create script group */
  createScriptGroup: async (name: string, scriptIds: string[]): Promise<ScriptGroup | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("script_groups")
      .insert({ user_id: user.id, name, script_ids: scriptIds })
      .select()
      .single();

    return error ? null : (data as ScriptGroup);
  },

  /** List user's jobs (non-draft) */
  getJobs: async (statusFilter?: string): Promise<Job[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from("jobs")
      .select("*, avatars(*), scripts(*)")
      .eq("user_id", user.id)
      .neq("status", "draft")
      .order("created_at", { ascending: false });

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    return (data as Job[]) || [];
  },

  /** List draft jobs (campaigns) */
  getDraftJobs: async (): Promise<Job[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("jobs")
      .select("*, avatars(*), scripts(*)")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false });

    return (data as Job[]) || [];
  },

  /** List completed jobs (for exports / hooks) */
  getCompletedJobs: async (): Promise<Job[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("video_url", "is", null)
      .order("created_at", { ascending: false });

    return (data as Job[]) || [];
  },

  /** List premium jobs */
  getPremiumJobs: async (): Promise<PremiumJob[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("premium_jobs")
      .select("*, video_chunks(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return (data as PremiumJob[]) || [];
  },

  /** List completed premium jobs (for exports / hooks) */
  getCompletedPremiumJobs: async (): Promise<PremiumJob[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("premium_jobs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("final_video_url", "is", null)
      .order("created_at", { ascending: false });

    return (data as PremiumJob[]) || [];
  },

  /** List mass campaigns */
  getMassCampaigns: async (): Promise<MassCampaign[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("mass_campaigns")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return (data as MassCampaign[]) || [];
  },

  /** List mass jobs */
  getMassJobs: async (): Promise<MassJob[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("mass_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return (data as MassJob[]) || [];
  },

  /** List completed mass jobs */
  getCompletedMassJobs: async (): Promise<MassJob[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("mass_jobs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("video_url", "is", null)
      .order("created_at", { ascending: false });

    return (data as MassJob[]) || [];
  },

  /** List hook jobs */
  getHookJobs: async (): Promise<HookJob[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("hook_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return (data || []) as HookJob[];
  },

  /** List image generation jobs */
  getImageJobs: async (): Promise<ImageGenerationJob[]> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("image_generation_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return (data || []) as ImageGenerationJob[];
  },

  /** Count jobs by status for dashboard stats */
  getJobStats: async (): Promise<{
    total: number;
    completed: number;
    processing: number;
    queued: number;
    failed: number;
  }> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { total: 0, completed: 0, processing: 0, queued: 0, failed: 0 };

    const { data } = await supabase
      .from("jobs")
      .select("status")
      .eq("user_id", user.id)
      .neq("status", "draft");

    const statuses = (data || []) as { status: string }[];
    return {
      total: statuses.length,
      completed: statuses.filter((j) => j.status === "completed").length,
      processing: statuses.filter((j) => j.status === "processing").length,
      queued: statuses.filter((j) => j.status === "queued").length,
      failed: statuses.filter((j) => j.status === "failed").length,
    };
  },

  /** Update profile */
  updateProfile: async (updates: { full_name?: string; email?: string }): Promise<boolean> => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    return !error;
  },

  /** Upload file to Supabase storage */
  uploadFile: async (bucket: string, path: string, file: File): Promise<string | null> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) return null;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  },
};
