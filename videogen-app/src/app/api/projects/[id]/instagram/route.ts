import { NextRequest, NextResponse } from "next/server";
import { getInstagramMetadata, saveInstagramMetadata } from "@/lib/db-queries";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const meta = getInstagramMetadata(projectId);
    if (!meta) return NextResponse.json({ project_id: projectId });
    return NextResponse.json(meta);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    if (isNaN(projectId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const body = await req.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    saveInstagramMetadata(projectId, body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
