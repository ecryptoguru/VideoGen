import { NextRequest, NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "crypto";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_TOKEN_LENGTH,
  CSRF_MAX_AGE_SECONDS,
} from "./config";

/**
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Validate a CSRF token against the cookie using timing-safe comparison
 */
export function validateCSRFToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  try {
    const a = Buffer.from(cookieToken, "utf8");
    const b = Buffer.from(headerToken, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Set CSRF token in response cookies
 */
export function setCSRFToken(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CSRF_MAX_AGE_SECONDS,
  });
}

/**
 * Middleware to check CSRF protection
 * Should be applied to state-changing endpoints (POST, PATCH, DELETE, PUT)
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  const method = request.method;

  // Only check CSRF for state-changing methods
  if (!["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
    return null;
  }

  // Skip CSRF check for API routes that are public or have other auth
  const skipCSRF = [
    "/api/minimax",
    "/api/brand-kit",
  ].some((path) => request.nextUrl.pathname.startsWith(path));

  if (skipCSRF) {
    return null;
  }

  if (!validateCSRFToken(request)) {
    return new NextResponse(
      JSON.stringify({ error: "CSRF token validation failed" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}
