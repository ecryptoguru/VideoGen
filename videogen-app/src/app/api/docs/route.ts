import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "VideoGen API",
    version: "1.0.0",
    description: "AI-powered video generation platform API using MiniMax AI services",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  paths: {
    "/api/projects": {
      get: {
        summary: "Get all projects",
        tags: ["Projects"],
        responses: {
          "200": {
            description: "List of projects",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/Project",
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a new project",
        tags: ["Projects"],
        security: [{ csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateProject",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Project created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    success: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
          },
          "403": {
            description: "CSRF validation failed",
          },
        },
      },
      patch: {
        summary: "Update a project",
        tags: ["Projects"],
        security: [{ csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateProject",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Project updated successfully",
          },
          "400": {
            description: "Validation error",
          },
          "403": {
            description: "CSRF validation failed",
          },
        },
      },
      delete: {
        summary: "Delete a project",
        tags: ["Projects"],
        security: [{ csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Project deleted successfully",
          },
          "400": {
            description: "Validation error",
          },
          "403": {
            description: "CSRF validation failed",
          },
        },
      },
    },
    "/api/scenes": {
      get: {
        summary: "Get all scenes",
        tags: ["Scenes"],
        responses: {
          "200": {
            description: "List of scenes",
          },
        },
      },
      post: {
        summary: "Create a new scene",
        tags: ["Scenes"],
        security: [{ csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateScene",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Scene created successfully",
          },
          "400": {
            description: "Validation error",
          },
        },
      },
    },
    "/api/minimax/text": {
      post: {
        summary: "Generate text using MiniMax AI",
        tags: ["MiniMax"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["messages"],
                properties: {
                  messages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string", enum: ["user", "assistant", "system"] },
                        content: { type: "string" },
                      },
                    },
                  },
                  model: { type: "string" },
                  temperature: { type: "number" },
                  max_tokens: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Text generated successfully",
          },
          "429": {
            description: "Rate limit exceeded",
          },
        },
      },
    },
    "/api/minimax/image": {
      post: {
        summary: "Generate images using MiniMax AI",
        tags: ["MiniMax"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt"],
                properties: {
                  prompt: { type: "string" },
                  model: { type: "string" },
                  aspect_ratio: { type: "string", enum: ["1:1", "16:9", "9:16", "4:3", "3:4"] },
                  n: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Images generated successfully",
          },
          "429": {
            description: "Rate limit exceeded",
          },
        },
      },
    },
    "/api/minimax/video": {
      post: {
        summary: "Generate videos using MiniMax AI",
        tags: ["MiniMax"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["model", "prompt", "duration"],
                properties: {
                  model: { type: "string" },
                  prompt: { type: "string" },
                  first_frame_image: { type: "string", format: "uri" },
                  duration: { type: "number" },
                  resolution: { type: "string", enum: ["360P", "480P", "720P", "768P", "1080P"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Video generation started",
          },
          "429": {
            description: "Rate limit exceeded",
          },
        },
      },
    },
    "/api/video-poll": {
      get: {
        summary: "Server-Sent Events for video polling",
        tags: ["Video"],
        parameters: [
          {
            name: "taskIds",
            in: "query",
            required: true,
            schema: {
              type: "string",
              description: "Comma-separated list of task IDs",
            },
          },
        ],
        responses: {
          "200": {
            description: "SSE stream with task updates",
            content: {
              "text/event-stream": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Project: {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
          platform: { type: "string", enum: ["instagram_reels", "linkedin", "youtube_shorts", "youtube_long"] },
          topic: { type: "string" },
          script: { type: "string" },
          music_prompt: { type: "string" },
          status: { type: "string", enum: ["draft", "generating", "processing", "ready", "published", "failed"] },
          video_mode: { type: "string", enum: ["t2v", "i2v", "fl2v", "s2v", "template"] },
          video_model: { type: "string" },
          hook_variant: { type: "string" },
          thumbnail_urls: { type: "string" },
          scheduled_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      CreateProject: {
        type: "object",
        required: ["name", "platform"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          platform: { type: "string", enum: ["instagram_reels", "linkedin", "youtube_shorts", "youtube_long"] },
          topic: { type: "string", maxLength: 500 },
          script: { type: "string" },
          music_prompt: { type: "string", maxLength: 1000 },
          status: { type: "string", enum: ["draft", "generating", "processing", "ready", "published", "failed"] },
          video_mode: { type: "string", enum: ["t2v", "i2v", "fl2v", "s2v", "template"] },
          video_model: { type: "string", maxLength: 100 },
          hook_variant: { type: "string", maxLength: 500 },
          thumbnail_urls: { type: "string" },
          scheduled_at: { type: "string", format: "date-time" },
        },
      },
      UpdateProject: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "number" },
          name: { type: "string", minLength: 1, maxLength: 200 },
          platform: { type: "string", enum: ["instagram_reels", "linkedin", "youtube_shorts", "youtube_long"] },
          topic: { type: "string", maxLength: 500 },
          script: { type: "string" },
          music_prompt: { type: "string", maxLength: 1000 },
          status: { type: "string", enum: ["draft", "generating", "processing", "ready", "published", "failed"] },
          video_mode: { type: "string", enum: ["t2v", "i2v", "fl2v", "s2v", "template"] },
          video_model: { type: "string", maxLength: 100 },
          hook_variant: { type: "string", maxLength: 500 },
          thumbnail_urls: { type: "string" },
          scheduled_at: { type: "string", format: "date-time" },
        },
      },
      CreateScene: {
        type: "object",
        required: ["project_id", "order_index"],
        properties: {
          project_id: { type: "number" },
          order_index: { type: "number", minimum: 0 },
          script: { type: "string", maxLength: 5000 },
          direction_notes: { type: "string", maxLength: 2000 },
          image_url: { type: "string", format: "uri" },
          image_base64: { type: "string" },
          video_task_id: { type: "string", maxLength: 200 },
          video_file_id: { type: "string", maxLength: 200 },
          video_url: { type: "string", format: "uri" },
          status: { type: "string", enum: ["pending", "generating", "ready", "failed"] },
          camera_commands: { type: "string", maxLength: 500 },
          prompt_optimizer: { type: "number", minimum: 0, maximum: 1 },
          prompt_optimizer_mode: { type: "string", enum: ["fast", "quality"] },
        },
      },
    },
    securitySchemes: {
      csrfToken: {
        type: "apiKey",
        in: "header",
        name: "x-csrf-token",
        description: "CSRF token for state-changing requests",
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
