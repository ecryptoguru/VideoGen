/**
 * Zod Validation Schemas for API Routes
 * Provides type-safe validation for all API request bodies
 */

import { z } from "zod";

// Platform enum
const platformEnum = z.enum([
  "instagram_reels",
  "linkedin",
  "youtube_shorts",
  "youtube_long",
]);

// Project status enum
const projectStatusEnum = z.enum([
  "draft",
  "generating",
  "processing",
  "ready",
  "published",
  "failed",
]);

// Scene status enum
const sceneStatusEnum = z.enum([
  "pending",
  "generating",
  "ready",
  "failed",
]);

// Video mode enum
const videoModeEnum = z.enum(["t2v", "i2v", "fl2v", "s2v", "template"]);

// Projects API
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  platform: platformEnum,
  topic: z.string().max(500).nullable().default(null),
  script: z.string().nullable().default(null),
  music_prompt: z.string().max(1000).nullable().default(null),
  status: projectStatusEnum.default("draft"),
  video_mode: videoModeEnum.default("i2v"),
  video_model: z.string().max(100).default("MiniMax-Hailuo-2.3"),
  hook_variant: z.string().max(500).nullable().default(null),
  thumbnail_urls: z.string().nullable().default(null),
  scheduled_at: z.string().datetime().nullable().default(null),
});

export const updateProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200).optional(),
  platform: platformEnum.optional(),
  topic: z.string().max(500).nullable().optional(),
  script: z.string().nullable().optional(),
  music_prompt: z.string().max(1000).nullable().optional(),
  status: projectStatusEnum.optional(),
  video_mode: videoModeEnum.optional(),
  video_model: z.string().max(100).optional(),
  hook_variant: z.string().max(500).nullable().optional(),
  thumbnail_urls: z.string().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
}).refine((data) => {
  const keys = Object.keys(data).filter((k) => k !== "id");
  return keys.length > 0;
}, {
  message: "At least one field to update is required",
  path: ["body"],
});

export const deleteProjectSchema = z.object({
  id: z.number().int().positive(),
});

// Scenes API
export const createSceneSchema = z.object({
  project_id: z.number().int().positive(),
  order_index: z.number().int().min(0),
  script: z.string().max(5000).optional(),
  direction_notes: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  image_base64: z.string().optional(),
  video_task_id: z.string().max(200).optional(),
  video_file_id: z.string().max(200).optional(),
  video_url: z.string().url().optional(),
  status: sceneStatusEnum.optional(),
  camera_commands: z.string().max(500).optional(),
  prompt_optimizer: z.number().int().min(0).max(1).optional(),
  prompt_optimizer_mode: z.enum(["fast", "quality"]).optional(),
});

export const updateSceneSchema = z.object({
  id: z.number().int().positive(),
  project_id: z.number().int().positive().optional(),
  order_index: z.number().int().min(0).optional(),
  script: z.string().max(5000).optional(),
  direction_notes: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  image_base64: z.string().optional(),
  video_task_id: z.string().max(200).optional(),
  video_file_id: z.string().max(200).optional(),
  video_url: z.string().url().optional(),
  status: sceneStatusEnum.optional(),
  camera_commands: z.string().max(500).optional(),
  prompt_optimizer: z.number().int().min(0).max(1).optional(),
  prompt_optimizer_mode: z.enum(["fast", "quality"]).optional(),
}).refine((data) => {
  const keys = Object.keys(data).filter((k) => k !== "id");
  return keys.length > 0;
}, {
  message: "At least one field to update is required",
  path: ["body"],
});

export const deleteSceneSchema = z.object({
  id: z.number().int().positive(),
});

// Brand Kit API
export const updateBrandKitSchema = z.object({
  brand_name: z.string().max(200).optional(),
  tagline: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  tone_of_voice: z.string().max(200).optional(),
  target_audience: z.string().max(500).optional(),
  key_messages: z.string().max(2000).optional(),
  words_to_avoid: z.string().max(1000).optional(),
  brand_story: z.string().max(5000).optional(),
  competitors: z.string().max(2000).optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  heading_font: z.string().max(100).optional(),
  body_font: z.string().max(100).optional(),
  typography_style: z.string().max(100).optional(),
  logo_url: z.string().url().optional(),
  logo_variant_url: z.string().url().optional(),
  mascot_image_url: z.string().url().optional(),
  mascot_file_id: z.string().max(200).optional(),
  style_guide_url: z.string().url().optional(),
  language: z.string().max(50).optional(),
  voice_id: z.string().max(200).optional(),
});

// MiniMax Text API
export const minimaxTextSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(32000),
  })).min(1).max(20),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(8000).optional(),
  stream: z.boolean().optional(),
  user_consent: z.boolean().optional(),
});

// MiniMax Image API
export const minimaxImageSchema = z.object({
  prompt: z.string().min(1).max(2000),
  model: z.string().max(100).optional(),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"]).optional(),
  n: z.number().int().min(1).max(4).optional(),
  user_consent: z.boolean().optional(),
});

