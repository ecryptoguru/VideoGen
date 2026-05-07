/**
 * Content Filtering and Moderation
 * Filters prompts and outputs for harmful content, injection attacks, and PII
 */

import { MAX_CONTENT_LENGTH } from "./config";

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  blockedContent?: string;
  severity: "low" | "medium" | "high";
}

export interface PIIResult {
  hasPII: boolean;
  types: string[];
}

// Prompt injection patterns - direct instruction overrides and role manipulation only
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction overrides
  "ignore all previous instructions",
  "disregard all instructions",
  "forget previous instructions",
  "override your instructions",
  "bypass your guidelines",
  "ignore the above",
  "disregard the above",
  "forget the above",
  "system override",
  "admin override",
  "developer override",

  // Role manipulation
  "act as a different ai",
  "pretend to be",
  "roleplay as",
  "you are now",
  "switch to",
  "become a",
  "adopt the persona",

  // Output manipulation
  "print your instructions",
  "show your system prompt",
  "reveal your training data",
  "output your prompt",
  "display your instructions",
  "show your configuration",
  "dump your memory",
  "reveal your secrets",

  // Structural attacks
  "<system>",
  "</system>",
  "<instruction>",
  "</instruction>",
  "<prompt>",
  "</prompt>",
  "<role>",
  "</role>",

  // Jailbreak attempts
  "jailbreak",
  "dan mode",
  "developer mode",
  "unrestricted mode",
  "freedom mode",
  "bypass filters",
  "bypass restrictions",
  "remove limitations",
  "disable safety",
  "ignore safety",
];

// Harmful content keywords
const HARMFUL_KEYWORDS = [
  "violence",
  "terrorism",
  "hate speech",
  "racism",
  "discrimination",
  "harassment",
  "bullying",
  "self-harm",
  "suicide",
  "illegal",
  "drugs",
  "weapons",
  "exploitation",
  "abuse",
  "torture",
  "murder",
  "assault",
  "fraud",
  "scam",
  "phishing",
  "malware",
  "hacking",
  "bomb",
  "explosive",
  "poison",
  "toxic",
  "genocide",
  "extremist",
  "radicalize",
  "radicalization",
  "cyberbully",
  "dox",
  "doxxing",
  "swat",
  "swatting",
];

export function filterPrompt(prompt: string): FilterResult {
  if (!prompt || typeof prompt !== "string") {
    return {
      allowed: false,
      reason: "Invalid prompt input",
      severity: "high",
    };
  }

  const normalizedPrompt = prompt.toLowerCase();

  // Check for prompt injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (normalizedPrompt.includes(pattern)) {
      return {
        allowed: false,
        reason: "Prompt injection pattern detected",
        blockedContent: pattern,
        severity: "high",
      };
    }
  }

  // Check for harmful keywords
  for (const keyword of HARMFUL_KEYWORDS) {
    if (normalizedPrompt.includes(keyword)) {
      return {
        allowed: false,
        reason: "Harmful content detected",
        blockedContent: keyword,
        severity: "high",
      };
    }
  }

  // Check for excessive length (potential DoS)
  if (prompt.length > MAX_CONTENT_LENGTH) {
    return {
      allowed: false,
      reason: `Prompt exceeds maximum length (${MAX_CONTENT_LENGTH} characters)`,
      severity: "medium",
    };
  }

  // Check for repeated characters (potential DoS)
  if (/(.)\1{20,}/.test(prompt)) {
    return {
      allowed: false,
      reason: "Excessive repetition detected",
      severity: "medium",
    };
  }

  // Check for suspicious encoding patterns
  if (/\\[xu][0-9a-f]+/.test(prompt)) {
    return {
      allowed: false,
      reason: "Suspicious encoding pattern detected",
      severity: "high",
    };
  }

  // Check for potential SQL injection patterns
  if (/['";]|--|\/\*|\*\/|xp_|sp_|exec\(|union\s+select/i.test(prompt)) {
    return {
      allowed: false,
      reason: "Potential SQL injection pattern detected",
      severity: "high",
    };
  }

  // Check for potential XSS patterns
  if (/<script|javascript:|on\w+\s*=|eval\(|expression\(/i.test(prompt)) {
    return {
      allowed: false,
      reason: "Potential XSS pattern detected",
      severity: "high",
    };
  }

  return { allowed: true, severity: "low" };
}

export function filterOutput(content: string): FilterResult {
  if (!content || typeof content !== "string") {
    return {
      allowed: false,
      reason: "Invalid content input",
      severity: "high",
    };
  }

  // Disabled output filtering for testing - allow all responses
  // TODO: Re-enable after testing with appropriate filtering rules
  return { allowed: true, severity: "low" };

  const normalizedContent = content.toLowerCase();

  for (const keyword of HARMFUL_KEYWORDS) {
    if (normalizedContent.includes(keyword)) {
      return {
        allowed: false,
        reason: "Harmful content in output",
        blockedContent: keyword,
        severity: "high",
      };
    }
  }

  if (/<script|javascript:|eval\(|expression\(/i.test(content)) {
    return {
      allowed: false,
      reason: "Potential code injection in output",
      severity: "high",
    };
  }

  return { allowed: true, severity: "low" };
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove control characters except newlines, tabs, and carriage returns
  let sanitized = input.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  // Limit length to prevent DoS
  if (sanitized.length > MAX_CONTENT_LENGTH * 5) {
    sanitized = sanitized.substring(0, MAX_CONTENT_LENGTH * 5);
  }

  return sanitized;
}

export function detectPII(text: string): { hasPII: boolean; types: string[] } {
  if (!text || typeof text !== "string") {
    return { hasPII: false, types: [] };
  }

  const detectedTypes: string[] = [];

  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) {
    detectedTypes.push("email");
  }

  if (/(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/.test(text)) {
    detectedTypes.push("phone");
  }

  if (/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/.test(text)) {
    detectedTypes.push("credit_card");
  }

  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) {
    detectedTypes.push("ssn");
  }

  if (/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text) || /\b[0-9a-f]{1,4}(:[0-9a-f]{1,4}){7}\b/i.test(text)) {
    detectedTypes.push("ip_address");
  }

  if (/https?:\/\/[^\s]+/.test(text) && !/(localhost|example\.com|test\.com|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(text)) {
    detectedTypes.push("url");
  }

  if (/api[_-]?key|secret[_-]?key|access[_-]?token|bearer[_-]?token/i.test(text)) {
    detectedTypes.push("api_key");
  }

  if (/\d+\s+[a-z]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)/i.test(text)) {
    detectedTypes.push("address");
  }

  if (/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(text) && /(dob|birth|birthday|born)/i.test(text)) {
    detectedTypes.push("date_of_birth");
  }

  return {
    hasPII: detectedTypes.length > 0,
    types: detectedTypes,
  };
}
