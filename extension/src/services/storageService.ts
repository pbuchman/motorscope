/**
 * Storage Service
 *
 * Simplified - no local storage for listings anymore.
 * This file is kept for potential migration cleanup in the future.
 */
import { extensionStorage } from "./extensionStorage";
import { STORAGE_KEYS } from "./settingsService";

/**
 * Clear all local listings (used for migration cleanup)
 */
export const clearAllLocalListings = async (): Promise<void> => {
  await extensionStorage.set(STORAGE_KEYS.listings, []);
};

