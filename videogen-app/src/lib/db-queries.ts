import db from "@/data/db";
import { Project, BrandKit, PlatformPreset, Scene, Voice, Generation, CalendarEvent, YouTubeMetadata, InstagramMetadata, LinkedInMetadata } from "@/types";
import { validateFieldSchema } from "./json-validator";

const ALLOWED_PROJECT_COLS = new Set([
  "name", "platform", "topic", "script", "music_prompt", "status",
  "video_mode", "video_model", "hook_variant", "thumbnail_urls", "scheduled_at",
] as const);

const ALLOWED_SCENE_COLS = new Set([
  "script", "direction_notes", "image_url", "image_base64", "video_task_id",
  "video_file_id", "video_url", "status", "camera_commands",
  "prompt_optimizer", "prompt_optimizer_mode",
] as const);

export const ALLOWED_VOICE_COLS = new Set([
  "name", "type", "source_file_id", "prompt_file_id", "description", "is_default",
] as const);

export const ALLOWED_GENERATION_COLS = new Set([
  "modality", "model", "prompt", "params", "output_url", "file_id", "status",
] as const);

export const ALLOWED_CALENDAR_COLS = new Set([
  "project_id", "title", "event_date", "status", "platform",
] as const);

export const ALLOWED_BRAND_KIT_COLS = new Set([
  "brand_name", "tagline", "description", "tone_of_voice", "target_audience",
  "key_messages", "words_to_avoid", "brand_story", "competitors",
  "primary_color", "secondary_color", "accent_color",
  "heading_font", "body_font", "typography_style",
  "logo_url", "logo_variant_url", "mascot_image_url", "mascot_file_id", "style_guide_url",
  "language", "voice_id",
] as const);

function filterAllowedCols<T extends Record<string, unknown>>(updates: Partial<T>, allowed: Set<string>): Partial<T> {
  const filtered: Partial<T> = {};
  for (const key of Object.keys(updates)) {
    if (allowed.has(key)) {
      (filtered as Record<string, unknown>)[key] = updates[key as keyof T];
    }
  }
  return filtered;
}

export function getProjects(): Project[] {
  return db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all() as Project[];
}

export function getProjectById(id: number): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;
}

