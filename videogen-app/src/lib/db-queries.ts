import { prisma } from "./db";
import { Project, BrandKit, PlatformPreset, Scene, Voice, Generation, CalendarEvent, YouTubeMetadata, InstagramMetadata, LinkedInMetadata } from "@/types";
import { validateFieldSchema } from "./json-validator";

type ProjectModel = {
  id: number;
  name: string;
  platform: string;
  topic: string | null;
  script: string | null;
  musicPrompt: string | null;
  status: string;
  videoMode: string | null;
  videoModel: string | null;
  hookVariant: string | null;
  thumbnailUrls: string | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SceneModel = {
  id: number;
  projectId: number;
  orderIndex: number;
  script: string | null;
  directionNotes: string | null;
  imageUrl: string | null;
  imageBase64: string | null;
  videoTaskId: string | null;
  videoFileId: string | null;
  videoUrl: string | null;
  status: string;
  cameraCommands: string | null;
  promptOptimizer: number | null;
  promptOptimizerMode: string | null;
};

type VoiceModel = {
  id: number;
  voiceId: string;
  name: string | null;
  type: string | null;
  sourceFileId: string | null;
  promptFileId: string | null;
  description: string | null;
  isDefault: number;
  createdAt: Date;
};

type GenerationModel = {
  id: number;
  modality: string;
  model: string | null;
  prompt: string | null;
  params: string | null;
  outputUrl: string | null;
  fileId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CalendarEventModel = {
  id: number;
  projectId: number | null;
  title: string;
  eventDate: Date;
  status: string;
  platform: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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

export async function getProjects(): Promise<Project[]> {
  const results = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      platform: true,
      topic: true,
      script: true,
      musicPrompt: true,
      status: true,
      videoMode: true,
      videoModel: true,
      hookVariant: true,
      thumbnailUrls: true,
      scheduledAt: true,
      createdAt: true,
      updatedAt: true,
    }
  });
  return results.map((p: ProjectModel) => ({
    id: p.id,
    name: p.name,
    platform: p.platform,
    topic: p.topic,
    script: p.script,
    music_prompt: p.musicPrompt,
    status: p.status,
    video_mode: p.videoMode,
    video_model: p.videoModel,
    hook_variant: p.hookVariant,
    thumbnail_urls: p.thumbnailUrls,
    scheduled_at: p.scheduledAt?.toISOString(),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  })) as Project[];
}

export async function getProjectById(id: number): Promise<Project | null> {
  const result = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      platform: true,
      topic: true,
      script: true,
      musicPrompt: true,
      status: true,
      videoMode: true,
      videoModel: true,
      hookVariant: true,
      thumbnailUrls: true,
      scheduledAt: true,
      createdAt: true,
      updatedAt: true,
    }
  });
  if (!result) return null;
  return {
    id: result.id,
    name: result.name,
    platform: result.platform,
    topic: result.topic,
    script: result.script,
    music_prompt: result.musicPrompt,
    status: result.status,
    video_mode: result.videoMode,
    video_model: result.videoModel,
    hook_variant: result.hookVariant,
    thumbnail_urls: result.thumbnailUrls,
    scheduled_at: result.scheduledAt?.toISOString(),
    created_at: result.createdAt.toISOString(),
    updated_at: result.updatedAt.toISOString(),
  } as Project;
}

export async function createProject(project: Omit<Project, "id" | "created_at" | "updated_at">): Promise<number> {
  // Validate JSON fields before insertion
  if (project.script && !validateFieldSchema("script", project.script)) {
    throw new Error("Invalid JSON in script field");
  }
  if (project.thumbnail_urls && !validateFieldSchema("thumbnail_urls", project.thumbnail_urls)) {
    throw new Error("Invalid JSON in thumbnail_urls field");
  }

  const result = await prisma.project.create({
    data: {
      name: project.name,
      platform: project.platform,
      topic: project.topic,
      script: project.script,
      musicPrompt: project.music_prompt,
      status: project.status,
      videoMode: project.video_mode,
      videoModel: project.video_model,
      hookVariant: project.hook_variant,
      thumbnailUrls: project.thumbnail_urls,
      scheduledAt: project.scheduled_at ? new Date(project.scheduled_at) : null,
    }
  });
  return result.id;
}

export async function updateProject(id: number, updates: Partial<Project>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_PROJECT_COLS);
  
  // Validate JSON fields before update
  if (filtered.script && !validateFieldSchema("script", filtered.script as string)) {
    throw new Error("Invalid JSON in script field");
  }
  if (filtered.thumbnail_urls && !validateFieldSchema("thumbnail_urls", filtered.thumbnail_urls as string)) {
    throw new Error("Invalid JSON in thumbnail_urls field");
  }
  
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.project.update({
    where: { id },
    data: {
      ...filtered,
      updatedAt: new Date()
    }
  });
}

