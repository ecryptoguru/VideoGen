import { NextRequest, NextResponse } from "next/server";
import { getYouTubeMetadata, saveYouTubeMetadata } from "@/lib/db-queries";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const projectIdNum = parseInt(id);
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ error: "invalid projectId" }, { status: 400 });
    }
    const meta = getYouTubeMetadata(projectIdNum);
    return NextResponse.json(meta || {});
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!body.project_id || typeof body.project_id !== "number") {
      return NextResponse.json({ error: "project_id is required" }, { status: 400 });
    }
    saveYouTubeMetadata(body.project_id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
