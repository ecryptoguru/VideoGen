-- Create api_usage table for tracking AI API costs and usage
CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  project_id INTEGER,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  duration_ms INTEGER,
  cost_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  cache_creation_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_project_id ON api_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created ON api_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- Create user_quota table for managing user quotas
CREATE TABLE IF NOT EXISTS user_quota (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  daily_quota_cents INTEGER NOT NULL DEFAULT 1000,
  monthly_quota_cents INTEGER NOT NULL DEFAULT 30000,
  daily_used_cents INTEGER DEFAULT 0,
  monthly_used_cents INTEGER DEFAULT 0,
  daily_reset_date DATE,
  monthly_reset_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_quota_user_id ON user_quota(user_id);
