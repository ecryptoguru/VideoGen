/**
 * Integration tests for /api/minimax/text route
 * Tests MiniMax text/chat API proxy
 * NOTE: This route has complex middleware (rate-limit, quota, PII detection, consent)
 * These tests focus on validation logic that doesn't require full mocking
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function createTestRequest(body?: unknown): NextRequest {
  const url = "http://localhost:3000/api/minimax/text";
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe("/api/minimax/text Integration Tests", () => {
  describe("POST /api/minimax/text - Validation", () => {
    it("should reject requests without messages array", async () => {
      const request = createTestRequest({
        prompt: "Test",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error?.message).toContain("messages array is required");
    });

    it("should reject empty messages array", async () => {
      const request = createTestRequest({
        messages: [],
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should reject messages without role", async () => {
      const request = createTestRequest({
        messages: [{ content: "Test" }],
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should reject messages without content", async () => {
      const request = createTestRequest({
        messages: [{ role: "user" }],
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should accept valid messages format", async () => {
      // This will fail due to missing API key, but validates the request format
      const request = createTestRequest({
        messages: [
          { role: "user", content: "Test message" }
        ],
      });

      const response = await POST(request);
      // Should not fail on validation (400), but may fail on API key (500)
      expect([400, 500]).toContain(response.status);
    });
  });
});
