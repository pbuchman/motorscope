/**
 * Authentication Configuration
 *
 * Configuration constants for OAuth and backend authentication.
 */

// Backend API configuration
export const BACKEND_BASE_URL = 'https://motorscope-663051224718.europe-west1.run.app/api';
export const AUTH_ENDPOINT_PATH = '/auth/google';
export const LISTINGS_ENDPOINT_PATH = '/listings';

// Storage keys for auth state
export const STORAGE_KEY_BACKEND_TOKEN = 'authToken';
export const STORAGE_KEY_USER_PROFILE = 'userProfile';

// Local state storage key prefix (used by existing storage service)
export const STORAGE_KEY_LOCAL_STATE_PREFIX = 'motorscope_';

// UI labels
export const UI_LOGIN_BUTTON_LABEL = 'Sign in';
export const UI_LOGOUT_BUTTON_LABEL = 'Log out';
export const UI_LOGGED_IN_PREFIX = 'Logged in as';

