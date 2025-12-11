/**
 * Settings Service
 *
 * All settings and data come from the backend API.
 * Session storage is used ONLY for runtime state (refresh status).
 * NO local/persistent storage is used.
 *
 * @deprecated Import from './settings' instead for better tree-shaking.
 */

// Re-export everything from the new modular structure
export {
    // Storage keys (session storage only - for runtime state)
    STORAGE_KEYS,

    // Extension settings (from API)
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    getGeminiApiKey,
    saveGeminiApiKey,
    getBackendUrl,
    saveBackendUrl,

    // Gemini stats & history (from API)
    getGeminiStats,
    getGeminiHistory,
    recordGeminiCall,
    clearGeminiLogs,

    // Refresh status (session storage - runtime state)
    DEFAULT_REFRESH_STATUS,
    getRefreshStatus,
} from './settings';
