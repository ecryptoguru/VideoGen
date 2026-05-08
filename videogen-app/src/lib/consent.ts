import { prisma } from "@/lib/db";

export interface ConsentStatus {
  hasConsent: boolean;
  consentDate?: string;
  consentVersion?: string;
  dataRetentionAccepted?: boolean;
}

const CONSENT_VERSION = "1.0";

export async function checkUserConsent(userId: string): Promise<ConsentStatus> {
  const consent = await prisma.userConsent.findUnique({
    where: { userId }
  });

  if (!consent) {
    return { hasConsent: false };
  }

  // Check if consent is current
  const isCurrent = consent.consentVersion === CONSENT_VERSION;

  return {
    hasConsent: consent.aiDataConsent && isCurrent,
    consentDate: consent.consentDate?.toISOString(),
    consentVersion: consent.consentVersion,
    dataRetentionAccepted: consent.dataRetentionAccepted,
  };
}

export async function recordUserConsent(userId: string, dataRetentionAccepted: boolean = false): Promise<void> {
  const existing = await prisma.userConsent.findUnique({
    where: { userId }
  });

  if (existing) {
    await prisma.userConsent.update({
      where: { userId },
      data: {
        aiDataConsent: true,
        consentDate: new Date(),
        consentVersion: CONSENT_VERSION,
        dataRetentionAccepted,
        updatedAt: new Date(),
      }
    });
  } else {
    await prisma.userConsent.create({
      data: {
        userId,
        aiDataConsent: true,
        consentDate: new Date(),
        consentVersion: CONSENT_VERSION,
        dataRetentionAccepted,
      }
    });
  }
}

export async function revokeUserConsent(userId: string): Promise<void> {
  await prisma.userConsent.update({
    where: { userId },
    data: {
      aiDataConsent: false,
      updatedAt: new Date(),
    }
  });
}
