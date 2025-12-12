/**
 * Storage Keys
 *
 * Keys for session storage - used ONLY for runtime state.
 * All persistent data is stored in Firebase via API.
 */

export const STORAGE_KEYS = {
    // Runtime state (session storage only)
    refreshStatus: 'motorscope_refresh_status',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

