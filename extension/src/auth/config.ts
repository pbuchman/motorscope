/**
 * Authentication Configuration
 *
 * Configuration constants for OAuth and backend authentication.
 */

// =============================================================================
// Backend URL Configuration
// =============================================================================

/** Predefined backend URL options */
export const BACKEND_URL_OPTIONS = [
  {
    label: 'Cloud (Production)',
    value: 'https://motorscope-api-663051224718.europe-west1.run.app/api',
  },
  {
    label: 'Local Development',
    value: 'http://localhost:8080/api',
  },
] as const;

/** Default backend URL (remote production) */
export const DEFAULT_BACKEND_URL = BACKEND_URL_OPTIONS[0].value;

/** API endpoint paths (relative to backend base URL) */
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
// UI Labels
// =============================================================================

export const UI_LOGIN_BUTTON_LABEL = 'Sign in';
export const UI_LOGOUT_BUTTON_LABEL = 'Log out';
export const UI_LOGGED_IN_PREFIX = 'Logged in as';

