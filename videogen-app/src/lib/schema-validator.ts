/**
 * Schema Validation for API Responses
 * Validates that MiniMax API responses match expected structures
 */

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface VideoResponseSchema {
  task_id?: string;
  status?: string;
  video_url?: string;
  error?: string;
}

export interface TextResponseSchema {
  content?: string;
  model?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface ImageResponseSchema {
  url?: string;
  revised_prompt?: string;
}

export interface AudioResponseSchema {
  url?: string;
  duration?: number;
}

export interface QualityValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export function validateVideoResponse(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Response is not an object"] };
  }

  const response = data as Record<string, unknown>;
  const errors: string[] = [];

  // Check for required or expected fields
  if (response.task_id && typeof response.task_id !== "string") {
    errors.push("task_id must be a string");
  }
  if (response.status && typeof response.status !== "string") {
    errors.push("status must be a string");
  }
  if (response.video_url && typeof response.video_url !== "string") {
    errors.push("video_url must be a string");
  }
  if (response.error && typeof response.error !== "string") {
    errors.push("error must be a string");
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

export function validateTextResponse(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Response is not an object"] };
  }

  const response = data as Record<string, unknown>;
  const errors: string[] = [];

  if (response.content) {
    if (typeof response.content === "string") {
      // Native MiniMax format
    } else if (Array.isArray(response.content)) {
      // Anthropic-compatible format: [{ type: "text", text: "..." }]
      const arr = response.content as unknown[];
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== "object") {
          errors.push(`content[${i}] must be an object`);
          continue;
        }
        const obj = item as Record<string, unknown>;
        if (typeof obj.type !== "string") {
          errors.push(`content[${i}].type must be a string`);
          continue;
        }
        // Only require text for text blocks; other block types (thinking, tool_use) may omit it
        if (obj.type === "text" && typeof obj.text !== "string") {
          errors.push(`content[${i}].text must be a string`);
        }
      }
    } else {
      errors.push("content must be a string or an array of content blocks");
    }
  }
  if (response.model && typeof response.model !== "string") {
    errors.push("model must be a string");
  }

  if (response.usage && typeof response.usage !== "object") {
    errors.push("usage must be an object");
  } else if (response.usage) {
    const usage = response.usage as Record<string, unknown>;
    if (usage.input_tokens && typeof usage.input_tokens !== "number") {
      errors.push("usage.input_tokens must be a number");
    }
    if (usage.output_tokens && typeof usage.output_tokens !== "number") {
      errors.push("usage.output_tokens must be a number");
    }
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

export function validateImageResponse(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Response is not an object"] };
  }

  const response = data as Record<string, unknown>;
  const errors: string[] = [];

  if (response.url && typeof response.url !== "string") {
    errors.push("url must be a string");
  }
  if (response.revised_prompt && typeof response.revised_prompt !== "string") {
    errors.push("revised_prompt must be a string");
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

export function validateAudioResponse(data: unknown): ValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Response is not an object"] };
  }

  const response = data as Record<string, unknown>;
  const errors: string[] = [];

  if (response.url && typeof response.url !== "string") {
    errors.push("url must be a string");
  }
  if (response.duration && typeof response.duration !== "number") {
    errors.push("duration must be a number");
  }

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

export function validateResponse(data: unknown, model: string): ValidationResult {
  switch (model) {
    case "MiniMax-Hailuo-2.3":
      return validateVideoResponse(data);
    case "MiniMax-M2.7":
      return validateTextResponse(data);
    case "image-01":
      return validateImageResponse(data);
    case "speech-2.8-hd":
    case "music-2.6":
      return validateAudioResponse(data);
    default:
      // For unknown models, do basic validation
      if (!data || typeof data !== "object") {
        return { valid: false, errors: ["Response is not an object"] };
      }
      return { valid: true };
  }
}

export function validateImageQuality(url: string): QualityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    return { valid: false, errors: ["Image URL is missing"] };
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return { valid: false, errors: ["Invalid image URL format"] };
  }

  // Check for allowed protocols
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    errors.push("Image URL must use HTTP or HTTPS protocol");
  }

  // Check for suspicious domains
  const suspiciousDomains = ["localhost", "127.0.0.1", "0.0.0.0"];
  if (suspiciousDomains.some(domain => url.includes(domain))) {
    warnings.push("Image URL points to localhost or private IP");
  }

  // Check file extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const hasValidExtension = allowedExtensions.some(ext => 
    url.toLowerCase().endsWith(ext) || url.toLowerCase().includes(ext + "?")
  );
  
  if (!hasValidExtension && !url.includes("minimax")) {
    warnings.push("Image URL may not have a recognized image file extension");
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateVideoQuality(url: string): QualityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    return { valid: false, errors: ["Video URL is missing"] };
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return { valid: false, errors: ["Invalid video URL format"] };
  }

  // Check for allowed protocols
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    errors.push("Video URL must use HTTP or HTTPS protocol");
  }

  // Check for suspicious domains
  const suspiciousDomains = ["localhost", "127.0.0.1", "0.0.0.0"];
  if (suspiciousDomains.some(domain => url.includes(domain))) {
    warnings.push("Video URL points to localhost or private IP");
  }

  // Check file extension
  const allowedExtensions = [".mp4", ".webm", ".mov", ".avi"];
  const hasValidExtension = allowedExtensions.some(ext => 
    url.toLowerCase().endsWith(ext) || url.toLowerCase().includes(ext + "?")
  );
  
  if (!hasValidExtension && !url.includes("minimax")) {
    warnings.push("Video URL may not have a recognized video file extension");
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
