/**
 * OAuth Client Module
 *
 * Main authentication orchestrator that combines:
 * - Google OAuth (via chrome.identity.getAuthToken)
 * - Backend JWT management
 * - Session state management
 *
 * This implements the complete auth flow:
 * 1. On startup: Check stored JWT validity
 * 2. If JWT valid: Use it (no Google call needed)
 * 3. If JWT expired: Try silent Google re-auth
 * 4. If silent fails: Require interactive login
 */

import { User, AuthState, BackendAuthResponse } from './types';
import { validateJwt, isJwtExpired } from './jwt';
import {
  getGoogleTokenInteractive,
  getGoogleTokenSilent,
  clearGoogleAuth
} from './googleAuth';
import {
  storeAuthData,
  getStoredAuthData,
  clearAuthData,
  getStoredToken,
  getStoredUser,
} from './storage';
import { getBackendUrl } from '../services/settingsService';
import { DEFAULT_BACKEND_URL, API_PREFIX, AUTH_ENDPOINT_PATH } from './config';

// Re-export types for convenience
export type { User, AuthState } from './types';
export type UserProfile = User; // Alias for backward compatibility

// =============================================================================
// Backend API Communication
// =============================================================================

/**
 * Get the configured backend base URL
 */
const getBaseUrl = async (): Promise<string> => {
  try {
    return await getBackendUrl();
  } catch {
    return DEFAULT_BACKEND_URL;
  }
};

/**
 * Call backend /auth/google endpoint with Google access token
 * Backend verifies token and returns JWT + user profile
 */
const authenticateWithBackend = async (googleToken: string): Promise<BackendAuthResponse> => {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${API_PREFIX}${AUTH_ENDPOINT_PATH}`;

  console.log('[OAuth] Calling backend auth endpoint...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken: googleToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
    throw new Error(error.message || `Authentication failed: ${response.status}`);
  }

  const authResponse: BackendAuthResponse = await response.json();
  console.log('[OAuth] Backend authentication successful');

  return authResponse;
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Get current authentication state
 *
 * Checks stored JWT validity:
 * - If valid: returns logged_in state
 * - If expired: returns logged_out (caller should try silent login)
 * - If no data: returns logged_out
 */
export const getAuthState = async (): Promise<AuthState> => {
  const storedData = await getStoredAuthData();

  if (!storedData) {
    console.log('[OAuth] No stored auth data');
    return {
      status: 'logged_out',
      user: null,
      token: null,
    };
  }

  const { token, user } = storedData;
  const validation = validateJwt(token);

  if (!validation.valid) {
    console.log('[OAuth] Stored JWT is invalid or expired');
    // Don't clear data here - let the caller decide whether to try silent login
    return {
      status: 'logged_out',
      user: null,
      token: null,
    };
  }

  console.log('[OAuth] Stored JWT is valid');
  return {
    status: 'logged_in',
    user,
    token,
  };
};

/**
 * Check if stored JWT is expired (but might be refreshable via silent login)
 */
export const isTokenExpired = async (): Promise<boolean> => {
  const token = await getStoredToken();
  if (!token) return true;
  return isJwtExpired(token);
};

/**
 * Perform silent login using cached Google token
 *
 * This should be called when:
 * - JWT is expired but we want to try re-auth without user interaction
 *
 * @returns Auth result with user and token, or null if silent login fails
 */
export const trySilentLogin = async (): Promise<{ user: User; token: string } | null> => {
  console.log('[OAuth] Attempting silent login...');

  const googleToken = await getGoogleTokenSilent();

  if (!googleToken) {
    console.log('[OAuth] Silent login failed - no Google token available');
    return null;
  }

  try {
    const authResponse = await authenticateWithBackend(googleToken);
    await storeAuthData(authResponse.token, authResponse.user);
    console.log('[OAuth] Silent login successful');
    return {
      user: authResponse.user,
      token: authResponse.token,
    };
  } catch (error) {
    console.error('[OAuth] Silent backend auth failed:', error);
    return null;
  }
};

/**
 * Perform interactive login (shows Google consent screen if needed)
 *
 * Flow:
 * 1. Get Google token interactively
 * 2. Send to backend for verification
 * 3. Store returned JWT + user profile
 *
 * @returns User profile and backend JWT
 * @throws Error if login fails
 */
export const loginWithProvider = async (): Promise<{ user: User; token: string }> => {
  console.log('[OAuth] Starting interactive login...');

  // Get Google token (may show consent screen)
  const googleToken = await getGoogleTokenInteractive();
  console.log('[OAuth] Got Google token');

  // Authenticate with backend
  const authResponse = await authenticateWithBackend(googleToken);

  // Store auth data
  await storeAuthData(authResponse.token, authResponse.user);

  console.log('[OAuth] Interactive login successful:', authResponse.user.email);

  return {
    user: authResponse.user,
    token: authResponse.token,
  };
};

/**
 * Logout - clears all auth state
 *
 * Clears:
 * - Backend JWT from storage
 * - User profile from storage
 * - Cached Google token from Chrome
 */
export const logout = async (): Promise<void> => {
  console.log('[OAuth] Logging out...');

  // Clear Google auth (cached token + revoke)
  await clearGoogleAuth();

  // Clear stored auth data
  await clearAuthData();

  console.log('[OAuth] Logout complete');
};

/**
 * Get the stored backend JWT token
 */
export const getToken = async (): Promise<string | null> => {
  return getStoredToken();
};

/**
 * Initialize auth state with silent login attempt if needed
 *
 * This should be called on extension startup:
 * 1. Check if stored JWT is valid → return logged_in
 * 2. If expired, try silent login → return logged_in if successful
 * 3. Otherwise → return logged_out
 */
export const initializeAuth = async (): Promise<AuthState> => {
  console.log('[OAuth] Initializing auth state...');

  // First check stored state
  const storedData = await getStoredAuthData();

  if (!storedData) {
    console.log('[OAuth] No stored auth data, returning logged_out');
    return {
      status: 'logged_out',
      user: null,
      token: null,
    };
  }

  const { token, user } = storedData;
  const validation = validateJwt(token);

  // If JWT is still valid, use it
  if (validation.valid) {
    console.log('[OAuth] Stored JWT is valid');
    return {
      status: 'logged_in',
      user,
      token,
    };
  }

  // JWT expired - try silent login
  console.log('[OAuth] Stored JWT expired, trying silent login...');
  const silentResult = await trySilentLogin();

  if (silentResult) {
    return {
      status: 'logged_in',
      user: silentResult.user,
      token: silentResult.token,
    };
  }

  // Silent login failed - clear stale data and return logged_out
  console.log('[OAuth] Silent login failed, clearing auth data');
  await clearAuthData();

  return {
    status: 'logged_out',
    user: null,
    token: null,
  };
};

