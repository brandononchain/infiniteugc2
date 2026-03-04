/* ─── Common ─── */
export type VideoProvider =
  | "heygen"
  | "omnihuman"
  | "sora2"
  | "sora2pro"
  | "seedance"
  | "hedra_avatar"
  | "hedra_omnia"
  | "veo3";

export type PremiumVideoProvider = "veo3" | "sora2pro" | "omnihuman";

export type MassVideoProvider = "hedra_avatar" | "hedra_omnia";

export type ImageModel = "nano_banana" | "seedream_4_5";

export type JobStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/* ─── User Profile ─── */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  credits: number;
  is_admin: boolean;
  created_at: string;
}

/* ─── Avatar ─── */
export interface Avatar {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  voice_id: string | null;
  created_at: string;
}

/* ─── Voice ─── */
export interface Voice {
  id: string;
  user_id: string;
  name: string;
  elevenlabs_voice_id: string;
  sample_url: string | null;
  created_at: string;
}

/* ─── Script ─── */
export interface Script {
  id: string;
  user_id: string;
  name: string;
  content: string;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

/* ─── Script Group ─── */
export interface ScriptGroup {
  id: string;
  user_id: string;
  name: string;
  script_ids: string[];
  created_at: string;
}

/* ─── Job (Single Campaign) ─── */
export interface Job {
  id: string;
  user_id: string;
  avatar_id: string | null;
  script_id: string | null;
  campaign_name: string | null;
  video_provider: VideoProvider;
  status: JobStatus;
  heygen_id: string | null;
  video_url: string | null;
  error_message: string | null;
  error_details: string | null;
  caption_enabled: boolean;
  caption_style: Record<string, unknown> | null;
  caption_position: { x: number; y: number } | null;
  text_overlays: TextOverlay[];
  draft_job_id: string | null;
  source_video_url: string | null;
  is_caption_job: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  avatars?: Avatar;
  scripts?: Script;
}

export interface TextOverlay {
  text: string;
  position: { x: number; y: number };
  style?: Record<string, unknown>;
}

/* ─── Mass Campaign ─── */
export interface MassCampaign {
  id: string;
  user_id: string;
  campaign_name: string;
  avatar_id: string | null;
  script_group_id: string | null;
  video_provider: MassVideoProvider;
  caption_enabled: boolean;
  caption_style: Record<string, unknown> | null;
  caption_position: { x: number; y: number } | null;
  text_overlays: TextOverlay[];
  status: string;
  created_at: string;
  updated_at: string;
}

/* ─── Mass Job ─── */
export interface MassJob {
  id: string;
  mass_campaign_id: string;
  user_id: string;
  video_provider: MassVideoProvider;
  avatar_id: string | null;
  script_id: string | null;
  status: JobStatus;
  video_url: string | null;
  error_message: string | null;
  error_details: string | null;
  caption_enabled: boolean;
  caption_style: Record<string, unknown> | null;
  caption_position: { x: number; y: number } | null;
  text_overlays: TextOverlay[];
  completed_at: string | null;
  created_at: string;
}

/* ─── Premium Job ─── */
export interface PremiumJob {
  id: string;
  user_id: string;
  script_content: string;
  keyframe_image_url: string | null;
  campaign_name: string | null;
  instructions: string | null;
  video_provider: PremiumVideoProvider;
  voice_id: string | null;
  total_chunks: number;
  status: JobStatus | "stitching";
  credits_cost: number;
  final_video_url: string | null;
  error_message: string | null;
  template_job_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  video_chunks?: VideoChunk[];
}

export interface VideoChunk {
  id: string;
  premium_job_id: string;
  chunk_index: number;
  script_segment: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url: string | null;
  duration_seconds: number;
  created_at: string;
}

/* ─── Hook Job ─── */
export interface HookJob {
  id: string;
  user_id: string;
  source_type: "job" | "premium_job" | "mass_job";
  source_id: string;
  source_video_url: string;
  status: JobStatus;
  hook_video_url: string | null;
  error_message: string | null;
  credits_cost: number;
  created_at: string;
  completed_at: string | null;
}

/* ─── Image Generation Job ─── */
export interface ImageGenerationJob {
  id: string;
  user_id: string;
  prompt: string;
  model: ImageModel;
  aspect_ratio: string;
  resolution: string;
  status: JobStatus;
  image_url: string | null;
  error_message: string | null;
  batch_id: string | null;
  created_at: string;
}

/* ─── API Response Types ─── */
export interface RunCampaignResponse {
  success: boolean;
  job_id: string;
  queue_position: number;
  cost: number;
  status: string;
}

export interface BatchRunResponse {
  success: boolean;
  total_cost: number;
  results: Array<{
    campaign_id: string;
    job_id: string;
    status: string;
  }>;
}

export interface RunMassCampaignResponse {
  success: boolean;
  job_count: number;
  total_cost: number;
  jobs: Array<{
    job_id: string;
    script_name: string;
    status: string;
  }>;
}

export interface PremiumEstimate {
  chunks: number;
  credits: number;
  wordCount: number;
  reasoning: string;
}

export interface ImageGenerateResponse {
  success: boolean;
  batch_id: string;
  jobs: Array<{ id: string; status: string }>;
  credits_used: number;
}

export interface GenerateHookResponse {
  success: boolean;
  hook_job_id: string;
  credits_used: number;
}
