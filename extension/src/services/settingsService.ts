/**
 * Settings Service
 *
 * @deprecated Import from './settings' instead for better tree-shaking.
 * This file re-exports for backward compatibility only.
 */

// Re-export everything from the new modular structure
export {
  // Storage keys
  STORAGE_KEYS,

  // Extension settings
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  getGeminiApiKey,
  saveGeminiApiKey,
  getBackendUrl,
  saveBackendUrl,

  // Gemini stats & history
  getGeminiStats,
  getGeminiHistory,
  recordGeminiCall,
  clearGeminiLogs,

  // Refresh status
  DEFAULT_REFRESH_STATUS,
  getRefreshStatus,
} from './settings';
