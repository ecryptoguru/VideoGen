import { prisma } from "@/lib/db";

export interface AuditLog {
  id?: number;
  event_type: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint: string;
  method: string;
  status_code?: number;
  details?: string;
  created_at: string;
}

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = "login_success",
  LOGIN_FAILURE = "login_failure",
  LOGOUT = "logout",
  
  // CSRF events
  CSRF_VALIDATION_FAILED = "csrf_validation_failed",
  
  // Rate limit events
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  
  // Data access events
  PROJECT_CREATED = "project_created",
  PROJECT_UPDATED = "project_updated",
  PROJECT_DELETED = "project_deleted",
  PROJECT_ACCESSED = "project_accessed",
  
  // Content filter events
  CONTENT_BLOCKED = "content_blocked",
  PII_DETECTED = "pii_detected",
  
  // API quota events
  QUOTA_EXCEEDED = "quota_exceeded",
  
  // Admin events
  ADMIN_ACTION = "admin_action",
  CONFIG_CHANGED = "config_changed",
}

/**
 * Log a security event to the audit log
 */
export async function logSecurityEvent(event: {
  event_type: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint: string;
  method: string;
  status_code?: number;
  details?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        eventType: event.event_type,
        userId: event.user_id,
        ipAddress: event.ip_address,
        userAgent: event.user_agent,
        endpoint: event.endpoint,
        method: event.method,
        statusCode: event.status_code,
        details: event.details,
      }
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(userId: string, limit = 100): Promise<AuditLog[]> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return logs.map(log => ({
      id: log.id,
      event_type: log.eventType,
      user_id: log.userId,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.statusCode,
      details: log.details,
      created_at: log.createdAt.toISOString(),
    })) as AuditLog[];
  } catch (error) {
    console.error("Failed to get user audit logs:", error);
    return [];
  }
}

/**
 * Get recent security events
 */
export async function getRecentSecurityEvents(limit = 50): Promise<AuditLog[]> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        eventType: {
          in: ['login_failure', 'csrf_validation_failed', 'rate_limit_exceeded', 'content_blocked', 'quota_exceeded']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return logs.map(log => ({
      id: log.id,
      event_type: log.eventType,
      user_id: log.userId,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      endpoint: log.endpoint,
      method: log.method,
      status_code: log.statusCode,
      details: log.details,
      created_at: log.createdAt.toISOString(),
    })) as AuditLog[];
  } catch (error) {
    console.error("Failed to get recent security events:", error);
    return [];
  }
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(userId: string): Promise<boolean> {
  try {
    // Check for multiple failed logins in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const loginFailures = await prisma.auditLog.count({
      where: {
        userId,
        eventType: 'login_failure',
        createdAt: { gt: oneHourAgo }
      }
    });
    
    if (loginFailures > 5) {
      return true;
    }

    // Check for rate limit violations
    const rateLimitViolations = await prisma.auditLog.count({
      where: {
        userId,
        eventType: 'rate_limit_exceeded',
        createdAt: { gt: oneHourAgo }
      }
    });
    
    if (rateLimitViolations > 3) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to check suspicious activity:", error);
    return false;
  }
}
