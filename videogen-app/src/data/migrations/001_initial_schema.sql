-- Migration 001: Initial schema
-- This creates all the base tables

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  topic TEXT,
  script TEXT,
  music_prompt TEXT,
  status TEXT DEFAULT 'draft',
  video_mode TEXT DEFAULT 'i2v',
  video_model TEXT DEFAULT 'MiniMax-Hailuo-2.3',
  hook_variant TEXT,
  thumbnail_urls TEXT,
  scheduled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  script TEXT,
  direction_notes TEXT,
  image_url TEXT,
  image_base64 TEXT,
  video_task_id TEXT,
  video_file_id TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  camera_commands TEXT,
  prompt_optimizer INTEGER DEFAULT 1,
  prompt_optimizer_mode TEXT DEFAULT 'fast'
);

CREATE TABLE IF NOT EXISTS audio_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT,
  url TEXT,
  tts_model TEXT,
  voice_id TEXT,
  tts_settings TEXT,
  music_model TEXT,
  is_instrumental INTEGER,
  lyrics TEXT,
  timestamps TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voice_id TEXT UNIQUE NOT NULL,
  name TEXT,
  type TEXT,
  source_file_id TEXT,
  prompt_file_id TEXT,
  description TEXT,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brand_kit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT,
  tagline TEXT,
  description TEXT,
  tone_of_voice TEXT,
  target_audience TEXT,
  key_messages TEXT,
  words_to_avoid TEXT,
  brand_story TEXT,
  competitors TEXT,
  primary_color TEXT DEFAULT '#7C3AED',
  secondary_color TEXT DEFAULT '#EC4899',
  accent_color TEXT DEFAULT '#F97316',
  heading_font TEXT DEFAULT 'Inter',
  body_font TEXT DEFAULT 'system-ui',
  typography_style TEXT DEFAULT 'modern',
  logo_url TEXT,
  logo_variant_url TEXT,
  mascot_image_url TEXT,
  mascot_file_id TEXT,
  style_guide_url TEXT,
  language TEXT DEFAULT 'English',
  voice_id TEXT DEFAULT 'English_expressive_narrator',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instagram_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  caption TEXT,
  hashtags TEXT,
  hashtags_suggested TEXT,
  story_text TEXT,
  story_hashtags TEXT,
  reel_title TEXT,
  reel_description TEXT,
  cover_image_prompt TEXT,
  content_type TEXT DEFAULT 'reel',
  target_audience TEXT,
  call_to_action TEXT,
  scheduled_at DATETIME,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS linkedin_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  headline TEXT,
  caption TEXT,
  hashtags TEXT,
  hashtags_suggested TEXT,
  target_audience TEXT,
  call_to_action TEXT,
  content_format TEXT DEFAULT 'post',
  industry TEXT,
  scheduled_at DATETIME,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT,
  description TEXT,
  niche TEXT,
  followers INTEGER DEFAULT 0,
  avg_engagement REAL DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  posting_frequency TEXT,
  content_themes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trend_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  category TEXT NOT NULL,
  trend_text TEXT NOT NULL,
  trend_type TEXT DEFAULT 'hashtag',
  volume_score INTEGER DEFAULT 0,
  velocity_score INTEGER DEFAULT 0,
  hashtag TEXT,
  description TEXT,
  example_posts TEXT,
  posted_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

CREATE TABLE IF NOT EXISTS viral_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  video_title TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  creator_name TEXT,
  creator_handle TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  posted_at DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  used_in_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL
);

-- Create generations table
CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modality TEXT NOT NULL,
  model TEXT,
  prompt TEXT,
  params TEXT,
  output_url TEXT,
  file_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_date DATETIME NOT NULL,
  status TEXT DEFAULT 'scheduled',
  platform TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create youtube_metadata table
CREATE TABLE IF NOT EXISTS youtube_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  tags TEXT,
  hashtags TEXT,
  category TEXT,
  language TEXT,
  privacy_status TEXT DEFAULT 'public',
  seo_score INTEGER,
  thumbnail_text TEXT,
  thumbnail_overlay_json TEXT,
  chapters TEXT,
  scheduled_at DATETIME,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default brand kit row
INSERT OR IGNORE INTO brand_kit (id, language, voice_id) VALUES (1, 'English', 'English_expressive_narrator');