export async function deleteProject(id: number): Promise<void> {
  await prisma.project.delete({
    where: { id }
  });
}

export async function getBrandKit(): Promise<BrandKit | null> {
  const result = await prisma.brandKit.findFirst();
  if (!result) return null;
  return {
    id: result.id,
    brand_name: result.brandName,
    tagline: result.tagline,
    description: result.description,
    tone_of_voice: result.toneOfVoice,
    target_audience: result.targetAudience,
    key_messages: result.keyMessages,
    words_to_avoid: result.wordsToAvoid,
    brand_story: result.brandStory,
    competitors: result.competitors,
    primary_color: result.primaryColor,
    secondary_color: result.secondaryColor,
    accent_color: result.accentColor,
    heading_font: result.headingFont,
    body_font: result.bodyFont,
    typography_style: result.typographyStyle,
    logo_url: result.logoUrl,
    logo_variant_url: result.logoVariantUrl,
    mascot_image_url: result.mascotImageUrl,
    mascot_file_id: result.mascotFileId,
    style_guide_url: result.styleGuideUrl,
    language: result.language,
    voice_id: result.voiceId,
    updated_at: result.updatedAt.toISOString(),
  } as BrandKit;
}

export async function updateBrandKit(updates: Partial<BrandKit>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_BRAND_KIT_COLS);
  const keys = Object.keys(filtered);
  if (keys.length === 0) return;
  const existing = await getBrandKit();
  if (existing) {
    await prisma.brandKit.update({
      where: { id: existing.id },
      data: {
        ...filtered,
        updatedAt: new Date()
      }
    });
  } else {
    await prisma.brandKit.create({
      data: filtered
    });
  }
}

export async function getPlatformPresets(): Promise<PlatformPreset[]> {
  return await prisma.$queryRaw`SELECT * FROM platform_presets ORDER BY id` as PlatformPreset[];
}

// ─── Scenes ────────────────────────────────────────────────

export async function getScenesByProjectId(projectId: number): Promise<Scene[]> {
  const results = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { orderIndex: 'asc' }
  });
  return results.map((s: SceneModel) => ({
    id: s.id,
    project_id: s.projectId,
    order_index: s.orderIndex,
    script: s.script,
    direction_notes: s.directionNotes,
    image_url: s.imageUrl,
    image_base64: s.imageBase64,
    video_task_id: s.videoTaskId,
    video_file_id: s.videoFileId,
    video_url: s.videoUrl,
    status: s.status,
    camera_commands: s.cameraCommands,
    prompt_optimizer: s.promptOptimizer,
    prompt_optimizer_mode: s.promptOptimizerMode,
  })) as Scene[];
}

export async function createScene(scene: Omit<Scene, "id">): Promise<number> {
  const result = await prisma.scene.create({
    data: {
      projectId: scene.project_id,
      orderIndex: scene.order_index,
      script: scene.script,
      directionNotes: scene.direction_notes,
      imageUrl: scene.image_url,
      imageBase64: scene.image_base64,
      videoTaskId: scene.video_task_id,
      videoFileId: scene.video_file_id,
      videoUrl: scene.video_url,
      status: scene.status,
      cameraCommands: scene.camera_commands,
      promptOptimizer: scene.prompt_optimizer,
      promptOptimizerMode: scene.prompt_optimizer_mode
    }
  });
  return result.id;
}

export async function updateScene(id: number, updates: Partial<Scene>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_SCENE_COLS);
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.scene.update({
    where: { id },
    data: filtered
  });
}

export async function deleteScene(id: number): Promise<void> {
  await prisma.scene.delete({
    where: { id }
  });
}

// ─── Voices ────────────────────────────────────────────────

export async function getVoices(): Promise<Voice[]> {
  const results = await prisma.voice.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return results.map((v: VoiceModel) => ({
    id: v.id,
    voice_id: v.voiceId,
    name: v.name,
    type: v.type,
    source_file_id: v.sourceFileId,
    prompt_file_id: v.promptFileId,
    description: v.description,
    is_default: v.isDefault,
    created_at: v.createdAt.toISOString(),
  })) as Voice[];
}

export async function getVoiceById(id: number): Promise<Voice | null> {
  const result = await prisma.voice.findUnique({
    where: { id }
  });
  if (!result) return null;
  return {
    id: result.id,
    voice_id: result.voiceId,
    name: result.name,
    type: result.type,
    source_file_id: result.sourceFileId,
    prompt_file_id: result.promptFileId,
    description: result.description,
    is_default: result.isDefault,
    created_at: result.createdAt.toISOString(),
  } as Voice;
}

