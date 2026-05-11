import { NextRequest, NextResponse } from "next/server";
import { miniMaxLimiter } from "@/lib/rate-limit";
import { apiLogger } from "@/lib/logger";
import { checkQuota, recordApiUsage } from "@/lib/cost-tracker";
import { detectPII } from "@/lib/content-filter";
import { checkUserConsent } from "@/lib/consent";
import { generateText } from "@/lib/minimax-text";
import { getAuthUser } from "@/lib/auth";
import {
  handleApiError,
  createValidationErrorResponse,
  createQuotaExceededResponse,
  createConsentRequiredResponse,
  createConfigErrorResponse,
} from "@/lib/api-error-handler";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const endpoint = "/api/minimax/text";
  const method = "POST";

  const { userId } = getAuthUser(req);

  const consentStatus = await checkUserConsent(userId);
  if (!consentStatus.hasConsent && userId !== "anonymous") {
    return createConsentRequiredResponse({ endpoint, method, userId, startTime });
  }

  const quotaCheck = await checkQuota(userId);
  if (!quotaCheck.allowed) {
    return createQuotaExceededResponse(
      quotaCheck.reason || "Quota exceeded",
      quotaCheck.daily_remaining_cents || 0,
      quotaCheck.monthly_remaining_cents || 0,
      { endpoint, method, userId, startTime }
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

  let projectId: number | undefined = undefined;

  try {
    const requestBody = await req.json();
    projectId = requestBody.project_id ? Number(requestBody.project_id) : undefined;

    if (!requestBody || typeof requestBody !== "object") {
      return createValidationErrorResponse("Invalid request body", undefined, {
        endpoint, method, userId, projectId, startTime,
      });
    }

    if (!Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
      return createValidationErrorResponse("messages array is required", "messages", {
        endpoint, method, userId, projectId, startTime,
      });
    }

    if (requestBody.messages.some((m: unknown) => !m || typeof (m as Record<string, unknown>).role !== "string" || typeof (m as Record<string, unknown>).content !== "string")) {
      return createValidationErrorResponse("Each message must have role and content strings", "messages", {
        endpoint, method, userId, projectId, startTime,
      });
    }

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
        userId,
        projectId,
      });
      await recordApiUsage({
        user_id: userId,
        project_id: projectId,
        endpoint,
        model: "MiniMax-M2.7",
        duration_ms: Date.now() - startTime,
        cost_cents: 0,
        status: "pii_detected",
        error_message: `PII detected: ${piiCheck.types.join(", ")}`,
      });
      return NextResponse.json(
        {
          error: "Personal information detected in your input. For privacy protection, please remove sensitive data such as emails, phone numbers, or addresses before proceeding.",
          pii_types: piiCheck.types,
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return createConfigErrorResponse("Missing API key", { endpoint, method, userId, projectId, startTime });
    }

    const { data, costCents, durationMs } = await generateText({
      messages: requestBody.messages,
      userId,
      projectId,
      endpoint,
    });

    apiLogger.logRequest({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status: 200,
      duration: durationMs,
      userId,
      projectId,
      model: "MiniMax-M2.7",
      costCents,
    });

    return NextResponse.json({ ...(data as Record<string, unknown>), ...quotaAlert }, { status: 200 });
  } catch (error) {
    return handleApiError(error, { endpoint, method, userId, projectId, startTime });
  }
}
