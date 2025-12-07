/**
 * Storage Helpers
 *
 * Type-safe utilities for Chrome extension storage operations.
 * Eliminates repetitive "get with default" patterns across services.
 */

import { extensionStorage } from '../extensionStorage';

/**
 * Get a value from storage with a typed default fallback.
 * Handles null/undefined uniformly.
 */
export async function getWithDefault<T>(key: string, defaultValue: T): Promise<T> {
  const value = await extensionStorage.get<T>(key);
  return value ?? defaultValue;
}

/**
 * Set a value in storage.
 * Thin wrapper for consistency and potential future enhancements (logging, validation).
 */
export async function setStorage<T>(key: string, value: T): Promise<void> {
  await extensionStorage.set(key, value);
}

