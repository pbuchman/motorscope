/**
 * OAuth Client Module
 *
 * Handles Google OAuth authentication flow and backend token management.
 * Uses Chrome Identity API with getAuthToken() for Chrome extension OAuth.
 *
 * This approach uses the "Chrome extension" OAuth client type in GCP,
 * which is configured with the extension's Item ID (not redirect URIs).
 */

import { extensionStorage } from '../services/extensionStorage';
import {
  AUTH_ENDPOINT_PATH,
  STORAGE_KEY_BACKEND_TOKEN,
  STORAGE_KEY_USER_PROFILE,
  DEFAULT_BACKEND_URL,
  API_PREFIX,
} from './config';
import { getBackendUrl } from '../services/settingsService';

/**
 * User profile returned from the backend
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
}

/**
 * Auth state returned by getAuthState()
 */
export interface AuthState {
  status: 'logged_out' | 'logged_in';
  user: UserProfile | null;
  token: string | null;
}

/**
 * Response from the backend auth endpoint
 */
interface AuthResponse {
  token: string;
  user: UserProfile;
}

/**
 * Check if running in Chrome extension context with identity API
 */
const hasIdentityApi = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.identity;
};

/**
 * Get OAuth access token using Chrome Identity API
 *
 * This uses chrome.identity.getAuthToken() which works with
 * "Chrome extension" type OAuth clients in GCP.
 *
 * @param interactive - Whether to show the OAuth consent screen
 * @returns The OAuth access token
 */
const getOAuthAccessToken = async (interactive: boolean = true): Promise<string> => {
  if (!hasIdentityApi()) {
    throw new Error('Chrome Identity API not available');
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!token) {
        reject(new Error('No token returned from Chrome Identity API'));
        return;
      }
      resolve(token);
    });
  });
};

/**
 * Get user info from Google using an access token
 */
const getGoogleUserInfo = async (accessToken: string): Promise<{
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return response.json();
};

/**
 * Login with Google OAuth provider
 *
 * Flow:
 * 1. Get access token via chrome.identity.getAuthToken()
 * 2. Fetch user info from Google
 * 3. Send access token to backend for verification
 * 4. Receive and store backend JWT and user profile
 *
 * @returns User profile and token
 */
export const loginWithProvider = async (): Promise<{ user: UserProfile; token: string }> => {
  console.log('[OAuth] Starting login flow...');

  // Get Google access token using Chrome Identity API
  const accessToken = await getOAuthAccessToken(true);
  console.log('[OAuth] Got access token');

  // Get configured backend URL
  let backendUrl: string;
  try {
    backendUrl = await getBackendUrl();
  } catch {
    backendUrl = DEFAULT_BACKEND_URL;
  }

  // Send access token to backend for verification and JWT generation
  // Backend will verify the token with Google and create our JWT
  const response = await fetch(`${backendUrl}${API_PREFIX}${AUTH_ENDPOINT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
    throw new Error(error.message || `Authentication failed: ${response.status}`);
  }

  const authResponse: AuthResponse = await response.json();

  // Store token and user profile
  await extensionStorage.set(STORAGE_KEY_BACKEND_TOKEN, authResponse.token);
  await extensionStorage.set(STORAGE_KEY_USER_PROFILE, authResponse.user);

  console.log('[OAuth] Login successful:', authResponse.user.email);

  return {
    user: authResponse.user,
    token: authResponse.token,
  };
};

/**
 * Logout - clears stored token and user profile
 */
export const logout = async (): Promise<void> => {
  await extensionStorage.set(STORAGE_KEY_BACKEND_TOKEN, null);
  await extensionStorage.set(STORAGE_KEY_USER_PROFILE, null);

  // Also revoke the Chrome identity token cache
  if (hasIdentityApi()) {
    try {
      // Get the current token to revoke it
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          // Remove from Chrome's cache
          chrome.identity.removeCachedAuthToken({ token }, () => {
            console.log('[Auth] Removed cached auth token');
          });

          // Optionally revoke the token with Google
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
            .catch(() => {}); // Ignore errors
        }
      });
    } catch (error) {
      console.warn('[Auth] Failed to clear cached tokens:', error);
    }
  }
};

/**
 * Get current authentication state
 *
 * @returns Current auth state with status, user, and token
 */
export const getAuthState = async (): Promise<AuthState> => {
  const token = await extensionStorage.get<string>(STORAGE_KEY_BACKEND_TOKEN);
  const user = await extensionStorage.get<UserProfile>(STORAGE_KEY_USER_PROFILE);

  if (token && user) {
    return {
      status: 'logged_in',
      user,
      token,
    };
  }

  return {
    status: 'logged_out',
    user: null,
    token: null,
  };
};

/**
 * Get the stored backend token
 *
 * @returns The backend JWT or null
 */
export const getToken = async (): Promise<string | null> => {
  return extensionStorage.get<string>(STORAGE_KEY_BACKEND_TOKEN) ?? null;
};

