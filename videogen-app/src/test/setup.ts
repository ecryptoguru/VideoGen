import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";
import { resetTestDb, getTestDb } from "./test-db";

beforeEach(() => {
  resetTestDb();
});

// Mock rate limiter to always allow in tests
vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limit")>("@/lib/rate-limit");
  return {
    ...actual,
    apiLimiter: vi.fn(async () => null),
    strictLimiter: vi.fn(async () => null),
    miniMaxLimiter: vi.fn(async () => null),
  };
});

// Mock CSRF to always pass in tests
vi.mock("@/lib/csrf", async () => {
  return {
    generateCSRFToken: vi.fn(() => "test-csrf-token"),
    validateCSRFToken: vi.fn(() => true),
    setCSRFToken: vi.fn(),
    csrfProtection: vi.fn(() => null),
  };
});

// Mock audit log to avoid side effects
vi.mock("@/lib/audit-log", async () => {
  return {
    logSecurityEvent: vi.fn(),
    SecurityEventType: {
      RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
      CSRF_VALIDATION_FAILED: "csrf_validation_failed",
      PROJECT_CREATED: "project_created",
      PROJECT_UPDATED: "project_updated",
      PROJECT_DELETED: "project_deleted",
    },
  };
});

// Mock logger to avoid closed-DB issues during test resets
vi.mock("@/lib/logger", async () => {
  return {
    apiLogger: {
      logRequest: vi.fn(),
      getLogs: vi.fn(() => []),
      getErrorLogs: vi.fn(() => []),
      getSlowRequests: vi.fn(() => []),
      clearLogs: vi.fn(),
      clearOldLogs: vi.fn(),
      getStats: vi.fn(() => ({
        total: 0, errors: 0, errorRate: 0, avgDuration: 0,
        p50Duration: 0, p95Duration: 0, p99Duration: 0,
        totalCost: 0, totalCacheReads: 0, cacheHitRate: 0,
      })),
    },
    logApiRequest: vi.fn((_ep, _m, handler) => handler()),
  };
});

// Mock DB to use in-memory test database via Proxy so resets work
vi.mock("@/data/db", async () => {
  return {
    __esModule: true,
    default: new Proxy({} as import("better-sqlite3").Database, {
      get(_target, prop) {
        const db = getTestDb();
        const value = (db as unknown as Record<string, unknown>)[prop as string];
        if (typeof value === "function") {
          return value.bind(db);
        }
        return value;
      },
    }),
    initDb: vi.fn(),
  };
});
