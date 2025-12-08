/**
 * Extension Settings Service
 *
 * Manages core extension configuration: API key, backend URL, check frequency.
 * All settings are fetched from and saved to the backend API.
 * NO local storage is used for settings.
 *
 * Backend URL is the only exception - it's needed to know where to make API calls,
 * so it has a hardcoded default.
 */

import { ExtensionSettings } from '../../types';
import { DEFAULT_BACKEND_URL } from '../../auth/config';
import { getRemoteSettings, patchRemoteSettings } from '../../api/client';

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
// Settings Operations (API-only)
// ============================================================================

/**
 * Get all extension settings from the API.
 * Returns defaults if not authenticated or on error.
 */
export async function getSettings(): Promise<ExtensionSettings> {
  try {
    const remoteSettings = await getRemoteSettings();
    return {
      geminiApiKey: remoteSettings.geminiApiKey || '',
      checkFrequencyMinutes: clampFrequency(remoteSettings.checkFrequencyMinutes),
      backendUrl: DEFAULT_BACKEND_URL, // Backend URL is always the default
    };
  } catch (error) {
    console.warn('Failed to fetch settings from API:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save all extension settings to the API.
 */
export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  try {
    await patchRemoteSettings({
      geminiApiKey: settings.geminiApiKey,
      checkFrequencyMinutes: clampFrequency(settings.checkFrequencyMinutes),
    });
  } catch (error) {
    console.warn('Failed to save settings to API:', error);
    throw error;
  }
}

// ============================================================================
// Individual Setting Accessors (for convenience)
// ============================================================================

/**
 * Get Gemini API key from the API.
 */
export async function getGeminiApiKey(): Promise<string> {
  const settings = await getSettings();
  return settings.geminiApiKey;
}

/**
 * Save Gemini API key to the API.
 */
export async function saveGeminiApiKey(key: string): Promise<void> {
  await patchRemoteSettings({ geminiApiKey: key.trim() });
}

/**
 * Get backend URL - always returns the default.
 * The backend URL is hardcoded since we need it to make API calls.
 */
export async function getBackendUrl(): Promise<string> {
  return DEFAULT_BACKEND_URL;
}

/**
 * Save backend URL - no-op since backend URL is hardcoded.
 * @deprecated Backend URL cannot be changed.
 */
export async function saveBackendUrl(_url: string): Promise<void> {
  console.warn('saveBackendUrl is deprecated - backend URL is hardcoded');
}

