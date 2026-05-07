/**
 * Unit tests for JSON validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateJSONString,
  parseJSONSafely,
  stringifyJSONSafely,
  isValidJSONArray,
  isValidJSONObject,
  validateFieldSchema
} from './json-validator';

describe('validateJSONString', () => {
  it('should return true for valid JSON string', () => {
    expect(validateJSONString('{"key": "value"}')).toBe(true);
  });

  it('should return true for valid JSON array', () => {
    expect(validateJSONString('[1, 2, 3]')).toBe(true);
  });

  it('should return false for invalid JSON', () => {
    expect(validateJSONString('{invalid}')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(validateJSONString('')).toBe(false);
  });

  it('should return false for non-string input', () => {
    expect(validateJSONString(null as unknown as string)).toBe(false);
    expect(validateJSONString(undefined as unknown as string)).toBe(false);
  });
});

describe('parseJSONSafely', () => {
  it('should parse valid JSON string', () => {
    const result = parseJSONSafely('{"key": "value"}', {});
    expect(result).toEqual({ key: 'value' });
  });

  it('should return default value for invalid JSON', () => {
    const result = parseJSONSafely('{invalid}', { default: true });
    expect(result).toEqual({ default: true });
  });

  it('should return default value for null input', () => {
    const result = parseJSONSafely(null, { default: true });
    expect(result).toEqual({ default: true });
  });

  it('should return default value for undefined input', () => {
    const result = parseJSONSafely(undefined, { default: true });
    expect(result).toEqual({ default: true });
  });
});

describe('stringifyJSONSafely', () => {
  it('should stringify valid object', () => {
    const result = stringifyJSONSafely({ key: 'value' });
    expect(result).toBe('{"key":"value"}');
  });

  it('should return empty object for circular references', () => {
    const obj: Record<string, unknown> = { key: 'value' };
    obj.self = obj;
    const result = stringifyJSONSafely(obj);
    expect(result).toBe('{}');
  });
});

describe('isValidJSONArray', () => {
  it('should return true for valid JSON array', () => {
    expect(isValidJSONArray('[1, 2, 3]')).toBe(true);
  });

  it('should return false for JSON object', () => {
    expect(isValidJSONArray('{"key": "value"}')).toBe(false);
  });

  it('should return false for invalid JSON', () => {
    expect(isValidJSONArray('invalid')).toBe(false);
  });
});

describe('isValidJSONObject', () => {
  it('should return true for valid JSON object', () => {
    expect(isValidJSONObject('{"key": "value"}')).toBe(true);
  });

  it('should return false for JSON array', () => {
    expect(isValidJSONObject('[1, 2, 3]')).toBe(false);
  });

  it('should return false for invalid JSON', () => {
    expect(isValidJSONObject('invalid')).toBe(false);
  });
});

describe('validateFieldSchema', () => {
  it('should validate script field as array', () => {
    expect(validateFieldSchema('script', '["scene1", "scene2"]')).toBe(true);
    expect(validateFieldSchema('script', '{"key": "value"}')).toBe(false);
  });

  it('should validate thumbnail_urls field as array', () => {
    expect(validateFieldSchema('thumbnail_urls', '["url1", "url2"]')).toBe(true);
    expect(validateFieldSchema('thumbnail_urls', '{"key": "value"}')).toBe(false);
  });

  it('should validate tts_settings field as object', () => {
    expect(validateFieldSchema('tts_settings', '{"speed": 1.0}')).toBe(true);
    expect(validateFieldSchema('tts_settings', '["setting1"]')).toBe(false);
  });

  it('should validate camera_commands field as object', () => {
    expect(validateFieldSchema('camera_commands', '{"pan": "left"}')).toBe(true);
    expect(validateFieldSchema('camera_commands', '["command1"]')).toBe(false);
  });

  it('should return default validation for unknown fields', () => {
    expect(validateFieldSchema('unknown_field', '{"key": "value"}')).toBe(true);
    expect(validateFieldSchema('unknown_field', 'invalid')).toBe(false);
  });
});