export async function createVoice(voice: Omit<Voice, "id" | "created_at">): Promise<number> {
  const result = await prisma.voice.create({
    data: {
      voiceId: voice.voice_id,
      name: voice.name,
      type: voice.type,
      sourceFileId: voice.source_file_id,
      promptFileId: voice.prompt_file_id,
      description: voice.description,
      isDefault: voice.is_default
    }
  });
  return result.id;
}

export async function updateVoice(id: number, updates: Partial<Voice>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_VOICE_COLS);
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.voice.update({
    where: { id },
    data: filtered
  });
}

export async function deleteVoice(id: number): Promise<void> {
  await prisma.voice.delete({
    where: { id }
  });
}

export async function setDefaultVoice(id: number): Promise<void> {
  await prisma.voice.updateMany({
    data: { isDefault: 0 }
  });
  await prisma.voice.update({
    where: { id },
    data: { isDefault: 1 }
  });
}

// ─── Generations ───────────────────────────────────────────

export async function getGenerations(): Promise<Generation[]> {
  const results = await prisma.generation.findMany({
    orderBy: { createdAt: 'desc' }
  });
  return results.map((g: GenerationModel) => ({
    id: g.id,
    modality: g.modality,
    model: g.model,
    prompt: g.prompt,
    params: g.params,
    output_url: g.outputUrl,
    file_id: g.fileId,
    status: g.status,
    created_at: g.createdAt.toISOString(),
    updated_at: g.updatedAt.toISOString(),
  })) as Generation[];
}

export async function getGenerationsByModality(modality: string): Promise<Generation[]> {
  const results = await prisma.generation.findMany({
    where: { modality },
    orderBy: { createdAt: 'desc' }
  });
  return results.map((g: GenerationModel) => ({
    id: g.id,
    modality: g.modality,
    model: g.model,
    prompt: g.prompt,
    params: g.params,
    output_url: g.outputUrl,
    file_id: g.fileId,
    status: g.status,
    created_at: g.createdAt.toISOString(),
    updated_at: g.updatedAt.toISOString(),
  })) as Generation[];
}

export async function createGeneration(generation: Omit<Generation, "id" | "created_at">): Promise<number> {
  const result = await prisma.generation.create({
    data: {
      modality: generation.modality,
      model: generation.model,
      prompt: generation.prompt,
      params: generation.params,
      outputUrl: generation.output_url,
      fileId: generation.file_id,
      status: generation.status
    }
  });
  return result.id;
}

export async function updateGeneration(id: number, updates: Partial<Generation>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_GENERATION_COLS);
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.generation.update({
    where: { id },
    data: filtered
  });
}

export async function deleteGeneration(id: number): Promise<void> {
  await prisma.generation.delete({
    where: { id }
  });
}

// ─── Calendar Events ───────────────────────────────────────

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const results = await prisma.calendarEvent.findMany({
    orderBy: { eventDate: 'asc' }
  });
  return results.map((e: CalendarEventModel) => ({
    id: e.id,
    project_id: e.projectId,
    title: e.title,
    event_date: e.eventDate.toISOString(),
    status: e.status,
    platform: e.platform,
    description: e.description,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  })) as CalendarEvent[];
}

export async function getCalendarEventsByDateRange(start: string, end: string): Promise<CalendarEvent[]> {
  const results = await prisma.calendarEvent.findMany({
    where: {
      eventDate: {
        gte: new Date(start),
        lte: new Date(end)
      }
    },
    orderBy: { eventDate: 'asc' }
  });
  return results.map(e => ({
    id: e.id,
    project_id: e.projectId,
    title: e.title,
    event_date: e.eventDate.toISOString(),
    status: e.status,
    platform: e.platform,
    description: e.description,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  })) as CalendarEvent[];
}

export async function createCalendarEvent(event: Omit<CalendarEvent, "id" | "created_at">): Promise<number> {
  const result = await prisma.calendarEvent.create({
    data: {
      projectId: event.project_id,
      title: event.title,
      eventDate: new Date(event.event_date),
      status: event.status,
      platform: event.platform
    }
  });
  return result.id;
}

export async function updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_CALENDAR_COLS);
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.calendarEvent.update({
    where: { id },
    data: filtered
  });
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  await prisma.calendarEvent.delete({
    where: { id }
  });
}

// ─── YouTube Metadata ───────────────────────────────────────

