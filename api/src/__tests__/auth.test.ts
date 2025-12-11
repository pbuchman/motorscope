/**
 * Tests for Authentication Module
 *
 * Tests JWT generation, verification, and utility functions.
 * Note: ESM module mocking is complex, so we test the utility functions
 * that don't require Firestore access directly.
 */

import { describe, it, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Test JWT utility functions directly without complex mocking
// These tests use the actual JWT library but mock just the secret

const TEST_SECRET = 'test-secret-key-for-testing';

describe('Authentication Module', () => {
  describe('JWT Token Structure', () => {
    it('should create valid JWT with 3 parts', () => {
      const token = jwt.sign(
        { userId: 'user_123', email: 'test@example.com', jti: 'test-jti' },
        TEST_SECRET,
        { expiresIn: '1h' }
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId, email, and jti in payload', () => {
      const payload = { userId: 'user_456', email: 'user@test.com', jti: 'unique-id' };
      const token = jwt.sign(payload, TEST_SECRET);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe('user_456');
      expect(decoded.email).toBe('user@test.com');
      expect(decoded.jti).toBe('unique-id');
    });

    it('should include expiration claim when set', () => {
      const token = jwt.sign(
        { userId: 'user_123', email: 'test@example.com' },
        TEST_SECRET,
        { expiresIn: '1h' }
      );
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('JWT Verification', () => {
    it('should verify valid token', () => {
      const token = jwt.sign(
        { userId: 'user_123', email: 'test@example.com' },
        TEST_SECRET
      );

      const payload = jwt.verify(token, TEST_SECRET) as any;

      expect(payload.userId).toBe('user_123');
      expect(payload.email).toBe('test@example.com');
    });

    it('should throw for invalid token structure', () => {
      expect(() => jwt.verify('invalid-token', TEST_SECRET)).toThrow();
    });

    it('should throw for tampered token', () => {
      const token = jwt.sign(
        { userId: 'user_123', email: 'test@example.com' },
        TEST_SECRET
      );
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => jwt.verify(tamperedToken, TEST_SECRET)).toThrow();
    });

    it('should throw for token with wrong secret', () => {
      const token = jwt.sign(
        { userId: 'user_123', email: 'test@example.com' },
        'wrong-secret'
      );

      expect(() => jwt.verify(token, TEST_SECRET)).toThrow();
    });

    it('should throw for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user_123', email: 'test@example.com' },
        TEST_SECRET,
        { expiresIn: '-1h' }
      );

      expect(() => jwt.verify(expiredToken, TEST_SECRET)).toThrow(/expired/i);
    });
  });

  describe('Token Expiration Logic', () => {
    it('should extract expiration from exp claim', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = { exp: futureTime };

      const expDate = payload.exp ? new Date(payload.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

      expect(expDate).toBeInstanceOf(Date);
      expect(Math.floor(expDate.getTime() / 1000)).toBe(futureTime);
    });

    it('should default to 24h when exp is not set', () => {
      const payload = { userId: 'user_123' };

      const expDate = (payload as any).exp
        ? new Date((payload as any).exp * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      const expectedMin = Date.now() + 23 * 60 * 60 * 1000;
      const expectedMax = Date.now() + 25 * 60 * 60 * 1000;

      expect(expDate.getTime()).toBeGreaterThan(expectedMin);
      expect(expDate.getTime()).toBeLessThan(expectedMax);
    });
  });

  describe('Authorization Header Parsing Logic', () => {
    const parseAuthHeader = (header: string | undefined): string | null => {
      if (!header) return null;
      const parts = header.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
      return parts[1];
    };

    it('should extract token from valid Bearer header', () => {
      const token = parseAuthHeader('Bearer abc123');
      expect(token).toBe('abc123');
    });

    it('should return null for missing header', () => {
      expect(parseAuthHeader(undefined)).toBeNull();
    });

    it('should return null for wrong auth scheme', () => {
      expect(parseAuthHeader('Basic abc123')).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      expect(parseAuthHeader('Bearer')).toBeNull();
    });

    it('should return null for token without Bearer', () => {
      expect(parseAuthHeader('abc123')).toBeNull();
    });

    it('should handle Bearer with multiple spaces', () => {
      // "Bearer  token" would split into 3 parts
      expect(parseAuthHeader('Bearer  token')).toBeNull();
    });
  });

  describe('JTI (JWT ID) Uniqueness', () => {
    it('should generate unique JTIs using crypto.randomUUID pattern', () => {
      // Test the pattern used for generating unique IDs
      const generateJti = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

      const jti1 = generateJti();
      const jti2 = generateJti();

      expect(jti1).not.toBe(jti2);
      expect(jti1.length).toBeGreaterThan(10);
    });
  });
});

describe('auth.ts integration tests', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    // restore env and global.fetch
    process.env = { ...ORIGINAL_ENV } as NodeJS.ProcessEnv;
    // @ts-ignore
    if (global.fetch && (global.fetch as any).__isMock) {
      // @ts-ignore
      global.fetch = undefined;
    }
    jest.resetModules();
  });

  it('verifyGoogleToken should return payload on valid ticket', async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.OAUTH_CLIENT_ID = 'test-client-id';

    // Mock google-auth-library OAuth2Client
    (jest as any).unstable_mockModule('google-auth-library', () => {
      class MockTicket {
        payload: any;
        constructor(payload: any) {
          this.payload = payload;
        }
        getPayload() {
          return this.payload;
        }
      }
      return {
        OAuth2Client: class {
          constructor() {}
          async verifyIdToken({ idToken: _idToken, audience: _audience }: any) {
            return new MockTicket({ sub: 'g-sub', email: 'g@ex.com', name: 'G' });
          }
        },
      } as any;
    });

    const auth = await import('../auth.js');

    const payload = await auth.verifyGoogleToken('fake-id-token');
    expect(payload.sub).toBe('g-sub');
    expect(payload.email).toBe('g@ex.com');
  });

  it('verifyGoogleToken should throw when payload missing', async () => {
    process.env.OAUTH_CLIENT_ID = 'test-client-id';
    (jest as any).unstable_mockModule('google-auth-library', () => {
      return {
        OAuth2Client: class {
          async verifyIdToken() {
            return { getPayload: () => null } as any;
          }
        },
      } as any;
    });

    const auth = await import('../auth.js');

    await expect(auth.verifyGoogleToken('bad')).rejects.toThrow(/Invalid or expired Google token/);
  });

  it('verifyGoogleAccessToken should return payload on OK fetch', async () => {
    process.env.OAUTH_CLIENT_ID = 'test-client-id';

    // Mock fetch
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sub: 'g-sub', email: 'g@ex.com', name: 'G' }),
    });
    // mark mock so we can restore
    // @ts-ignore
    (global.fetch as any).__isMock = true;

    const auth = await import('../auth.js');

    const payload = await auth.verifyGoogleAccessToken('fake-access-token');
    expect(payload.sub).toBe('g-sub');
    expect(payload.email).toBe('g@ex.com');
  });

  it('verifyGoogleAccessToken should throw on non-OK fetch', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    // @ts-ignore
    (global.fetch as any).__isMock = true;

    const auth = await import('../auth.js');

    await expect(auth.verifyGoogleAccessToken('bad')).rejects.toThrow(/Invalid or expired Google access token/);
  });

  it('generateJwt/verifyJwt roundtrip and expiration extraction', async () => {
    process.env.JWT_SECRET = 'roundtrip-secret';
    const auth = await import('../auth.js');

    const token = auth.generateJwt('user-1', 'u@ex.com');
    expect(typeof token).toBe('string');

    const decoded = auth.verifyJwt(token);
    expect(decoded.userId).toBe('user-1');
    expect(decoded.email).toBe('u@ex.com');

    const expDate = auth.getTokenExpiration(decoded as any);
    expect(expDate).toBeInstanceOf(Date);
  });

  it('verifyJwtWithBlacklistCheck should throw when token is blacklisted', async () => {
    process.env.JWT_SECRET = 'blacklist-secret';

    // Mock db.isTokenBlacklisted
    const mockIsTokenBlacklisted = jest.fn().mockResolvedValue(true);
    (jest as any).unstable_mockModule('../db.js', () => ({ isTokenBlacklisted: mockIsTokenBlacklisted }));

    const auth = await import('../auth.js');

    const token = auth.generateJwt('u2', 'u2@ex.com');
    await expect(auth.verifyJwtWithBlacklistCheck(token)).rejects.toThrow(/revoked|Token has been revoked/);
  });

  it('authMiddleware should attach user on valid Bearer token and call next', async () => {
    process.env.JWT_SECRET = 'mw-secret';

    // Mock db.isTokenBlacklisted to false
    const mockIsTokenBlacklisted = jest.fn().mockResolvedValue(false);
    (jest as any).unstable_mockModule('../db.js', () => ({ isTokenBlacklisted: mockIsTokenBlacklisted }));

    const auth = await import('../auth.js');

    const token = auth.generateJwt('mw-user', 'mw@ex.com');

    const req: any = { headers: { authorization: `Bearer ${token}` } };

    const res: any = {
      status: function(code: number) {
        this._status = code;
        return this;
      },
      json: function(payload: any) {
        this._body = payload;
        return this;
      },
    };

    // Call middleware and await asynchronous verification (it uses .then)
    await new Promise<void>((resolve) => {
      auth.authMiddleware(req, res, () => {
        // next will be called asynchronously
        resolve();
      });
    });

    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('mw-user');
  });

  it('authMiddleware should return 401 for missing Authorization header', async () => {
    const auth = await import('../auth.js');

    const req: any = { headers: {} };
    const res: any = {
      status: function(code: number) { this._status = code; return this; },
      json: function(body: any) { this._body = body; return this; },
    };

    let finished = false;
    await new Promise<void>((resolve) => {
      auth.authMiddleware(req, res, () => { finished = true; resolve(); });
      // allow microtask to finish
      setImmediate(resolve);
    });

    expect(res._status).toBe(401);
    expect(res._body.message).toContain('Authorization header is required');
  });

  it('authMiddleware should return 401 for invalid Bearer header format', async () => {
    const auth = await import('../auth.js');

    const req: any = { headers: { authorization: 'Basic abc' } };
    const res: any = {
      status: function(code: number) { this._status = code; return this; },
      json: function(body: any) { this._body = body; return this; },
    };

    await new Promise<void>((resolve) => {
      auth.authMiddleware(req, res, () => { resolve(); });
      setImmediate(resolve);
    });

    expect(res._status).toBe(401);
    expect(res._body.message).toContain('Authorization header must be: Bearer');
  });

  // =========================================================================
  // Additional edge case tests for full coverage
  // =========================================================================

  describe('verifyGoogleToken edge cases', () => {
    it('should throw when payload has sub but missing email', async () => {
      process.env.OAUTH_CLIENT_ID = 'test-client-id';
      (jest as any).unstable_mockModule('google-auth-library', () => ({
        OAuth2Client: class {
          async verifyIdToken() {
            return { getPayload: () => ({ sub: 'g-sub' }) };
          }
        },
      }));

      const auth = await import('../auth.js');
      await expect(auth.verifyGoogleToken('token')).rejects.toThrow(/Invalid or expired Google token/);
    });

    it('should throw when payload has email but missing sub', async () => {
      process.env.OAUTH_CLIENT_ID = 'test-client-id';
      (jest as any).unstable_mockModule('google-auth-library', () => ({
        OAuth2Client: class {
          async verifyIdToken() {
            return { getPayload: () => ({ email: 'e@ex.com' }) };
          }
        },
      }));

      const auth = await import('../auth.js');
      await expect(auth.verifyGoogleToken('token')).rejects.toThrow(/Invalid or expired Google token/);
    });

    it('should throw when verifyIdToken throws an error', async () => {
      process.env.OAUTH_CLIENT_ID = 'test-client-id';
      (jest as any).unstable_mockModule('google-auth-library', () => ({
        OAuth2Client: class {
          async verifyIdToken() {
            throw new Error('Network error');
          }
        },
      }));

      const auth = await import('../auth.js');
      await expect(auth.verifyGoogleToken('token')).rejects.toThrow(/Invalid or expired Google token/);
    });
  });

  describe('verifyGoogleAccessToken edge cases', () => {
    it('should throw when userinfo has sub but missing email', async () => {
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sub: 'g-sub' }),
      });
      // @ts-ignore
      (global.fetch as any).__isMock = true;

      const auth = await import('../auth.js');
      await expect(auth.verifyGoogleAccessToken('token')).rejects.toThrow(/Invalid or expired Google access token/);
    });

    it('should throw when userinfo has email but missing sub', async () => {
      // @ts-ignore
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ email: 'e@ex.com' }),
      });
      // @ts-ignore
      (global.fetch as any).__isMock = true;

      const auth = await import('../auth.js');
      await expect(auth.verifyGoogleAccessToken('token')).rejects.toThrow(/Invalid or expired Google access token/);
    });

    it('should throw when fetch throws an error', async () => {
      // @ts-ignore
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      // @ts-ignore
      (global.fetch as any).__isMock = true;

      const auth = await import('../auth.js');
      await expect(auth.verifyGoogleAccessToken('token')).rejects.toThrow(/Invalid or expired Google access token/);
    });
  });

  describe('generateJwt edge cases', () => {
    it('should throw when JWT_SECRET is empty string', async () => {
      process.env.JWT_SECRET = '';
      const auth = await import('../auth.js');

      expect(() => auth.generateJwt('user', 'email@ex.com')).toThrow(/JWT_SECRET is not configured/);
    });

    it('should throw when JWT_SECRET is undefined', async () => {
      delete process.env.JWT_SECRET;
      const auth = await import('../auth.js');

      expect(() => auth.generateJwt('user', 'email@ex.com')).toThrow(/JWT_SECRET is not configured/);
    });
  });

  describe('verifyJwt edge cases', () => {
    it('should throw "Token has expired" for expired token', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const auth = await import('../auth.js');

      const expiredToken = jwt.sign(
        { userId: 'user', email: 'e@ex.com', jti: 'jti' },
        'test-secret',
        { expiresIn: '-1h' }
      );

      expect(() => auth.verifyJwt(expiredToken)).toThrow(/Token has expired/);
    });

    it('should throw "Invalid token" for malformed token', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const auth = await import('../auth.js');

      expect(() => auth.verifyJwt('not.a.valid.token')).toThrow(/Invalid token/);
    });

    it('should throw "Invalid token" for tampered token', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const auth = await import('../auth.js');

      const token = jwt.sign({ userId: 'user', email: 'e@ex.com' }, 'test-secret');
      const tampered = token.slice(0, -10) + 'xxxxxxxxxx';

      expect(() => auth.verifyJwt(tampered)).toThrow(/Invalid token/);
    });

    it('should throw when JWT_SECRET is not configured', async () => {
      process.env.JWT_SECRET = '';
      const auth = await import('../auth.js');

      expect(() => auth.verifyJwt('any-token')).toThrow(/JWT_SECRET is not configured/);
    });
  });

  describe('verifyJwtWithBlacklistCheck edge cases', () => {
    it('should skip blacklist check when token has no jti (legacy)', async () => {
      process.env.JWT_SECRET = 'test-secret';

      const mockIsTokenBlacklisted = jest.fn().mockResolvedValue(false);
      (jest as any).unstable_mockModule('../db.js', () => ({ isTokenBlacklisted: mockIsTokenBlacklisted }));

      const auth = await import('../auth.js');

      // Create token without jti
      const tokenWithoutJti = jwt.sign({ userId: 'user', email: 'e@ex.com' }, 'test-secret');

      const result = await auth.verifyJwtWithBlacklistCheck(tokenWithoutJti);
      expect(result.userId).toBe('user');
      expect(mockIsTokenBlacklisted).not.toHaveBeenCalled();
    });

    it('should pass when token is not blacklisted', async () => {
      process.env.JWT_SECRET = 'test-secret';

      const mockIsTokenBlacklisted = jest.fn().mockResolvedValue(false);
      (jest as any).unstable_mockModule('../db.js', () => ({ isTokenBlacklisted: mockIsTokenBlacklisted }));

      const auth = await import('../auth.js');
      const token = auth.generateJwt('user', 'e@ex.com');

      const result = await auth.verifyJwtWithBlacklistCheck(token);
      expect(result.userId).toBe('user');
      expect(mockIsTokenBlacklisted).toHaveBeenCalled();
    });
  });

  describe('getTokenExpiration edge cases', () => {
    it('should return exp date when exp claim exists', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const auth = await import('../auth.js');

      const futureTimestamp = Math.floor(Date.now() / 1000) + 7200;
      const payload = { userId: 'user', email: 'e@ex.com', exp: futureTimestamp };

      const expDate = auth.getTokenExpiration(payload as any);
      expect(expDate.getTime()).toBe(futureTimestamp * 1000);
    });

    it('should return 24h from now when exp claim is missing', async () => {
      process.env.JWT_SECRET = 'test-secret';
      const auth = await import('../auth.js');

      const payload = { userId: 'user', email: 'e@ex.com' };

      const before = Date.now();
      const expDate = auth.getTokenExpiration(payload as any);
      const after = Date.now();

      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;

      expect(expDate.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expDate.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('authMiddleware edge cases', () => {
    it('should return 401 when JWT verification fails', async () => {
      process.env.JWT_SECRET = 'test-secret';

      const mockIsTokenBlacklisted = jest.fn().mockResolvedValue(false);
      (jest as any).unstable_mockModule('../db.js', () => ({ isTokenBlacklisted: mockIsTokenBlacklisted }));

      const auth = await import('../auth.js');

      const req: any = { headers: { authorization: 'Bearer invalid.token.here' } };
      const res: any = {
        _status: 0,
        _body: null,
        status(code: number) { this._status = code; return this; },
        json(body: any) { this._body = body; return this; },
      };

      await new Promise<void>((resolve) => {
        auth.authMiddleware(req, res, () => resolve());
        setImmediate(resolve);
      });

      expect(res._status).toBe(401);
      expect(res._body.error).toBe('Unauthorized');
      expect(res._body.message).toContain('Invalid token');
    });

    it('should return 401 when token is blacklisted', async () => {
      process.env.JWT_SECRET = 'test-secret';

      const mockIsTokenBlacklisted = jest.fn().mockResolvedValue(true);
      (jest as any).unstable_mockModule('../db.js', () => ({ isTokenBlacklisted: mockIsTokenBlacklisted }));

      const auth = await import('../auth.js');
      const token = auth.generateJwt('user', 'e@ex.com');

      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const res: any = {
        _status: 0,
        _body: null,
        status(code: number) { this._status = code; return this; },
        json(body: any) { this._body = body; return this; },
      };

      await new Promise<void>((resolve) => {
        auth.authMiddleware(req, res, () => resolve());
        setImmediate(resolve);
      });

      expect(res._status).toBe(401);
      expect(res._body.message).toContain('revoked');
    });

    it('should handle non-Error thrown from verification', async () => {
      process.env.JWT_SECRET = 'test-secret';

      const mockIsTokenBlacklisted = jest.fn().mockRejectedValue('string error');
      (jest as any).unstable_mockModule('../db.js', () => ({ isTokenBlacklisted: mockIsTokenBlacklisted }));

      const auth = await import('../auth.js');
      const token = auth.generateJwt('user', 'e@ex.com');

      const req: any = { headers: { authorization: `Bearer ${token}` } };
      const res: any = {
        _status: 0,
        _body: null,
        status(code: number) { this._status = code; return this; },
        json(body: any) { this._body = body; return this; },
      };

      await new Promise<void>((resolve) => {
        auth.authMiddleware(req, res, () => resolve());
        setImmediate(resolve);
      });

      expect(res._status).toBe(401);
      expect(res._body.message).toBe('Authentication failed');
    });
  });
});
