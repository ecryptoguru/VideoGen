import { NextRequest, NextResponse } from "next/server";
import { getVoices, createVoice, updateVoice, deleteVoice, setDefaultVoice } from "@/lib/db-queries";
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
    const voices = await getVoices();
    return NextResponse.json(voices);
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/voices",
      method: "GET",
    });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    await logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      endpoint: "/api/voices",
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
      endpoint: "/api/voices",
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
    if (!body.voice_id || typeof body.voice_id !== "string") {
      return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
    }
    const id = await createVoice(body);
    return NextResponse.json({ id, success: true });
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/voices",
      method: "POST",
    });
  }
}

export async function PATCH(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    await logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      endpoint: "/api/voices",
      method: "PATCH",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return rateLimitResult;
  }

  const csrfResult = csrfProtection(req);
  if (csrfResult) {
    await logSecurityEvent({
      event_type: SecurityEventType.CSRF_VALIDATION_FAILED,
      endpoint: "/api/voices",
      method: "PATCH",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return csrfResult;
  }

  const sizeGuard = guardBodySize(req);
  if (sizeGuard) return sizeGuard;

  try {
    const { id, action, ...updates } = await req.json();
    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (action === "setDefault") {
      await setDefaultVoice(id);
    } else {
      await updateVoice(id, updates);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/voices",
      method: "PATCH",
    });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    await logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      endpoint: "/api/voices",
      method: "DELETE",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return rateLimitResult;
  }

  const csrfResult = csrfProtection(req);
  if (csrfResult) {
    await logSecurityEvent({
      event_type: SecurityEventType.CSRF_VALIDATION_FAILED,
      endpoint: "/api/voices",
      method: "DELETE",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return csrfResult;
  }

  try {
    const { id } = await req.json();
    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await deleteVoice(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/voices",
      method: "DELETE",
    });
  }
}