export function createProject(project: Omit<Project, "id" | "created_at" | "updated_at">): number {
  // Validate JSON fields before insertion
  if (project.script && !validateFieldSchema("script", project.script)) {
    throw new Error("Invalid JSON in script field");
  }
  if (project.thumbnail_urls && !validateFieldSchema("thumbnail_urls", project.thumbnail_urls)) {
    throw new Error("Invalid JSON in thumbnail_urls field");
  }

  const result = db.prepare(`
    INSERT INTO projects (name, platform, topic, script, music_prompt, status, video_mode, video_model)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    project.name,
    project.platform,
    project.topic,
    project.script,
    project.music_prompt,
    project.status,
    project.video_mode,
    project.video_model
  );
  return Number(result.lastInsertRowid);
}

export function updateProject(id: number, updates: Partial<Project>) {
  const filtered = filterAllowedCols(updates, ALLOWED_PROJECT_COLS);
  
  // Validate JSON fields before update
  if (filtered.script && !validateFieldSchema("script", filtered.script as string)) {
    throw new Error("Invalid JSON in script field");
  }
  if (filtered.thumbnail_urls && !validateFieldSchema("thumbnail_urls", filtered.thumbnail_urls as string)) {
    throw new Error("Invalid JSON in thumbnail_urls field");
  }
  
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  if (sets.length === 0) return;
  db.prepare(`UPDATE projects SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
}

export function deleteProject(id: number) {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
}

export function getBrandKit(): BrandKit | undefined {
  return db.prepare("SELECT * FROM brand_kit LIMIT 1").get() as BrandKit | undefined;
}

export function updateBrandKit(updates: Partial<BrandKit>) {
  const filtered = filterAllowedCols(updates, ALLOWED_BRAND_KIT_COLS);
  const keys = Object.keys(filtered);
  if (keys.length === 0) return;
  const existing = getBrandKit();
  if (existing) {
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    const values = Object.values(filtered);
    db.prepare(`UPDATE brand_kit SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(...values);
  } else {
    const cols = keys.join(", ");
    const vals = Object.values(filtered);
    const placeholders = vals.map(() => "?").join(", ");
    db.prepare(`INSERT INTO brand_kit (${cols}) VALUES (${placeholders})`).run(...vals);
  }
}

export function getPlatformPresets(): PlatformPreset[] {
  return db.prepare("SELECT * FROM platform_presets ORDER BY id").all() as PlatformPreset[];
}

// ─── Scenes ────────────────────────────────────────────────

export function getScenesByProjectId(projectId: number): Scene[] {
  return db.prepare("SELECT * FROM scenes WHERE project_id = ? ORDER BY order_index").all(projectId) as Scene[];
}

export function createScene(scene: Omit<Scene, "id">): number {
  const result = db.prepare(`
    INSERT INTO scenes (project_id, order_index, script, direction_notes, image_url, image_base64, video_task_id, video_file_id, video_url, status, camera_commands, prompt_optimizer, prompt_optimizer_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    scene.project_id,
    scene.order_index,
    scene.script,
    scene.direction_notes,
    scene.image_url,
    scene.image_base64,
    scene.video_task_id,
    scene.video_file_id,
    scene.video_url,
    scene.status,
    scene.camera_commands,
    scene.prompt_optimizer,
    scene.prompt_optimizer_mode
  );
  return Number(result.lastInsertRowid);
}

export function updateScene(id: number, updates: Partial<Scene>) {
  const filtered = filterAllowedCols(updates, ALLOWED_SCENE_COLS);
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  if (sets.length === 0) return;
  db.prepare(`UPDATE scenes SET ${sets} WHERE id = ?`).run(...values, id);
}

export function deleteScene(id: number) {
  db.prepare("DELETE FROM scenes WHERE id = ?").run(id);
}

// ─── Voices ────────────────────────────────────────────────

export function getVoices(): Voice[] {
  return db.prepare("SELECT * FROM voices ORDER BY created_at DESC").all() as Voice[];
}

export function getVoiceById(id: number): Voice | undefined {
  return db.prepare("SELECT * FROM voices WHERE id = ?").get(id) as Voice | undefined;
}

export function createVoice(voice: Omit<Voice, "id" | "created_at">): number {
  const result = db.prepare(`
    INSERT INTO voices (voice_id, name, type, source_file_id, prompt_file_id, description, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    voice.voice_id,
    voice.name,
    voice.type,
    voice.source_file_id,
    voice.prompt_file_id,
    voice.description,
    voice.is_default
  );
  return Number(result.lastInsertRowid);
}

export function updateVoice(id: number, updates: Partial<Voice>) {
  const filtered = filterAllowedCols(updates, ALLOWED_VOICE_COLS);
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  if (sets.length === 0) return;
  db.prepare(`UPDATE voices SET ${sets} WHERE id = ?`).run(...values, id);
}

export function deleteVoice(id: number) {
  db.prepare("DELETE FROM voices WHERE id = ?").run(id);
}

export function setDefaultVoice(id: number) {
  db.prepare("UPDATE voices SET is_default = 0").run();
  db.prepare("UPDATE voices SET is_default = 1 WHERE id = ?").run(id);
}

// ─── Generations ───────────────────────────────────────────

export function getGenerations(): Generation[] {
  return db.prepare("SELECT * FROM generations ORDER BY created_at DESC").all() as Generation[];
}

export function getGenerationsByModality(modality: string): Generation[] {
  return db.prepare("SELECT * FROM generations WHERE modality = ? ORDER BY created_at DESC").all(modality) as Generation[];
}

export function createGeneration(generation: Omit<Generation, "id" | "created_at">): number {
  const result = db.prepare(`
    INSERT INTO generations (modality, model, prompt, params, output_url, file_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    generation.modality,
    generation.model,
    generation.prompt,
    generation.params,
    generation.output_url,
    generation.file_id,
    generation.status
  );
  return Number(result.lastInsertRowid);
}

export function updateGeneration(id: number, updates: Partial<Generation>) {
  const filtered = filterAllowedCols(updates, ALLOWED_GENERATION_COLS);
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  if (sets.length === 0) return;
  db.prepare(`UPDATE generations SET ${sets} WHERE id = ?`).run(...values, id);
}

export function deleteGeneration(id: number) {
  db.prepare("DELETE FROM generations WHERE id = ?").run(id);
}

// ─── Calendar Events ───────────────────────────────────────

export function getCalendarEvents(): CalendarEvent[] {
  return db.prepare("SELECT * FROM calendar_events ORDER BY event_date").all() as CalendarEvent[];
}

export function getCalendarEventsByDateRange(start: string, end: string): CalendarEvent[] {
  return db.prepare("SELECT * FROM calendar_events WHERE event_date BETWEEN ? AND ? ORDER BY event_date")
    .all(start, end) as CalendarEvent[];
}

export function createCalendarEvent(event: Omit<CalendarEvent, "id" | "created_at">): number {
  const result = db.prepare(`
    INSERT INTO calendar_events (project_id, title, event_date, status, platform)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    event.project_id,
    event.title,
    event.event_date,
    event.status,
    event.platform
  );
  return Number(result.lastInsertRowid);
}

export function updateCalendarEvent(id: number, updates: Partial<CalendarEvent>) {
  const filtered = filterAllowedCols(updates, ALLOWED_CALENDAR_COLS);
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  if (sets.length === 0) return;
  db.prepare(`UPDATE calendar_events SET ${sets} WHERE id = ?`).run(...values, id);
}

export function deleteCalendarEvent(id: number) {
  db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
}

// ─── YouTube Metadata ───────────────────────────────────────

const ALLOWED_YOUTUBE_COLS = new Set([
  "project_id", "title", "description", "tags", "hashtags",
  "category", "language", "privacy_status", "seo_score",
  "thumbnail_text", "thumbnail_overlay_json", "chapters",
  "scheduled_at", "published_at",
] as const);

export function getYouTubeMetadata(projectId: number) {
  return db.prepare("SELECT * FROM youtube_metadata WHERE project_id = ?").get(projectId) as YouTubeMetadata | undefined;
}

export function createYouTubeMetadata(data: Partial<YouTubeMetadata>): number {
  const cols = ["project_id", ...Object.keys(filterAllowedCols(data, ALLOWED_YOUTUBE_COLS))];
  const vals = cols.map((k) => data[k as keyof typeof data]);
  const placeholders = cols.map(() => "?").join(", ");
  const result = db.prepare(`INSERT INTO youtube_metadata (${cols.join(", ")}) VALUES (${placeholders})`).run(...vals);
  return result.lastInsertRowid as number;
}

export function updateYouTubeMetadata(projectId: number, updates: Partial<YouTubeMetadata>) {
  const filtered = filterAllowedCols(updates, ALLOWED_YOUTUBE_COLS);
  if (Object.keys(filtered).length === 0) return;
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  db.prepare(`UPDATE youtube_metadata SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`).run(...values, projectId);
}

export function saveYouTubeMetadata(projectId: number, data: Partial<YouTubeMetadata>) {
  const existing = getYouTubeMetadata(projectId);
  if (existing) {
    updateYouTubeMetadata(projectId, data);
  } else {
    createYouTubeMetadata({ ...data, project_id: projectId });
  }
}

// ─── Instagram Metadata ───────────────────────────────────────

export const ALLOWED_INSTAGRAM_COLS = new Set([
  "project_id", "caption", "hashtags", "hashtags_suggested",
  "story_text", "story_hashtags", "reel_title", "reel_description",
  "cover_image_prompt", "content_type", "target_audience",
  "call_to_action", "scheduled_at", "published_at",
] as const);

export function getInstagramMetadata(projectId: number) {
  return db.prepare("SELECT * FROM instagram_metadata WHERE project_id = ?").get(projectId) as InstagramMetadata | undefined;
}

export function createInstagramMetadata(data: Partial<InstagramMetadata>): number {
  const cols = ["project_id", ...Object.keys(filterAllowedCols(data, ALLOWED_INSTAGRAM_COLS))];
  const vals = cols.map((k) => data[k as keyof typeof data]);
  const placeholders = cols.map(() => "?").join(", ");
  const result = db.prepare(`INSERT INTO instagram_metadata (${cols.join(", ")}) VALUES (${placeholders})`).run(...vals);
  return result.lastInsertRowid as number;
}

export function updateInstagramMetadata(projectId: number, updates: Partial<InstagramMetadata>) {
  const filtered = filterAllowedCols(updates, ALLOWED_INSTAGRAM_COLS);
  if (Object.keys(filtered).length === 0) return;
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  db.prepare(`UPDATE instagram_metadata SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`).run(...values, projectId);
}

export function saveInstagramMetadata(projectId: number, data: Partial<InstagramMetadata>) {
  const existing = getInstagramMetadata(projectId);
  if (existing) {
    updateInstagramMetadata(projectId, data);
  } else {
    createInstagramMetadata({ ...data, project_id: projectId });
  }
}

export function getInstagramScore(caption: string, hashtags: string): InstagramScore {
  const charScore = caption.length >= 125 && caption.length <= 2200 ? 100 : Math.max(0, Math.min(100, (caption.length / 2200) * 100));
  const hashCount = (hashtags.match(/#/g) || []).length;
  const hashScore = hashCount >= 5 && hashCount <= 30 ? 100 : Math.max(0, Math.min(100, (hashCount / 30) * 100));
  const hookScore = /^(swipe up|save this|tap the link|check out|link in bio|link in comments|follow for more|double tap|comment)/i.test(caption) ? 100 : 50;
  const ctaPatterns = /^(swipe up|save this|tap the link|check out|link in bio|link in comments|follow for more|double tap|comment|learn more|get yours|shop now|sign up|read more|watch more|see more)/i;
  const ctaScore = ctaPatterns.test(caption) ? 100 : 0;
  const hashArr = hashtags.split(",").map((h) => h.trim()).filter(Boolean);
  const reachScore = hashArr.length > 0 && hashArr.some((h) => h.length > 15) ? 80 : 60;
  const total = Math.round(charScore * 0.25 + hashScore * 0.2 + hookScore * 0.2 + ctaScore * 0.15 + reachScore * 0.2);
  return {
    total: Math.min(100, total),
    character_count: caption.length,
    hashtag_count: hashCount,
    hook_score: hookScore,
    reach_score: reachScore,
  };
}

export interface InstagramScore {
  total: number;
  character_count: number;
  hashtag_count: number;
  hook_score: number;
  reach_score: number;
}

// ─── LinkedIn Metadata ───────────────────────────────────────

export const ALLOWED_LINKEDIN_COLS = new Set([
  "project_id", "headline", "caption", "hashtags", "hashtags_suggested",
  "target_audience", "call_to_action", "content_format", "industry",
  "scheduled_at", "published_at",
] as const);

export function getLinkedInMetadata(projectId: number) {
  return db.prepare("SELECT * FROM linkedin_metadata WHERE project_id = ?").get(projectId) as LinkedInMetadata | undefined;
}

export function createLinkedInMetadata(data: Partial<LinkedInMetadata>): number {
  const cols = ["project_id", ...Object.keys(filterAllowedCols(data, ALLOWED_LINKEDIN_COLS))];
  const vals = cols.map((k) => data[k as keyof typeof data]);
  const placeholders = cols.map(() => "?").join(", ");
  const result = db.prepare(`INSERT INTO linkedin_metadata (${cols.join(", ")}) VALUES (${placeholders})`).run(...vals);
  return result.lastInsertRowid as number;
}

export function updateLinkedInMetadata(projectId: number, updates: Partial<LinkedInMetadata>) {
  const filtered = filterAllowedCols(updates, ALLOWED_LINKEDIN_COLS);
  if (Object.keys(filtered).length === 0) return;
  const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(filtered);
  db.prepare(`UPDATE linkedin_metadata SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`).run(...values, projectId);
}

export function saveLinkedInMetadata(projectId: number, data: Partial<LinkedInMetadata>) {
  const existing = getLinkedInMetadata(projectId);
  if (existing) {
    updateLinkedInMetadata(projectId, data);
  } else {
    createLinkedInMetadata({ ...data, project_id: projectId });
  }
}

export function getLinkedInScore(caption: string, hashtags: string): LinkedInScore {
  const charScore = caption.length >= 150 && caption.length <= 3000 ? 100 : Math.max(0, Math.min(100, (caption.length / 3000) * 100));
  const hashCount = (hashtags.match(/#/g) || []).length;
  const hashScore = hashCount >= 3 && hashCount <= 5 ? 100 : Math.max(0, Math.min(100, (hashCount / 5) * 100));
  const hookScore = /^(I |Here's|The real|Stop |This changed|3 things|I almost|I turned|Tuesday|We almost)/i.test(caption) ? 100 : 50;
  const ctaScore = /(What would you add|What's your|DM me|Comment|Connect if|link in comments)/i.test(caption) ? 100 : 0;
  const total = Math.round(charScore * 0.3 + hashScore * 0.25 + hookScore * 0.25 + ctaScore * 0.2);
  return {
    total: Math.min(100, total),
    character_count: caption.length,
    hashtag_count: hashCount,
    hook_score: hookScore,
  };
}

export interface LinkedInScore {
  total: number;
  character_count: number;
  hashtag_count: number;
  hook_score: number;
}
