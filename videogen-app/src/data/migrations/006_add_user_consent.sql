-- Create user_consent table for tracking AI data usage consent
CREATE TABLE IF NOT EXISTS user_consent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  ai_data_consent BOOLEAN DEFAULT false,
  consent_date DATETIME,
  consent_version TEXT DEFAULT '1.0',
  data_retention_accepted BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_consent_user_id ON user_consent(user_id);
