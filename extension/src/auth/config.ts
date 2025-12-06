/**
 * Authentication Configuration
 *
 * Configuration constants for OAuth and backend authentication.
 */

// =============================================================================
// Backend URL Configuration
// =============================================================================

/** Predefined backend server options (base URLs without /api) */
export const BACKEND_SERVER_OPTIONS = [
  {
    label: 'Development (Cloud)',
    value: 'https://motorscope-dev-663051224718.europe-west1.run.app',
  },
  {
    label: 'Local',
    value: 'http://localhost:8080',
  },
] as const;

/** Default backend server (Development Cloud) */
export const DEFAULT_BACKEND_URL = BACKEND_SERVER_OPTIONS[0].value;

/** API path prefix - appended to base URL */
export const API_PREFIX = '/api';

/** API endpoint paths (relative to API_PREFIX) */
export const AUTH_ENDPOINT_PATH = '/auth/google';
export const LISTINGS_ENDPOINT_PATH = '/listings';
export const SETTINGS_ENDPOINT_PATH = '/settings';

// =============================================================================
// Storage Keys
// =============================================================================

/** Storage key for backend JWT token */
export const STORAGE_KEY_BACKEND_TOKEN = 'authToken';

/** Storage key for user profile */
export const STORAGE_KEY_USER_PROFILE = 'userProfile';

/** Local state storage key prefix (used by existing storage service) */
export const STORAGE_KEY_LOCAL_STATE_PREFIX = 'motorscope_';

// =============================================================================
// JWT Configuration
// =============================================================================

/**
 * Leeway in seconds for JWT expiration check
 * Token is considered expired this many seconds before actual expiration
 * This prevents edge cases where token expires between check and use
 */
export const JWT_EXP_LEEWAY_SECONDS = 60;

// =============================================================================
// UI Labels
// =============================================================================

export const UI_LOGIN_BUTTON_LABEL = 'Sign in';
export const UI_LOGOUT_BUTTON_LABEL = 'Log out';
export const UI_LOGGED_IN_PREFIX = 'Logged in as';

