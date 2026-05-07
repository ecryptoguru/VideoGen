/**
 * JSON Validation Utilities
 * Validates JSON strings before storing in database TEXT fields
 */

export function validateJSONString(jsonString: string): boolean {
  if (!jsonString || typeof jsonString !== "string") {
    return false;
  }

  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

export function parseJSONSafely<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) {
    return defaultValue;
  }

  if (!validateJSONString(jsonString)) {
    console.warn("Invalid JSON string, returning default value");
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

export function stringifyJSONSafely(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error("Failed to stringify JSON:", error);
    return "{}";
  }
}

/**
 * Validates that a value is a valid JSON array
 */
export function isValidJSONArray(jsonString: string): boolean {
  if (!validateJSONString(jsonString)) {
    return false;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}

/**
 * Validates that a value is a valid JSON object
 */
export function isValidJSONObject(jsonString: string): boolean {
  if (!validateJSONString(jsonString)) {
    return false;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

/**
 * Validates JSON schema for specific database fields
 */
export function validateFieldSchema(fieldName: string, jsonString: string): boolean {
  switch (fieldName) {
    case "script":
    case "thumbnail_urls":
    case "hashtags":
    case "tags":
    case "chapters":
    case "content_themes":
    case "example_posts":
      return isValidJSONArray(jsonString);

    case "tts_settings":
    case "timestamps":
    case "thumbnail_overlay_json":
    case "camera_commands":
      return isValidJSONObject(jsonString);

    default:
      return validateJSONString(jsonString);
  }
}
