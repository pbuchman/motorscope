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

import {AuthState, BackendAuthResponse, User} from './types';
import {isJwtExpired, validateJwt} from './jwt';
import {
    clearGoogleAuth,
    disconnectGoogleAccount,
    getGoogleTokenInteractive,
    getGoogleTokenSilent,
    removeCachedGoogleToken,
} from './googleAuth';
import {clearAuthData, getStoredAuthData, getStoredToken, storeAuthData} from './storage';
import {API_PREFIX, AUTH_ENDPOINT_PATH, AUTH_LOGOUT_ENDPOINT_PATH, AUTH_ME_ENDPOINT_PATH} from './config';
import {getBackendServerUrl} from './localServerStorage';

// Re-export types for convenience
export type {User, AuthState} from './types';
export type UserProfile = User; // Alias for backward compatibility

// =============================================================================
// Backend API Communication
// =============================================================================

/**
 * Call backend /auth/logout endpoint to invalidate the token
 * Returns true if successful, false otherwise (we still clear local state either way)
 *
 * @param token - The JWT token to invalidate
 * @param backendUrl - Optional specific backend URL (used when changing servers)
 */
const invalidateTokenOnBackend = async (token: string, backendUrl?: string): Promise<boolean> => {
    const baseUrl = backendUrl || await getBackendServerUrl();
    const url = `${baseUrl}${API_PREFIX}${AUTH_LOGOUT_ENDPOINT_PATH}`;

    try {
        console.log('[OAuth] Calling backend logout endpoint...');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            console.log('[OAuth] Token invalidated on backend');
            return true;
        }

        console.log('[OAuth] Backend logout returned:', response.status);
        return false;
    } catch (error) {
        // Network error - still proceed with local logout
        console.log('[OAuth] Backend logout failed (network error):', error);
        return false;
    }
};

/**
 * Call backend /auth/google endpoint with Google access token
 * Backend verifies token and returns JWT + user profile
 */
const authenticateWithBackend = async (googleToken: string): Promise<BackendAuthResponse> => {
    const backendUrl = await getBackendServerUrl();
    const url = `${backendUrl}${API_PREFIX}${AUTH_ENDPOINT_PATH}`;

    console.log('[OAuth] Calling backend auth endpoint...');

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({accessToken: googleToken}),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({message: 'Authentication failed'}));
        throw new Error(error.message || `Authentication failed: ${response.status}`);
    }

    const authResponse: BackendAuthResponse = await response.json();
    console.log('[OAuth] Backend authentication successful');

    return authResponse;
};

/**
 * Verify session with backend via GET /auth/me
 * Returns true if session is valid, false otherwise
 *
 * This is an optional check to ensure the backend still recognizes the session.
 * Useful for detecting server-side session invalidation.
 */
