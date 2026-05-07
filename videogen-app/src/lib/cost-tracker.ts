import db from "@/data/db";

interface ApiUsageRecord {
  user_id?: string;
  project_id?: number;
  endpoint: string;
  model: string;
  tokens_used?: number;
  duration_ms?: number;
  cost_cents: number;
  status: string;
  error_message?: string;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
}

interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  daily_remaining_cents?: number;
  monthly_remaining_cents?: number;
  alert_threshold?: number; // Percentage (0-100)
  alert_type?: "daily" | "monthly" | null;
}

interface UsageStats {
  total_requests: number;
  total_cost_cents: number;
  total_cache_reads: number;
  cache_hit_rate: number;
  avg_duration_ms: number;
}

export interface ModelPerformanceMetrics {
  model: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate: number;
  avg_duration_ms: number;
  total_cost_cents: number;
  last_used: string;
}

// MiniMax token pricing (from docs)
// Standard input: $10/1M tokens = 0.01 cents/token
// Standard output: $40/1M tokens = 0.04 cents/token
// Cache write: 1.25x input = 0.0125 cents/token
// Cache read: 0.1x input = 0.001 cents/token
const TOKEN_PRICING = {
  input: 0.01, // cents per token
  output: 0.04, // cents per token
  cache_write: 0.0125, // cents per token
  cache_read: 0.001, // cents per token
};

