import { NextRequest, NextResponse } from "next/server";
import { SEOSuggestion } from "@/types";

function scoreTitle(title: string): number {
  let score = 50;
  if (title.length >= 50 && title.length <= 60) score += 25;
  else if (title.length > 30 && title.length < 70) score += 15;
  if (/\d+/.test(title)) score += 10;
  if (/how|what|why|when|where/i.test(title)) score += 10;
  if (/!|\?|...|\.\.\./.test(title)) score += 5;
  const weak = ["amazing", "incredible", "best ever", "you won't believe"];
  if (weak.some(w => title.toLowerCase().includes(w))) score -= 10;
  return Math.min(100, Math.max(0, score));
}

function scoreDescription(desc: string): number {
  let score = 40;
  if (desc.length >= 1500) score += 20;
  else if (desc.length >= 500) score += 10;
  if (/http|https/.test(desc)) score += 5;
  if (/#\w+/g.test(desc)) score += 10;
  if (/^\d{1,2}:\d{2}/m.test(desc)) score += 10;
  if (/\bwatch\b|\bsubscribe\b|\blike\b/i.test(desc)) score += 5;
  return Math.min(100, Math.max(0, score));
}

function scoreTags(tags: string[]): number {
  if (tags.length === 0) return 0;
  if (tags.length >= 3 && tags.length <= 8) return 60;
  if (tags.length > 8) return 40;
  return 20;
}

function scoreThumbnail(text: string): number {
  let score = 50;
  if (text.length === 0) return 25;
  if (text.length <= 5) score += 25;
  else if (text.length <= 15) score += 15;
  if (/[A-Z]/.test(text)) score += 10;
  if (/[!★🔑]/.test(text)) score += 10;
  return Math.min(100, Math.max(0, score));
}

function scoreChapters(chapters: { title: string; start_time: number }[]): number {
  if (chapters.length === 0) return 0;
  if (chapters.length >= 3) return 60;
  if (chapters.length >= 1) return 40;
  return 20;
}

function buildSuggestions(
  title: string,
  desc: string,
  tags: string[],
  thumbnail: string,
  chapters: { title: string; start_time: number }[]
): SEOSuggestion[] {
  const suggestions: SEOSuggestion[] = [];

  if (title.length < 30) {
    suggestions.push({ type: "title", severity: "high", message: "Title is too short", suggestion: "Aim for 50-60 characters to maximize search visibility" });
  } else if (title.length > 70) {
    suggestions.push({ type: "title", severity: "medium", message: "Title may be truncated", suggestion: "Keep under 60 characters for full display in search results" });
  }

  if (desc.length < 500) {
    suggestions.push({ type: "description", severity: "high", message: "Description too short", suggestion: "Write at least 500 characters — first 150 appear in search snippets" });
  }
  if (desc.length > 0 && !/#\w+/g.test(desc)) {
    suggestions.push({ type: "description", severity: "low", message: "No hashtags found", suggestion: "Add 3-5 relevant hashtags to boost discovery" });
  }
  if (desc.length > 0 && !/^\d{1,2}:\d{2}/m.test(desc)) {
    suggestions.push({ type: "description", severity: "medium", message: "No timestamps in description", suggestion: "Add timestamps to improve watch time and SEO" });
  }

  if (tags.length === 0) {
    suggestions.push({ type: "tag", severity: "high", message: "No tags added", suggestion: "Add 3-8 relevant tags mixing broad and niche terms" });
  } else if (tags.length > 15) {
    suggestions.push({ type: "tag", severity: "low", message: "Too many tags", suggestion: "YouTube ignores tags beyond ~15 — keep it focused" });
  }

  if (thumbnail.length === 0) {
    suggestions.push({ type: "thumbnail", severity: "high", message: "No thumbnail text set", suggestion: "Add a short, punchy headline — readable on mobile at 3 inches" });
  } else if (thumbnail.length > 20) {
    suggestions.push({ type: "thumbnail", severity: "medium", message: "Thumbnail text too long", suggestion: "Keep thumbnail text under 5 words for readability" });
  }

  if (chapters.length === 0) {
    suggestions.push({ type: "chapter", severity: "medium", message: "No chapters defined", suggestion: "Add at least 3 chapters to enable YouTube chapter jumps" });
  }

  return suggestions;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title = "", description = "", tags = [], thumbnail_text = "", chapters = [] } = body;

    const tagsArr = Array.isArray(tags) ? tags : (typeof tags === "string" ? JSON.parse(tags as string) : []);
    const chaptersArr = Array.isArray(chapters) ? chapters : (typeof chapters === "string" ? JSON.parse(chapters as string) : []);
    const parsedChapters = chaptersArr.map((c: unknown) => {
      if (typeof c === "object" && c !== null) return c as { title: string; start_time: number };
      if (typeof c === "string") return { title: c, start_time: 0 };
      return { title: String(c), start_time: 0 };
    });

    const title_score = scoreTitle(title);
    const description_score = scoreDescription(description);
    const tag_score = scoreTags(tagsArr);
    const thumbnail_score = scoreThumbnail(thumbnail_text);
    const chapter_score = scoreChapters(parsedChapters);

    const overall = Math.round(
      title_score * 0.3 + description_score * 0.25 + tag_score * 0.15 + thumbnail_score * 0.15 + chapter_score * 0.15
    );

    const suggestions = buildSuggestions(title, description, tagsArr, thumbnail_text, parsedChapters);

    return NextResponse.json({
      overall,
      title_score,
      description_score,
      tag_score,
      thumbnail_score,
      chapter_score,
      suggestions,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
