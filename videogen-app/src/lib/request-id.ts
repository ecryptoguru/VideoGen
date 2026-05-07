/**
 * Request ID Generation and Tracking
 * Provides unique identifiers for each request to enable tracing and debugging
 */

export function generateRequestId(): string {
  // Generate a unique ID using timestamp + random string
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomStr}`;
}

export function generateShortRequestId(): string {
  // Generate a shorter ID for display purposes
  return Math.random().toString(36).substring(2, 10);
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  projectId?: number;
  endpoint?: string;
  method?: string;
  startTime?: number;
  metadata?: Record<string, unknown>;
}

const requestContexts = new Map<string, RequestContext>();

export function setRequestContext(context: RequestContext): void {
  requestContexts.set(context.requestId, context);
}

export function getRequestContext(requestId: string): RequestContext | undefined {
  return requestContexts.get(requestId);
}

export function clearRequestContext(requestId: string): void {
  requestContexts.delete(requestId);
}

export function getAllActiveContexts(): RequestContext[] {
  return Array.from(requestContexts.values());
}

// Clean up old contexts periodically (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [requestId, context] of requestContexts.entries()) {
    if (context.startTime && context.startTime < oneHourAgo) {
      requestContexts.delete(requestId);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
