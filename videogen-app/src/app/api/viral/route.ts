import { NextRequest, NextResponse } from "next/server";
import db from "@/data/db";
import { ViralVideo, TrendPlatform } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED_VIRAL_COLS = new Set([
  "platform", "video_title", "video_url", "thumbnail_url",
  "creator_name", "creator_handle", "views", "likes",
  "comments", "shares", "engagement_rate", "posted_at", "notes",
] as const);

type AllowedViralCol = typeof ALLOWED_VIRAL_COLS extends Set<infer T> ? T : never;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") as TrendPlatform | null;
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 20, 50));

    let query = "SELECT * FROM viral_videos WHERE 1=1";
    const params: string[] = [];

    if (platform) {
      query += " AND platform = ?";
      params.push(platform);
    }

    query += " ORDER BY engagement_rate DESC, views DESC LIMIT ?";
    params.push(String(limit));

    const rows = db.prepare(query).all(...params) as ViralVideo[];
    return NextResponse.json(rows);
  } catch (err) {
    console.error("Viral videos fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch viral videos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_VIRAL_COLS.has(key as AllowedViralCol)) {
        filtered[key] = body[key];
      }
    }

    if (!filtered.platform || !filtered.video_title) {
      return NextResponse.json({ error: "Platform and video title are required" }, { status: 400 });
    }

    if (!["instagram", "linkedin", "youtube"].includes(filtered.platform as string)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const engagement_rate = Number(filtered.engagement_rate) ||
      (Number(filtered.views) > 0
        ? ((Number(filtered.likes) + Number(filtered.comments) + Number(filtered.shares)) / Number(filtered.views)) * 100
        : 0);

    const result = db.prepare(`
      INSERT INTO viral_videos (platform, video_title, video_url, thumbnail_url, creator_name, creator_handle, views, likes, comments, shares, engagement_rate, posted_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      filtered.platform,
      filtered.video_title,
      filtered.video_url || null,
      filtered.thumbnail_url || null,
      filtered.creator_name || null,
      filtered.creator_handle || null,
      Number(filtered.views) || 0,
      Number(filtered.likes) || 0,
      Number(filtered.comments) || 0,
      Number(filtered.shares) || 0,
      engagement_rate,
      filtered.posted_at || null,
      filtered.notes || null
    );

    return NextResponse.json({ id: result.lastInsertRowid, ...filtered, engagement_rate }, { status: 201 });
  } catch (err) {
    console.error("Viral video create error:", err);
    return NextResponse.json({ error: "Failed to add viral video" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    db.prepare("DELETE FROM viral_videos WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Viral video delete error:", err);
    return NextResponse.json({ error: "Failed to delete viral video" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, used_in_project_id } = body;

    if (!id) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    db.prepare("UPDATE viral_videos SET used_in_project_id = ? WHERE id = ?").run(used_in_project_id || null, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Viral video update error:", err);
    return NextResponse.json({ error: "Failed to update viral video" }, { status: 500 });
  }
}