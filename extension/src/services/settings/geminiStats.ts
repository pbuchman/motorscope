/**
 * Gemini Stats Service
 *
 * Tracks Gemini API usage statistics and call history.
 * Stats are aggregate counts; history is stored separately for scalability.
 */

import { GeminiCallHistoryEntry, GeminiStats } from '../../types';
import { STORAGE_KEYS } from './storageKeys';
import { getWithDefault, setStorage } from './storageHelpers';

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
// Stats Operations
// ============================================================================

export async function getGeminiStats(): Promise<GeminiStats> {
  return getWithDefault(STORAGE_KEYS.geminiStats, DEFAULT_STATS);
}

async function saveGeminiStats(stats: GeminiStats): Promise<void> {
  await setStorage(STORAGE_KEYS.geminiStats, stats);
}

// ============================================================================
// History Operations
// ============================================================================

export async function getGeminiHistory(): Promise<GeminiCallHistoryEntry[]> {
  return getWithDefault(STORAGE_KEYS.geminiHistory, []);
}

async function saveGeminiHistory(history: GeminiCallHistoryEntry[]): Promise<void> {
  await setStorage(STORAGE_KEYS.geminiHistory, history);
}

// ============================================================================
// Combined Operations
// ============================================================================

/** Record a new Gemini API call, updating both stats and history */
export async function recordGeminiCall(entry: GeminiCallHistoryEntry): Promise<void> {
  const [stats, history] = await Promise.all([
    getGeminiStats(),
    getGeminiHistory(),
  ]);

  const isSuccess = entry.status === 'success';

  const updatedStats: GeminiStats = {
    allTimeTotalCalls: stats.allTimeTotalCalls + 1,
    totalCalls: stats.totalCalls + 1,
    successCount: stats.successCount + (isSuccess ? 1 : 0),
    errorCount: stats.errorCount + (isSuccess ? 0 : 1),
  };

  // Prepend new entry and trim to max size
  const updatedHistory = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);

  await Promise.all([
    saveGeminiStats(updatedStats),
    saveGeminiHistory(updatedHistory),
  ]);
}

/** Clear session stats and history, preserving all-time total */
export async function clearGeminiLogs(): Promise<void> {
  const stats = await getGeminiStats();

  await Promise.all([
    saveGeminiStats({
      allTimeTotalCalls: stats.allTimeTotalCalls,
      totalCalls: 0,
      successCount: 0,
      errorCount: 0,
    }),
    saveGeminiHistory([]),
  ]);
}

