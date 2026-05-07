import db from "@/data/db";

export interface ConsentStatus {
  hasConsent: boolean;
  consentDate?: string;
  consentVersion?: string;
  dataRetentionAccepted?: boolean;
}

const CONSENT_VERSION = "1.0";

export function checkUserConsent(userId: string): ConsentStatus {
  const consent = db.prepare(`
    SELECT ai_data_consent, consent_date, consent_version, data_retention_accepted
    FROM user_consent WHERE user_id = ?
  `).get(userId) as {
    ai_data_consent: number;
    consent_date: string;
    consent_version: string;
    data_retention_accepted: number;
  } | undefined;

  if (!consent) {
    return { hasConsent: false };
  }

  // Check if consent is current
  const isCurrent = consent.consent_version === CONSENT_VERSION;

  return {
    hasConsent: consent.ai_data_consent === 1 && isCurrent,
    consentDate: consent.consent_date,
    consentVersion: consent.consent_version,
    dataRetentionAccepted: consent.data_retention_accepted === 1,
  };
}

export function recordUserConsent(userId: string, dataRetentionAccepted: boolean = false): void {
  const existing = db.prepare("SELECT id FROM user_consent WHERE user_id = ?").get(userId);

  if (existing) {
    db.prepare(`
      UPDATE user_consent
      SET ai_data_consent = 1,
          consent_date = CURRENT_TIMESTAMP,
          consent_version = ?,
          data_retention_accepted = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(CONSENT_VERSION, dataRetentionAccepted ? 1 : 0, userId);
  } else {
    db.prepare(`
      INSERT INTO user_consent (user_id, ai_data_consent, consent_date, consent_version, data_retention_accepted)
      VALUES (?, 1, CURRENT_TIMESTAMP, ?, ?)
    `).run(userId, CONSENT_VERSION, dataRetentionAccepted ? 1 : 0);
  }
}

export function revokeUserConsent(userId: string): void {
  db.prepare(`
    UPDATE user_consent
    SET ai_data_consent = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(userId);
}
