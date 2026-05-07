import { NextRequest, NextResponse } from "next/server";
import {
  RATE_LIMIT_API_WINDOW_MS,
  RATE_LIMIT_API_MAX,
  RATE_LIMIT_STRICT_MAX,
  RATE_LIMIT_MINIMAX_WINDOW_MS,
  RATE_LIMIT_MINIMAX_MAX,
} from "./config";

/**
 * Simple in-memory rate limiter for development.
 * NOTE: For production with serverless/multi-instance deploys,
 * replace with Redis/Upstash KV so limits are shared across instances.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number;
  max: number;
  identifier?: (req: NextRequest) => string;
}

export interface RateLimitStatus {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, identifier } = options;

  return async function rateLimit(req: NextRequest): Promise<NextResponse | null> {
    const id = identifier ? identifier(req) : getClientIP(req);
    const now = Date.now();

    const entry = rateLimitMap.get(id);

    if (!entry || now > entry.resetTime) {
      rateLimitMap.set(id, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(entry.resetTime).toISOString(),
            "Retry-After": String(retryAfterSeconds),
          },
        }
      );
    }

    entry.count++;
    rateLimitMap.set(id, entry);
    return null;
  };
}

export function getRateLimitStatus(req: NextRequest, options: RateLimitOptions): RateLimitStatus {
  const { windowMs, max, identifier } = options;
  const id = identifier ? identifier(req) : getClientIP(req);
  const now = Date.now();
  const entry = rateLimitMap.get(id);

  if (!entry || now > entry.resetTime) {
    return { allowed: true, limit: max, remaining: max - 1, resetTime: now + windowMs };
  }

  if (entry.count >= max) {
    return {
      allowed: false,
      limit: max,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  return {
    allowed: true,
    limit: max,
    remaining: max - entry.count,
    resetTime: entry.resetTime,
  };
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  const cfConnectingIP = req.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) return realIP;
  if (cfConnectingIP) return cfConnectingIP;
  return "unknown";
}

// Clean up expired entries every minute to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(id);
    }
  }
}, 60000);

// Pre-configured limiters (generous for dev, tighten for production)
export const apiLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_API_WINDOW_MS,
  max: RATE_LIMIT_API_MAX,
});

export const strictLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_API_WINDOW_MS,
  max: RATE_LIMIT_STRICT_MAX,
});

export const miniMaxLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_MINIMAX_WINDOW_MS,
  max: RATE_LIMIT_MINIMAX_MAX,
});
