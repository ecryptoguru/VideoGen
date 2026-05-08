import { NextRequest, NextResponse } from "next/server";
import { miniMaxLimiter } from "@/lib/rate-limit";
import { retryWithBackoff, miniMaxRetryOptions } from "@/lib/retry";
import { apiLogger } from "@/lib/logger";
import { checkQuota, recordApiUsage } from "@/lib/cost-tracker";
import { filterPrompt, sanitizeInput, filterOutput, detectPII } from "@/lib/content-filter";
import { checkUserConsent } from "@/lib/consent";
import { validateResponse } from "@/lib/schema-validator";
import { generateRequestId } from "@/lib/request-id";
import { MINIMAX_TIMEOUT_MS, MAX_PROMPT_LENGTH, MINIMAX_VIDEO_COST_CENTS } from "@/lib/config";
import { guardBodySize } from "@/lib/body-size-guard";
import {
  handleApiError,
  createValidationErrorResponse,
  createQuotaExceededResponse,
  createConsentRequiredResponse,
  createConfigErrorResponse,
  createContentBlockedResponse,
} from "@/lib/api-error-handler";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const endpoint = "/api/minimax/video";
  const method = "POST";
  const model = "MiniMax-Hailuo-2.3";
  const requestId = generateRequestId();

  const userId = (req.headers.get("x-user-id") as string) || "anonymous";
  const projectId = req.headers.get("x-project-id") ? Number(req.headers.get("x-project-id")) : undefined;

  const consentStatus = await checkUserConsent(userId);
  if (!consentStatus.hasConsent && userId !== "anonymous") {
    return createConsentRequiredResponse({
      endpoint,
      method,
      userId,
      projectId,
      startTime,
    });
  }

  const quotaCheck = await checkQuota(userId);
  if (!quotaCheck.allowed) {
    return createQuotaExceededResponse(
      quotaCheck.reason || "Quota exceeded",
      quotaCheck.daily_remaining_cents || 0,
      quotaCheck.monthly_remaining_cents || 0,
      {
        endpoint,
        method,
        userId,
        projectId,
        startTime,
      }
    );
  }

  const quotaAlert = quotaCheck.alert_threshold ? {
    quota_alert: {
      threshold: quotaCheck.alert_threshold,
      type: quotaCheck.alert_type,
      message: `You have used ${quotaCheck.alert_threshold}% of your ${quotaCheck.alert_type} quota. Consider upgrading to avoid interruption.`,
    }
  } : {};

  const rateLimitResult = await miniMaxLimiter(req);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const sizeGuard = guardBodySize(req);
  if (sizeGuard) return sizeGuard;

  try {
    const requestBody = await req.json();

    if (!requestBody || typeof requestBody !== "object") {
      return createValidationErrorResponse("Invalid request body", undefined, {
        endpoint,
        method,
        userId,
        projectId,
        startTime,
      });
    }

    if (!requestBody.prompt || typeof requestBody.prompt !== "string") {
      return createValidationErrorResponse("prompt is required", "prompt", {
        endpoint,
        method,
        userId,
        projectId,
        startTime,
      });
    }

    const sanitizedPrompt = sanitizeInput(requestBody.prompt);

    const filterResult = filterPrompt(sanitizedPrompt);
    if (!filterResult.allowed) {
      return createContentBlockedResponse(
        filterResult.reason || "Content blocked",
        filterResult.severity,
        {
          endpoint,
          method,
          userId,
          projectId,
          startTime,
        }
      );
    }

    const piiCheck = detectPII(sanitizedPrompt);
    if (piiCheck.hasPII) {
      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status: 400,
        duration: Date.now() - startTime,
        error: `PII detected: ${piiCheck.types.join(", ")}`,
        requestId,
        userId,
        projectId,
        model,
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

    if (sanitizedPrompt.length > MAX_PROMPT_LENGTH) {
      return createValidationErrorResponse(`prompt must be under ${MAX_PROMPT_LENGTH} chars`, "prompt", {
        endpoint,
        method,
        userId,
        projectId,
        startTime,
      });
    }

    const duration = requestBody.duration ? String(requestBody.duration) : undefined;
    if (duration && !["6", "10"].includes(duration)) {
      return createValidationErrorResponse("duration must be 6 or 10", "duration", {
        endpoint,
        method,
        userId,
        projectId,
        startTime,
      });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return createConfigErrorResponse("Missing API key", {
        endpoint,
        method,
        userId,
        projectId,
        startTime,
      });
    }

    const response = await retryWithBackoff(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MINIMAX_TIMEOUT_MS);

      const res = await fetch("https://api.minimax.io/v1/video_generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: sanitizedPrompt,
          ...(duration ? { duration } : {}),
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
        requestId,
        userId,
        projectId,
        model,
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

    const responseString = JSON.stringify(data);
    const outputFilterResult = filterOutput(responseString);
    if (!outputFilterResult.allowed) {
      return createContentBlockedResponse(
        outputFilterResult.reason || "Output blocked",
        outputFilterResult.severity,
        {
          endpoint,
          method,
          userId,
          projectId,
          startTime,
        }
      );
    }

    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: response.status,
      duration: requestDuration,
      requestId,
      userId,
      projectId,
      model,
      costCents: MINIMAX_VIDEO_COST_CENTS,
    });

    await recordApiUsage({
      user_id: userId,
      project_id: projectId,
      endpoint,
      model,
      duration_ms: requestDuration,
      cost_cents: MINIMAX_VIDEO_COST_CENTS,
      status: "success",
    });

    return NextResponse.json({ ...data, ...quotaAlert }, { status: response.status });
  } catch (error) {
    return handleApiError(error, {
      endpoint,
      method,
      userId,
      projectId,
      startTime,
    });
  }
}
