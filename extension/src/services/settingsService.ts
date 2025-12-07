import { ExtensionSettings, GeminiCallHistoryEntry, GeminiStats, RefreshStatus } from '../types';
import { extensionStorage } from './extensionStorage';
import { DEFAULT_BACKEND_URL } from '../auth/config';

export const STORAGE_KEYS = {
  listings: 'motorscope_listings',
  settings: 'motorscope_settings',
  geminiKey: 'motorscope_gemini_key',
  geminiStats: 'motorscope_gemini_stats',
  refreshStatus: 'motorscope_refresh_status',
  backendUrl: 'motorscope_backend_url',
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  geminiApiKey: '',
  checkFrequencyMinutes: 60,
  backendUrl: DEFAULT_BACKEND_URL,
};

const clampFrequency = (value?: number): number => {
  const numeric = typeof value === 'number' && !Number.isNaN(value) ? value : DEFAULT_SETTINGS.checkFrequencyMinutes;
  return Math.min(43200, Math.max(0.167, numeric)); // 10 seconds (0.167 min) to 1 month
};

// Gemini API key is stored separately for security (not mixed with other settings)
export const getGeminiApiKey = async (): Promise<string> => {
  const key = await extensionStorage.get<string>(STORAGE_KEYS.geminiKey);
  return key || '';
};

export const saveGeminiApiKey = async (key: string): Promise<void> => {
  await extensionStorage.set(STORAGE_KEYS.geminiKey, key.trim());
};

// Backend URL stored separately
export const getBackendUrl = async (): Promise<string> => {
  const url = await extensionStorage.get<string>(STORAGE_KEYS.backendUrl);
  return url || DEFAULT_BACKEND_URL;
};

export const saveBackendUrl = async (url: string): Promise<void> => {
  await extensionStorage.set(STORAGE_KEYS.backendUrl, url.trim());
};

// Settings combines the API key from dedicated storage with other settings
export const getSettings = async (): Promise<ExtensionSettings> => {
  const stored = await extensionStorage.get<{ checkFrequencyMinutes?: number }>(STORAGE_KEYS.settings);
  const geminiApiKey = await getGeminiApiKey();
  const backendUrl = await getBackendUrl();
  return {
    geminiApiKey,
    checkFrequencyMinutes: clampFrequency(stored?.checkFrequencyMinutes),
    backendUrl,
  };
};

// Save settings - API key and backend URL go to dedicated storage, other settings to settings storage
export const saveSettings = async (settings: ExtensionSettings): Promise<void> => {
  // Save API key to dedicated storage
  await saveGeminiApiKey(settings.geminiApiKey);

  // Save backend URL to dedicated storage
  await saveBackendUrl(settings.backendUrl);

  // Save other settings (without API key and backend URL) to settings storage
  await extensionStorage.set(STORAGE_KEYS.settings, {
    checkFrequencyMinutes: clampFrequency(settings.checkFrequencyMinutes),
  });
};

// Gemini stats (aggregate counts only - history stored separately)
export const getGeminiStats = async (): Promise<GeminiStats> => {
  const stats = await extensionStorage.get<GeminiStats>(STORAGE_KEYS.geminiStats);
  return stats || { allTimeTotalCalls: 0, totalCalls: 0, successCount: 0, errorCount: 0 };
};

// Gemini history stored separately
const GEMINI_HISTORY_KEY = 'motorscope_gemini_history';

export const getGeminiHistory = async (): Promise<GeminiCallHistoryEntry[]> => {
  const history = await extensionStorage.get<GeminiCallHistoryEntry[]>(GEMINI_HISTORY_KEY);
  return history || [];
};

export const recordGeminiCall = async (entry: GeminiCallHistoryEntry): Promise<void> => {
  // Update stats
  const stats = await getGeminiStats();
  await extensionStorage.set(STORAGE_KEYS.geminiStats, {
    allTimeTotalCalls: (stats.allTimeTotalCalls || 0) + 1,
    totalCalls: stats.totalCalls + 1,
    successCount: entry.status === 'success' ? stats.successCount + 1 : stats.successCount,
    errorCount: entry.status === 'error' ? stats.errorCount + 1 : stats.errorCount,
  });

  // Update history (keep last 200 entries locally)
  const history = await getGeminiHistory();
  const updatedHistory = [entry, ...history].slice(0, 200);
  await extensionStorage.set(GEMINI_HISTORY_KEY, updatedHistory);
};

// Clear logs and session counts, but preserve allTimeTotalCalls
export const clearGeminiLogs = async (): Promise<void> => {
  const stats = await getGeminiStats();
  await extensionStorage.set(STORAGE_KEYS.geminiStats, {
    allTimeTotalCalls: stats.allTimeTotalCalls || 0,
    totalCalls: 0,
    successCount: 0,
    errorCount: 0,
  });
  // Clear history
  await extensionStorage.set(GEMINI_HISTORY_KEY, []);
};

export const DEFAULT_REFRESH_STATUS: RefreshStatus = {
  lastRefreshTime: null,
  nextRefreshTime: null,
  lastRefreshCount: 0,
  isRefreshing: false,
  currentIndex: 0,
  totalCount: 0,
  currentListingTitle: null,
  pendingItems: [],
  recentlyRefreshed: [],
  refreshErrors: [],
};

export const getRefreshStatus = async (): Promise<RefreshStatus> => {
  const status = await extensionStorage.get<RefreshStatus>(STORAGE_KEYS.refreshStatus);
  return status || DEFAULT_REFRESH_STATUS;
};