const ALLOWED_YOUTUBE_COLS = new Set([
  "project_id", "title", "description", "tags", "hashtags",
  "category", "language", "privacy_status", "seo_score",
  "thumbnail_text", "thumbnail_overlay_json", "chapters",
  "scheduled_at", "published_at",
] as const);

export async function getYouTubeMetadata(projectId: number): Promise<YouTubeMetadata | null> {
  const result = await prisma.youtubeMetadata.findUnique({
    where: { projectId }
  });
  if (!result) return null;
  return {
    id: result.id,
    project_id: result.projectId,
    title: result.title || '',
    description: result.description || '',
    tags: result.tags || '',
    hashtags: result.hashtags || '',
    category: result.category || '',
    language: result.language || '',
    privacy_status: (result.privacyStatus || 'public') as 'public' | 'unlisted' | 'private',
    seo_score: result.seoScore || 0,
    thumbnail_text: result.thumbnailText || '',
    thumbnail_overlay_json: result.thumbnailOverlayJson || '',
    chapters: result.chapters || '',
    scheduled_at: result.scheduledAt?.toISOString() || null,
    published_at: result.publishedAt?.toISOString() || null,
    created_at: result.createdAt.toISOString(),
    updated_at: result.updatedAt.toISOString(),
  };
}

export async function createYouTubeMetadata(data: Partial<YouTubeMetadata>): Promise<number> {
  const result = await prisma.youtubeMetadata.create({
    data: {
      projectId: data.project_id!,
      title: data.title,
      description: data.description,
      tags: data.tags,
      hashtags: data.hashtags,
      category: data.category,
      language: data.language,
      privacyStatus: data.privacy_status,
      seoScore: data.seo_score,
      thumbnailText: data.thumbnail_text,
      thumbnailOverlayJson: data.thumbnail_overlay_json,
      chapters: data.chapters,
      scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
      publishedAt: data.published_at ? new Date(data.published_at) : null,
    }
  });
  return result.id;
}

export async function updateYouTubeMetadata(projectId: number, updates: Partial<YouTubeMetadata>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_YOUTUBE_COLS);
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.youtubeMetadata.update({
    where: { projectId },
    data: {
      title: updates.title,
      description: updates.description,
      tags: updates.tags,
      hashtags: updates.hashtags,
      category: updates.category,
      language: updates.language,
      privacyStatus: updates.privacy_status,
      seoScore: updates.seo_score,
      thumbnailText: updates.thumbnail_text,
      thumbnailOverlayJson: updates.thumbnail_overlay_json,
      chapters: updates.chapters,
      updatedAt: new Date(),
      scheduledAt: updates.scheduled_at ? new Date(updates.scheduled_at) : undefined,
      publishedAt: updates.published_at ? new Date(updates.published_at) : undefined,
    }
  });
}

export async function saveYouTubeMetadata(projectId: number, data: Partial<YouTubeMetadata>): Promise<void> {
  const existing = await getYouTubeMetadata(projectId);
  if (existing) {
    await updateYouTubeMetadata(projectId, data);
  } else {
    await createYouTubeMetadata({ ...data, project_id: projectId });
  }
}

// ─── Instagram Metadata ───────────────────────────────────────

export const ALLOWED_INSTAGRAM_COLS = new Set([
  "project_id", "caption", "hashtags", "hashtags_suggested",
  "story_text", "story_hashtags", "reel_title", "reel_description",
  "cover_image_prompt", "content_type", "target_audience",
  "call_to_action", "scheduled_at", "published_at",
] as const);

export async function getInstagramMetadata(projectId: number): Promise<InstagramMetadata | null> {
  const result = await prisma.instagramMetadata.findUnique({
    where: { projectId }
  });
  if (!result) return null;
  return {
    id: result.id,
    project_id: result.projectId,
    caption: result.caption || '',
    hashtags: result.hashtags || '',
    hashtags_suggested: result.hashtagsSuggested || '',
    story_text: result.storyText || '',
    story_hashtags: result.storyHashtags || '',
    reel_title: result.reelTitle || '',
    reel_description: result.reelDescription || '',
    cover_image_prompt: result.coverImagePrompt || '',
    content_type: (result.contentType || 'reel') as 'reel' | 'story' | 'feed_carousel' | 'feed_single',
    target_audience: result.targetAudience || '',
    call_to_action: result.callToAction || '',
    scheduled_at: result.scheduledAt?.toISOString() || null,
    published_at: result.publishedAt?.toISOString() || null,
    created_at: result.createdAt.toISOString(),
    updated_at: result.updatedAt.toISOString(),
  };
}

