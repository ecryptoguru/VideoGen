import db from "@/data/db";

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
export function logSecurityEvent(event: {
  event_type: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint: string;
  method: string;
  status_code?: number;
  details?: string;
}): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        event_type, user_id, ip_address, user_agent, 
        endpoint, method, status_code, details, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.event_type,
      event.user_id || null,
      event.ip_address || null,
      event.user_agent || null,
      event.endpoint,
      event.method,
      event.status_code || null,
      event.details || null,
      new Date().toISOString()
    );
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Get audit logs for a user
 */
export function getUserAuditLogs(userId: string, limit = 100): AuditLog[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit) as AuditLog[];
  } catch (error) {
    console.error("Failed to get user audit logs:", error);
    return [];
  }
}

/**
 * Get recent security events
 */
export function getRecentSecurityEvents(limit = 50): AuditLog[] {
  try {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE event_type IN (
        'login_failure', 'csrf_validation_failed', 
        'rate_limit_exceeded', 'content_blocked', 'quota_exceeded'
      )
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as AuditLog[];
  } catch (error) {
    console.error("Failed to get recent security events:", error);
    return [];
  }
}

/**
 * Check for suspicious activity patterns
 */
export function checkSuspiciousActivity(userId: string): boolean {
  try {
    // Check for multiple failed logins in last hour
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE user_id = ? 
        AND event_type = 'login_failure'
        AND created_at > datetime('now', '-1 hour')
    `);
    const result = stmt.get(userId) as { count: number };
    
    if (result.count > 5) {
      return true;
    }

    // Check for rate limit violations
    const rateLimitStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE user_id = ? 
        AND event_type = 'rate_limit_exceeded'
        AND created_at > datetime('now', '-1 hour')
    `);
    const rateLimitResult = rateLimitStmt.get(userId) as { count: number };
    
    if (rateLimitResult.count > 3) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to check suspicious activity:", error);
    return false;
  }
}
