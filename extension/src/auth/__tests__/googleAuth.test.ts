/**
 * Tests for Google Authentication Module
 *
 * Tests Chrome identity API operations for Google OAuth.
 * Uses the global chromeMock set up in setupTests.ts
 */

import {
    hasIdentityApi,
    getGoogleToken,
    getGoogleTokenInteractive,
    getGoogleTokenSilent,
    removeCachedGoogleToken,
    revokeGoogleToken,
    clearGoogleAuth,
    disconnectGoogleAccount,
} from '../googleAuth';
import {getChromeMock} from '@/test-utils/chromeMock';

describe('Google Auth Module', () => {
    let chrome: ReturnType<typeof getChromeMock>;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        chrome = getChromeMock();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    describe('hasIdentityApi', () => {
        it('should return true when chrome.identity is available', () => {
            expect(hasIdentityApi()).toBe(true);
        });

        it('should return false when chrome is undefined', () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            expect(hasIdentityApi()).toBe(false);

            (globalThis as any).chrome = originalChrome;
        });

        it('should return false when chrome.identity is undefined', () => {
            const originalIdentity = chrome.identity;
            (chrome as any).identity = undefined;

            expect(hasIdentityApi()).toBe(false);

            (chrome as any).identity = originalIdentity;
        });
    });

    describe('getGoogleToken', () => {
        it('should return token when successful', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                callback('mock-google-token');
            }) as any;

            const token = await getGoogleToken(true);
            expect(token).toBe('mock-google-token');
        });

        it('should pass interactive flag to getAuthToken', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                expect(options.interactive).toBe(true);
                callback('token');
            }) as any;

            await getGoogleToken(true);

            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                expect(options.interactive).toBe(false);
                callback('token');
            }) as any;

            await getGoogleToken(false);
        });

        it('should throw error when chrome.identity is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            await expect(getGoogleToken(true)).rejects.toThrow('Chrome Identity API not available');

            (globalThis as any).chrome = originalChrome;
        });

        it('should throw error when runtime.lastError is set', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                chrome.runtime.lastError = {message: 'User cancelled'};
                callback(undefined);
                chrome.runtime.lastError = null;
            }) as any;

            await expect(getGoogleToken(true)).rejects.toThrow('User cancelled');
        });

        it('should throw error with default message when lastError has no message', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                chrome.runtime.lastError = {} as any;
                callback(undefined);
                chrome.runtime.lastError = null;
            }) as any;

            await expect(getGoogleToken(true)).rejects.toThrow('Failed to get Google token');
        });

        it('should throw error when no token is returned', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                callback(undefined);
            }) as any;

            await expect(getGoogleToken(true)).rejects.toThrow('No token returned from Chrome Identity API');
        });
    });

    describe('getGoogleTokenInteractive', () => {
        it('should call getGoogleToken with interactive=true', async () => {
            let capturedInteractive: boolean | undefined;
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                capturedInteractive = options.interactive;
                callback('interactive-token');
            }) as any;

            const token = await getGoogleTokenInteractive();
            expect(token).toBe('interactive-token');
            expect(capturedInteractive).toBe(true);
        });
    });

    describe('getGoogleTokenSilent', () => {
        it('should call getGoogleToken with interactive=false', async () => {
            let capturedInteractive: boolean | undefined;
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                capturedInteractive = options.interactive;
                callback('silent-token');
            }) as any;

            const token = await getGoogleTokenSilent();
            expect(token).toBe('silent-token');
            expect(capturedInteractive).toBe(false);
        });

        it('should return null instead of throwing on error', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                chrome.runtime.lastError = {message: 'Silent auth failed'};
                callback(undefined);
                chrome.runtime.lastError = null;
            }) as any;

            const token = await getGoogleTokenSilent();
            expect(token).toBeNull();
        });
    });

    describe('removeCachedGoogleToken', () => {
        it('should call chrome.identity.removeCachedAuthToken', async () => {
            chrome.identity.removeCachedAuthToken = jest.fn((options: any, callback: () => void) => {
                callback();
            }) as any;

            await removeCachedGoogleToken('token-to-remove');

            expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
                {token: 'token-to-remove'},
                expect.any(Function),
            );
        });

        it('should do nothing when chrome.identity is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            // Should not throw
            await expect(removeCachedGoogleToken('token')).resolves.toBeUndefined();

            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('revokeGoogleToken', () => {
        const originalFetch = global.fetch;

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('should call Google revoke endpoint', async () => {
            const mockFetch = jest.fn().mockResolvedValue({} as Response);
            global.fetch = mockFetch;

            await revokeGoogleToken('token-to-revoke');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://accounts.google.com/o/oauth2/revoke?token=token-to-revoke',
            );
        });

        it('should not throw when fetch fails', async () => {
            global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

            // Should not throw
            await expect(revokeGoogleToken('token')).resolves.toBeUndefined();
        });
    });

    describe('clearGoogleAuth', () => {
        it('should remove cached token when available', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                callback('cached-token');
            }) as any;
            chrome.identity.removeCachedAuthToken = jest.fn((options: any, callback: () => void) => {
                callback();
            }) as any;

            await clearGoogleAuth();

            expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
                {token: 'cached-token'},
                expect.any(Function),
            );
        });

        it('should not call removeCachedAuthToken when no token exists', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                callback(undefined);
            }) as any;
            chrome.identity.removeCachedAuthToken = jest.fn() as any;

            await clearGoogleAuth();

            expect(chrome.identity.removeCachedAuthToken).not.toHaveBeenCalled();
        });

        it('should do nothing when chrome.identity is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            // Should not throw
            await expect(clearGoogleAuth()).resolves.toBeUndefined();

            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('disconnectGoogleAccount', () => {
        const originalFetch = global.fetch;

        afterEach(() => {
            global.fetch = originalFetch;
        });

        it('should remove cached token and revoke with Google', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                callback('disconnect-token');
            }) as any;
            chrome.identity.removeCachedAuthToken = jest.fn((options: any, callback: () => void) => {
                callback();
            }) as any;
            const mockFetch = jest.fn().mockResolvedValue({} as Response);
            global.fetch = mockFetch;

            await disconnectGoogleAccount();

            expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
                {token: 'disconnect-token'},
                expect.any(Function),
            );
            expect(mockFetch).toHaveBeenCalledWith(
                'https://accounts.google.com/o/oauth2/revoke?token=disconnect-token',
            );
        });

        it('should not revoke when no token exists', async () => {
            chrome.identity.getAuthToken = jest.fn((options: any, callback: (token?: string) => void) => {
                callback(undefined);
            }) as any;
            const mockFetch = jest.fn().mockResolvedValue({} as Response);
            global.fetch = mockFetch;

            await disconnectGoogleAccount();

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should do nothing when chrome.identity is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            // Should not throw
            await expect(disconnectGoogleAccount()).resolves.toBeUndefined();

            (globalThis as any).chrome = originalChrome;
        });
    });
});
