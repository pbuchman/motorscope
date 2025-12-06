/**
 * OAuth Client Module
 *
 * Handles Google OAuth authentication flow and backend token management.
 * Uses Chrome Identity API for OAuth and stores backend JWT locally.
 */

import { extensionStorage } from '../services/extensionStorage';
import {
  BACKEND_BASE_URL,
  AUTH_ENDPOINT_PATH,
  STORAGE_KEY_BACKEND_TOKEN,
  STORAGE_KEY_USER_PROFILE,
} from './config';

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
 * Get OAuth token using Chrome Identity API
 *
 * @param interactive - Whether to show the OAuth consent screen
 * @returns The OAuth access token
 */
const getOAuthToken = async (interactive: boolean = true): Promise<string> => {
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
 * Exchange OAuth token for Google ID token
 * Chrome identity API returns an access token, but we need an ID token for backend verification.
 * We'll use the tokeninfo endpoint to get user info and construct our auth flow.
 */
const getGoogleIdToken = async (): Promise<string> => {
  if (!hasIdentityApi()) {
    throw new Error('Chrome Identity API not available');
  }

  // Use launchWebAuthFlow to get an ID token directly
  const redirectUrl = chrome.identity.getRedirectURL();
  const clientId = '663051224718-nj03sld1761g1oicnngk1umj0ob717qe.apps.googleusercontent.com';
  const scopes = encodeURIComponent('openid email profile');
  const nonce = Math.random().toString(36).substring(2);

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&response_type=id_token` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&scope=${scopes}` +
    `&nonce=${nonce}` +
    `&prompt=consent`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!responseUrl) {
          reject(new Error('No response URL from OAuth flow'));
          return;
        }

        // Extract ID token from the URL fragment
        const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
        const idToken = urlParams.get('id_token');

        if (!idToken) {
          reject(new Error('No ID token in OAuth response'));
          return;
        }

        resolve(idToken);
      }
    );
  });
};

/**
 * Login with Google OAuth provider
 *
 * 1. Gets Google ID token via Chrome Identity API
 * 2. Sends token to backend for verification
 * 3. Receives and stores backend JWT and user profile
 *
 * @returns User profile and token
 */
export const loginWithProvider = async (): Promise<{ user: UserProfile; token: string }> => {
  // Get Google ID token
  const idToken = await getGoogleIdToken();

  // Send to backend for verification and JWT generation
  const response = await fetch(`${BACKEND_BASE_URL}${AUTH_ENDPOINT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
    throw new Error(error.message || `Authentication failed: ${response.status}`);
  }

  const authResponse: AuthResponse = await response.json();

  // Store token and user profile
  await extensionStorage.set(STORAGE_KEY_BACKEND_TOKEN, authResponse.token);
  await extensionStorage.set(STORAGE_KEY_USER_PROFILE, authResponse.user);

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
      // Clear cached tokens
      chrome.identity.clearAllCachedAuthTokens(() => {
        console.log('[Auth] Cleared cached auth tokens');
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

