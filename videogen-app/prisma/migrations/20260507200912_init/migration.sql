-- CreateTable
CREATE TABLE "projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "topic" TEXT,
    "script" TEXT,
    "music_prompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "video_mode" TEXT NOT NULL DEFAULT 'i2v',
    "video_model" TEXT NOT NULL DEFAULT 'MiniMax-Hailuo-2.3',
    "hook_variant" TEXT,
    "thumbnail_urls" TEXT,
    "scheduled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "script" TEXT,
    "direction_notes" TEXT,
    "image_url" TEXT,
    "image_base64" TEXT,
    "video_task_id" TEXT,
    "video_file_id" TEXT,
    "video_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "camera_commands" TEXT,
    "prompt_optimizer" INTEGER NOT NULL DEFAULT 1,
    "prompt_optimizer_mode" TEXT NOT NULL DEFAULT 'fast',
    CONSTRAINT "scenes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audio_assets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "type" TEXT,
    "url" TEXT,
    "tts_model" TEXT,
    "voice_id" TEXT,
    "tts_settings" TEXT,
    "music_model" TEXT,
    "is_instrumental" INTEGER,
    "lyrics" TEXT,
    "timestamps" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audio_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voice_id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "source_file_id" TEXT,
    "prompt_file_id" TEXT,
    "description" TEXT,
    "is_default" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "brand_kit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand_name" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "tone_of_voice" TEXT,
    "target_audience" TEXT,
    "key_messages" TEXT,
    "words_to_avoid" TEXT,
    "brand_story" TEXT,
    "competitors" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#7C3AED',
    "secondary_color" TEXT NOT NULL DEFAULT '#EC4899',
    "accent_color" TEXT NOT NULL DEFAULT '#F97316',
    "heading_font" TEXT NOT NULL DEFAULT 'Inter',
    "body_font" TEXT NOT NULL DEFAULT 'system-ui',
    "typography_style" TEXT NOT NULL DEFAULT 'modern',
    "logo_url" TEXT,
    "logo_variant_url" TEXT,
    "mascot_image_url" TEXT,
    "mascot_file_id" TEXT,
    "style_guide_url" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "voice_id" TEXT NOT NULL DEFAULT 'English_expressive_narrator',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "instagram_metadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "caption" TEXT,
    "hashtags" TEXT,
    "hashtags_suggested" TEXT,
    "story_text" TEXT,
    "story_hashtags" TEXT,
    "reel_title" TEXT,
    "reel_description" TEXT,
    "cover_image_prompt" TEXT,
    "content_type" TEXT NOT NULL DEFAULT 'reel',
    "target_audience" TEXT,
    "call_to_action" TEXT,
    "scheduled_at" DATETIME,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "instagram_metadata_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "linkedin_metadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "headline" TEXT,
    "caption" TEXT,
    "hashtags" TEXT,
    "hashtags_suggested" TEXT,
    "target_audience" TEXT,
    "call_to_action" TEXT,
    "content_format" TEXT NOT NULL DEFAULT 'post',
    "industry" TEXT,
    "scheduled_at" DATETIME,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "linkedin_metadata_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT,
    "description" TEXT,
    "niche" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement" REAL DEFAULT 0,
    "avg_views" INTEGER NOT NULL DEFAULT 0,
    "posting_frequency" TEXT,
    "content_themes" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "trend_cache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "trend_text" TEXT NOT NULL,
    "trend_type" TEXT NOT NULL DEFAULT 'hashtag',
    "volume_score" INTEGER NOT NULL DEFAULT 0,
    "velocity_score" INTEGER NOT NULL DEFAULT 0,
    "hashtag" TEXT,
    "description" TEXT,
    "example_posts" TEXT,
    "posted_at" DATETIME,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME
);

-- CreateTable
CREATE TABLE "viral_videos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL,
    "video_title" TEXT NOT NULL,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "creator_name" TEXT,
    "creator_handle" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" REAL DEFAULT 0,
    "posted_at" DATETIME,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "used_in_project_id" INTEGER,
    CONSTRAINT "viral_videos_used_in_project_id_fkey" FOREIGN KEY ("used_in_project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "modality" TEXT NOT NULL,
    "model" TEXT,
    "prompt" TEXT,
    "params" TEXT,
    "output_url" TEXT,
    "file_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER,
    "title" TEXT NOT NULL,
    "event_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "platform" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "youtube_metadata" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "project_id" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "hashtags" TEXT,
    "category" TEXT,
    "language" TEXT,
    "privacy_status" TEXT NOT NULL DEFAULT 'public',
    "seo_score" INTEGER,
    "thumbnail_text" TEXT,
    "thumbnail_overlay_json" TEXT,
    "chapters" TEXT,
    "scheduled_at" DATETIME,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "youtube_metadata_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "project_id" INTEGER,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "cost_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "cache_creation_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_tokens" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_quota" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "daily_quota_cents" INTEGER NOT NULL DEFAULT 1000,
    "monthly_quota_cents" INTEGER NOT NULL DEFAULT 30000,
    "daily_used_cents" INTEGER NOT NULL DEFAULT 0,
    "monthly_used_cents" INTEGER NOT NULL DEFAULT 0,
    "daily_reset_date" DATETIME,
    "monthly_reset_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_consent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "ai_data_consent" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" DATETIME,
    "consent_version" TEXT NOT NULL DEFAULT '1.0',
    "data_retention_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status_code" INTEGER,
    "details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "voices_voice_id_key" ON "voices"("voice_id");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_metadata_project_id_key" ON "instagram_metadata"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_metadata_project_id_key" ON "linkedin_metadata"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_metadata_project_id_key" ON "youtube_metadata"("project_id");

-- CreateIndex
CREATE INDEX "api_usage_user_id_idx" ON "api_usage"("user_id");

-- CreateIndex
CREATE INDEX "api_usage_project_id_idx" ON "api_usage"("project_id");

-- CreateIndex
CREATE INDEX "api_usage_created_at_idx" ON "api_usage"("created_at");

-- CreateIndex
CREATE INDEX "api_usage_user_id_created_at_idx" ON "api_usage"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "api_usage_endpoint_idx" ON "api_usage"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "user_quota_user_id_key" ON "user_quota"("user_id");

-- CreateIndex
CREATE INDEX "user_quota_user_id_idx" ON "user_quota"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_consent_user_id_key" ON "user_consent"("user_id");

-- CreateIndex
CREATE INDEX "user_consent_user_id_idx" ON "user_consent"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_event_type_created_at_idx" ON "audit_logs"("event_type", "created_at" DESC);
