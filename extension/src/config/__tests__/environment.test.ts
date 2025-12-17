/**
 * Tests for Environment Configuration
 *
 * Tests verify that the environment mock is properly configured for testing.
 * Since the real environment.ts uses import.meta.env which Jest doesn't support,
 * we test the mock values that are used during testing.
 */

// Use the alias path which is mapped to the mock in jest.config.js
import {EXTENSION_ENV, OAUTH_CLIENT_ID, IS_PRODUCTION_BUILD, Environment} from '@/config/environment';

describe('Environment Configuration', () => {
    describe('EXTENSION_ENV', () => {
        it('should be "dev" in test environment', () => {
            expect(EXTENSION_ENV).toBe('dev');
        });

        it('should be a valid Environment type', () => {
            const validEnvs: Environment[] = ['dev', 'prod'];
            expect(validEnvs).toContain(EXTENSION_ENV);
        });
    });

    describe('OAUTH_CLIENT_ID', () => {
        it('should be the dev OAuth client ID', () => {
            expect(OAUTH_CLIENT_ID).toBe('608235183788-siuni6ukq90iou35afhukfc02b7sa8la.apps.googleusercontent.com');
        });

        it('should be a valid Google OAuth client ID format', () => {
            // Google OAuth client IDs follow a specific format
            expect(OAUTH_CLIENT_ID).toMatch(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
        });
    });

    describe('IS_PRODUCTION_BUILD', () => {
        it('should be false in test environment', () => {
            expect(IS_PRODUCTION_BUILD).toBe(false);
        });

        it('should be consistent with EXTENSION_ENV', () => {
            // When EXTENSION_ENV is 'dev', IS_PRODUCTION_BUILD should be false
            // When EXTENSION_ENV is 'prod', IS_PRODUCTION_BUILD should be true
            const expectedProduction = EXTENSION_ENV === 'prod';
            expect(IS_PRODUCTION_BUILD).toBe(expectedProduction);
        });
    });

    describe('Environment type', () => {
        it('should have proper type definition', () => {
            // TypeScript compile-time check - if this compiles, the type is correct
            const env: Environment = 'dev';
            expect(['dev', 'prod']).toContain(env);

            const env2: Environment = 'prod';
            expect(['dev', 'prod']).toContain(env2);
        });
    });
});
