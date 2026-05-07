/**
 * Centralized API Error Handler
 * Provides consistent error handling across all API routes
 */

import { NextResponse } from "next/server";
import { apiLogger } from "./logger";
import { generateRequestId } from "./request-id";

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
  requestId?: string;
  userId?: string;
  projectId?: number;
  endpoint?: string;
  method?: string;
  duration?: number;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId: string;
  userId?: string;
  projectId?: number;
  endpoint?: string;
  method?: string;
  duration?: number;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.status = options.status || 500;
    this.code = options.code || "INTERNAL_ERROR";
    this.details = options.details;
    this.requestId = options.requestId || generateRequestId();
    this.userId = options.userId;
    this.projectId = options.projectId;
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.duration = options.duration;
  }
}

export function handleApiError(error: unknown, context: {
  endpoint: string;
  method: string;
  userId?: string;
  projectId?: number;
  startTime?: number;
}): NextResponse {
  const requestId = generateRequestId();
  const duration = context.startTime ? Date.now() - context.startTime : undefined;

  // Log the error
  apiLogger.logRequest({
    timestamp: new Date().toISOString(),
    endpoint: context.endpoint,
    method: context.method,
    duration,
    error: error instanceof Error ? error.message : String(error),
    requestId,
    userId: context.userId,
    projectId: context.projectId,
  });

  // Handle different error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: error.requestId,
        },
      },
      { status: error.status }
    );
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          error: {
            code: "TIMEOUT",
            message: "Request timed out. Please try again.",
            requestId,
          },
        },
        { status: 504 }
      );
    }

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          error: {
            code: "NETWORK_ERROR",
            message: "Network error occurred. Please check your connection.",
            requestId,
          },
        },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred",
          requestId,
        },
      },
      { status: 500 }
    );
  }

  // Unknown error type
  return NextResponse.json(
    {
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    },
    { status: 500 }
  );
}

export function createValidationErrorResponse(
  message: string,
  field?: string,
  context?: { endpoint: string; method: string; userId?: string; projectId?: number; startTime?: number }
): NextResponse {
  const requestId = generateRequestId();
  const duration = context?.startTime ? Date.now() - context.startTime : undefined;

  if (context) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      method: context.method,
      duration,
      error: `Validation error: ${message}`,
      requestId,
      userId: context.userId,
      projectId: context.projectId,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message,
        field,
        requestId,
      },
    },
    { status: 400 }
  );
}

export function createQuotaExceededResponse(
  reason: string,
  dailyRemaining: number,
  monthlyRemaining: number,
  context?: { endpoint: string; method: string; userId?: string; projectId?: number; startTime?: number }
): NextResponse {
  const requestId = generateRequestId();
  const duration = context?.startTime ? Date.now() - context.startTime : undefined;

  if (context) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      method: context.method,
      duration,
      error: `Quota exceeded: ${reason}`,
      requestId,
      userId: context.userId,
      projectId: context.projectId,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "QUOTA_EXCEEDED",
        message: reason,
        daily_remaining: dailyRemaining,
        monthly_remaining: monthlyRemaining,
        requestId,
      },
    },
    { status: 429 }
  );
}

export function createRateLimitResponse(
  retryAfter: number,
  context?: { endpoint: string; method: string; userId?: string; projectId?: number; startTime?: number }
): NextResponse {
  const requestId = generateRequestId();
  const duration = context?.startTime ? Date.now() - context.startTime : undefined;

  if (context) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      method: context.method,
      duration,
      error: "Rate limit exceeded",
      requestId,
      userId: context.userId,
      projectId: context.projectId,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retry_after: retryAfter,
        requestId,
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}

export function createConsentRequiredResponse(
  context?: { endpoint: string; method: string; userId?: string; projectId?: number; startTime?: number }
): NextResponse {
  const requestId = generateRequestId();
  const duration = context?.startTime ? Date.now() - context.startTime : undefined;

  if (context) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      method: context.method,
      duration,
      error: "AI data usage consent required",
      requestId,
      userId: context.userId,
      projectId: context.projectId,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "CONSENT_REQUIRED",
        message: "AI data usage consent required. Please accept the terms to continue.",
        requestId,
      },
    },
    { status: 403 }
  );
}

export function createConfigErrorResponse(
  message: string,
  context?: { endpoint: string; method: string; userId?: string; projectId?: number; startTime?: number }
): NextResponse {
  const requestId = generateRequestId();
  const duration = context?.startTime ? Date.now() - context.startTime : undefined;

  if (context) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      method: context.method,
      duration,
      error: `Config error: ${message}`,
      requestId,
      userId: context.userId,
      projectId: context.projectId,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "CONFIG_ERROR",
        message: "Server configuration error",
        requestId,
      },
    },
    { status: 500 }
  );
}

export function createContentBlockedResponse(
  reason: string,
  severity?: "low" | "medium" | "high",
  context?: { endpoint: string; method: string; userId?: string; projectId?: number; startTime?: number }
): NextResponse {
  const requestId = generateRequestId();
  const duration = context?.startTime ? Date.now() - context.startTime : undefined;

  if (context) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      method: context.method,
      duration,
      error: `Content blocked: ${reason}`,
      requestId,
      userId: context.userId,
      projectId: context.projectId,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "CONTENT_BLOCKED",
        message: `Content blocked: ${reason}`,
        severity,
        requestId,
      },
    },
    { status: 400 }
  );
}
