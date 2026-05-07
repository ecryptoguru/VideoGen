import { NextRequest, NextResponse } from "next/server";
import { MAX_FILE_SIZE_BYTES, ALLOWED_UPLOAD_MIME_TYPES, MINIMAX_TIMEOUT_MS } from "@/lib/config";

function createTimeoutController(ms: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId, cleanup: () => clearTimeout(timeoutId) };
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Max size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" not allowed. Allowed: ${ALLOWED_UPLOAD_MIME_TYPES.join(", ")}.`,
    };
  }
  return { valid: true };
}

export async function POST(req: NextRequest) {
  const { controller, cleanup } = createTimeoutController(MINIMAX_TIMEOUT_MS);

  try {
    const contentType = req.headers.get("content-type") || "";
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { text, purpose } = body;

      if (!text || typeof text !== "string") {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
      }
      if (!purpose) {
        return NextResponse.json({ error: "purpose is required" }, { status: 400 });
      }

      const blob = new Blob([text], { type: "text/plain" });
      const fileName = `script_${Date.now()}.txt`;

      const minimaxForm = new FormData();
      minimaxForm.append("file", blob, fileName);
      minimaxForm.append("purpose", purpose);

      const response = await fetch("https://api.minimax.io/v1/files/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: minimaxForm,
        signal: controller.signal,
      });
      cleanup();

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const purpose = formData.get("purpose") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!purpose) {
      return NextResponse.json({ error: "purpose is required" }, { status: 400 });
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 413 });
    }

    const minimaxForm = new FormData();
    minimaxForm.append("file", file);
    minimaxForm.append("purpose", purpose);

    const response = await fetch("https://api.minimax.io/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: minimaxForm,
      signal: controller.signal,
    });
    cleanup();

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    cleanup();
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("MiniMax file upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
