-- Migration 007: Add performance indexes
-- Improves query performance for frequently accessed columns

-- Index on scenes.project_id for faster scene lookups
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);

-- Index on scenes.status for filtering by status
CREATE INDEX IF NOT EXISTS idx_scenes_status ON scenes(status);

-- Index on projects.status and created_at for dashboard queries
CREATE INDEX IF NOT EXISTS idx_projects_status_created_at ON projects(status, created_at DESC);

-- Index on api_usage.user_id and created_at for cost tracking queries
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created_at ON api_usage(user_id, created_at DESC);

-- Index on calendar_events.event_date for calendar queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);

-- Index on instagram_metadata.project_id for metadata lookups
CREATE INDEX IF NOT EXISTS idx_instagram_metadata_project_id ON instagram_metadata(project_id);

-- Index on youtube_metadata.project_id for metadata lookups
CREATE INDEX IF NOT EXISTS idx_youtube_metadata_project_id ON youtube_metadata(project_id);

-- Index on linkedin_metadata.project_id for metadata lookups
CREATE INDEX IF NOT EXISTS idx_linkedin_metadata_project_id ON linkedin_metadata(project_id);

-- Index on trend_cache.expires_at for cache cleanup
CREATE INDEX IF NOT EXISTS idx_trend_cache_expires_at ON trend_cache(expires_at);

-- Index on voices.is_default for finding default voice
CREATE INDEX IF NOT EXISTS idx_voices_is_default ON voices(is_default);

-- Composite index on projects for filtering by platform and status
CREATE INDEX IF NOT EXISTS idx_projects_platform_status ON projects(platform, status);
