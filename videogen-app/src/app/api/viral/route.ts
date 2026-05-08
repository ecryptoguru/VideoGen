import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const where: { platform?: string } = {};
    if (platform) {
      where.platform = platform;
    }

    const rows = await prisma.viralVideo.findMany({
      where,
      orderBy: [
        { engagementRate: 'desc' },
        { views: 'desc' }
      ],
      take: limit
    });
    
    // Convert camelCase to snake_case for API response
    const formattedRows = rows.map(r => ({
      id: r.id,
      platform: r.platform,
      video_title: r.videoTitle,
      video_url: r.videoUrl,
      thumbnail_url: r.thumbnailUrl,
      creator_name: r.creatorName,
      creator_handle: r.creatorHandle,
      views: r.views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      engagement_rate: r.engagementRate,
      posted_at: r.postedAt?.toISOString(),
      fetched_at: r.fetchedAt.toISOString(),
      notes: r.notes,
      used_in_project_id: r.usedInProjectId,
    })) as ViralVideo[];
    
    return NextResponse.json(formattedRows);
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

    const video = await prisma.viralVideo.create({
      data: {
        platform: filtered.platform as string,
        videoTitle: filtered.video_title as string,
        videoUrl: filtered.video_url as string | null,
        thumbnailUrl: filtered.thumbnail_url as string | null,
        creatorName: filtered.creator_name as string | null,
        creatorHandle: filtered.creator_handle as string | null,
        views: Number(filtered.views) || 0,
        likes: Number(filtered.likes) || 0,
        comments: Number(filtered.comments) || 0,
        shares: Number(filtered.shares) || 0,
        engagementRate: engagement_rate,
        postedAt: filtered.posted_at ? new Date(filtered.posted_at as string) : null,
        notes: filtered.notes as string | null,
      }
    });

    return NextResponse.json({ id: video.id, ...filtered, engagement_rate }, { status: 201 });
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

    await prisma.viralVideo.delete({
      where: { id: Number(id) }
    });
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

    await prisma.viralVideo.update({
      where: { id: Number(id) },
      data: { usedInProjectId: used_in_project_id ? Number(used_in_project_id) : null }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Viral video update error:", err);
    return NextResponse.json({ error: "Failed to update viral video" }, { status: 500 });
  }
}