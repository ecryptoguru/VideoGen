import { NextRequest, NextResponse } from "next/server";
import { getGenerations, getGenerationsByModality, createGeneration, updateGeneration, deleteGeneration } from "@/lib/db-queries";

export async function GET(req: NextRequest) {
  try {
    const modality = req.nextUrl.searchParams.get("modality");
    const generations = modality ? getGenerationsByModality(modality) : getGenerations();
    return NextResponse.json(generations);
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
    if (!body.modality || typeof body.modality !== "string") {
      return NextResponse.json({ error: "modality is required" }, { status: 400 });
    }
    const id = createGeneration(body);
    return NextResponse.json({ id, success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    updateGeneration(id, updates);
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
    deleteGeneration(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
