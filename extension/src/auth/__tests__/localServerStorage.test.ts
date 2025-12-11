/**
 * Tests for Local Server Storage
 *
 * Uses the global chromeMock set up in setupTests.ts
 */

import {clearBackendServerUrl, getBackendServerUrl, setBackendServerUrl,} from '@/auth/localServerStorage';
import {BACKEND_SERVER_OPTIONS, DEFAULT_BACKEND_URL} from '@/auth/config';
import {getChromeMock} from '@/test-utils/chromeMock';

describe('Local Server Storage', () => {
    let chrome: ReturnType<typeof getChromeMock>;

    beforeEach(() => {
        chrome = getChromeMock();
    });

    describe('getBackendServerUrl', () => {
        it('should return default URL when nothing is stored', async () => {
            const url = await getBackendServerUrl();
            expect(url).toBe(DEFAULT_BACKEND_URL);
        });

        it('should return stored URL when valid', async () => {
            const validUrl = BACKEND_SERVER_OPTIONS[0].value;
            // Pre-populate the mock storage
            await new Promise<void>((resolve) => {
                chrome.storage.local.set({'motorscope_backend_server': validUrl}, () => resolve());
            });

            const url = await getBackendServerUrl();
            expect(url).toBe(validUrl);
        });

        it('should return default URL for invalid stored value', async () => {
            // Pre-populate with invalid URL
            await new Promise<void>((resolve) => {
                chrome.storage.local.set({'motorscope_backend_server': 'https://invalid-server.com'}, () => resolve());
            });

            const url = await getBackendServerUrl();
            expect(url).toBe(DEFAULT_BACKEND_URL);
        });
    });

    describe('setBackendServerUrl', () => {
        it('should store valid URL', async () => {
            const validUrl = BACKEND_SERVER_OPTIONS[0].value;
            await setBackendServerUrl(validUrl);

            expect(chrome.storage.local.set).toHaveBeenCalled();

            // Verify the value was stored
            const storedUrl = await getBackendServerUrl();
            expect(storedUrl).toBe(validUrl);
        });

        it('should throw error for invalid URL', async () => {
            await expect(setBackendServerUrl('https://invalid-server.com')).rejects.toThrow(
                'Invalid backend server URL'
            );
        });

        it('should accept all valid server options', async () => {
            for (const option of BACKEND_SERVER_OPTIONS) {
                await setBackendServerUrl(option.value);
                const storedUrl = await getBackendServerUrl();
                expect(storedUrl).toBe(option.value);
            }
        });
    });

    describe('clearBackendServerUrl', () => {
        it('should remove stored URL', async () => {
            // First store a value
            const validUrl = BACKEND_SERVER_OPTIONS[0].value;
            await setBackendServerUrl(validUrl);

            // Then clear it
            await clearBackendServerUrl();

            expect(chrome.storage.local.remove).toHaveBeenCalled();

            // Verify it returns default after clearing
            const url = await getBackendServerUrl();
            expect(url).toBe(DEFAULT_BACKEND_URL);
        });
    });
});

describe('Backend Server Options Validation', () => {
    it('should have at least one server option', () => {
        expect(BACKEND_SERVER_OPTIONS.length).toBeGreaterThan(0);
    });

    it('should have unique values', () => {
        const values = BACKEND_SERVER_OPTIONS.map(o => o.value);
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBe(values.length);
    });

    it('should have valid URL format for all options', () => {
        for (const option of BACKEND_SERVER_OPTIONS) {
            expect(() => new URL(option.value)).not.toThrow();
        }
    });

    it('should have default URL in options', () => {
        const defaultInOptions = BACKEND_SERVER_OPTIONS.some(o => o.value === DEFAULT_BACKEND_URL);
        expect(defaultInOptions).toBe(true);
    });

    it('should have label for each option', () => {
        for (const option of BACKEND_SERVER_OPTIONS) {
            expect(option.label).toBeDefined();
            expect(option.label.length).toBeGreaterThan(0);
        }
    });
});
