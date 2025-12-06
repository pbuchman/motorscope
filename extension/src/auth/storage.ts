/**
 * Chrome Storage Utilities
 *
 * Type-safe wrapper around chrome.storage.local for auth data.
 */

import { User, StoredAuthData } from './types';

// Storage keys
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'motorscope_auth_token',
  USER: 'motorscope_auth_user',
  STORED_AT: 'motorscope_auth_stored_at',
} as const;

/**
 * Check if running in Chrome extension context
 */
export const isChromeExtension = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
};

/**
 * Get a value from chrome.storage.local
 */
export const getStorageItem = async <T>(key: string): Promise<T | null> => {
  if (!isChromeExtension()) {
    // Fallback to localStorage for development
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] ?? null);
    });
  });
};

/**
 * Set a value in chrome.storage.local
 */
export const setStorageItem = async <T>(key: string, value: T): Promise<void> => {
  if (!isChromeExtension()) {
    // Fallback to localStorage for development
    localStorage.setItem(key, JSON.stringify(value));
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
};

/**
 * Remove a value from chrome.storage.local
 */
export const removeStorageItem = async (key: string): Promise<void> => {
  if (!isChromeExtension()) {
    localStorage.removeItem(key);
    return;
  }

  return new Promise((resolve) => {
    // Cast to any to work around @types/chrome missing remove() signature
    (chrome.storage.local as any).remove([key], resolve);
  });
};

/**
 * Remove multiple values from chrome.storage.local
 */
export const removeStorageItems = async (keys: string[]): Promise<void> => {
  if (!isChromeExtension()) {
    keys.forEach(key => localStorage.removeItem(key));
    return;
  }

  return new Promise((resolve) => {
    // Cast to any to work around @types/chrome missing remove() signature
    (chrome.storage.local as any).remove(keys, resolve);
  });
};

// =============================================================================
// Auth-Specific Storage Functions
// =============================================================================

/**
 * Store authentication data (JWT + user profile)
 */
export const storeAuthData = async (token: string, user: User): Promise<void> => {
  const storedAt = Date.now();
  await Promise.all([
    setStorageItem(AUTH_STORAGE_KEYS.TOKEN, token),
    setStorageItem(AUTH_STORAGE_KEYS.USER, user),
    setStorageItem(AUTH_STORAGE_KEYS.STORED_AT, storedAt),
  ]);
  console.log('[Storage] Auth data stored');
};

/**
 * Retrieve stored authentication data
 */
export const getStoredAuthData = async (): Promise<StoredAuthData | null> => {
  const [token, user, storedAt] = await Promise.all([
    getStorageItem<string>(AUTH_STORAGE_KEYS.TOKEN),
    getStorageItem<User>(AUTH_STORAGE_KEYS.USER),
    getStorageItem<number>(AUTH_STORAGE_KEYS.STORED_AT),
  ]);

  if (token && user && storedAt) {
    return { token, user, storedAt };
  }

  return null;
};

/**
 * Clear all authentication data from storage
 */
export const clearAuthData = async (): Promise<void> => {
  await removeStorageItems([
    AUTH_STORAGE_KEYS.TOKEN,
    AUTH_STORAGE_KEYS.USER,
    AUTH_STORAGE_KEYS.STORED_AT,
  ]);
  console.log('[Storage] Auth data cleared');
};

/**
 * Get the stored JWT token
 */
export const getStoredToken = async (): Promise<string | null> => {
  return getStorageItem<string>(AUTH_STORAGE_KEYS.TOKEN);
};

/**
 * Get the stored user profile
 */
export const getStoredUser = async (): Promise<User | null> => {
  return getStorageItem<User>(AUTH_STORAGE_KEYS.USER);
};

