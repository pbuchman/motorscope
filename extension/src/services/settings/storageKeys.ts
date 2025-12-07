/**
 * Storage Keys
 *
 * Central registry of all Chrome storage keys used by the extension.
 * Single source of truth prevents typos and makes key discovery easy.
 */

export const STORAGE_KEYS = {
  // Extension settings
  settings: 'motorscope_settings',
  geminiKey: 'motorscope_gemini_key',
  backendUrl: 'motorscope_backend_url',

  // Gemini stats & history
  geminiStats: 'motorscope_gemini_stats',
  geminiHistory: 'motorscope_gemini_history',

  // Sync status
  refreshStatus: 'motorscope_refresh_status',

  // Legacy (kept for migration, not actively used)
  listings: 'motorscope_listings',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

