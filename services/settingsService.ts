import { ExtensionSettings, GeminiCallHistoryEntry, GeminiStats, RefreshStatus } from '../types';
import { extensionStorage } from './extensionStorage';

export const STORAGE_KEYS = {
  settings: 'moto_tracker_settings',
  geminiKey: 'moto_tracker_gemini_key',
  geminiStats: 'moto_tracker_gemini_stats',
  refreshStatus: 'moto_tracker_refresh_status',
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  geminiApiKey: '',
  checkFrequencyMinutes: 60,
};

const clampFrequency = (value?: number): number => {
  const numeric = typeof value === 'number' && !Number.isNaN(value) ? value : DEFAULT_SETTINGS.checkFrequencyMinutes;
  return Math.min(43200, Math.max(0.167, numeric)); // 10 seconds (0.167 min) to 1 month
};

export const getGeminiApiKey = async (): Promise<string> => {
  const key = await extensionStorage.get<string>(STORAGE_KEYS.geminiKey);
  return key || '';
};

export const saveGeminiApiKey = async (key: string): Promise<void> => {
  await extensionStorage.set(STORAGE_KEYS.geminiKey, key.trim());
};

export const getSettings = async (): Promise<ExtensionSettings> => {
  const stored = await extensionStorage.get<ExtensionSettings>(STORAGE_KEYS.settings);
  const geminiApiKey = await getGeminiApiKey();
  return {
    geminiApiKey,
    checkFrequencyMinutes: clampFrequency(stored?.checkFrequencyMinutes),
  };
};

export const saveSettings = async (settings: ExtensionSettings): Promise<void> => {
  const merged: ExtensionSettings = {
    geminiApiKey: settings.geminiApiKey.trim(),
    checkFrequencyMinutes: clampFrequency(settings.checkFrequencyMinutes),
  };
  await extensionStorage.set(STORAGE_KEYS.settings, merged);
  await saveGeminiApiKey(merged.geminiApiKey);
};

export const getGeminiStats = async (): Promise<GeminiStats> => {
  const stats = await extensionStorage.get<GeminiStats>(STORAGE_KEYS.geminiStats);
  return stats || { totalCalls: 0, history: [] };
};

export const recordGeminiCall = async (entry: GeminiCallHistoryEntry): Promise<void> => {
  const stats = await getGeminiStats();
  const history = [entry, ...stats.history].slice(0, 200);
  await extensionStorage.set(STORAGE_KEYS.geminiStats, {
    totalCalls: stats.totalCalls + 1,
    history,
  });
};

export const resetGeminiStats = async (): Promise<void> => {
  await extensionStorage.set(STORAGE_KEYS.geminiStats, { totalCalls: 0, history: [] });
};

export const DEFAULT_REFRESH_STATUS: RefreshStatus = {
  lastRefreshTime: null,
  nextRefreshTime: null,
  lastRefreshCount: 0,
  isRefreshing: false,
};

export const getRefreshStatus = async (): Promise<RefreshStatus> => {
  const status = await extensionStorage.get<RefreshStatus>(STORAGE_KEYS.refreshStatus);
  return status || DEFAULT_REFRESH_STATUS;
};

export const saveRefreshStatus = async (status: Partial<RefreshStatus>): Promise<void> => {
  const current = await getRefreshStatus();
  await extensionStorage.set(STORAGE_KEYS.refreshStatus, { ...current, ...status });
};

