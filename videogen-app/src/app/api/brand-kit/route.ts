import { NextRequest, NextResponse } from "next/server";
import { getBrandKit, updateBrandKit } from "@/lib/db-queries";
import { ALLOWED_BRAND_KIT_COLS } from "@/lib/db-queries";
import { apiLimiter } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api-error-handler";
import { csrfProtection } from "@/lib/csrf";
import { logSecurityEvent, SecurityEventType } from "@/lib/audit-log";
import { guardBodySize } from "@/lib/body-size-guard";

export async function GET(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const brandKit = await getBrandKit();
    return NextResponse.json(brandKit || {});
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/brand-kit",
      method: "GET",
    });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    await logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      endpoint: "/api/brand-kit",
      method: "POST",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return rateLimitResult;
  }

  const csrfResult = csrfProtection(req);
  if (csrfResult) {
    await logSecurityEvent({
      event_type: SecurityEventType.CSRF_VALIDATION_FAILED,
      endpoint: "/api/brand-kit",
      method: "POST",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return csrfResult;
  }

  const sizeGuard = guardBodySize(req);
  if (sizeGuard) return sizeGuard;

  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if ((ALLOWED_BRAND_KIT_COLS as unknown as Set<string>).has(key)) {
        filtered[key] = body[key];
      }
    }
    await updateBrandKit(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/brand-kit",
      method: "POST",
    });
  }
}
