import { prisma } from "@/lib/db";

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

export async function checkQuota(userId: string): Promise<QuotaCheck> {
  const today = getToday();
  const currentMonth = getCurrentMonth();

  const quota = await prisma.userQuota.findUnique({
    where: { userId }
  });

  if (!quota) {
    // Create default quota for new user
    await prisma.userQuota.create({
      data: {
        userId,
        dailyQuotaCents: 1000,
        monthlyQuotaCents: 30000,
        dailyResetDate: new Date(today),
        monthlyResetDate: new Date(currentMonth),
      }
    });
    
    return {
      allowed: true,
      daily_remaining_cents: 1000,
      monthly_remaining_cents: 30000,
    };
  }

  const dailyRemaining = quota.dailyQuotaCents - quota.dailyUsedCents;
  const monthlyRemaining = quota.monthlyQuotaCents - quota.monthlyUsedCents;

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
  const dailyUsagePercent = (quota.dailyUsedCents / quota.dailyQuotaCents) * 100;
  const monthlyUsagePercent = (quota.monthlyUsedCents / quota.monthlyQuotaCents) * 100;
  
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

export async function recordApiUsage(record: ApiUsageRecord): Promise<void> {
  const cost = record.cost_cents;
  
  // Record the API usage
  await prisma.apiUsage.create({
    data: {
      userId: record.user_id || 'anonymous',
      projectId: record.project_id,
      endpoint: record.endpoint,
      model: record.model,
      durationMs: record.duration_ms,
      costCents: cost,
      status: record.status,
      errorMessage: record.error_message,
      cacheCreationTokens: record.cache_creation_tokens,
      cacheReadTokens: record.cache_read_tokens,
      inputTokens: record.input_tokens,
      outputTokens: record.output_tokens,
    }
  });

  // Update quota usage atomically
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  await prisma.$transaction(async (tx) => {
    const quota = await tx.userQuota.findUnique({
      where: { userId: record.user_id || 'anonymous' }
    });

    if (!quota) return;

    const dailyReset = quota.dailyResetDate?.toISOString().split('T')[0] !== today;
    const monthlyReset = quota.monthlyResetDate?.toISOString().slice(0, 7) !== thisMonth;

    const dailyUsed = dailyReset ? cost : quota.dailyUsedCents + cost;
    const monthlyUsed = monthlyReset ? cost : quota.monthlyUsedCents + cost;

    await tx.userQuota.update({
      where: { id: quota.id },
      data: {
        dailyUsedCents: dailyUsed,
        monthlyUsedCents: monthlyUsed,
        ...(dailyReset ? { dailyResetDate: new Date(today) } : {}),
        ...(monthlyReset ? { monthlyResetDate: new Date(thisMonth) } : {}),
        updatedAt: new Date(),
      }
    });
  });
}

export async function getApiUsageStats(userId: string, days: number = 30): Promise<UsageStats> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await prisma.apiUsage.aggregate({
    where: {
      userId,
      createdAt: { gte: startDate }
    },
    _count: true,
    _sum: {
      costCents: true,
      cacheReadTokens: true,
    },
    _avg: {
      durationMs: true,
    }
  });

  const total_requests = stats._count || 0;
  const total_cost_cents = stats._sum.costCents || 0;
  const total_cache_reads = stats._sum.cacheReadTokens || 0;
  const avg_duration_ms = stats._avg.durationMs || 0;

  const cacheHitRate = total_requests > 0 
    ? (total_cache_reads / total_requests) * 100 
    : 0;

  return {
    total_requests,
    total_cost_cents,
    total_cache_reads,
    cache_hit_rate: cacheHitRate,
    avg_duration_ms,
  };
}

export async function getModelPerformanceMetrics(model: string, days: number = 30): Promise<ModelPerformanceMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await prisma.apiUsage.aggregate({
    where: {
      model,
      createdAt: { gte: startDate }
    },
    _count: true,
    _sum: {
      costCents: true,
    },
    _avg: {
      durationMs: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 1
  });

  const successful_requests = await prisma.apiUsage.count({
    where: {
      model,
      status: 'success',
      createdAt: { gte: startDate }
    }
  });

  const last_used_record = await prisma.apiUsage.findFirst({
    where: {
      model,
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'desc' }
  });

  const total_requests = stats._count || 0;
  const failed_requests = total_requests - successful_requests;
  const successRate = total_requests > 0 
    ? (successful_requests / total_requests) * 100 
    : 0;

  return {
    model,
    total_requests,
    successful_requests,
    failed_requests,
    success_rate: successRate,
    avg_duration_ms: stats._avg.durationMs || 0,
    total_cost_cents: stats._sum.costCents || 0,
    last_used: last_used_record?.createdAt.toISOString() || "",
  };
}
