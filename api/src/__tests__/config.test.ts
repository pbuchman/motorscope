/**
 * Tests for Configuration Module
 */

import {afterAll, beforeEach, describe, expect, it, jest} from '@jest/globals';

describe('Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = {...originalEnv};
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('Environment Variables', () => {
        it('should have default GCP_PROJECT_ID', async () => {
            delete process.env.GCP_PROJECT_ID;
            const config = await import('../config.js');

            expect(config.GCP_PROJECT_ID).toBe('motorscope');
        });

        it('should use custom GCP_PROJECT_ID from env', async () => {
            process.env.GCP_PROJECT_ID = 'my-project';
            const config = await import('../config.js');

            expect(config.GCP_PROJECT_ID).toBe('my-project');
        });

        it('should have default PORT', async () => {
            delete process.env.PORT;
            const config = await import('../config.js');

            expect(config.PORT).toBe(8080);
        });

        it('should use PORT from env', async () => {
            process.env.PORT = '3000';
            const config = await import('../config.js');

            expect(config.PORT).toBe(3000);
        });

        it('should default NODE_ENV to development', async () => {
            delete process.env.NODE_ENV;
            const config = await import('../config.js');

            expect(config.NODE_ENV).toBe('development');
        });

        it('should detect production environment', async () => {
            process.env.NODE_ENV = 'production';
            const config = await import('../config.js');

            expect(config.IS_PRODUCTION).toBe(true);
        });
    });

    describe('Firestore Collections', () => {
        it('should have correct collection names', async () => {
            const config = await import('../config.js');

            expect(config.FIRESTORE_USERS_COLLECTION).toBe('users');
            expect(config.FIRESTORE_LISTINGS_COLLECTION).toBe('listings');
            expect(config.FIRESTORE_GEMINI_HISTORY_COLLECTION).toBe('gemini_history');
            expect(config.FIRESTORE_TOKEN_BLACKLIST_COLLECTION).toBe('token_blacklist');
        });

        it('should have correct database ID', async () => {
            const config = await import('../config.js');

            expect(config.FIRESTORE_DATABASE_ID).toBe('motorscopedb');
        });

        it('should have userId field name for listings', async () => {
            const config = await import('../config.js');

            expect(config.FIRESTORE_LISTINGS_USER_FIELD).toBe('userId');
        });
    });

    describe('JWT Configuration', () => {
        it('should have JWT expiration', async () => {
            const config = await import('../config.js');

            expect(config.JWT_EXPIRATION).toBe('24h');
        });

        it('should default JWT_SECRET to empty string when not set', async () => {
            delete process.env.JWT_SECRET;
            const config = await import('../config.js');

            expect(config.JWT_SECRET).toBe('');
        });
    });

    describe('validateConfig', () => {
        it('should not throw in development mode without secrets', async () => {
            process.env.NODE_ENV = 'development';
            delete process.env.JWT_SECRET;
            delete process.env.OAUTH_CLIENT_ID;
            delete process.env.ALLOWED_ORIGIN_EXTENSION;

            const config = await import('../config.js');

            expect(() => config.validateConfig()).not.toThrow();
        });

        it('should throw in production without JWT_SECRET', async () => {
            process.env.NODE_ENV = 'production';
            delete process.env.JWT_SECRET;
            process.env.OAUTH_CLIENT_ID = 'test-client-id';
            process.env.ALLOWED_ORIGIN_EXTENSION = 'chrome-extension://test';

            const config = await import('../config.js');

            expect(() => config.validateConfig()).toThrow('JWT_SECRET');
        });

        it('should throw in production without OAUTH_CLIENT_ID', async () => {
            process.env.NODE_ENV = 'production';
            process.env.JWT_SECRET = 'test-secret';
            delete process.env.OAUTH_CLIENT_ID;
            process.env.ALLOWED_ORIGIN_EXTENSION = 'chrome-extension://test';

            const config = await import('../config.js');

            expect(() => config.validateConfig()).toThrow('OAUTH_CLIENT_ID');
        });

        it('should throw in production without ALLOWED_ORIGIN_EXTENSION', async () => {
            process.env.NODE_ENV = 'production';
            process.env.JWT_SECRET = 'test-secret';
            process.env.OAUTH_CLIENT_ID = 'test-client-id';
            delete process.env.ALLOWED_ORIGIN_EXTENSION;

            const config = await import('../config.js');

            expect(() => config.validateConfig()).toThrow('ALLOWED_ORIGIN_EXTENSION');
        });

        it('should not throw in production with all required env vars', async () => {
            process.env.NODE_ENV = 'production';
            process.env.JWT_SECRET = 'test-secret';
            process.env.OAUTH_CLIENT_ID = 'test-client-id';
            process.env.ALLOWED_ORIGIN_EXTENSION = 'chrome-extension://test';

            const config = await import('../config.js');

            expect(() => config.validateConfig()).not.toThrow();
        });
    });
});