// MiniMax Video API
export const minimaxVideoSchema = z.object({
  model: z.string().max(100),
  prompt: z.string().min(1).max(2000),
  first_frame_image: z.string().url().optional(),
  duration: z.number().int().min(1).max(10),
  resolution: z.enum(["360P", "480P", "720P", "768P", "1080P"]).optional(),
  user_consent: z.boolean().optional(),
});

// MiniMax TTS API
export const minimaxTtsSchema = z.object({
  text: z.string().min(1).max(10000),
  model: z.string().max(100).optional(),
  voice_setting: z.object({
    voice_id: z.string().max(200),
    speed: z.number().min(0.5).max(2).optional(),
    vol: z.number().min(0.1).max(1).optional(),
    pitch: z.number().min(-12).max(12).optional(),
  }),
  output_format: z.enum(["mp3", "wav", "hex"]).optional(),
  language_boost: z.string().max(50).optional(),
  user_consent: z.boolean().optional(),
});

// MiniMax Music API
export const minimaxMusicSchema = z.object({
  prompt: z.string().min(1).max(500),
  model: z.string().max(100).optional(),
  is_instrumental: z.boolean().optional(),
  output_format: z.enum(["mp3", "wav", "hex"]).optional(),
  user_consent: z.boolean().optional(),
});

// Calendar Events API
export const createCalendarEventSchema = z.object({
  project_id: z.number().int().positive().optional(),
  title: z.string().min(1).max(200),
  event_date: z.string().datetime(),
  platform: platformEnum.optional(),
  description: z.string().max(1000).optional(),
});

export const updateCalendarEventSchema = z.object({
  id: z.number().int().positive(),
  project_id: z.number().int().positive().optional(),
  title: z.string().min(1).max(200).optional(),
  event_date: z.string().datetime().optional(),
  platform: platformEnum.optional(),
  description: z.string().max(1000).optional(),
}).refine((data) => {
  const keys = Object.keys(data).filter((k) => k !== "id");
  return keys.length > 0;
}, {
  message: "At least one field to update is required",
  path: ["body"],
});

export const deleteCalendarEventSchema = z.object({
  id: z.number().int().positive(),
});

// Voices API
export const createVoiceSchema = z.object({
  voice_id: z.string().min(1).max(200),
  name: z.string().max(200).optional(),
  type: z.enum(["system", "cloned"]).optional(),
  source_file_id: z.string().max(200).optional(),
  prompt_file_id: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  is_default: z.number().int().min(0).max(1).optional(),
});

export const updateVoiceSchema = z.object({
  id: z.number().int().positive(),
  voice_id: z.string().min(1).max(200).optional(),
  name: z.string().max(200).optional(),
  type: z.enum(["system", "cloned"]).optional(),
  source_file_id: z.string().max(200).optional(),
  prompt_file_id: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  is_default: z.number().int().min(0).max(1).optional(),
}).refine((data) => {
  const keys = Object.keys(data).filter((k) => k !== "id");
  return keys.length > 0;
}, {
  message: "At least one field to update is required",
  path: ["body"],
});

export const deleteVoiceSchema = z.object({
  id: z.number().int().positive(),
});

// Instagram Metadata API
export const updateInstagramMetadataSchema = z.object({
  project_id: z.number().int().positive().optional(),
  caption: z.string().max(2200).optional(),
  hashtags: z.string().max(1000).optional(),
  hashtags_suggested: z.string().max(1000).optional(),
  story_text: z.string().max(500).optional(),
  story_hashtags: z.string().max(500).optional(),
  reel_title: z.string().max(100).optional(),
  reel_description: z.string().max(500).optional(),
  cover_image_prompt: z.string().max(500).optional(),
  content_type: z.enum(["reel", "story", "feed_carousel", "feed_single"]).optional(),
  target_audience: z.string().max(200).optional(),
  call_to_action: z.string().max(300).optional(),
  scheduled_at: z.string().datetime().optional(),
  published_at: z.string().datetime().optional(),
});

// LinkedIn Metadata API
export const updateLinkedInMetadataSchema = z.object({
  project_id: z.number().int().positive().optional(),
  headline: z.string().max(200).optional(),
  caption: z.string().max(3000).optional(),
  hashtags: z.string().max(1000).optional(),
  hashtags_suggested: z.string().max(1000).optional(),
  target_audience: z.string().max(200).optional(),
  call_to_action: z.string().max(300).optional(),
  content_format: z.enum(["post", "carousel", "article", "video"]).optional(),
  industry: z.string().max(100).optional(),
  scheduled_at: z.string().datetime().optional(),
  published_at: z.string().datetime().optional(),
});

// YouTube Metadata API
export const updateYoutubeMetadataSchema = z.object({
  project_id: z.number().int().positive().optional(),
  title: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  tags: z.string().max(1000).optional(),
  hashtags: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
  privacy_status: z.enum(["public", "unlisted", "private"]).optional(),
  seo_score: z.number().int().min(0).max(100).optional(),
  thumbnail_text: z.string().max(200).optional(),
  thumbnail_overlay_json: z.string().max(1000).optional(),
  chapters: z.string().max(5000).optional(),
  scheduled_at: z.string().datetime().optional(),
  published_at: z.string().datetime().optional(),
});
