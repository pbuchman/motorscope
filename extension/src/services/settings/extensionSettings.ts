/**
 * Extension Settings Service
 *
 * Manages core extension configuration: API key, backend URL, check frequency.
 * Settings are stored across multiple storage keys for security (API key separate).
 */

import { ExtensionSettings } from '../../types';
import { DEFAULT_BACKEND_URL } from '../../auth/config';
import { STORAGE_KEYS } from './storageKeys';
import { getWithDefault, setStorage } from './storageHelpers';

// ============================================================================
// Defaults & Validation
// ============================================================================

export const DEFAULT_SETTINGS: ExtensionSettings = {
  geminiApiKey: '',
  checkFrequencyMinutes: 60,
  backendUrl: DEFAULT_BACKEND_URL,
};

/** Clamp frequency to valid range: 10 seconds (0.167 min) to 1 month (43200 min) */
function clampFrequency(value?: number): number {
  const numeric = typeof value === 'number' && !Number.isNaN(value)
    ? value
    : DEFAULT_SETTINGS.checkFrequencyMinutes;
  return Math.min(43200, Math.max(0.167, numeric));
}

// ============================================================================
// Individual Setting Accessors
// ============================================================================

export async function getGeminiApiKey(): Promise<string> {
  return getWithDefault(STORAGE_KEYS.geminiKey, '');
}

export async function saveGeminiApiKey(key: string): Promise<void> {
  await setStorage(STORAGE_KEYS.geminiKey, key.trim());
}

export async function getBackendUrl(): Promise<string> {
  return getWithDefault(STORAGE_KEYS.backendUrl, DEFAULT_BACKEND_URL);
}

export async function saveBackendUrl(url: string): Promise<void> {
  await setStorage(STORAGE_KEYS.backendUrl, url.trim());
}

// ============================================================================
// Combined Settings
// ============================================================================

/** Get all extension settings as a unified object */
export async function getSettings(): Promise<ExtensionSettings> {
  const [stored, geminiApiKey, backendUrl] = await Promise.all([
    getWithDefault<{ checkFrequencyMinutes?: number }>(STORAGE_KEYS.settings, {}),
    getGeminiApiKey(),
    getBackendUrl(),
  ]);

  return {
    geminiApiKey,
    checkFrequencyMinutes: clampFrequency(stored.checkFrequencyMinutes),
    backendUrl,
  };
}

/** Save all extension settings */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await Promise.all([
    saveGeminiApiKey(settings.geminiApiKey),
    saveBackendUrl(settings.backendUrl),
    setStorage(STORAGE_KEYS.settings, {
      checkFrequencyMinutes: clampFrequency(settings.checkFrequencyMinutes),
    }),
  ]);
}