export async function createInstagramMetadata(data: Partial<InstagramMetadata>): Promise<number> {
  const result = await prisma.instagramMetadata.create({
    data: {
      projectId: data.project_id!,
      caption: data.caption,
      hashtags: data.hashtags,
      hashtagsSuggested: data.hashtags_suggested,
      storyText: data.story_text,
      storyHashtags: data.story_hashtags,
      reelTitle: data.reel_title,
      reelDescription: data.reel_description,
      coverImagePrompt: data.cover_image_prompt,
      contentType: data.content_type,
      targetAudience: data.target_audience,
      callToAction: data.call_to_action,
      scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
      publishedAt: data.published_at ? new Date(data.published_at) : null,
    }
  });
  return result.id;
}

export async function updateInstagramMetadata(projectId: number, updates: Partial<InstagramMetadata>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_INSTAGRAM_COLS);
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.instagramMetadata.update({
    where: { projectId },
    data: {
      caption: updates.caption,
      hashtags: updates.hashtags,
      hashtagsSuggested: updates.hashtags_suggested,
      storyText: updates.story_text,
      storyHashtags: updates.story_hashtags,
      reelTitle: updates.reel_title,
      reelDescription: updates.reel_description,
      coverImagePrompt: updates.cover_image_prompt,
      contentType: updates.content_type,
      targetAudience: updates.target_audience,
      callToAction: updates.call_to_action,
      updatedAt: new Date(),
      scheduledAt: updates.scheduled_at ? new Date(updates.scheduled_at) : undefined,
      publishedAt: updates.published_at ? new Date(updates.published_at) : undefined,
    }
  });
}

export async function saveInstagramMetadata(projectId: number, data: Partial<InstagramMetadata>): Promise<void> {
  const existing = await getInstagramMetadata(projectId);
  if (existing) {
    await updateInstagramMetadata(projectId, data);
  } else {
    await createInstagramMetadata({ ...data, project_id: projectId });
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

export async function getLinkedInMetadata(projectId: number): Promise<LinkedInMetadata | null> {
  const result = await prisma.linkedinMetadata.findUnique({
    where: { projectId }
  });
  if (!result) return null;
  return {
    id: result.id,
    project_id: result.projectId,
    headline: result.headline || '',
    caption: result.caption || '',
    hashtags: result.hashtags || '',
    hashtags_suggested: result.hashtagsSuggested || '',
    target_audience: result.targetAudience || '',
    call_to_action: result.callToAction || '',
    content_format: (result.contentFormat || 'post') as 'video' | 'post' | 'carousel' | 'article',
    industry: result.industry || '',
    scheduled_at: result.scheduledAt?.toISOString() || null,
    published_at: result.publishedAt?.toISOString() || null,
    created_at: result.createdAt.toISOString(),
    updated_at: result.updatedAt.toISOString(),
  };
}

export async function createLinkedInMetadata(data: Partial<LinkedInMetadata>): Promise<number> {
  const result = await prisma.linkedinMetadata.create({
    data: {
      projectId: data.project_id!,
      headline: data.headline,
      caption: data.caption,
      hashtags: data.hashtags,
      hashtagsSuggested: data.hashtags_suggested,
      targetAudience: data.target_audience,
      callToAction: data.call_to_action,
      contentFormat: data.content_format,
      industry: data.industry,
      scheduledAt: data.scheduled_at ? new Date(data.scheduled_at) : null,
      publishedAt: data.published_at ? new Date(data.published_at) : null,
    }
  });
  return result.id;
}

export async function updateLinkedInMetadata(projectId: number, updates: Partial<LinkedInMetadata>): Promise<void> {
  const filtered = filterAllowedCols(updates, ALLOWED_LINKEDIN_COLS);
  if (Object.keys(filtered).length === 0) return;
  
  await prisma.linkedinMetadata.update({
    where: { projectId },
    data: {
      headline: updates.headline,
      caption: updates.caption,
      hashtags: updates.hashtags,
      hashtagsSuggested: updates.hashtags_suggested,
      targetAudience: updates.target_audience,
      callToAction: updates.call_to_action,
      contentFormat: updates.content_format,
      industry: updates.industry,
      updatedAt: new Date(),
      scheduledAt: updates.scheduled_at ? new Date(updates.scheduled_at) : undefined,
      publishedAt: updates.published_at ? new Date(updates.published_at) : undefined,
    }
  });
}

export async function saveLinkedInMetadata(projectId: number, data: Partial<LinkedInMetadata>): Promise<void> {
  const existing = await getLinkedInMetadata(projectId);
  if (existing) {
    await updateLinkedInMetadata(projectId, data);
  } else {
    await createLinkedInMetadata({ ...data, project_id: projectId });
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
