/**
 * Unit tests for request ID generation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateRequestId,
  generateShortRequestId,
  setRequestContext,
  getRequestContext,
  clearRequestContext,
  getAllActiveContexts
} from './request-id';

describe('generateRequestId', () => {
  it('should generate a unique request ID', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('should contain timestamp and random string', () => {
    const id = generateRequestId();
    
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });
});

describe('generateShortRequestId', () => {
  it('should generate a short request ID', () => {
    const id = generateShortRequestId();
    
    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(0);
  });

  it('should be shorter than full request ID', () => {
    const shortId = generateShortRequestId();
    const fullId = generateRequestId();
    
    expect(shortId.length).toBeLessThan(fullId.length);
  });
});

describe('RequestContext', () => {
  it('should set and get request context', () => {
    const context = {
      requestId: 'req-123',
      userId: 'user-456',
      endpoint: '/api/test',
      method: 'POST',
      startTime: Date.now(),
    };

    setRequestContext(context);
    const retrieved = getRequestContext('req-123');
    
    expect(retrieved).toEqual(context);
  });

  it('should return undefined for non-existent context', () => {
    const retrieved = getRequestContext('non-existent');
    expect(retrieved).toBeUndefined();
  });

  it('should clear specific request context', () => {
    const context = {
      requestId: 'req-123',
      userId: 'user-456',
    };

    setRequestContext(context);
    clearRequestContext('req-123');
    
    const retrieved = getRequestContext('req-123');
    expect(retrieved).toBeUndefined();
  });

  it('should get all active contexts', () => {
    const context1 = { requestId: 'req-1', userId: 'user-1' };
    const context2 = { requestId: 'req-2', userId: 'user-2' };

    setRequestContext(context1);
    setRequestContext(context2);
    
    const allContexts = getAllActiveContexts();
    
    expect(allContexts).toHaveLength(2);
    expect(allContexts).toContainEqual(context1);
    expect(allContexts).toContainEqual(context2);
    
    // Clean up
    clearRequestContext('req-1');
    clearRequestContext('req-2');
  });
});
