/**
 * Settings Service - Barrel Export
 *
 * Re-exports all settings-related modules for backward compatibility.
 * Import from here for a unified API, or directly from submodules for tree-shaking.
 */

// Storage infrastructure
export {STORAGE_KEYS} from './storageKeys';

// Extension settings
export {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    getGeminiApiKey,
    saveGeminiApiKey,
    getBackendUrl,
    saveBackendUrl,
} from './extensionSettings';

// Gemini stats & history
export {
    getGeminiStats,
    getGeminiHistory,
    recordGeminiCall,
    clearGeminiLogs,
} from './geminiStats';

// Refresh status
export {
    DEFAULT_REFRESH_STATUS,
    getRefreshStatus,
    saveRefreshStatus,
    updateRefreshStatus,
} from './refreshStatus';

