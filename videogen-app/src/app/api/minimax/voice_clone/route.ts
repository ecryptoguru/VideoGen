import { NextRequest, NextResponse } from "next/server";
import { miniMaxLimiter } from "@/lib/rate-limit";
import { retryWithBackoff, miniMaxRetryOptions } from "@/lib/retry";
import { apiLogger } from "@/lib/logger";
import { checkQuota, recordApiUsage } from "@/lib/cost-tracker";
import { filterPrompt, sanitizeInput, filterOutput, detectPII } from "@/lib/content-filter";
import { checkUserConsent } from "@/lib/consent";
import { validateResponse } from "@/lib/schema-validator";

import { MINIMAX_TIMEOUT_MS } from "@/lib/config";
const MINIMAX_TIMEOUT = MINIMAX_TIMEOUT_MS;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const endpoint = "/api/minimax/voice_clone";
  const method = "POST";
  const model = "voice_clone";

  // Get user ID from auth (placeholder - replace with actual auth when available)
  const userId = (req.headers.get("x-user-id") as string) || "anonymous";

  // Check user consent for AI data usage
  const consentStatus = await checkUserConsent(userId);
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

  // Check quota before proceeding
  const quotaCheck = await checkQuota(userId);
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

  // Apply rate limiting
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
      await recordApiUsage({
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
    if (!requestBody.file_id || typeof requestBody.file_id !== "string") {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: Date.now() - startTime,
        error: "file_id is required",
      });
      await recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "validation_failed",
        error_message: "file_id is required",
      });
      return NextResponse.json({ error: "file_id is required" }, { status: 400 });
    }

    // Sanitize file_id to prevent injection
    const sanitizedFileId = sanitizeInput(requestBody.file_id);
    
    // Filter file_id for harmful content
    const filterResult = filterPrompt(sanitizedFileId);
    if (!filterResult.allowed) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: Date.now() - startTime,
        error: filterResult.reason,
      });
      await recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "content_blocked",
        error_message: filterResult.reason,
      });
      return NextResponse.json({ error: `Content blocked: ${filterResult.reason}` }, { status: 400 });
    }

    // Check for PII in request body text fields (description, name, etc.)
    const textFields = Object.values(requestBody)
      .filter((v): v is string => typeof v === "string")
      .join(" ");
    if (textFields) {
      const piiCheck = detectPII(textFields);
      if (piiCheck.hasPII) {
        apiLogger.logRequest({
          timestamp: new Date().toISOString(),
          endpoint,
          method,
          status: 400,
          duration: Date.now() - startTime,
          error: `PII detected: ${piiCheck.types.join(", ")}`,
        });
        await recordApiUsage({
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
      await recordApiUsage({
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

    const response = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT);

      const res = await fetch("https://api.minimax.io/v1/voice_clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          ...requestBody,
          file_id: sanitizedFileId,
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

    // Validate response structure
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
      await recordApiUsage({
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

    // Filter output content for harmful content
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
      await recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: requestDuration,
        cost_cents: 100,
        status: "output_blocked",
        error_message: outputFilterResult.reason,
      });
      return NextResponse.json({ error: `Output blocked: ${outputFilterResult.reason}` }, { status: 400 });
    }

    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: response.status,
      duration: requestDuration,
    });

    await recordApiUsage({
      user_id: userId,
      project_id: projectId,
      endpoint,
      model,
      duration_ms: requestDuration,
      cost_cents: 100, // Voice clone cost
      status: "success",
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
      await recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model,
        duration_ms: requestDuration,
        cost_cents: 0,
        status: "timeout",
        error_message: "Request timed out",
      });
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("MiniMax voice clone API error:", error);
    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 500,
      duration: requestDuration,
      error: error instanceof Error ? error.message : String(error),
    });
    await recordApiUsage({
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
