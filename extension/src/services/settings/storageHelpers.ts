/**
 * Storage Helpers
 *
 * Type-safe utilities for Chrome extension SESSION storage operations.
 * Used ONLY for runtime state (refresh status).
 * All persistent data comes from API - NO local storage.
 */

import {extensionStorage} from '../extensionStorage';

/**
 * Get a value from session storage with a typed default fallback.
 * Handles null/undefined uniformly.
 */
export async function getWithDefault<T>(key: string, defaultValue: T): Promise<T> {
    const value = await extensionStorage.get<T>(key);
    return value ?? defaultValue;
}

/**
 * Set a value in session storage.
 * Thin wrapper for consistency and potential future enhancements (logging, validation).
 */
export async function setStorage<T>(key: string, value: T): Promise<void> {
    await extensionStorage.set(key, value);
}

