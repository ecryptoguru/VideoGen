-- Migration 004: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_platform ON projects(platform);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_scheduled_at ON projects(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_status ON scenes(status);
CREATE INDEX IF NOT EXISTS idx_scenes_order_index ON scenes(order_index);

CREATE INDEX IF NOT EXISTS idx_audio_assets_project_id ON audio_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_audio_assets_type ON audio_assets(type);

CREATE INDEX IF NOT EXISTS idx_voices_type ON voices(type);
CREATE INDEX IF NOT EXISTS idx_voices_is_default ON voices(is_default);

CREATE INDEX IF NOT EXISTS idx_instagram_metadata_project_id ON instagram_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_instagram_metadata_scheduled_at ON instagram_metadata(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_linkedin_metadata_project_id ON linkedin_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_metadata_scheduled_at ON linkedin_metadata(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_trend_cache_platform ON trend_cache(platform);
CREATE INDEX IF NOT EXISTS idx_trend_cache_expires_at ON trend_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_viral_videos_platform ON viral_videos(platform);
CREATE INDEX IF NOT EXISTS idx_viral_videos_posted_at ON viral_videos(posted_at);
