/**
 * Google Authentication Module
 *
 * Handles Google OAuth via chrome.identity.getAuthToken().
 * This module only deals with Google tokens, not backend JWTs.
 */

/**
 * Check if Chrome Identity API is available
 */
export const hasIdentityApi = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.identity;
};

/**
 * Get Google OAuth access token
 *
 * Uses chrome.identity.getAuthToken() which handles:
 * - Token caching
 * - Token refresh
 * - Consent screen (when interactive)
 *
 * @param interactive - If true, shows consent screen if needed
 * @returns Google access token
 * @throws Error if token cannot be obtained
 */
export const getGoogleToken = async (interactive: boolean): Promise<string> => {
  if (!hasIdentityApi()) {
    throw new Error('Chrome Identity API not available');
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || 'Failed to get Google token';
        console.log(`[GoogleAuth] getAuthToken failed (interactive: ${interactive}):`, errorMessage);
        reject(new Error(errorMessage));
        return;
      }

      if (!token) {
        reject(new Error('No token returned from Chrome Identity API'));
        return;
      }

      console.log(`[GoogleAuth] Got token (interactive: ${interactive})`);
      resolve(token);
    });
  });
};

/**
 * Get Google token interactively (shows consent screen if needed)
 * Used for initial login
 */
export const getGoogleTokenInteractive = async (): Promise<string> => {
  return getGoogleToken(true);
};

/**
 * Get Google token silently (no UI)
 * Used for silent re-authentication
 * Returns null if silent auth fails (instead of throwing)
 */
export const getGoogleTokenSilent = async (): Promise<string | null> => {
  try {
    return await getGoogleToken(false);
  } catch (error) {
    console.log('[GoogleAuth] Silent token acquisition failed:', error);
    return null;
  }
};

/**
 * Remove cached Google token from Chrome's cache
 * This forces a fresh token on next getAuthToken call
 *
 * @param token - The token to remove from cache
 */
export const removeCachedGoogleToken = async (token: string): Promise<void> => {
  if (!hasIdentityApi()) {
    return;
  }

  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      console.log('[GoogleAuth] Removed cached token');
      resolve();
    });
  });
};

/**
 * Revoke Google token with Google's servers
 * This invalidates the token completely
 *
 * @param token - The token to revoke
 */
export const revokeGoogleToken = async (token: string): Promise<void> => {
  try {
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    console.log('[GoogleAuth] Token revoked with Google');
  } catch (error) {
    // Ignore errors - token might already be invalid
    console.log('[GoogleAuth] Token revocation failed (may already be invalid):', error);
  }
};

/**
 * Clear Google auth from Chrome's cache
 *
 * IMPORTANT: This only removes the token from Chrome's local cache.
 * It does NOT revoke the user's consent with Google.
 *
 * This is the correct behavior for a normal "log out" action:
 * - User logs out of MotorScope
 * - On next login, they see account picker (not consent screen)
 * - Their consent grant with Google is preserved
 *
 * Only call revokeGoogleToken() for explicit "disconnect account"
 * or security incidents.
 */
export const clearGoogleAuth = async (): Promise<void> => {
  if (!hasIdentityApi()) {
    return;
  }

  return new Promise((resolve) => {
    // Get current token to clear it from Chrome's cache
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      if (token) {
        // Remove from Chrome's cache only - DO NOT revoke with Google
        // Revoking with Google would invalidate the user's consent grant,
        // causing them to see the consent screen again on next login
        await removeCachedGoogleToken(token);
        console.log('[GoogleAuth] Cleared cached token (consent preserved)');
      }
      resolve();
    });
  });
};

/**
 * Fully disconnect Google account
 *
 * This revokes the user's consent with Google and clears all cached tokens.
 * Use this only for explicit "disconnect account" actions, not regular logout.
 *
 * After calling this, the user will see the full consent screen on next login.
 */
export const disconnectGoogleAccount = async (): Promise<void> => {
  if (!hasIdentityApi()) {
    return;
  }

  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      if (token) {
        // Remove from Chrome's cache
        await removeCachedGoogleToken(token);
        // Revoke consent with Google - user will see consent screen again
        await revokeGoogleToken(token);
        console.log('[GoogleAuth] Disconnected Google account (consent revoked)');
      }
      resolve();
    });
  });
};

