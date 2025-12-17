/**
 * Tests for Auth Storage Module
 *
 * Tests Chrome session storage operations for authentication data.
 * Uses the global chromeMock set up in setupTests.ts
 */

import {
    AUTH_STORAGE_KEYS,
    isChromeExtension,
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    removeStorageItems,
    storeAuthData,
    getStoredAuthData,
    clearAuthData,
    getStoredToken,
    getStoredUser,
} from '../storage';
import {User} from '../types';
import {getChromeMock} from '@/test-utils/chromeMock';

describe('Auth Storage Module', () => {
    let chrome: ReturnType<typeof getChromeMock>;

    beforeEach(() => {
        chrome = getChromeMock();
    });

    describe('isChromeExtension', () => {
        it('should return true when chrome.storage.session is available', () => {
            expect(isChromeExtension()).toBe(true);
        });

        it('should return false when chrome is undefined', () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            expect(isChromeExtension()).toBe(false);

            (globalThis as any).chrome = originalChrome;
        });

        it('should return false when chrome.storage is undefined', () => {
            const originalStorage = chrome.storage;
            (chrome as any).storage = undefined;

            expect(isChromeExtension()).toBe(false);

            (chrome as any).storage = originalStorage;
        });

        it('should return false when chrome.storage.session is undefined', () => {
            const originalSession = chrome.storage.session;
            (chrome.storage as any).session = undefined;

            expect(isChromeExtension()).toBe(false);

            (chrome.storage as any).session = originalSession;
        });
    });

    describe('getStorageItem', () => {
        it('should return stored value from chrome.storage.session', async () => {
            await new Promise<void>((resolve) => {
                chrome.storage.session.set({testKey: 'testValue'}, () => resolve());
            });

            const value = await getStorageItem<string>('testKey');
            expect(value).toBe('testValue');
        });

        it('should return null for non-existent key', async () => {
            const value = await getStorageItem<string>('nonExistentKey');
            expect(value).toBeNull();
        });

        it('should fall back to sessionStorage when chrome is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            // Set up sessionStorage
            sessionStorage.setItem('fallbackKey', JSON.stringify('fallbackValue'));

            const value = await getStorageItem<string>('fallbackKey');
            expect(value).toBe('fallbackValue');

            // Clean up
            sessionStorage.removeItem('fallbackKey');
            (globalThis as any).chrome = originalChrome;
        });

        it('should return null from sessionStorage fallback for non-existent key', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            const value = await getStorageItem<string>('nonExistent');
            expect(value).toBeNull();

            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('setStorageItem', () => {
        it('should store value in chrome.storage.session', async () => {
            await setStorageItem('newKey', 'newValue');

            expect(chrome.storage.session.set).toHaveBeenCalledWith(
                {newKey: 'newValue'},
                expect.any(Function),
            );
        });

        it('should fall back to sessionStorage when chrome is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            await setStorageItem('fallbackSetKey', {test: 123});

            const stored = sessionStorage.getItem('fallbackSetKey');
            expect(stored).toBe(JSON.stringify({test: 123}));

            // Clean up
            sessionStorage.removeItem('fallbackSetKey');
            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('removeStorageItem', () => {
        it('should remove value from chrome.storage.session', async () => {
            await setStorageItem('removeKey', 'value');
            await removeStorageItem('removeKey');

            expect(chrome.storage.session.remove).toHaveBeenCalledWith(
                ['removeKey'],
                expect.any(Function),
            );
        });

        it('should fall back to sessionStorage when chrome is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            sessionStorage.setItem('removeKey', 'value');
            await removeStorageItem('removeKey');

            expect(sessionStorage.getItem('removeKey')).toBeNull();

            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('removeStorageItems', () => {
        it('should remove multiple values from chrome.storage.session', async () => {
            await setStorageItem('key1', 'value1');
            await setStorageItem('key2', 'value2');
            await removeStorageItems(['key1', 'key2']);

            expect(chrome.storage.session.remove).toHaveBeenCalledWith(
                ['key1', 'key2'],
                expect.any(Function),
            );
        });

        it('should fall back to sessionStorage when chrome is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            sessionStorage.setItem('multi1', 'value1');
            sessionStorage.setItem('multi2', 'value2');
            await removeStorageItems(['multi1', 'multi2']);

            expect(sessionStorage.getItem('multi1')).toBeNull();
            expect(sessionStorage.getItem('multi2')).toBeNull();

            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('storeAuthData', () => {
        it('should store token, user, and timestamp', async () => {
            const mockUser: User = {
                id: 'user_123',
                email: 'test@example.com',
                displayName: 'Test User',
            };

            await storeAuthData('mock-token', mockUser);

            expect(chrome.storage.session.set).toHaveBeenCalledWith(
                {[AUTH_STORAGE_KEYS.TOKEN]: 'mock-token'},
                expect.any(Function),
            );
            expect(chrome.storage.session.set).toHaveBeenCalledWith(
                {[AUTH_STORAGE_KEYS.USER]: mockUser},
                expect.any(Function),
            );
        });
    });

    describe('getStoredAuthData', () => {
        it('should return stored auth data when all fields are present', async () => {
            const mockUser: User = {
                id: 'user_123',
                email: 'test@example.com',
            };
            const storedAt = Date.now();

            await new Promise<void>((resolve) => {
                chrome.storage.session.set(
                    {
                        [AUTH_STORAGE_KEYS.TOKEN]: 'stored-token',
                        [AUTH_STORAGE_KEYS.USER]: mockUser,
                        [AUTH_STORAGE_KEYS.STORED_AT]: storedAt,
                    },
                    () => resolve(),
                );
            });

            const authData = await getStoredAuthData();

            expect(authData).not.toBeNull();
            expect(authData?.token).toBe('stored-token');
            expect(authData?.user).toEqual(mockUser);
            expect(authData?.storedAt).toBe(storedAt);
        });

        it('should return null when token is missing', async () => {
            const mockUser: User = {
                id: 'user_123',
                email: 'test@example.com',
            };

            await new Promise<void>((resolve) => {
                chrome.storage.session.set(
                    {
                        [AUTH_STORAGE_KEYS.USER]: mockUser,
                        [AUTH_STORAGE_KEYS.STORED_AT]: Date.now(),
                    },
                    () => resolve(),
                );
            });

            const authData = await getStoredAuthData();
            expect(authData).toBeNull();
        });

        it('should return null when user is missing', async () => {
            await new Promise<void>((resolve) => {
                chrome.storage.session.set(
                    {
                        [AUTH_STORAGE_KEYS.TOKEN]: 'token',
                        [AUTH_STORAGE_KEYS.STORED_AT]: Date.now(),
                    },
                    () => resolve(),
                );
            });

            const authData = await getStoredAuthData();
            expect(authData).toBeNull();
        });

        it('should return null when storedAt is missing', async () => {
            const mockUser: User = {
                id: 'user_123',
                email: 'test@example.com',
            };

            await new Promise<void>((resolve) => {
                chrome.storage.session.set(
                    {
                        [AUTH_STORAGE_KEYS.TOKEN]: 'token',
                        [AUTH_STORAGE_KEYS.USER]: mockUser,
                    },
                    () => resolve(),
                );
            });

            const authData = await getStoredAuthData();
            expect(authData).toBeNull();
        });

        it('should return null when storage is empty', async () => {
            const authData = await getStoredAuthData();
            expect(authData).toBeNull();
        });
    });

    describe('clearAuthData', () => {
        it('should remove all auth-related keys', async () => {
            const mockUser: User = {
                id: 'user_123',
                email: 'test@example.com',
            };

            await storeAuthData('token', mockUser);
            await clearAuthData();

            expect(chrome.storage.session.remove).toHaveBeenCalledWith(
                [AUTH_STORAGE_KEYS.TOKEN, AUTH_STORAGE_KEYS.USER, AUTH_STORAGE_KEYS.STORED_AT],
                expect.any(Function),
            );
        });
    });

    describe('getStoredToken', () => {
        it('should return stored token', async () => {
            await new Promise<void>((resolve) => {
                chrome.storage.session.set({[AUTH_STORAGE_KEYS.TOKEN]: 'my-token'}, () => resolve());
            });

            const token = await getStoredToken();
            expect(token).toBe('my-token');
        });

        it('should return null when no token stored', async () => {
            const token = await getStoredToken();
            expect(token).toBeNull();
        });
    });

    describe('getStoredUser', () => {
        it('should return stored user', async () => {
            const mockUser: User = {
                id: 'user_456',
                email: 'user@test.com',
                displayName: 'Test',
            };

            await new Promise<void>((resolve) => {
                chrome.storage.session.set({[AUTH_STORAGE_KEYS.USER]: mockUser}, () => resolve());
            });

            const user = await getStoredUser();
            expect(user).toEqual(mockUser);
        });

        it('should return null when no user stored', async () => {
            const user = await getStoredUser();
            expect(user).toBeNull();
        });
    });

    describe('AUTH_STORAGE_KEYS', () => {
        it('should have expected key values', () => {
            expect(AUTH_STORAGE_KEYS.TOKEN).toBe('motorscope_auth_token');
            expect(AUTH_STORAGE_KEYS.USER).toBe('motorscope_auth_user');
            expect(AUTH_STORAGE_KEYS.STORED_AT).toBe('motorscope_auth_stored_at');
        });
    });
});
