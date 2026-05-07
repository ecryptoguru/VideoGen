/**
 * Integration tests for /api/projects route
 * Tests both valid and invalid inputs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "./route";
import { resetTestDb } from "@/test/test-db";

function createTestRequest(method: string, body?: unknown): NextRequest {
  const url = "http://localhost:3000/api/projects";
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe("/api/projects Integration Tests", () => {
  beforeEach(() => {
    resetTestDb();
  });

  describe("GET /api/projects", () => {
    it("should return list of projects", async () => {
      const request = createTestRequest("GET");
      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("POST /api/projects - Validation", () => {
    it("should create project with valid data", async () => {
      const request = createTestRequest("POST", {
        name: "Test Project",
        platform: "instagram_reels",
        topic: "Test topic",
        status: "draft",
        video_mode: "i2v",
        video_model: "MiniMax-Hailuo-2.3",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(typeof data.id).toBe("number");
    });

    it("should reject invalid platform", async () => {
      const request = createTestRequest("POST", {
        name: "Test Project",
        platform: "invalid_platform",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should reject missing required fields", async () => {
      const request = createTestRequest("POST", {
        name: "Test Project",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should accept valid instagram_reels platform", async () => {
      const request = createTestRequest("POST", {
        name: "Instagram Test",
        platform: "instagram_reels",
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should accept valid linkedin platform", async () => {
      const request = createTestRequest("POST", {
        name: "LinkedIn Test",
        platform: "linkedin",
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should accept valid youtube_shorts platform", async () => {
      const request = createTestRequest("POST", {
        name: "YouTube Shorts Test",
        platform: "youtube_shorts",
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should accept valid youtube_long platform", async () => {
      const request = createTestRequest("POST", {
        name: "YouTube Long Test",
        platform: "youtube_long",
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("PATCH /api/projects", () => {
    it("should update existing project", async () => {
      const createReq = createTestRequest("POST", {
        name: "Original",
        platform: "instagram_reels",
      });
      const createRes = await POST(createReq);
      expect(createRes.status).toBe(200);
      const { id } = await createRes.json();

      const request = createTestRequest("PATCH", {
        id,
        name: "Updated Project Name",
      });

      const response = await PATCH(request);
      expect(response.status).toBe(200);
    });

    it("should reject invalid project ID", async () => {
      const request = createTestRequest("PATCH", {
        id: -1,
        name: "Updated Project Name",
      });

      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/projects", () => {
    it("should delete project", async () => {
      const createReq = createTestRequest("POST", {
        name: "To Delete",
        platform: "instagram_reels",
      });
      const createRes = await POST(createReq);
      expect(createRes.status).toBe(200);
      const { id } = await createRes.json();

      const request = createTestRequest("DELETE", { id });
      const response = await DELETE(request);
      expect(response.status).toBe(200);
    });

    it("should reject invalid project ID", async () => {
      const request = createTestRequest("DELETE", {
        id: 0,
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });
  });
});

describe("/api/projects Security & Validation Tests", () => {
  beforeEach(() => {
    resetTestDb();
  });

  it("should prevent SQL injection via name field", async () => {
    const maliciousName = "'; DROP TABLE projects; --";
    const request = createTestRequest("POST", {
      name: maliciousName,
      platform: "instagram_reels",
    });
    const response = await POST(request);
    // Parameterized queries prevent injection, so creation should succeed
    expect(response.status).toBe(200);

    const { id } = await response.json();
    const getReq = createTestRequest("GET");
    const getRes = await GET(getReq);
    const projects = await getRes.json();
    const found = projects.find((p: { id: number }) => p.id === id);
    expect(found?.name).toBe(maliciousName);
  });

  it("should enforce name length limit", async () => {
    const longName = "x".repeat(201);
    const request = createTestRequest("POST", {
      name: longName,
      platform: "instagram_reels",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should validate platform enum strictly", async () => {
    const invalidPlatforms = ["facebook", "tiktok", "twitter", "youtube", ""];
    for (const platform of invalidPlatforms) {
      const request = createTestRequest("POST", {
        name: "Test",
        platform,
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    }
  });

  it("should accept all valid platform values", async () => {
    const validPlatforms = ["instagram_reels", "linkedin", "youtube_shorts", "youtube_long"];
    for (const platform of validPlatforms) {
      const request = createTestRequest("POST", {
        name: `Test ${platform}`,
        platform,
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }
  });

  it("should reject topic exceeding 500 characters", async () => {
    const request = createTestRequest("POST", {
      name: "Test",
      platform: "instagram_reels",
      topic: "x".repeat(501),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should reject status enum strictly", async () => {
    const request = createTestRequest("POST", {
      name: "Test",
      platform: "instagram_reels",
      status: "invalid_status",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should accept all valid status values", async () => {
    const validStatuses = ["draft", "generating", "processing", "ready", "published", "failed"];
    for (const status of validStatuses) {
      const request = createTestRequest("POST", {
        name: `Test ${status}`,
        platform: "instagram_reels",
        status,
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }
  });

  it("should reject video_mode enum strictly", async () => {
    const request = createTestRequest("POST", {
      name: "Test",
      platform: "instagram_reels",
      video_mode: "invalid_mode",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should accept all valid video_mode values", async () => {
    const validModes = ["t2v", "i2v", "fl2v", "s2v", "template"];
    for (const mode of validModes) {
      const request = createTestRequest("POST", {
        name: `Test ${mode}`,
        platform: "instagram_reels",
        video_mode: mode,
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    }
  });

  it("should reject scheduled_at with invalid datetime format", async () => {
    const request = createTestRequest("POST", {
      name: "Test",
      platform: "instagram_reels",
      scheduled_at: "not-a-date",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should accept valid datetime for scheduled_at", async () => {
    const request = createTestRequest("POST", {
      name: "Test",
      platform: "instagram_reels",
      scheduled_at: "2025-12-31T23:59:59.000Z",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
