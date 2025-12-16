/**
 * Mock for environment configuration in tests
 * Jest doesn't support import.meta.env, so we mock it
 */

export type Environment = 'dev' | 'prod';

export const EXTENSION_ENV: Environment = 'dev';

export const OAUTH_CLIENT_ID = '608235183788-siuni6ukq90iou35afhukfc02b7sa8la.apps.googleusercontent.com';

export const IS_PRODUCTION_BUILD = false;

