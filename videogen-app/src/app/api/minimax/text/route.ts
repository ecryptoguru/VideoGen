import { NextRequest, NextResponse } from "next/server";
import { miniMaxLimiter } from "@/lib/rate-limit";
import { retryWithBackoff, miniMaxRetryOptions } from "@/lib/retry";
import { apiLogger } from "@/lib/logger";
import { checkQuota, recordApiUsage, calculateCostFromTokens } from "@/lib/cost-tracker";
import { filterOutput, detectPII } from "@/lib/content-filter";
import { checkUserConsent } from "@/lib/consent";
import { validateResponse } from "@/lib/schema-validator";

import { MINIMAX_TIMEOUT_MS } from "@/lib/config";
const MINIMAX_TIMEOUT = MINIMAX_TIMEOUT_MS;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const endpoint = "/api/minimax/text";
  const method = "POST";
  const model = "MiniMax-M2.7";

  const userId = (req.headers.get("x-user-id") as string) || "anonymous";

  const consentStatus = checkUserConsent(userId);
  if (!consentStatus.hasConsent && userId !== "anonymous") {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 403,
      duration: Date.now() - startTime,
      error: "AI data usage consent required",
    });
    return NextResponse.json(
      { error: "AI data usage consent required. Please accept the terms to continue." },
      { status: 403 }
    );
  }

  const quotaCheck = checkQuota(userId);
  if (!quotaCheck.allowed) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 429,
      duration: Date.now() - startTime,
      error: quotaCheck.reason,
    });
    return NextResponse.json(
      { error: quotaCheck.reason, daily_remaining: quotaCheck.daily_remaining_cents, monthly_remaining: quotaCheck.monthly_remaining_cents },
      { status: 429 }
    );
  }

  // Include quota alert in response if threshold reached
  const quotaAlert = quotaCheck.alert_threshold ? {
    quota_alert: {
      threshold: quotaCheck.alert_threshold,
      type: quotaCheck.alert_type,
      message: `You have used ${quotaCheck.alert_threshold}% of your ${quotaCheck.alert_type} quota. Consider upgrading to avoid interruption.`,
    }
  } : {};

  const rateLimitResult = await miniMaxLimiter(req);
  if (rateLimitResult) {
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 429,
      duration: Date.now() - startTime,
      error: "Rate limit exceeded",
    });
    return rateLimitResult;
  }

  let projectId: number | undefined = undefined;

  try {
    const requestBody = await req.json();
    projectId = requestBody.project_id ? Number(requestBody.project_id) : undefined;

    if (!requestBody || typeof requestBody !== "object") {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: Date.now() - startTime,
        error: "Invalid request body",
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "validation_failed",
        error_message: "Invalid request body",
      });
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: Date.now() - startTime,
        error: "messages array is required",
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "validation_failed",
        error_message: "messages array is required",
      });
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }
    if (requestBody.messages.some((m: unknown) => !m || typeof (m as Record<string, unknown>).role !== "string" || typeof (m as Record<string, unknown>).content !== "string")) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: Date.now() - startTime,
        error: "Each message must have role and content strings",
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "validation_failed",
        error_message: "Each message must have role and content strings",
      });
      return NextResponse.json({ error: "Each message must have role and content strings" }, { status: 400 });
    }

    // Check for PII in user messages
    const allMessagesText = requestBody.messages.map((m: { content: string }) => m.content).join(" ");
    const piiCheck = detectPII(allMessagesText);
    if (piiCheck.hasPII) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: Date.now() - startTime,
        error: `PII detected: ${piiCheck.types.join(", ")}`,
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "pii_detected",
        error_message: `PII detected: ${piiCheck.types.join(", ")}`,
      });
      return NextResponse.json(
        { 
          error: "Personal information detected in your input. For privacy protection, please remove sensitive data such as emails, phone numbers, or addresses before proceeding.",
          pii_types: piiCheck.types
        }, 
        { status: 400 }
      );
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 500,
        duration: Date.now() - startTime,
        error: "Server configuration error - missing API key",
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "config_error",
        error_message: "Server configuration error - missing API key",
      });
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Add cache_control to large messages (>1000 chars) for cost optimization
    const messagesWithCache = requestBody.messages.map((msg: { role: string; content: string }) => {
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      if (content.length > 1000) {
        return {
          ...msg,
          content: [
            {
              type: "text",
              text: content,
              cache_control: { type: "ephemeral" },
            },
          ],
        };
      }
      return msg;
    });

    const response = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT);

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
        const error = new Error(`MiniMax API error: ${res.status} ${res.statusText}`) as Error & { status: number };
        error.status = res.status;
        throw error;
      }

      return res;
    }, miniMaxRetryOptions);

    const data = await response.json();
    const requestDuration = Date.now() - startTime;

    const schemaValidation = validateResponse(data, model);
    if (!schemaValidation.valid) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 500,
        duration: requestDuration,
        error: `Schema validation failed: ${schemaValidation.errors?.join(", ")}`,
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: requestDuration,
        cost_cents: 0,
        status: "schema_validation_failed",
        error_message: schemaValidation.errors?.join(", "),
      });
      return NextResponse.json({ error: "Invalid response from AI provider" }, { status: 500 });
    }

    const responseString = JSON.stringify(data);
    const outputFilterResult = filterOutput(responseString);
    if (!outputFilterResult.allowed) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: requestDuration,
        error: outputFilterResult.reason,
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: requestDuration,
        cost_cents: 1,
        status: "output_blocked",
        error_message: outputFilterResult.reason,
      });
      return NextResponse.json({ error: `Output blocked: ${outputFilterResult.reason}` }, { status: 400 });
    }

    // Calculate cost from actual token usage if available
    let costCents = 1; // Default fallback cost
    let cacheCreationTokens = 0;
    let cacheReadTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    if (data.usage) {
      cacheCreationTokens = data.usage.cache_creation_input_tokens || 0;
      cacheReadTokens = data.usage.cache_read_input_tokens || 0;
      inputTokens = data.usage.input_tokens || 0;
      outputTokens = data.usage.output_tokens || 0;
      
      // Calculate cost from actual token usage
      costCents = calculateCostFromTokens(inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens);
    }

    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: response.status,
      duration: requestDuration,
    });

    recordApiUsage({
      user_id: userId,
      project_id: projectId,
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

    return NextResponse.json({ ...data, ...quotaAlert }, { status: response.status });
  } catch (error) {
    const requestDuration = Date.now() - startTime;

    if (error instanceof Error && error.name === "AbortError") {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 504,
        duration: requestDuration,
        error: "Request timed out",
      });
      recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: requestDuration,
        cost_cents: 0,
        status: "timeout",
        error_message: "Request timed out",
      });
      return NextResponse.json({ error: "Request timed out. MiniMax may be slow." }, { status: 504 });
    }
    console.error("MiniMax text API error:", error);
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 500,
      duration: requestDuration,
      error: error instanceof Error ? error.message : String(error),
    });
    recordApiUsage({
      user_id: userId,
      project_id: projectId,
      endpoint,
      model,
      duration_ms: requestDuration,
      cost_cents: 0,
      status: "error",
      error_message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
