import { NextRequest, NextResponse } from "next/server";
import db from "@/data/db";
import { Competitor } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED_COMPETITOR_COLS = new Set([
  "name", "platform", "handle", "description", "niche", "followers",
  "avg_engagement", "avg_views", "posting_frequency", "content_themes", "is_active",
] as const);

type AllowedCol = typeof ALLOWED_COMPETITOR_COLS extends Set<infer T> ? T : never;

export async function GET() {
  try {
    const competitors = db.prepare(
      "SELECT * FROM competitors WHERE is_active = 1 ORDER BY followers DESC"
    ).all() as Competitor[];
    return NextResponse.json(competitors);
  } catch (err) {
    console.error("Competitors fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch competitors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_COMPETITOR_COLS.has(key as AllowedCol)) {
        filtered[key] = body[key];
      }
    }

    if (!filtered.name || !filtered.platform) {
      return NextResponse.json({ error: "Name and platform are required" }, { status: 400 });
    }

    if (filtered.platform && !["instagram", "linkedin", "youtube"].includes(filtered.platform as string)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO competitors (name, platform, handle, description, niche, followers, avg_engagement, avg_views, posting_frequency, content_themes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      filtered.name,
      filtered.platform,
      filtered.handle || null,
      filtered.description || null,
      filtered.niche || null,
      Number(filtered.followers) || 0,
      Number(filtered.avg_engagement) || 0,
      Number(filtered.avg_views) || 0,
      filtered.posting_frequency || null,
      filtered.content_themes || null,
      Number(filtered.is_active) ?? 1
    );

    return NextResponse.json({ id: result.lastInsertRowid, ...filtered }, { status: 201 });
  } catch (err) {
    console.error("Competitor create error:", err);
    return NextResponse.json({ error: "Failed to create competitor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Competitor ID is required" }, { status: 400 });
    }

    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_COMPETITOR_COLS.has(key as AllowedCol)) {
        filtered[key] = updates[key];
      }
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const sets = Object.keys(filtered).map((k) => `${k} = ?`).join(", ");
    const values = Object.values(filtered);

    db.prepare(`UPDATE competitors SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);

    return NextResponse.json({ id, ...filtered });
  } catch (err) {
    console.error("Competitor update error:", err);
    return NextResponse.json({ error: "Failed to update competitor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Competitor ID is required" }, { status: 400 });
    }

    db.prepare("UPDATE competitors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Competitor delete error:", err);
    return NextResponse.json({ error: "Failed to delete competitor" }, { status: 500 });
  }
}