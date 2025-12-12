/**
 * Chrome Session Storage Utilities
 *
 * Type-safe wrapper around chrome.storage.session for auth data.
 * Session storage is cleared when the browser is closed or user logs out.
 * NO local/persistent storage is used.
 */

import {StoredAuthData, User} from './types';

// Storage keys
export const AUTH_STORAGE_KEYS = {
    TOKEN: 'motorscope_auth_token',
    USER: 'motorscope_auth_user',
    STORED_AT: 'motorscope_auth_stored_at',
} as const;

/**
 * Check if running in Chrome extension context with session storage
 */
export const isChromeExtension = (): boolean => {
    return typeof chrome !== 'undefined' && !!chrome.storage?.session;
};

/**
 * Get a value from chrome.storage.session
 */
export const getStorageItem = async <T>(key: string): Promise<T | null> => {
    if (!isChromeExtension()) {
        // Fallback to sessionStorage for development (NOT localStorage)
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    }

    return new Promise((resolve) => {
        chrome.storage.session.get(key, (result) => {
            resolve(result[key] ?? null);
        });
    });
};

/**
 * Set a value in chrome.storage.session
 */
export const setStorageItem = async <T>(key: string, value: T): Promise<void> => {
    if (!isChromeExtension()) {
        // Fallback to sessionStorage for development (NOT localStorage)
        sessionStorage.setItem(key, JSON.stringify(value));
        return;
    }

    return new Promise((resolve) => {
        chrome.storage.session.set({[key]: value}, resolve);
    });
};

/**
 * Remove a value from chrome.storage.session
 */
export const removeStorageItem = async (key: string): Promise<void> => {
    if (!isChromeExtension()) {
        sessionStorage.removeItem(key);
        return;
    }

    return new Promise((resolve) => {
        chrome.storage.session.remove([key], resolve);
    });
};

/**
 * Remove multiple values from chrome.storage.session
 */
export const removeStorageItems = async (keys: string[]): Promise<void> => {
    if (!isChromeExtension()) {
        keys.forEach(key => sessionStorage.removeItem(key));
        return;
    }

    return new Promise((resolve) => {
        chrome.storage.session.remove(keys, resolve);
    });
};

// =============================================================================
// Auth-Specific Storage Functions
// =============================================================================

/**
 * Store authentication data (JWT + user profile) in session storage
 */
export const storeAuthData = async (token: string, user: User): Promise<void> => {
    const storedAt = Date.now();
    await Promise.all([
        setStorageItem(AUTH_STORAGE_KEYS.TOKEN, token),
        setStorageItem(AUTH_STORAGE_KEYS.USER, user),
        setStorageItem(AUTH_STORAGE_KEYS.STORED_AT, storedAt),
    ]);
    console.log('[Storage] Auth data stored in session');
};

/**
 * Retrieve stored authentication data from session storage
 */
export const getStoredAuthData = async (): Promise<StoredAuthData | null> => {
    const [token, user, storedAt] = await Promise.all([
        getStorageItem<string>(AUTH_STORAGE_KEYS.TOKEN),
        getStorageItem<User>(AUTH_STORAGE_KEYS.USER),
        getStorageItem<number>(AUTH_STORAGE_KEYS.STORED_AT),
    ]);

    if (token && user && storedAt) {
        return {token, user, storedAt};
    }

    return null;
};

/**
 * Clear all authentication data from session storage
 */
export const clearAuthData = async (): Promise<void> => {
    await removeStorageItems([
        AUTH_STORAGE_KEYS.TOKEN,
        AUTH_STORAGE_KEYS.USER,
        AUTH_STORAGE_KEYS.STORED_AT,
    ]);
    console.log('[Storage] Auth data cleared from session');
};

/**
 * Get the stored JWT token from session storage
 */
export const getStoredToken = async (): Promise<string | null> => {
    return getStorageItem<string>(AUTH_STORAGE_KEYS.TOKEN);
};

/**
 * Get the stored user profile from session storage
 */
export const getStoredUser = async (): Promise<User | null> => {
    return getStorageItem<User>(AUTH_STORAGE_KEYS.USER);
};

