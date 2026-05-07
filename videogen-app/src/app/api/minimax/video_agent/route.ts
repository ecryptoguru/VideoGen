import { NextRequest, NextResponse } from "next/server";

import { MINIMAX_TIMEOUT_MS } from "@/lib/config";
const MINIMAX_TIMEOUT = MINIMAX_TIMEOUT_MS;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!body.template_id || typeof body.template_id !== "string") {
      return NextResponse.json({ error: "template_id is required" }, { status: 400 });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT);

    const response = await fetch("https://api.minimax.io/v1/video_agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("MiniMax video agent API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
