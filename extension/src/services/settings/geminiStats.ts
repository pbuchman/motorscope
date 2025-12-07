/**
 * Gemini Stats Service
 *
 * Tracks Gemini API usage statistics and call history.
 *
 * When authenticated:
 * - Stats are stored in Firebase via the backend API
 * - History is stored in Firebase via the backend API
 *
 * When not authenticated:
 * - Stats and history are stored locally (fallback)
 */

import { GeminiCallHistoryEntry, GeminiStats } from '../../types';
import { STORAGE_KEYS } from './storageKeys';
import { getWithDefault, setStorage } from './storageHelpers';
import {
  getRemoteSettings,
  saveRemoteSettings,
  getRemoteGeminiHistory,
  addRemoteGeminiHistory,
  clearRemoteGeminiHistory,
} from '../../api/client';
import { getStoredToken } from '../../auth/storage';

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_STATS: GeminiStats = {
  allTimeTotalCalls: 0,
  totalCalls: 0,
  successCount: 0,
  errorCount: 0,
};

const MAX_HISTORY_ENTRIES = 200;

// ============================================================================
// Auth Check Helper
// ============================================================================

/** Check if user is authenticated (has valid JWT) */
async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await getStoredToken();
    return !!token;
  } catch {
    return false;
  }
}

// ============================================================================
// Stats Operations
// ============================================================================

/** Get local stats from Chrome storage */
async function getLocalStats(): Promise<GeminiStats> {
  return getWithDefault(STORAGE_KEYS.geminiStats, DEFAULT_STATS);
}

/** Save local stats to Chrome storage */
async function saveLocalStats(stats: GeminiStats): Promise<void> {
  await setStorage(STORAGE_KEYS.geminiStats, stats);
}

/** Get Gemini stats - from Firebase if authenticated, else from local storage */
export async function getGeminiStats(): Promise<GeminiStats> {
  if (await isAuthenticated()) {
    try {
      const remoteSettings = await getRemoteSettings();
      return remoteSettings.geminiStats || DEFAULT_STATS;
    } catch (error) {
      console.warn('Failed to fetch remote stats, using local:', error);
      return getLocalStats();
    }
  }
  return getLocalStats();
}

/** Save Gemini stats - to Firebase if authenticated, always to local storage */
async function saveGeminiStats(stats: GeminiStats): Promise<void> {
  // Always save locally for offline access
  await saveLocalStats(stats);

  // Also save to remote if authenticated
  if (await isAuthenticated()) {
    try {
      await saveRemoteSettings({ geminiStats: stats });
    } catch (error) {
      console.warn('Failed to save remote stats:', error);
    }
  }
}

// ============================================================================
// History Operations
// ============================================================================

/** Get local history from Chrome storage */
async function getLocalHistory(): Promise<GeminiCallHistoryEntry[]> {
  return getWithDefault(STORAGE_KEYS.geminiHistory, []);
}

/** Save local history to Chrome storage */
async function saveLocalHistory(history: GeminiCallHistoryEntry[]): Promise<void> {
  await setStorage(STORAGE_KEYS.geminiHistory, history);
}

/** Get Gemini history - from Firebase if authenticated, else from local storage */
export async function getGeminiHistory(): Promise<GeminiCallHistoryEntry[]> {
  if (await isAuthenticated()) {
    try {
      return await getRemoteGeminiHistory(MAX_HISTORY_ENTRIES);
    } catch (error) {
      console.warn('Failed to fetch remote history, using local:', error);
      return getLocalHistory();
    }
  }
  return getLocalHistory();
}

// ============================================================================
// Combined Operations
// ============================================================================

/** Record a new Gemini API call, updating both stats and history */
export async function recordGeminiCall(entry: GeminiCallHistoryEntry): Promise<void> {
  const isSuccess = entry.status === 'success';
  const authenticated = await isAuthenticated();

  // Get current stats (from remote if authenticated)
  const stats = authenticated
    ? await (async () => {
        try {
          const remoteSettings = await getRemoteSettings();
          return remoteSettings.geminiStats || DEFAULT_STATS;
        } catch {
          return getLocalStats();
        }
      })()
    : await getLocalStats();

  const updatedStats: GeminiStats = {
    allTimeTotalCalls: stats.allTimeTotalCalls + 1,
    totalCalls: stats.totalCalls + 1,
    successCount: stats.successCount + (isSuccess ? 1 : 0),
    errorCount: stats.errorCount + (isSuccess ? 0 : 1),
  };

  // Save stats (to both local and remote if authenticated)
  await saveGeminiStats(updatedStats);

  // Handle history
  if (authenticated) {
    // Push entry to Firebase
    try {
      await addRemoteGeminiHistory(entry);
    } catch (error) {
      console.warn('Failed to save remote history entry, saving locally:', error);
      // Fallback to local storage
      const localHistory = await getLocalHistory();
      const updatedHistory = [entry, ...localHistory].slice(0, MAX_HISTORY_ENTRIES);
      await saveLocalHistory(updatedHistory);
    }
  } else {
    // Save locally only
    const localHistory = await getLocalHistory();
    const updatedHistory = [entry, ...localHistory].slice(0, MAX_HISTORY_ENTRIES);
    await saveLocalHistory(updatedHistory);
  }
}

/** Clear session stats and history, preserving all-time total */
export async function clearGeminiLogs(): Promise<void> {
  const stats = await getGeminiStats();
  const authenticated = await isAuthenticated();

  const clearedStats: GeminiStats = {
    allTimeTotalCalls: stats.allTimeTotalCalls,
    totalCalls: 0,
    successCount: 0,
    errorCount: 0,
  };

  // Clear local storage
  await Promise.all([
    saveLocalStats(clearedStats),
    saveLocalHistory([]),
  ]);

  // Clear remote if authenticated
  if (authenticated) {
    try {
      await Promise.all([
        saveRemoteSettings({ geminiStats: clearedStats }),
        clearRemoteGeminiHistory(),
      ]);
    } catch (error) {
      console.warn('Failed to clear remote logs:', error);
    }
  }
}

