import { describe, it, expect } from 'vitest';
import { getAuthUser, requireAuth } from '@/lib/auth';
import type { NextRequest } from 'next/server';

describe('auth', () => {
  describe('getAuthUser', () => {
    it('returns anonymous when no x-user-id header', () => {
      const req = {
        headers: { get: () => null },
      } as unknown as NextRequest;

      const result = getAuthUser(req);
      expect(result.userId).toBe('anonymous');
      expect(result.isAnonymous).toBe(true);
    });

    it('returns userId from header', () => {
      const req = {
        headers: { get: (key: string) => key === 'x-user-id' ? 'user-123' : null },
      } as unknown as NextRequest;

      const result = getAuthUser(req);
      expect(result.userId).toBe('user-123');
      expect(result.isAnonymous).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('returns 401 when no user id', () => {
      const req = {
        headers: { get: () => null },
      } as unknown as NextRequest;

      const result = requireAuth(req);
      expect(typeof result === 'object' && 'status' in result).toBe(true);
      if (typeof result === 'object' && 'status' in result) {
        expect(result.status).toBe(401);
      }
    });

    it('returns 401 for anonymous', () => {
      const req = {
        headers: { get: (key: string) => key === 'x-user-id' ? 'anonymous' : null },
      } as unknown as NextRequest;

      const result = requireAuth(req);
      expect(typeof result === 'object' && 'status' in result).toBe(true);
      if (typeof result === 'object' && 'status' in result) {
        expect(result.status).toBe(401);
      }
    });

    it('returns auth result for valid user', () => {
      const req = {
        headers: { get: (key: string) => key === 'x-user-id' ? 'user-456' : null },
      } as unknown as NextRequest;

      const result = requireAuth(req);
      expect(typeof result === 'object' && 'userId' in result).toBe(true);
      if (typeof result === 'object' && 'userId' in result) {
        expect(result.userId).toBe('user-456');
        expect(result.isAnonymous).toBe(false);
      }
    });
  });
});
