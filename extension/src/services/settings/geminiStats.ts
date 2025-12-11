/**
 * Gemini Stats Service
 *
 * Tracks Gemini API usage statistics and call history.
 * All data is stored in Firebase via the backend API.
 * NO local storage is used.
 *
 * User must be authenticated to access stats/history.
 */

import {GeminiCallHistoryEntry, GeminiStats} from '../../types';
import {
    addRemoteGeminiHistory,
    clearRemoteGeminiHistory,
    getRemoteGeminiHistory,
    getRemoteSettings,
    patchRemoteSettings,
} from '../../api/client';

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_STATS: GeminiStats = {
    allTimeTotalCalls: 0,
    totalCalls: 0,
    successCount: 0,
    errorCount: 0,
};

// ============================================================================
// Stats Operations (API-only)
// ============================================================================

/**
 * Get Gemini stats from Firebase API.
 * Returns default stats if not authenticated or on error.
 */
export async function getGeminiStats(): Promise<GeminiStats> {
    try {
        const remoteSettings = await getRemoteSettings();
        return remoteSettings.geminiStats || DEFAULT_STATS;
    } catch (error) {
        console.warn('Failed to fetch Gemini stats from API:', error);
        return DEFAULT_STATS;
    }
}

/**
 * Save Gemini stats to Firebase API.
 */
async function saveGeminiStats(stats: GeminiStats): Promise<void> {
    try {
        await patchRemoteSettings({geminiStats: stats});
    } catch (error) {
        console.warn('Failed to save Gemini stats to API:', error);
        throw error;
    }
}

// ============================================================================
// History Operations (API-only)
// ============================================================================

/**
 * Get Gemini history from Firebase API.
 * Returns empty array if not authenticated or on error.
 */
export async function getGeminiHistory(): Promise<GeminiCallHistoryEntry[]> {
    try {
        return await getRemoteGeminiHistory(200);
    } catch (error) {
        console.warn('Failed to fetch Gemini history from API:', error);
        return [];
    }
}

// ============================================================================
// Combined Operations
// ============================================================================

/**
 * Record a new Gemini API call, updating both stats and history.
 * Requires authentication - silently fails if not authenticated.
 */
export async function recordGeminiCall(entry: GeminiCallHistoryEntry): Promise<void> {
    try {
        // Get current stats from API
        const remoteSettings = await getRemoteSettings();
        const stats = remoteSettings.geminiStats || DEFAULT_STATS;
        const isSuccess = entry.status === 'success';

        const updatedStats: GeminiStats = {
            allTimeTotalCalls: stats.allTimeTotalCalls + 1,
            totalCalls: stats.totalCalls + 1,
            successCount: stats.successCount + (isSuccess ? 1 : 0),
            errorCount: stats.errorCount + (isSuccess ? 0 : 1),
        };

        // Save stats and history to API in parallel
        await Promise.all([
            saveGeminiStats(updatedStats),
            addRemoteGeminiHistory(entry),
        ]);
    } catch (error) {
        console.warn('Failed to record Gemini call:', error);
        // Silently fail - don't break the main flow
    }
}

/**
 * Clear session stats and history, preserving all-time total.
 * Requires authentication.
 */
export async function clearGeminiLogs(): Promise<void> {
    try {
        const remoteSettings = await getRemoteSettings();
        const stats = remoteSettings.geminiStats || DEFAULT_STATS;

        const clearedStats: GeminiStats = {
            allTimeTotalCalls: stats.allTimeTotalCalls,
            totalCalls: 0,
            successCount: 0,
            errorCount: 0,
        };

        await Promise.all([
            patchRemoteSettings({geminiStats: clearedStats}),
            clearRemoteGeminiHistory(),
        ]);
    } catch (error) {
        console.warn('Failed to clear Gemini logs:', error);
        throw error;
    }
}

