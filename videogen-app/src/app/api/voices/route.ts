import { NextRequest, NextResponse } from "next/server";
import { getVoices, createVoice, updateVoice, deleteVoice, setDefaultVoice } from "@/lib/db-queries";

export async function GET() {
  try {
    const voices = getVoices();
    return NextResponse.json(voices);
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
    if (!body.voice_id || typeof body.voice_id !== "string") {
      return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
    }
    const id = createVoice(body);
    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, action, ...updates } = await req.json();
    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (action === "setDefault") {
      setDefaultVoice(id);
    } else {
      updateVoice(id, updates);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    deleteVoice(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
