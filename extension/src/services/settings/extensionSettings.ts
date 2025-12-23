/**
 * Extension Settings Service
 *
 * Manages core extension configuration: API key, check frequency, grace period.
 * All settings are fetched from and saved to the backend API.
 * NO local storage is used for settings.
 *
 * Backend URL is stored separately in chrome.storage.local (see localServerStorage.ts).
 */

import {ExtensionSettings} from '@/types';
import {getRemoteSettings, patchRemoteSettings} from '@/api/client';

// ============================================================================
// Defaults & Validation
// ============================================================================

/** Default grace period for ENDED listings (days) */
export const DEFAULT_ENDED_GRACE_PERIOD_DAYS = 3;

/** Minimum grace period (days) */
export const MIN_ENDED_GRACE_PERIOD_DAYS = 1;

/** Maximum grace period (days) */
export const MAX_ENDED_GRACE_PERIOD_DAYS = 30;

export const DEFAULT_SETTINGS: ExtensionSettings = {
    geminiApiKey: '',
    checkFrequencyMinutes: 60,
    endedListingGracePeriodDays: DEFAULT_ENDED_GRACE_PERIOD_DAYS,
};

/** Clamp frequency to valid range: 10 seconds (0.167 min) to 1 month (43200 min) */
function clampFrequency(value?: number): number {
    const numeric = typeof value === 'number' && !Number.isNaN(value)
        ? value
        : DEFAULT_SETTINGS.checkFrequencyMinutes;
    return Math.min(43200, Math.max(0.167, numeric));
}

/** Clamp grace period to valid range: 1 to 30 days */
function clampGracePeriod(value?: number): number {
    const numeric = typeof value === 'number' && !Number.isNaN(value)
        ? value
        : DEFAULT_SETTINGS.endedListingGracePeriodDays;
    return Math.min(MAX_ENDED_GRACE_PERIOD_DAYS, Math.max(MIN_ENDED_GRACE_PERIOD_DAYS, numeric));
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
            endedListingGracePeriodDays: clampGracePeriod(remoteSettings.endedListingGracePeriodDays),
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
            endedListingGracePeriodDays: clampGracePeriod(settings.endedListingGracePeriodDays),
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
    await patchRemoteSettings({geminiApiKey: key.trim()});
}

/**
 * Get backend URL from local storage.
 * @deprecated Use getBackendServerUrl from localServerStorage.ts instead
 */
export {getBackendServerUrl as getBackendUrl} from '../../auth/localServerStorage';

/**
 * Save backend URL to local storage.
 * @deprecated Use setBackendServerUrl from localServerStorage.ts instead
 */
export {setBackendServerUrl as saveBackendUrl} from '../../auth/localServerStorage';

