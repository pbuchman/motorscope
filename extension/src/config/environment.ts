/**
 * Environment Configuration
 *
 * Build-time environment configuration injected by Vite.
 * Values are replaced at build time based on VITE_ENV environment variable.
 *
 * Environments:
 * - dev: Development/testing with dev backend
 * - prod: Production with production backend
 *
 * Both dev and local development use the same extension build (dev),
 * but local backend can be selected in settings.
 */

// Environment type
export type Environment = 'dev' | 'prod';

// Current environment (set at build time via VITE_ENV)
export const EXTENSION_ENV: Environment = (import.meta.env.VITE_ENV as Environment) || 'dev';

// OAuth Client IDs per environment
const OAUTH_CLIENT_IDS: Record<Environment, string> = {
    dev: '608235183788-siuni6ukq90iou35afhukfc02b7sa8la.apps.googleusercontent.com',
    prod: '83225257608-86kc32r143q96ghn1gmq8c5rhoqcu4jc.apps.googleusercontent.com',
};

// Get OAuth client ID for current environment
export const OAUTH_CLIENT_ID = OAUTH_CLIENT_IDS[EXTENSION_ENV];

// Check if running in production build
export const IS_PRODUCTION_BUILD = EXTENSION_ENV === 'prod';

