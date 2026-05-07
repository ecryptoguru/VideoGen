import { NextRequest } from "next/server";
import { apiLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rateLimitResult = await apiLimiter(req);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const taskIds = req.nextUrl.searchParams.get("taskIds");
  if (!taskIds) {
    return new Response("taskIds parameter is required", { status: 400 });
  }

  const taskIdArray = taskIds.split(",").filter(Boolean);

  // Set up SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  });

  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown, event?: string) => {
        const message = event ? `event: ${event}\n` : "";
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message + payload));
      };

      // Send initial connection message
      sendEvent({ connected: true, taskCount: taskIdArray.length }, "connected");

      // Poll interval (10 seconds as per original implementation)
      const pollInterval = 10000;
      const maxAttempts = 120;
      let attempts = 0;

      const poll = async () => {
        try {
          if (attempts >= maxAttempts) {
            sendEvent({ error: "Max polling attempts reached" }, "error");
            controller.close();
            return;
          }

          attempts++;

          // Check status for each task
          const results = await Promise.allSettled(
            taskIdArray.map(async (taskId) => {
              const response = await fetch(
                `${process.env.MINIMAX_API_BASE_URL}/v1/video_generation/query?task_id=${taskId}`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
                  },
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch status for task ${taskId}`);
              }

              const data = await response.json();
              return {
                taskId,
                status: data.status,
                result: data,
              };
            })
          );

          const taskUpdates = results.map((result, index) => {
            if (result.status === "fulfilled") {
              return result.value;
            }
            return {
              taskId: taskIdArray[index],
              status: "failed",
              error: result.reason?.message || "Unknown error",
            };
          });

          // Send task updates
          sendEvent({ tasks: taskUpdates, attempt: attempts }, "update");

          // Check if all tasks are complete
          const allComplete = taskUpdates.every(
            (task) => task.status === "Success" || task.status === "Fail"
          );

          if (allComplete) {
            sendEvent({ complete: true }, "complete");
            controller.close();
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          sendEvent({ error: String(error) }, "error");
          controller.close();
        }
      };

      // Start polling
      setTimeout(poll, pollInterval);

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
