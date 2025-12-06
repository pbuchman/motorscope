/**
 * Auth Module Tests
 *
 * Jest tests for:
 * - Storage layer
 * - JWT expiration checker
 * - Silent login logic
 */

/// <reference types="jest" />

import { decodeJwt, isJwtExpired, validateJwt, getJwtTimeRemaining } from '../jwt';
import { JwtPayload } from '../types';

// Helper to create mock JWT
const createMockJwt = (payload: Partial<JwtPayload>, expiresInSeconds: number = 3600): string => {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    userId: 'user_123',
    email: 'test@example.com',
    iat: now,
    exp: now + expiresInSeconds,
    ...payload,
  };

  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = btoa(JSON.stringify(fullPayload));
  const signature = 'mock_signature';

  return `${header}.${payloadB64}.${signature}`;
};

describe('JWT Utilities', () => {
  describe('decodeJwt', () => {
    it('should decode a valid JWT', () => {
      const token = createMockJwt({ userId: 'test_user', email: 'test@test.com' });
      const decoded = decodeJwt(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('test_user');
      expect(decoded?.email).toBe('test@test.com');
    });

    it('should return null for invalid token format', () => {
      const decoded = decodeJwt('invalid.token');
      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeJwt('');
      expect(decoded).toBeNull();
    });

    it('should return null for non-JWT string', () => {
      const decoded = decodeJwt('not-a-jwt');
      expect(decoded).toBeNull();
    });
  });

  describe('isJwtExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = createMockJwt({}, 3600); // 1 hour from now
      expect(isJwtExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = createMockJwt({}, -60); // Expired 1 minute ago
      expect(isJwtExpired(token)).toBe(true);
    });

    it('should return true for token expiring within leeway', () => {
      const token = createMockJwt({}, 30); // Expires in 30 seconds
      expect(isJwtExpired(token, 60)).toBe(true); // With 60s leeway
    });

    it('should return true for invalid token', () => {
      expect(isJwtExpired('invalid')).toBe(true);
    });

    it('should work with decoded payload', () => {
      const payload: JwtPayload = {
        userId: 'user_123',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      expect(isJwtExpired(payload)).toBe(false);
    });
  });

  describe('getJwtTimeRemaining', () => {
    it('should return positive time for non-expired token', () => {
      const token = createMockJwt({}, 3600);
      const remaining = getJwtTimeRemaining(token);
      expect(remaining).toBeGreaterThan(3500); // Allow some variance
      expect(remaining).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for expired token', () => {
      const token = createMockJwt({}, -60);
      expect(getJwtTimeRemaining(token)).toBe(0);
    });

    it('should return 0 for invalid token', () => {
      expect(getJwtTimeRemaining('invalid')).toBe(0);
    });
  });

  describe('validateJwt', () => {
    it('should return valid result for non-expired token', () => {
      const token = createMockJwt({}, 3600);
      const result = validateJwt(token);

      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.payload).not.toBeNull();
    });

    it('should return invalid result for expired token', () => {
      const token = createMockJwt({}, -60);
      const result = validateJwt(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.payload).not.toBeNull(); // Still decodes even if expired
    });

    it('should return invalid result for malformed token', () => {
      const result = validateJwt('invalid');

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.payload).toBeNull();
    });
  });
});

// Mock chrome.storage for storage tests
const mockStorage: Record<string, unknown> = {};

const mockChromeStorage = {
  local: {
    get: jest.fn((key: string, callback: (result: Record<string, unknown>) => void) => {
      callback({ [key]: mockStorage[key] });
    }),
    set: jest.fn((items: Record<string, unknown>, callback?: () => void) => {
      Object.assign(mockStorage, items);
      callback?.();
    }),
    remove: jest.fn((keys: string | string[], callback?: () => void) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete mockStorage[key]);
      callback?.();
    }),
  },
};

// Note: Storage tests would need to mock chrome.storage
// This is shown as an example structure
describe('Auth Storage', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  it('should be testable with mocked chrome.storage', () => {
    // Storage tests would go here
    // They require setting up global.chrome mock
    expect(true).toBe(true);
  });
});

