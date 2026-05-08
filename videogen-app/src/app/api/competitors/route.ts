import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Competitor } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED_COMPETITOR_COLS = new Set([
  "name", "platform", "handle", "description", "niche", "followers",
  "avg_engagement", "avg_views", "posting_frequency", "content_themes", "is_active",
] as const);

type AllowedCol = typeof ALLOWED_COMPETITOR_COLS extends Set<infer T> ? T : never;

type CompetitorModel = {
  id: number;
  name: string;
  platform: string;
  handle: string | null;
  description: string | null;
  niche: string | null;
  followers: number;
  avgEngagement: number | null;
  avgViews: number | null;
  postingFrequency: string | null;
  contentThemes: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET() {
  try {
    const competitors = await prisma.competitor.findMany({
      where: { isActive: 1 },
      orderBy: { followers: 'desc' }
    });
    
    // Convert camelCase to snake_case for API response
    const formattedCompetitors = competitors.map((c: CompetitorModel) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      handle: c.handle,
      description: c.description,
      niche: c.niche,
      followers: c.followers,
      avg_engagement: c.avgEngagement,
      avg_views: c.avgViews,
      posting_frequency: c.postingFrequency,
      content_themes: c.contentThemes,
      is_active: Boolean(c.isActive),
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })) as Competitor[];
    
    return NextResponse.json(formattedCompetitors);
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

    const competitor = await prisma.competitor.create({
      data: {
        name: filtered.name as string,
        platform: filtered.platform as string,
        handle: filtered.handle as string | null,
        description: filtered.description as string | null,
        niche: filtered.niche as string | null,
        followers: Number(filtered.followers) || 0,
        avgEngagement: Number(filtered.avg_engagement) || 0,
        avgViews: Number(filtered.avg_views) || 0,
        postingFrequency: filtered.posting_frequency as string | null,
        contentThemes: filtered.content_themes as string | null,
        isActive: Number(filtered.is_active) ?? 1,
      }
    });

    return NextResponse.json({ id: competitor.id, ...filtered }, { status: 201 });
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

    await prisma.competitor.update({
      where: { id: Number(id) },
      data: {
        ...filtered,
        updatedAt: new Date(),
      }
    });

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

    await prisma.competitor.update({
      where: { id: Number(id) },
      data: { isActive: 0, updatedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Competitor delete error:", err);
    return NextResponse.json({ error: "Failed to delete competitor" }, { status: 500 });
  }
}