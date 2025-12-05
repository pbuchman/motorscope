import { ExtensionSettings, GeminiCallHistoryEntry, GeminiStats } from '../types';
import { extensionStorage } from './extensionStorage';

export const STORAGE_KEYS = {
  settings: 'moto_tracker_settings',
  geminiKey: 'moto_tracker_gemini_key',
  geminiStats: 'moto_tracker_gemini_stats',
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  geminiApiKey: '',
  checkFrequencyMinutes: 60,
};

const clampFrequency = (value?: number): number => {
  const numeric = typeof value === 'number' && !Number.isNaN(value) ? value : DEFAULT_SETTINGS.checkFrequencyMinutes;
  return Math.min(1440, Math.max(15, numeric));
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
