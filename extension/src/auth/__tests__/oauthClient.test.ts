/**
 * Tests for OAuth Client Module
 *
 * Tests authentication orchestration including:
 * - Auth state management
 * - Silent login flow
 * - Interactive login flow
 * - Logout and disconnect
 */

// Mock modules before imports
jest.mock('../jwt', () => ({
    isJwtExpired: jest.fn(),
    validateJwt: jest.fn(),
}));

jest.mock('../googleAuth', () => ({
    getGoogleTokenSilent: jest.fn(),
    getGoogleTokenInteractive: jest.fn(),
    clearGoogleAuth: jest.fn(),
    removeCachedGoogleToken: jest.fn(),
    disconnectGoogleAccount: jest.fn(),
}));

jest.mock('../storage', () => ({
    getStoredAuthData: jest.fn(),
    getStoredToken: jest.fn(),
    storeAuthData: jest.fn(),
    clearAuthData: jest.fn(),
}));

jest.mock('../localServerStorage', () => ({
    getBackendServerUrl: jest.fn().mockResolvedValue('https://api.example.com'),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
    getAuthState,
    isTokenExpired,
    trySilentLogin,
    loginWithProvider,
    logout,
    getToken,
    initializeAuth,
    verifySession,
    disconnect,
} from '../oauthClient';
import type {User} from '../types';

// Import mocked modules for type-safe access
import {isJwtExpired, validateJwt} from '../jwt';
import {
    getGoogleTokenSilent,
    getGoogleTokenInteractive,
    clearGoogleAuth,
    removeCachedGoogleToken,
    disconnectGoogleAccount,
} from '../googleAuth';
import {
    getStoredAuthData,
    getStoredToken,
    storeAuthData,
    clearAuthData,
} from '../storage';

const mockIsJwtExpired = isJwtExpired as jest.MockedFunction<typeof isJwtExpired>;
const mockValidateJwt = validateJwt as jest.MockedFunction<typeof validateJwt>;
const mockGetGoogleTokenSilent = getGoogleTokenSilent as jest.MockedFunction<typeof getGoogleTokenSilent>;
const mockGetGoogleTokenInteractive = getGoogleTokenInteractive as jest.MockedFunction<typeof getGoogleTokenInteractive>;
const mockClearGoogleAuth = clearGoogleAuth as jest.MockedFunction<typeof clearGoogleAuth>;
const mockRemoveCachedGoogleToken = removeCachedGoogleToken as jest.MockedFunction<typeof removeCachedGoogleToken>;
const mockDisconnectGoogleAccount = disconnectGoogleAccount as jest.MockedFunction<typeof disconnectGoogleAccount>;
const mockGetStoredAuthData = getStoredAuthData as jest.MockedFunction<typeof getStoredAuthData>;
const mockGetStoredToken = getStoredToken as jest.MockedFunction<typeof getStoredToken>;
const mockStoreAuthData = storeAuthData as jest.MockedFunction<typeof storeAuthData>;
const mockClearAuthData = clearAuthData as jest.MockedFunction<typeof clearAuthData>;

describe('OAuth Client', () => {
    const mockUser: User = {
        id: 'user_123',
        email: 'test@example.com',
        displayName: 'Test User',
        picture: 'https://example.com/avatar.jpg',
    };

    const mockToken = 'valid-jwt-token';
    const mockStoredAt = Date.now();

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();

        // Default mock implementations
        mockValidateJwt.mockReturnValue({valid: true, expired: false, payload: {userId: 'user_123', email: 'test@example.com', iat: Date.now(), exp: Date.now() + 3600000}});
        mockIsJwtExpired.mockReturnValue(false);
        mockGetStoredToken.mockResolvedValue(mockToken);
        mockGetStoredAuthData.mockResolvedValue({token: mockToken, user: mockUser, storedAt: mockStoredAt});
    });

    describe('getAuthState', () => {
        it('should return logged_out when no stored data', async () => {
            mockGetStoredAuthData.mockResolvedValue(null);

            const state = await getAuthState();

            expect(state.status).toBe('logged_out');
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
        });

        it('should return logged_in when JWT is valid', async () => {
            mockValidateJwt.mockReturnValue({valid: true, expired: false, payload: {userId: 'user_123', email: 'test@example.com', iat: Date.now(), exp: Date.now() + 3600000}});

            const state = await getAuthState();

            expect(state.status).toBe('logged_in');
            expect(state.user).toEqual(mockUser);
            expect(state.token).toBe(mockToken);
        });

        it('should return logged_out when JWT is invalid', async () => {
            mockValidateJwt.mockReturnValue({valid: false, expired: true, payload: null});

            const state = await getAuthState();

            expect(state.status).toBe('logged_out');
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
        });
    });

    describe('isTokenExpired', () => {
        it('should return true when no token stored', async () => {
            mockGetStoredToken.mockResolvedValue(null);

            const expired = await isTokenExpired();

            expect(expired).toBe(true);
        });

        it('should return false when token is not expired', async () => {
            mockIsJwtExpired.mockReturnValue(false);

            const expired = await isTokenExpired();

            expect(expired).toBe(false);
            expect(mockIsJwtExpired).toHaveBeenCalledWith(mockToken);
        });

        it('should return true when token is expired', async () => {
            mockIsJwtExpired.mockReturnValue(true);

            const expired = await isTokenExpired();

            expect(expired).toBe(true);
        });
    });

    describe('trySilentLogin', () => {
        const mockGoogleToken = 'google-access-token';

        beforeEach(() => {
            mockGetGoogleTokenSilent.mockResolvedValue(mockGoogleToken);
        });

        it('should return null when no Google token available', async () => {
            mockGetGoogleTokenSilent.mockResolvedValue(null);

            const result = await trySilentLogin();

            expect(result).toBeNull();
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should authenticate with backend on success', async () => {
            const backendResponse = {token: 'new-jwt', user: mockUser};
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(backendResponse),
            });

            const result = await trySilentLogin();

            expect(result).toEqual({user: mockUser, token: 'new-jwt'});
            expect(mockStoreAuthData).toHaveBeenCalledWith('new-jwt', mockUser);
        });

        it('should clear cached token on backend auth failure', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                json: jest.fn().mockResolvedValue({message: 'Invalid token'}),
            });

            const result = await trySilentLogin();

            expect(result).toBeNull();
            expect(mockRemoveCachedGoogleToken).toHaveBeenCalledWith(mockGoogleToken);
        });
    });

    describe('loginWithProvider', () => {
        const mockGoogleToken = 'google-access-token';

        beforeEach(() => {
            mockGetGoogleTokenInteractive.mockResolvedValue(mockGoogleToken);
        });

        it('should complete login flow on success', async () => {
            const backendResponse = {token: 'new-jwt', user: mockUser};
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(backendResponse),
            });

            const result = await loginWithProvider();

            expect(result).toEqual({user: mockUser, token: 'new-jwt'});
            expect(mockStoreAuthData).toHaveBeenCalledWith('new-jwt', mockUser);
        });

        it('should throw on network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network failed'));

            await expect(loginWithProvider()).rejects.toThrow('Network failed');
        });

        it('should retry and clear token on backend rejection', async () => {
            // First call fails, second succeeds
            mockFetch
                .mockResolvedValueOnce({
                    ok: false,
                    json: jest.fn().mockResolvedValue({message: 'Token not yet valid'}),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({token: 'jwt', user: mockUser}),
                });

            mockGetGoogleTokenSilent.mockResolvedValue(mockGoogleToken);

            const result = await loginWithProvider();

            expect(result).toEqual({user: mockUser, token: 'jwt'});
            expect(mockRemoveCachedGoogleToken).toHaveBeenCalled();
        });

        it('should fail after max retries', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                json: jest.fn().mockResolvedValue({message: 'Persistent error'}),
            });
            mockGetGoogleTokenSilent.mockResolvedValue(mockGoogleToken);

            await expect(loginWithProvider()).rejects.toThrow('Persistent error');
        });
    });

    describe('logout', () => {
        it('should invalidate token on backend and clear local state', async () => {
            mockFetch.mockResolvedValue({ok: true});

            await logout();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/logout'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${mockToken}`,
                    }),
                }),
            );
            expect(mockClearGoogleAuth).toHaveBeenCalled();
            expect(mockClearAuthData).toHaveBeenCalled();
        });

        it('should proceed with local logout even if backend fails', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await logout();

            expect(mockClearGoogleAuth).toHaveBeenCalled();
            expect(mockClearAuthData).toHaveBeenCalled();
        });

        it('should skip backend call if no token', async () => {
            mockGetStoredToken.mockResolvedValue(null);

            await logout();

            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockClearGoogleAuth).toHaveBeenCalled();
            expect(mockClearAuthData).toHaveBeenCalled();
        });
    });

    describe('getToken', () => {
        it('should return stored token', async () => {
            const token = await getToken();

            expect(token).toBe(mockToken);
            expect(mockGetStoredToken).toHaveBeenCalled();
        });

        it('should return null when no token', async () => {
            mockGetStoredToken.mockResolvedValue(null);

            const token = await getToken();

            expect(token).toBeNull();
        });
    });

    describe('initializeAuth', () => {
        it('should return logged_out when no stored data', async () => {
            mockGetStoredAuthData.mockResolvedValue(null);

            const state = await initializeAuth();

            expect(state.status).toBe('logged_out');
        });

        it('should return logged_in when JWT is valid', async () => {
            mockValidateJwt.mockReturnValue({valid: true, expired: false, payload: {userId: 'user_123', email: 'test@example.com', iat: Date.now(), exp: Date.now() + 3600000}});

            const state = await initializeAuth();

            expect(state.status).toBe('logged_in');
            expect(state.user).toEqual(mockUser);
        });

        it('should try silent login when JWT is expired', async () => {
            mockValidateJwt.mockReturnValue({valid: false, expired: true, payload: null});
            mockGetGoogleTokenSilent.mockResolvedValue('google-token');
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({token: 'new-jwt', user: mockUser}),
            });

            const state = await initializeAuth();

            expect(state.status).toBe('logged_in');
            expect(mockGetGoogleTokenSilent).toHaveBeenCalled();
        });

        it('should return logged_out and clear data when silent login fails', async () => {
            mockValidateJwt.mockReturnValue({valid: false, expired: true, payload: null});
            mockGetGoogleTokenSilent.mockResolvedValue(null);

            const state = await initializeAuth();

            expect(state.status).toBe('logged_out');
            expect(mockClearAuthData).toHaveBeenCalled();
        });
    });

    describe('verifySession', () => {
        it('should return false when no token', async () => {
            mockGetStoredToken.mockResolvedValue(null);

            const valid = await verifySession();

            expect(valid).toBe(false);
        });

        it('should verify session with backend', async () => {
            mockFetch.mockResolvedValue({ok: true});

            const valid = await verifySession();

            expect(valid).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/me'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${mockToken}`,
                    }),
                }),
            );
        });

        it('should return false when backend rejects', async () => {
            mockFetch.mockResolvedValue({ok: false, status: 401});

            const valid = await verifySession();

            expect(valid).toBe(false);
        });

        it('should return true on network error (assume valid for offline)', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const valid = await verifySession();

            expect(valid).toBe(true);
        });
    });

    describe('disconnect', () => {
        it('should revoke Google consent and clear auth data', async () => {
            await disconnect();

            expect(mockDisconnectGoogleAccount).toHaveBeenCalled();
            expect(mockClearAuthData).toHaveBeenCalled();
        });
    });
});

