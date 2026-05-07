import db from "@/data/db";
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
  private persistenceEnabled: boolean;

  constructor() {
    // Enable persistence if database is available
    this.persistenceEnabled = this.checkDatabaseReady();
    
    // Create logs table if it doesn't exist
    if (this.persistenceEnabled) {
      this.createLogsTable();
    }
  }

  private checkDatabaseReady(): boolean {
    try {
      db.prepare("SELECT 1").get();
      return true;
    } catch {
      console.warn("Database not ready for logging, using in-memory only");
      return false;
    }
  }

  private createLogsTable(): void {
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS api_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          status INTEGER,
          duration INTEGER,
          error TEXT,
          user_id TEXT,
          ip TEXT,
          user_agent TEXT,
          request_id TEXT,
          project_id INTEGER,
          model TEXT,
          cost_cents INTEGER,
          cache_read_tokens INTEGER,
          cache_creation_tokens INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Create indexes for efficient querying
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs(timestamp)`).run();
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint)`).run();
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id)`).run();
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_logs(request_id)`).run();
    } catch (error) {
      console.warn("Failed to create logs table:", error);
      this.persistenceEnabled = false;
    }
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

    // Persist to database if enabled
    if (this.persistenceEnabled) {
      this.persistLog(entry);
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

  private persistLog(entry: LogEntry): void {
    try {
      db.prepare(`
        INSERT INTO api_logs (
          timestamp, endpoint, method, status, duration, error,
          user_id, ip, user_agent, request_id, project_id, model,
          cost_cents, cache_read_tokens, cache_creation_tokens
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.timestamp,
        entry.endpoint,
        entry.method,
        entry.status || null,
        entry.duration || null,
        entry.error || null,
        entry.userId || null,
        entry.ip || null,
        entry.userAgent || null,
        entry.requestId || null,
        entry.projectId || null,
        entry.model || null,
        entry.costCents || null,
        entry.cacheReadTokens || null,
        entry.cacheCreationTokens || null
      );
    } catch (error) {
      console.warn("Failed to persist log:", error);
      // Don't disable persistence on single failure
    }
  }

  getLogs(filters?: Partial<LogEntry>, limit: number = 100): LogEntry[] {
    // If persistence is enabled and no filters, return from database with limit
    if (this.persistenceEnabled && !filters) {
      try {
        return db.prepare(`
          SELECT * FROM api_logs 
          ORDER BY created_at DESC 
          LIMIT ?
        `).all(limit) as LogEntry[];
      } catch (error) {
        console.warn("Failed to query logs from database:", error);
      }
    }

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
    if (this.persistenceEnabled) {
      try {
        return db.prepare("SELECT * FROM api_logs WHERE request_id = ?").get(requestId) as LogEntry | undefined;
      } catch (error) {
        console.warn("Failed to query log by request ID:", error);
      }
    }
    return this.inMemoryLogs.find((log) => log.requestId === requestId);
  }

  getLogsByUserId(userId: string, limit: number = 100): LogEntry[] {
    if (this.persistenceEnabled) {
      try {
        return db.prepare(`
          SELECT * FROM api_logs 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT ?
        `).all(userId, limit) as LogEntry[];
      } catch (error) {
        console.warn("Failed to query logs by user ID:", error);
      }
    }
    return this.inMemoryLogs.filter((log) => log.userId === userId).slice(-limit);
  }

  getLogsByProjectId(projectId: number, limit: number = 100): LogEntry[] {
    if (this.persistenceEnabled) {
      try {
        return db.prepare(`
          SELECT * FROM api_logs 
          WHERE project_id = ? 
          ORDER BY created_at DESC 
          LIMIT ?
        `).all(projectId, limit) as LogEntry[];
      } catch (error) {
        console.warn("Failed to query logs by project ID:", error);
      }
    }
    return this.inMemoryLogs.filter((log) => log.projectId === projectId).slice(-limit);
  }

  getErrorLogs(limit: number = 100): LogEntry[] {
    if (this.persistenceEnabled) {
      try {
        return db.prepare(`
          SELECT * FROM api_logs 
          WHERE error IS NOT NULL 
          ORDER BY created_at DESC 
          LIMIT ?
        `).all(limit) as LogEntry[];
      } catch (error) {
        console.warn("Failed to query error logs:", error);
      }
    }
    return this.inMemoryLogs.filter((log) => log.error !== undefined).slice(-limit);
  }

  getSlowRequests(thresholdMs: number = 5000, limit: number = 100): LogEntry[] {
    if (this.persistenceEnabled) {
      try {
        return db.prepare(`
          SELECT * FROM api_logs 
          WHERE duration > ? 
          ORDER BY duration DESC 
          LIMIT ?
        `).all(thresholdMs, limit) as LogEntry[];
      } catch (error) {
        console.warn("Failed to query slow requests:", error);
      }
    }
    return this.inMemoryLogs
      .filter((log) => log.duration && log.duration > thresholdMs)
      .slice(-limit);
  }

  clearLogs(): void {
    this.inMemoryLogs = [];
    
    if (this.persistenceEnabled) {
      try {
        db.prepare("DELETE FROM api_logs").run();
      } catch (error) {
        console.warn("Failed to clear logs from database:", error);
      }
    }
  }

  clearOldLogs(olderThanDays: number = 7): void {
    if (this.persistenceEnabled) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        
        db.prepare("DELETE FROM api_logs WHERE created_at < ?").run(cutoffDate.toISOString());
      } catch (error) {
        console.warn("Failed to clear old logs:", error);
      }
    }
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

    let logs: LogEntry[] = [];
    
    if (this.persistenceEnabled) {
      try {
        logs = db.prepare(`
          SELECT * FROM api_logs 
          WHERE created_at >= ? 
          ORDER BY created_at DESC
        `).all(sinceDate.toISOString()) as LogEntry[];
      } catch (error) {
        console.warn("Failed to query stats from database:", error);
        logs = this.inMemoryLogs.filter((log) => new Date(log.timestamp) >= sinceDate);
      }
    } else {
      logs = this.inMemoryLogs.filter((log) => new Date(log.timestamp) >= sinceDate);
    }

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
