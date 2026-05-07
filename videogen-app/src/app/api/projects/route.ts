import { NextRequest, NextResponse } from "next/server";
import { getProjects, createProject, updateProject, deleteProject } from "@/lib/db-queries";
import { apiLimiter } from "@/lib/rate-limit";
import { handleApiError, createValidationErrorResponse } from "@/lib/api-error-handler";
import { csrfProtection } from "@/lib/csrf";
import { logSecurityEvent, SecurityEventType } from "@/lib/audit-log";
import { guardBodySize } from "@/lib/body-size-guard";
import {
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
} from "@/lib/validation-schemas";

export async function GET(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const projects = getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/projects",
      method: "GET",
    });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      endpoint: "/api/projects",
      method: "POST",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return rateLimitResult;
  }

  const csrfResult = csrfProtection(req);
  if (csrfResult) {
    logSecurityEvent({
      event_type: SecurityEventType.CSRF_VALIDATION_FAILED,
      endpoint: "/api/projects",
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
    const validation = createProjectSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createValidationErrorResponse(
        firstError.message,
        firstError.path.join("."),
        { endpoint: "/api/projects", method: "POST" }
      );
    }
    
    const data = {
      ...validation.data,
      topic: validation.data.topic ?? null,
      script: validation.data.script ?? null,
      music_prompt: validation.data.music_prompt ?? null,
      hook_variant: validation.data.hook_variant ?? null,
      thumbnail_urls: validation.data.thumbnail_urls ?? null,
      scheduled_at: validation.data.scheduled_at ?? null,
    };
    
    const id = createProject(data);
    
    logSecurityEvent({
      event_type: SecurityEventType.PROJECT_CREATED,
      endpoint: "/api/projects",
      method: "POST",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
      details: `Project ID: ${id}`,
    });
    
    return NextResponse.json({ id, success: true });
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/projects",
      method: "POST",
    });
  }
}

export async function PATCH(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      endpoint: "/api/projects",
      method: "PATCH",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return rateLimitResult;
  }

  const csrfResult = csrfProtection(req);
  if (csrfResult) {
    logSecurityEvent({
      event_type: SecurityEventType.CSRF_VALIDATION_FAILED,
      endpoint: "/api/projects",
      method: "PATCH",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return csrfResult;
  }

  const sizeGuard = guardBodySize(req);
  if (sizeGuard) return sizeGuard;

  try {
    const body = await req.json();
    const validation = updateProjectSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createValidationErrorResponse(
        firstError.message,
        firstError.path.join("."),
        { endpoint: "/api/projects", method: "PATCH" }
      );
    }
    
    const { id, ...updates } = validation.data;
    updateProject(id, updates);
    
    logSecurityEvent({
      event_type: SecurityEventType.PROJECT_UPDATED,
      endpoint: "/api/projects",
      method: "PATCH",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
      details: `Project ID: ${id}`,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/projects",
      method: "PATCH",
    });
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      endpoint: "/api/projects",
      method: "DELETE",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return rateLimitResult;
  }

  const csrfResult = csrfProtection(req);
  if (csrfResult) {
    logSecurityEvent({
      event_type: SecurityEventType.CSRF_VALIDATION_FAILED,
      endpoint: "/api/projects",
      method: "DELETE",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
    });
    return csrfResult;
  }

  const sizeGuard = guardBodySize(req);
  if (sizeGuard) return sizeGuard;

  try {
    const body = await req.json();
    const validation = deleteProjectSchema.safeParse(body);
    
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createValidationErrorResponse(
        firstError.message,
        firstError.path.join("."),
        { endpoint: "/api/projects", method: "DELETE" }
      );
    }
    
    deleteProject(validation.data.id);
    
    logSecurityEvent({
      event_type: SecurityEventType.PROJECT_DELETED,
      endpoint: "/api/projects",
      method: "DELETE",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
      user_agent: req.headers.get("user-agent") || undefined,
      details: `Project ID: ${validation.data.id}`,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, {
      endpoint: "/api/projects",
      method: "DELETE",
    });
  }
}
