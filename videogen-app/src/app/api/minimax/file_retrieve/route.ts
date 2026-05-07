import { NextRequest, NextResponse } from "next/server";

import { MINIMAX_TIMEOUT_MS } from "@/lib/config";
const MINIMAX_TIMEOUT = MINIMAX_TIMEOUT_MS;

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("file_id");
    if (!fileId) {
      return NextResponse.json({ error: "file_id is required" }, { status: 400 });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT);

    const response = await fetch(`https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("MiniMax file retrieve API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
