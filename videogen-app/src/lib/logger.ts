import { generateRequestId } from "./request-id";

interface LogEntry {
  id?: number;
  timestamp: string;
  endpoint: string;
  method: string;
  status?: number;
  duration?: number;
  error?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  projectId?: number;
  model?: string;
  costCents?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

class ApiLogger {
  private inMemoryLogs: LogEntry[] = [];
  private maxInMemoryLogs = 1000; // Keep last 1000 logs in memory

  constructor() {
    // Initialize with in-memory logging only
    // Database persistence is handled by audit-log.ts for security events
  }

  logRequest(entry: LogEntry): void {
    // Add request ID if not provided
    if (!entry.requestId) {
      entry.requestId = generateRequestId();
    }

    // Store in memory
    this.inMemoryLogs.push(entry);
    
    // Keep only the last maxInMemoryLogs entries
    if (this.inMemoryLogs.length > this.maxInMemoryLogs) {
      this.inMemoryLogs.shift();
    }

    // Log to console for development
    if (process.env.NODE_ENV === "development") {
      console.log(`[API LOG] ${entry.method} ${entry.endpoint} [${entry.requestId}]`, {
        status: entry.status,
        duration: entry.duration,
        error: entry.error,
        userId: entry.userId,
        projectId: entry.projectId,
        model: entry.model,
        costCents: entry.costCents,
      });
    }
  }

  getLogs(filters?: Partial<LogEntry>, limit: number = 100): LogEntry[] {
    // Fall back to in-memory logs
    if (!filters) {
      return [...this.inMemoryLogs].slice(-limit);
    }

    return this.inMemoryLogs.filter((log) => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined) return true;
        return (log as unknown as Record<string, unknown>)[key] === value;
      });
    });
  }

  getLogsByRequestId(requestId: string): LogEntry | undefined {
    return this.inMemoryLogs.find((log) => log.requestId === requestId);
  }

  getLogsByUserId(userId: string, limit: number = 100): LogEntry[] {
    return this.inMemoryLogs.filter((log) => log.userId === userId).slice(-limit);
  }

  getLogsByProjectId(projectId: number, limit: number = 100): LogEntry[] {
    return this.inMemoryLogs.filter((log) => log.projectId === projectId).slice(-limit);
  }

  getErrorLogs(limit: number = 100): LogEntry[] {
    return this.inMemoryLogs.filter((log) => log.error !== undefined).slice(-limit);
  }

  getSlowRequests(thresholdMs: number = 5000, limit: number = 100): LogEntry[] {
    return this.inMemoryLogs
      .filter((log) => log.duration && log.duration > thresholdMs)
      .slice(-limit);
  }

  clearLogs(): void {
    this.inMemoryLogs = [];
  }

  clearOldLogs(olderThanDays: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    this.inMemoryLogs = this.inMemoryLogs.filter((log) => 
      new Date(log.timestamp) >= cutoffDate
    );
  }

  getStats(days: number = 7): {
    total: number;
    errors: number;
    errorRate: number;
    avgDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    totalCost: number;
    totalCacheReads: number;
    cacheHitRate: number;
  } {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const logs = this.inMemoryLogs.filter((log) => new Date(log.timestamp) >= sinceDate);

    const total = logs.length;
    const errors = logs.filter((l) => l.error).length;
    const durations = logs.map((l) => l.duration || 0).sort((a, b) => a - b);
    const totalCost = logs.reduce((sum, l) => sum + (l.costCents || 0), 0);
    const totalCacheReads = logs.reduce((sum, l) => sum + (l.cacheReadTokens || 0), 0);
    const cacheHits = logs.filter((l) => l.cacheReadTokens && l.cacheReadTokens > 0).length;

    const avgDuration = total > 0 ? durations.reduce((sum, d) => sum + d, 0) / total : 0;
    const p50Duration = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95Duration = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99Duration = durations[Math.floor(durations.length * 0.99)] || 0;

    return {
      total,
      errors,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      p50Duration,
      p95Duration,
      p99Duration,
      totalCost,
      totalCacheReads,
      cacheHitRate: total > 0 ? (cacheHits / total) * 100 : 0,
    };
  }
}

// Singleton instance
export const apiLogger = new ApiLogger();

// Middleware helper for Next.js API routes
export function logApiRequest(
  endpoint: string,
  method: string,
  handler: () => Promise<Response>,
  options?: { userId?: string; projectId?: number; model?: string }
): Promise<Response> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const userId = options?.userId;
  const projectId = options?.projectId;
  const model = options?.model;

  return handler()
    .then((response) => {
      const duration = Date.now() - startTime;
      const status = response.status;

      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status,
        duration,
        requestId,
        userId,
        projectId,
        model,
      });

      return response;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      apiLogger.logRequest({
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        duration,
        error: errorMessage,
        requestId,
        userId,
        projectId,
        model,
      });

      throw error;
    });
}
