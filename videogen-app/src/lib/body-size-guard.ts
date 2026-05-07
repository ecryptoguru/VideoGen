import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MAX_BODY_SIZE = 1024 * 1024; // 1 MB

/**
 * Guards against oversized request bodies.
 * App Router doesn't support export const config bodyParser sizeLimit,
 * so we check the Content-Length header before parsing JSON.
 */
export function guardBodySize(
  req: NextRequest,
  maxBytes = DEFAULT_MAX_BODY_SIZE
): NextResponse | null {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > maxBytes) {
      return NextResponse.json(
        { error: `Request body too large. Max allowed is ${maxBytes} bytes.` },
        { status: 413 }
      );
    }
  }
  return null;
}