export function calculateCostFromTokens(
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number
): number {
  const inputCost = inputTokens * TOKEN_PRICING.input;
  const outputCost = outputTokens * TOKEN_PRICING.output;
  const cacheReadCost = cacheReadTokens * TOKEN_PRICING.cache_read;
  const cacheWriteCost = cacheWriteTokens * TOKEN_PRICING.cache_write;
  
  return Math.ceil(inputCost + outputCost + cacheReadCost + cacheWriteCost);
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function checkQuota(userId: string): QuotaCheck {
  const today = getToday();
  const currentMonth = getCurrentMonth();

  const quota = db.prepare(`
    SELECT daily_quota_cents, monthly_quota_cents, daily_used_cents, monthly_used_cents
    FROM user_quota WHERE user_id = ?
  `).get(userId) as {
    daily_quota_cents: number;
    monthly_quota_cents: number;
    daily_used_cents: number;
    monthly_used_cents: number;
  } | undefined;

  if (!quota) {
    // Create default quota for new user
    db.prepare(`
      INSERT INTO user_quota (user_id, daily_quota_cents, monthly_quota_cents, daily_reset_date, monthly_reset_date)
      VALUES (?, 1000, 30000, ?, ?)
    `).run(userId, today, currentMonth);
    
    return {
      allowed: true,
      daily_remaining_cents: 1000,
      monthly_remaining_cents: 30000,
    };
  }

  const dailyRemaining = quota.daily_quota_cents - quota.daily_used_cents;
  const monthlyRemaining = quota.monthly_quota_cents - quota.monthly_used_cents;

  // Check for quota exhaustion
  if (dailyRemaining <= 0) {
    return {
      allowed: false,
      reason: "Daily quota exceeded",
      daily_remaining_cents: 0,
      monthly_remaining_cents: monthlyRemaining,
    };
  }

  if (monthlyRemaining <= 0) {
    return {
      allowed: false,
      reason: "Monthly quota exceeded",
      daily_remaining_cents: dailyRemaining,
      monthly_remaining_cents: 0,
    };
  }

  // Check for quota alerts (80%, 90%, 95% thresholds)
  const dailyUsagePercent = (quota.daily_used_cents / quota.daily_quota_cents) * 100;
  const monthlyUsagePercent = (quota.monthly_used_cents / quota.monthly_quota_cents) * 100;
  
  let alertThreshold: number | undefined;
  let alertType: "daily" | "monthly" | null = null;

  if (dailyUsagePercent >= 95) {
    alertThreshold = 95;
    alertType = "daily";
  } else if (monthlyUsagePercent >= 95) {
    alertThreshold = 95;
    alertType = "monthly";
  } else if (dailyUsagePercent >= 90) {
    alertThreshold = 90;
    alertType = "daily";
  } else if (monthlyUsagePercent >= 90) {
    alertThreshold = 90;
    alertType = "monthly";
  } else if (dailyUsagePercent >= 80) {
    alertThreshold = 80;
    alertType = "daily";
  } else if (monthlyUsagePercent >= 80) {
    alertThreshold = 80;
    alertType = "monthly";
  }

  return {
    allowed: true,
    daily_remaining_cents: dailyRemaining,
    monthly_remaining_cents: monthlyRemaining,
    alert_threshold: alertThreshold,
    alert_type: alertType,
  };
}

export function recordApiUsage(record: ApiUsageRecord): void {
  const cost = record.cost_cents;
  
  // Record the API usage
  db.prepare(`
    INSERT INTO api_usage (
      user_id, project_id, endpoint, model, duration_ms, cost_cents, status, error_message,
      cache_creation_tokens, cache_read_tokens, input_tokens, output_tokens
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.user_id,
    record.project_id,
    record.endpoint,
    record.model,
    record.duration_ms,
    cost,
    record.status,
    record.error_message || null,
    record.cache_creation_tokens || 0,
    record.cache_read_tokens || 0,
    record.input_tokens || 0,
    record.output_tokens || 0
  );

  // Update quota usage
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const quota = db.prepare("SELECT id, daily_reset_date, monthly_reset_date FROM user_quota WHERE user_id = ?").get(record.user_id) as {
    id: number;
    daily_reset_date: string;
    monthly_reset_date: string;
  } | undefined;

  if (quota) {
    let dailyUsed = cost;
    let monthlyUsed = cost;

    // Reset daily if needed
    if (quota.daily_reset_date !== today) {
      dailyUsed = cost;
      db.prepare("UPDATE user_quota SET daily_used_cents = 0, daily_reset_date = ? WHERE id = ?").run(today, quota.id);
    } else {
      dailyUsed = (db.prepare("SELECT daily_used_cents FROM user_quota WHERE id = ?").get(quota.id) as { daily_used_cents: number }).daily_used_cents + cost;
    }

    // Reset monthly if needed
    if (quota.monthly_reset_date !== thisMonth) {
      monthlyUsed = cost;
      db.prepare("UPDATE user_quota SET monthly_used_cents = 0, monthly_reset_date = ? WHERE id = ?").run(thisMonth, quota.id);
    } else {
      monthlyUsed = (db.prepare("SELECT monthly_used_cents FROM user_quota WHERE id = ?").get(quota.id) as { monthly_used_cents: number }).monthly_used_cents + cost;
    }

    db.prepare(`
      UPDATE user_quota 
      SET daily_used_cents = ?, monthly_used_cents = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(dailyUsed, monthlyUsed, quota.id);
  }
}

export function getApiUsageStats(userId: string, days: number = 30): UsageStats {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(cost_cents) as total_cost_cents,
      SUM(cache_read_tokens) as total_cache_reads,
      AVG(duration_ms) as avg_duration_ms
    FROM api_usage
    WHERE user_id = ? AND created_at >= ?
  `).get(userId, startDate.toISOString()) as {
    total_requests: number;
    total_cost_cents: number;
    total_cache_reads: number;
    avg_duration_ms: number;
  };

  const cacheHitRate = stats.total_requests > 0 
    ? (stats.total_cache_reads / stats.total_requests) * 100 
    : 0;

  return {
    total_requests: stats.total_requests || 0,
    total_cost_cents: stats.total_cost_cents || 0,
    total_cache_reads: stats.total_cache_reads || 0,
    cache_hit_rate: cacheHitRate,
    avg_duration_ms: stats.avg_duration_ms || 0,
  };
}

export function getModelPerformanceMetrics(model: string, days: number = 30): ModelPerformanceMetrics {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_requests,
      SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failed_requests,
      AVG(duration_ms) as avg_duration_ms,
      SUM(cost_cents) as total_cost_cents,
      MAX(created_at) as last_used
    FROM api_usage
    WHERE model = ? AND created_at >= ?
  `).get(model, startDate.toISOString()) as {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_duration_ms: number;
    total_cost_cents: number;
    last_used: string;
  };

  const successRate = stats.total_requests > 0 
    ? (stats.successful_requests / stats.total_requests) * 100 
    : 0;

  return {
    model,
    total_requests: stats.total_requests || 0,
    successful_requests: stats.successful_requests || 0,
    failed_requests: stats.failed_requests || 0,
    success_rate: successRate,
    avg_duration_ms: stats.avg_duration_ms || 0,
    total_cost_cents: stats.total_cost_cents || 0,
    last_used: stats.last_used || "",
  };
}
