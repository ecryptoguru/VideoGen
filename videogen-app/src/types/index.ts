export type Platform = "instagram_reels" | "linkedin" | "youtube_shorts" | "youtube_long";

export type VideoMode = "t2v" | "i2v" | "fl2v" | "s2v" | "template";

export type ProjectStatus = "draft" | "generating" | "processing" | "ready" | "published" | "failed";

export type SceneStatus = "pending" | "generating" | "ready" | "failed";

export type Modality = "text" | "image" | "video" | "tts" | "music" | "voice_clone";

export interface Project {
  id: number;
  name: string;
  platform: Platform;
  topic: string | null;
  script: string | null;
  music_prompt: string | null;
  status: ProjectStatus;
  video_mode: VideoMode;
  video_model: string;
  hook_variant: string | null;
  thumbnail_urls: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: number;
  project_id: number;
  order_index: number;
  script: string;
  direction_notes: string;
  image_url: string;
  image_base64: string;
  video_task_id: string;
  video_file_id: string;
  video_url: string;
  status: SceneStatus;
  camera_commands: string;
  prompt_optimizer: number;
  prompt_optimizer_mode: string;
}

export interface BrandKit {
  id: number;
  brand_name: string;
  tagline: string;
  description: string;
  tone_of_voice: string;
  target_audience: string;
  key_messages: string;
  words_to_avoid: string;
  brand_story: string;
  competitors: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  heading_font: string;
  body_font: string;
  typography_style: string;
  logo_url: string;
  logo_variant_url: string;
  mascot_image_url: string;
  mascot_file_id: string;
  style_guide_url: string;
  language: string;
  voice_id: string;
  updated_at: string;
}

export interface PlatformPreset {
  id: number;
  name: string;
  platform: Platform;
  video_model: string;
  resolution: string;
  duration: number;
  camera_style: string;
  music_mood: string;
  tts_voice_id: string;
  caption_style: string;
  is_default: number;
}

export interface Voice {
  id: number;
  voice_id: string;
  name: string;
  type: "system" | "cloned";
  source_file_id: string;
  prompt_file_id: string;
  description: string;
  is_default: number;
}

export interface CalendarEvent {
  id: number;
  project_id: number;
  title: string;
  event_date: string;
  status: string;
  platform: Platform;
  created_at: string;
}

export interface Generation {
  id: number;
  modality: Modality;
  model: string;
  prompt: string;
  params: string;
  output_url: string;
  file_id: string;
  status: string;
  created_at: string;
}

export interface ChapterTimestamp {
  title: string;
  start_time: number;
  end_time?: number;
}

export interface SEOSuggestion {
  type: "title" | "description" | "tag" | "thumbnail" | "chapter";
  severity: "high" | "medium" | "low";
  message: string;
  suggestion: string;
}

export interface SEOScore {
  overall: number;
  title_score: number;
  description_score: number;
  tag_score: number;
  thumbnail_score: number;
  chapter_score: number;
  suggestions: SEOSuggestion[];
}

export interface YouTubeMetadata {
  id?: number;
  project_id: number;
  title: string;
  description: string;
  tags: string;
  hashtags: string;
  category: string;
  language: string;
  privacy_status: "public" | "unlisted" | "private";
  seo_score: number;
  thumbnail_text: string;
  thumbnail_overlay_json: string;
  chapters: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InstagramMetadata {
  id?: number;
  project_id: number;
  caption: string;
  hashtags: string;
  hashtags_suggested: string;
  story_text: string;
  story_hashtags: string;
  reel_title: string;
  reel_description: string;
  cover_image_prompt: string;
  content_type: "reel" | "story" | "feed_carousel" | "feed_single";
  target_audience: string;
  call_to_action: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LinkedInMetadata {
  id?: number;
  project_id: number;
  headline: string;
  caption: string;
  hashtags: string;
  hashtags_suggested: string;
  target_audience: string;
  call_to_action: string;
  content_format: "post" | "carousel" | "article" | "video";
  industry: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TrendPlatform = "instagram" | "linkedin" | "youtube";

export interface TrendItem {
  id?: number;
  platform: TrendPlatform;
  category: string;
  trend_text: string;
  trend_type: "hashtag" | "topic" | "format" | "sound" | "caption_style";
  volume_score: number;
  velocity_score: number;
  hashtag?: string;
  description?: string;
  example_posts?: string;
  posted_at?: string;
  fetched_at?: string;
  expires_at?: string;
}

export interface Competitor {
  id?: number;
  name: string;
  platform: TrendPlatform;
  handle?: string;
  description?: string;
  niche?: string;
  followers: number;
  avg_engagement: number;
  avg_views: number;
  posting_frequency?: string;
  content_themes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ViralVideo {
  id?: number;
  platform: TrendPlatform;
  video_title: string;
  video_url?: string;
  thumbnail_url?: string;
  creator_name?: string;
  creator_handle?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  posted_at?: string;
  fetched_at?: string;
  notes?: string;
  used_in_project_id?: number;
}
