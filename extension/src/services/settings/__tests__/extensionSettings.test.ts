/**
 * Tests for Extension Settings Service
 *
 * Tests for settings management that communicates with the backend API.
 */

import {DEFAULT_SETTINGS, getSettings, saveSettings, getGeminiApiKey, saveGeminiApiKey} from '../extensionSettings';

// Mock the API client
jest.mock('@/api/client', () => ({
    getRemoteSettings: jest.fn(),
    patchRemoteSettings: jest.fn(),
}));

import {getRemoteSettings, patchRemoteSettings} from '@/api/client';

const mockGetRemoteSettings = getRemoteSettings as jest.MockedFunction<typeof getRemoteSettings>;
const mockPatchRemoteSettings = patchRemoteSettings as jest.MockedFunction<typeof patchRemoteSettings>;

// Frequency limits from extensionSettings.ts clampFrequency function
const MIN_FREQUENCY_MINUTES = 0.167; // 10 seconds
const MAX_FREQUENCY_MINUTES = 43200; // 30 days

describe('Extension Settings Service', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    describe('DEFAULT_SETTINGS', () => {
        it('should have default API key as empty string', () => {
            expect(DEFAULT_SETTINGS.geminiApiKey).toBe('');
        });

        it('should have default check frequency of 60 minutes', () => {
            expect(DEFAULT_SETTINGS.checkFrequencyMinutes).toBe(60);
        });
    });

    describe('getSettings', () => {
        it('should return settings from API', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: 'test-api-key',
                checkFrequencyMinutes: 120,
                geminiStats: {
                    allTimeTotalCalls: 100,
                    totalCalls: 50,
                    successCount: 45,
                    errorCount: 5,
                },
            });

            const settings = await getSettings();

            expect(settings.geminiApiKey).toBe('test-api-key');
            expect(settings.checkFrequencyMinutes).toBe(120);
        });

        it('should return defaults when API call fails', async () => {
            mockGetRemoteSettings.mockRejectedValue(new Error('Network error'));

            const settings = await getSettings();

            expect(settings).toEqual(DEFAULT_SETTINGS);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to fetch settings from API:',
                expect.any(Error),
            );
        });

        it('should use empty string for missing geminiApiKey', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: '',
                checkFrequencyMinutes: 60,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            const settings = await getSettings();

            expect(settings.geminiApiKey).toBe('');
        });

        it('should clamp frequency to minimum of 0.167 minutes', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: 'key',
                checkFrequencyMinutes: 0.001, // Very low
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            const settings = await getSettings();

            expect(settings.checkFrequencyMinutes).toBeGreaterThanOrEqual(MIN_FREQUENCY_MINUTES);
        });

        it('should clamp frequency to maximum of 43200 minutes', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: 'key',
                checkFrequencyMinutes: 100000, // Very high
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            const settings = await getSettings();

            expect(settings.checkFrequencyMinutes).toBeLessThanOrEqual(MAX_FREQUENCY_MINUTES);
        });

        it('should use default frequency for NaN values', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: 'key',
                checkFrequencyMinutes: NaN,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            const settings = await getSettings();

            expect(settings.checkFrequencyMinutes).toBe(DEFAULT_SETTINGS.checkFrequencyMinutes);
        });

        it('should use default frequency for non-number values', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: 'key',
                checkFrequencyMinutes: 'invalid' as unknown as number,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            const settings = await getSettings();

            expect(settings.checkFrequencyMinutes).toBe(DEFAULT_SETTINGS.checkFrequencyMinutes);
        });
    });

    describe('saveSettings', () => {
        it('should save settings to API', async () => {
            mockPatchRemoteSettings.mockResolvedValue({
                geminiApiKey: 'new-key',
                checkFrequencyMinutes: 30,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            await saveSettings({
                geminiApiKey: 'new-key',
                checkFrequencyMinutes: 30,
                endedListingGracePeriodDays: 3,
            });

            expect(mockPatchRemoteSettings).toHaveBeenCalledWith({
                geminiApiKey: 'new-key',
                checkFrequencyMinutes: 30,
                endedListingGracePeriodDays: 3,
            });
        });

        it('should clamp frequency when saving', async () => {
            mockPatchRemoteSettings.mockResolvedValue({
                geminiApiKey: 'key',
                checkFrequencyMinutes: 0.167,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            await saveSettings({
                geminiApiKey: 'key',
                checkFrequencyMinutes: 0.001, // Very low
                endedListingGracePeriodDays: 3,
            });

            expect(mockPatchRemoteSettings).toHaveBeenCalledWith(
                expect.objectContaining({
                    checkFrequencyMinutes: expect.any(Number),
                }),
            );
            // Verify the frequency was clamped
            const call = mockPatchRemoteSettings.mock.calls[0][0];
            expect(call.checkFrequencyMinutes).toBeGreaterThanOrEqual(0.167);
        });

        it('should throw error when API call fails', async () => {
            mockPatchRemoteSettings.mockRejectedValue(new Error('Save failed'));

            await expect(saveSettings({
                geminiApiKey: 'key',
                checkFrequencyMinutes: 60,
                endedListingGracePeriodDays: 3,
            })).rejects.toThrow('Save failed');

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'Failed to save settings to API:',
                expect.any(Error),
            );
        });
    });

    describe('getGeminiApiKey', () => {
        it('should return API key from settings', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: 'my-api-key',
                checkFrequencyMinutes: 60,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            const key = await getGeminiApiKey();

            expect(key).toBe('my-api-key');
        });

        it('should return empty string when not set', async () => {
            mockGetRemoteSettings.mockResolvedValue({
                geminiApiKey: '',
                checkFrequencyMinutes: 60,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            const key = await getGeminiApiKey();

            expect(key).toBe('');
        });
    });

    describe('saveGeminiApiKey', () => {
        it('should save trimmed API key', async () => {
            mockPatchRemoteSettings.mockResolvedValue({
                geminiApiKey: 'trimmed-key',
                checkFrequencyMinutes: 60,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            await saveGeminiApiKey('  trimmed-key  ');

            expect(mockPatchRemoteSettings).toHaveBeenCalledWith({
                geminiApiKey: 'trimmed-key',
            });
        });

        it('should handle empty key', async () => {
            mockPatchRemoteSettings.mockResolvedValue({
                geminiApiKey: '',
                checkFrequencyMinutes: 60,
                geminiStats: {
                    allTimeTotalCalls: 0,
                    totalCalls: 0,
                    successCount: 0,
                    errorCount: 0,
                },
            });

            await saveGeminiApiKey('');

            expect(mockPatchRemoteSettings).toHaveBeenCalledWith({
                geminiApiKey: '',
            });
        });
    });
});
