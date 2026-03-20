-- ═══════════════════════════════════════════════════════════
-- InfiniteUGC — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────────────────
-- 1. PROFILES (extends Supabase auth.users)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  credits INTEGER NOT NULL DEFAULT 10,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────────────────────
-- 2. AVATARS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  voice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_avatars_user_id ON avatars(user_id);

ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own avatars"
  ON avatars FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 3. VOICES
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  elevenlabs_voice_id TEXT NOT NULL,
  sample_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voices_user_id ON voices(user_id);

ALTER TABLE voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own voices"
  ON voices FOR ALL USING (auth.uid() = user_id);

-- Add FK from avatars.voice_id → voices.id (after voices table exists)
ALTER TABLE avatars
  ADD CONSTRAINT fk_avatars_voice_id
  FOREIGN KEY (voice_id) REFERENCES voices(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────────────────────
-- 4. SCRIPT GROUPS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS script_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  script_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_script_groups_user_id ON script_groups(user_id);

ALTER TABLE script_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own script_groups"
  ON script_groups FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 5. SCRIPTS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  group_id UUID REFERENCES script_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scripts_user_id ON scripts(user_id);
CREATE INDEX idx_scripts_group_id ON scripts(group_id);

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own scripts"
  ON scripts FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 6. JOBS (Single Campaign / Draft Jobs)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
  campaign_name TEXT,
  custom_prompt TEXT,
  reference_image_url TEXT,
  video_provider TEXT NOT NULL DEFAULT 'heygen',
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  heygen_id TEXT,
  video_url TEXT,
  error_message TEXT,
  error_details TEXT,
  caption_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  caption_style JSONB,
  caption_position JSONB,
  text_overlays JSONB NOT NULL DEFAULT '[]'::JSONB,
  draft_job_id UUID,
  source_video_url TEXT,
  is_caption_job BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own jobs"
  ON jobs FOR ALL USING (auth.uid() = user_id);

-- Service role needs full access for backend processing
CREATE POLICY "Service role full access on jobs"
  ON jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 7. PREMIUM JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS premium_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  script_content TEXT NOT NULL,
  keyframe_image_url TEXT,
  campaign_name TEXT,
  instructions TEXT,
  video_provider TEXT NOT NULL DEFAULT 'veo3',
  voice_id UUID REFERENCES voices(id) ON DELETE SET NULL,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  credits_cost INTEGER NOT NULL DEFAULT 0,
  final_video_url TEXT,
  error_message TEXT,
  template_job_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_premium_jobs_user_id ON premium_jobs(user_id);
CREATE INDEX idx_premium_jobs_status ON premium_jobs(status);

ALTER TABLE premium_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own premium_jobs"
  ON premium_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on premium_jobs"
  ON premium_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 8. VIDEO CHUNKS (for Premium Jobs)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  premium_job_id UUID NOT NULL REFERENCES premium_jobs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  script_segment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  video_url TEXT,
  duration_seconds NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_video_chunks_premium_job_id ON video_chunks(premium_job_id);

ALTER TABLE video_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own video_chunks"
  ON video_chunks FOR SELECT USING (
    premium_job_id IN (SELECT id FROM premium_jobs WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access on video_chunks"
  ON video_chunks FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 9. MASS CAMPAIGNS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mass_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL DEFAULT 'Untitled Campaign',
  avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
  script_group_id UUID REFERENCES script_groups(id) ON DELETE SET NULL,
  video_provider TEXT NOT NULL DEFAULT 'hedra_avatar',
  caption_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  caption_style JSONB,
  caption_position JSONB,
  text_overlays JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mass_campaigns_user_id ON mass_campaigns(user_id);

ALTER TABLE mass_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own mass_campaigns"
  ON mass_campaigns FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on mass_campaigns"
  ON mass_campaigns FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 10. MASS JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mass_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mass_campaign_id UUID NOT NULL REFERENCES mass_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_provider TEXT NOT NULL DEFAULT 'hedra_avatar',
  avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  video_url TEXT,
  error_message TEXT,
  error_details TEXT,
  caption_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  caption_style JSONB,
  caption_position JSONB,
  text_overlays JSONB NOT NULL DEFAULT '[]'::JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mass_jobs_user_id ON mass_jobs(user_id);
CREATE INDEX idx_mass_jobs_campaign_id ON mass_jobs(mass_campaign_id);
CREATE INDEX idx_mass_jobs_status ON mass_jobs(status);

ALTER TABLE mass_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own mass_jobs"
  ON mass_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on mass_jobs"
  ON mass_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 11. HOOK JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hook_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  source_premium_job_id UUID REFERENCES premium_jobs(id) ON DELETE SET NULL,
  source_mass_job_id UUID REFERENCES mass_jobs(id) ON DELETE SET NULL,
  source_video_url TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  hook_video_url TEXT,
  error_message TEXT,
  credits_cost INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_hook_jobs_user_id ON hook_jobs(user_id);
CREATE INDEX idx_hook_jobs_status ON hook_jobs(status);

ALTER TABLE hook_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own hook_jobs"
  ON hook_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on hook_jobs"
  ON hook_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 12. IMAGE GENERATION JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS image_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'nano_banana',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  resolution TEXT NOT NULL DEFAULT '2K',
  reference_image_urls JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  image_url TEXT,
  error_message TEXT,
  batch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_jobs_user_id ON image_generation_jobs(user_id);
CREATE INDEX idx_image_jobs_status ON image_generation_jobs(status);
CREATE INDEX idx_image_jobs_batch_id ON image_generation_jobs(batch_id);

ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own image_generation_jobs"
  ON image_generation_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on image_generation_jobs"
  ON image_generation_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 13. BROLL JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broll_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'kling-2.6',
  model_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  credits_cost INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_broll_jobs_user_id ON broll_jobs(user_id);

ALTER TABLE broll_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own broll_jobs"
  ON broll_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on broll_jobs"
  ON broll_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 14. CLONE JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clone_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  source_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  source_premium_job_id UUID REFERENCES premium_jobs(id) ON DELETE SET NULL,
  source_mass_job_id UUID REFERENCES mass_jobs(id) ON DELETE SET NULL,
  source_video_url TEXT NOT NULL,
  user_prompt TEXT NOT NULL DEFAULT '',
  analysis_data JSONB,
  blueprint_prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  final_video_url TEXT,
  error_message TEXT,
  credits_cost INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clone_jobs_user_id ON clone_jobs(user_id);

ALTER TABLE clone_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own clone_jobs"
  ON clone_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on clone_jobs"
  ON clone_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 15. EDITOR PROJECTS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS editor_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  thumbnail TEXT,
  duration NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_editor_projects_user_id ON editor_projects(user_id);

ALTER TABLE editor_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own editor_projects"
  ON editor_projects FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 16. EDITOR MEDIA
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS editor_media (
  media_id TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES editor_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_editor_media_project_id ON editor_media(project_id);
CREATE INDEX idx_editor_media_user_id ON editor_media(user_id);

ALTER TABLE editor_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own editor_media"
  ON editor_media FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────
-- 17. SYNC JOBS (Lip Sync / Audio Sync)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES editor_projects(id) ON DELETE SET NULL,
  media_id TEXT,
  script TEXT NOT NULL DEFAULT '',
  voice_id UUID REFERENCES voices(id) ON DELETE SET NULL,
  model TEXT NOT NULL DEFAULT 'lipsync-2',
  options JSONB NOT NULL DEFAULT '{}'::JSONB,
  input_video_url TEXT NOT NULL,
  output_video_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_jobs_user_id ON sync_jobs(user_id);

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sync_jobs"
  ON sync_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on sync_jobs"
  ON sync_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 18. SYNC OUTPUTS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  output_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sync_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sync_outputs"
  ON sync_outputs FOR SELECT USING (
    sync_job_id IN (SELECT id FROM sync_jobs WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role full access on sync_outputs"
  ON sync_outputs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 19. MOTION CONTROL JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS motion_control_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  output_video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_motion_control_jobs_user_id ON motion_control_jobs(user_id);

ALTER TABLE motion_control_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own motion_control_jobs"
  ON motion_control_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on motion_control_jobs"
  ON motion_control_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 20. DUBBING JOBS
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dubbing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_video_url TEXT NOT NULL,
  target_language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending',
  output_video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dubbing_jobs_user_id ON dubbing_jobs(user_id);

ALTER TABLE dubbing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own dubbing_jobs"
  ON dubbing_jobs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on dubbing_jobs"
  ON dubbing_jobs FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 21. SYSTEM KEYS (Admin-managed API keys)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_keys ENABLE ROW LEVEL SECURITY;

-- Only service role can access system_keys
CREATE POLICY "Service role only on system_keys"
  ON system_keys FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 22. VOICE REMIX TEMPLATES
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_remix_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  prompt_strength NUMERIC NOT NULL DEFAULT 0.5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE voice_remix_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active voice_remix_templates"
  ON voice_remix_templates FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Service role full access on voice_remix_templates"
  ON voice_remix_templates FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 23. VOICE REMIXES
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_remixes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_voice_id UUID REFERENCES voices(id) ON DELETE SET NULL,
  remix_template_id UUID REFERENCES voice_remix_templates(id) ON DELETE SET NULL,
  output_voice_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_remixes_user_id ON voice_remixes(user_id);

ALTER TABLE voice_remixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own voice_remixes"
  ON voice_remixes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on voice_remixes"
  ON voice_remixes FOR ALL USING (
    (SELECT auth.role()) = 'service_role'
  );

-- ───────────────────────────────────────────────────────────
-- 24. STORAGE BUCKETS
-- ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('voice-samples', 'voice-samples', TRUE),
  ('editor-media', 'editor-media', TRUE),
  ('videos', 'videos', TRUE),
  ('premium-videos', 'premium-videos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload to their own paths
CREATE POLICY "Authenticated users can upload voice samples"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-samples');

CREATE POLICY "Anyone can read voice samples"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'voice-samples');

CREATE POLICY "Authenticated users can upload editor media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'editor-media');

CREATE POLICY "Anyone can read editor media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'editor-media');

CREATE POLICY "Anyone can read videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'videos');

CREATE POLICY "Service role can manage videos"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id IN ('videos', 'premium-videos'));

CREATE POLICY "Anyone can read premium videos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'premium-videos');

-- ───────────────────────────────────────────────────────────
-- 25. UPDATED_AT TRIGGER (auto-update timestamps)
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END;
$$;
