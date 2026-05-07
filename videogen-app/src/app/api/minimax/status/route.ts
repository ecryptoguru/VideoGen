import { NextRequest, NextResponse } from "next/server";

const MINIMAX_TIMEOUT = 15000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");
    const taskType = searchParams.get("type") || "video";
    const apiKey = process.env.MINIMAX_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!taskId || typeof taskId !== "string" || taskId.length === 0) {
      return NextResponse.json({ error: "task_id is required" }, { status: 400 });
    }

    const endpoints: Record<string, string> = {
      video: "video_generation",
      tts: "t2a_async_query_v2",
      music: "music_generation",
    };
    const endpoint = endpoints[taskType] || "video_generation";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT);

    const response = await fetch(
      `https://api.minimax.io/v1/query/${endpoint}?task_id=${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("MiniMax status API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
