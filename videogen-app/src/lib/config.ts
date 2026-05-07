/**
 * Centralized configuration constants
 * Single source of truth for limits, timeouts, and magic numbers
 */

// Timeouts
export const MINIMAX_TIMEOUT_MS = 120000; // Increased to 120s for text generation
export const MINIMAX_RETRY_MAX_ATTEMPTS = 3;

// Prompt / input limits
export const MAX_PROMPT_LENGTH = 2000;
export const MAX_CONTENT_LENGTH = 10000;
export const MAX_SANITIZED_LENGTH = 50000;

// Rate limits (generous)
export const RATE_LIMIT_API_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_API_MAX = 300; // generous for dev
export const RATE_LIMIT_STRICT_MAX = 50;
export const RATE_LIMIT_MINIMAX_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MINIMAX_MAX = 30;

// File upload
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/mp3",
  "video/mp4",
  "video/webm",
  "text/plain",
];

// Cost tracking
export const MINIMAX_VIDEO_COST_CENTS = 50;

// Content filter
export const REPETITION_THRESHOLD = 20; // max repeated char count

// CSRF
export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_TOKEN_LENGTH = 32;
export const CSRF_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours
