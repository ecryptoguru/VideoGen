/**
 * Shared MiniMax Text Generation Service
 * Extracted from the API route so other modules can call it directly
 * without an internal HTTP round-trip.
 */

import { retryWithBackoff, miniMaxRetryOptions } from "./retry";
import { filterOutput, detectPII } from "./content-filter";
import { validateResponse } from "./schema-validator";
import { apiLogger } from "./logger";
import { recordApiUsage, calculateCostFromTokens } from "./cost-tracker";
import { MINIMAX_TIMEOUT_MS } from "./config";

const model = "MiniMax-M2.7";

export interface TextGenerationOptions {
  messages: Array<{ role: string; content: string }>;
  userId?: string;
  projectId?: number;
  endpoint?: string;
}

export interface TextGenerationResult {
  data: unknown;
  costCents: number;
  durationMs: number;
}

export async function generateText(
  options: TextGenerationOptions
): Promise<TextGenerationResult> {
  const startTime = Date.now();
  const endpoint = options.endpoint || "/api/minimax/text";
  const userId = options.userId || "anonymous";

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("Server configuration error - missing API key");
  }

  // Check for PII
  const allMessagesText = options.messages.map((m) => m.content).join(" ");
  const piiCheck = detectPII(allMessagesText);
  if (piiCheck.hasPII) {
    const error = new Error(`PII detected: ${piiCheck.types.join(", ")}`);
    (error as Error & { status: number }).status = 400;
    throw error;
  }

  // Add cache_control to large messages
  const messagesWithCache = options.messages.map((msg) => {
    const content =
      typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    if (content.length > 1000) {
      return {
        ...msg,
        content: [
          {
            type: "text" as const,
            text: content,
            cache_control: { type: "ephemeral" as const },
          },
        ],
      };
    }
    return msg;
  });

  const response = await retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT_MS);

    const res = await fetch("https://api.minimax.io/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: messagesWithCache,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const error = new Error(
        `MiniMax API error: ${res.status} ${res.statusText}`
      ) as Error & { status: number };
      error.status = res.status;
      throw error;
    }

    return res;
  }, miniMaxRetryOptions);

  const data = (await response.json()) as Record<string, unknown>;
  const requestDuration = Date.now() - startTime;

  // Schema validation
  const schemaValidation = validateResponse(data, model);
  if (!schemaValidation.valid) {
    await recordApiUsage({
      user_id: userId,
      project_id: options.projectId,
      endpoint,
      model,
      duration_ms: requestDuration,
      cost_cents: 0,
      status: "schema_validation_failed",
      error_message: schemaValidation.errors?.join(", "),
    });
    throw new Error(
      `Schema validation failed: ${schemaValidation.errors?.join(", ")}`
    );
  }

  // Output filtering
  const responseString = JSON.stringify(data);
  const outputFilterResult = filterOutput(responseString);
  if (!outputFilterResult.allowed) {
    await recordApiUsage({
      user_id: userId,
      project_id: options.projectId,
      endpoint,
      model,
      duration_ms: requestDuration,
      cost_cents: 1,
      status: "output_blocked",
      error_message: outputFilterResult.reason,
    });
    const error = new Error(`Output blocked: ${outputFilterResult.reason}`) as Error & {
      status: number;
    };
    error.status = 400;
    throw error;
  }

  // Calculate cost
  let costCents = 1;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  const usage = data.usage as Record<string, number> | undefined;
  if (usage) {
    cacheCreationTokens = usage.cache_creation_input_tokens || 0;
    cacheReadTokens = usage.cache_read_input_tokens || 0;
    inputTokens = usage.input_tokens || 0;
    outputTokens = usage.output_tokens || 0;
    costCents = calculateCostFromTokens(
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens
    );
  }

  apiLogger.logRequest({
    timestamp: new Date().toISOString(),
    endpoint,
    method: "POST",
    status: response.status,
    duration: requestDuration,
    userId,
    projectId: options.projectId,
    model,
  });

  await recordApiUsage({
    user_id: userId,
    project_id: options.projectId,
    endpoint,
    model,
    duration_ms: requestDuration,
    cost_cents: costCents,
    status: "success",
    cache_creation_tokens: cacheCreationTokens,
    cache_read_tokens: cacheReadTokens,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  });

  return { data, costCents, durationMs: requestDuration };
}