const verifySessionWithBackend = async (token: string): Promise<boolean> => {
    const backendUrl = await getBackendServerUrl();
    const url = `${backendUrl}${API_PREFIX}${AUTH_ME_ENDPOINT_PATH}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            console.log('[OAuth] Backend session verified');
            return true;
        }

        console.log('[OAuth] Backend session invalid:', response.status);
        return false;
    } catch (error) {
        // Network error - assume session is valid to allow offline usage
        console.log('[OAuth] Backend verification failed (network error), assuming valid');
        return true;
    }
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

    const {token, user} = storedData;
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
 * IMPORTANT: If the backend rejects the token, we clear it from Chrome's cache
 * so that subsequent interactive login can get a fresh token.
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

        // CRITICAL: Clear the bad token from Chrome's cache so that
        // subsequent interactive login can get a fresh token instead of
        // Chrome returning the same invalid cached token
        console.log('[OAuth] Clearing invalid token from Chrome cache...');
        try {
            await removeCachedGoogleToken(googleToken);
            console.log('[OAuth] Cleared invalid token');
        } catch (clearError) {
            console.log('[OAuth] Could not clear token:', clearError);
        }

        return null;
    }
};

/**
 * Helper to delay execution
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Perform interactive login (shows Google consent screen if needed)
 *
 * Flow:
 * 1. Get Google token interactively
 * 2. Wait a moment for token propagation (important for first-time users)
 * 3. Send to backend for verification
 * 4. If backend rejects, clear Chrome's token cache and retry
 * 5. Store returned JWT + user profile
 *
 * @returns User profile and backend JWT
 * @throws Error if login fails
 */
export const loginWithProvider = async (): Promise<{ user: User; token: string }> => {
    console.log('[OAuth] Starting interactive login...');

    const maxAttempts = 5;
    const initialDelayMs = 1000;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Get Google token (may show consent screen on first attempt)
            const googleToken = await getGoogleTokenInteractive();
            console.log(`[OAuth] Attempt ${attempt}: Got Google token, length: ${googleToken.length}`);

            // Wait for token propagation (especially important for fresh tokens)
            const waitMs = attempt === 1 ? initialDelayMs : initialDelayMs * 0.5;
            console.log(`[OAuth] Waiting ${waitMs}ms for token propagation...`);
            await delay(waitMs);

            // Try to authenticate with backend
            const authResponse = await authenticateWithBackend(googleToken);

            // Success! Store auth data
            await storeAuthData(authResponse.token, authResponse.user);
            console.log('[OAuth] Interactive login successful:', authResponse.user.email);

            return {
                user: authResponse.user,
                token: authResponse.token,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.log(`[OAuth] Attempt ${attempt}/${maxAttempts} failed:`, lastError.message);

            // Don't retry on network errors
            if (lastError.message.includes('network') || lastError.message.includes('fetch failed')) {
                throw lastError;
            }

            // If not the last attempt, clear the token cache and try again
            if (attempt < maxAttempts) {
                console.log('[OAuth] Clearing cached token before retry...');
                try {
                    // Get the current token silently and clear it
                    const cachedToken = await getGoogleTokenSilent();
                    if (cachedToken) {
                        await removeCachedGoogleToken(cachedToken);
                        console.log('[OAuth] Cleared cached token');
                    }
                } catch (clearError) {
                    console.log('[OAuth] Could not clear cached token:', clearError);
                }

                // Wait before retrying
                const retryDelayMs = 800 * Math.pow(1.5, attempt - 1);
                console.log(`[OAuth] Waiting ${Math.round(retryDelayMs)}ms before retry...`);
                await delay(retryDelayMs);
            }
        }
    }

    throw lastError || new Error('Login failed after multiple attempts');
};

/**
 * Logout - invalidates token and clears local auth state
 *
 * This function:
 * 1. Calls the backend to blacklist/invalidate the current JWT token
 * 2. Clears the cached Google token from Chrome's cache
 * 3. Clears stored auth data (JWT + user profile)
 *
 * IMPORTANT: Does NOT revoke Google consent.
 * User will see account picker (not consent screen) on next login.
 * For full account disconnection, use disconnect() instead.
 *
 * @param backendUrl - Optional specific backend URL (used when changing servers to logout from old server)
 */
export const logout = async (backendUrl?: string): Promise<void> => {
    console.log('[OAuth] Logging out...');

    // First, try to invalidate the token on the backend
    const token = await getStoredToken();
    if (token) {
        await invalidateTokenOnBackend(token, backendUrl);
    }

    // Clear Google auth from Chrome's cache (does NOT revoke consent)
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

    const {token, user} = storedData;
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

/**
 * Verify current session with backend
 *
 * Optional: Call this to confirm the backend still recognizes the session.
 * Returns true if valid, false if invalid or no session.
 */
export const verifySession = async (): Promise<boolean> => {
    const token = await getStoredToken();
    if (!token) {
        return false;
    }
    return verifySessionWithBackend(token);
};

/**
 * Fully disconnect Google account
 *
 * This is different from logout:
 * - logout(): Clears local session, preserves Google consent
 * - disconnect(): Revokes Google consent entirely
 *
 * After disconnect, user will see full consent screen on next login.
 * Use for "Remove account" or security-related actions.
 */
export const disconnect = async (): Promise<void> => {
    console.log('[OAuth] Disconnecting Google account...');

    // Revoke Google consent entirely
    await disconnectGoogleAccount();

    // Clear stored auth data
    await clearAuthData();

    console.log('[OAuth] Disconnect complete');
};
