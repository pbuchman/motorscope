/**
 * useCurrentTab Hook Tests
 *
 * Tests for the hook that provides current browser tab information.
 */

import {renderHook, waitFor} from '@testing-library/react';
import {useCurrentTab} from '@/hooks';

// Chrome API is mocked globally in test setup

describe('useCurrentTab', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('when in extension context', () => {
        it('should return tab info when tab is available', async () => {
            const mockTab = {
                id: 1,
                url: 'https://example.com/page',
                title: 'Example Page',
            };

            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([mockTab]);
            });

            const {result} = renderHook(() => useCurrentTab());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.tab).toEqual({
                url: 'https://example.com/page',
                title: 'Example Page',
                id: 1,
            });
            expect(result.current.error).toBeNull();
        });

        it('should handle missing tab URL', async () => {
            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([{id: 1, title: 'No URL Tab'}]);
            });

            const {result} = renderHook(() => useCurrentTab());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.tab).toBeNull();
            expect(result.current.error).toBe('Could not get current tab');
        });

        it('should handle empty tabs array', async () => {
            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([]);
            });

            const {result} = renderHook(() => useCurrentTab());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.tab).toBeNull();
            expect(result.current.error).toBe('Could not get current tab');
        });

        it('should start in loading state', () => {
            (chrome.tabs.query as jest.Mock).mockImplementation(() => {
                // Don't call callback - simulate loading
            });

            const {result} = renderHook(() => useCurrentTab());

            expect(result.current.isLoading).toBe(true);
            expect(result.current.tab).toBeNull();
        });

        it('should handle tab with empty title', async () => {
            const mockTab = {
                id: 2,
                url: 'https://example.com',
                // No title property
            };

            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([mockTab]);
            });

            const {result} = renderHook(() => useCurrentTab());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.tab?.title).toBe('');
        });
    });

    describe('when not in extension context', () => {
        it('should handle missing chrome.tabs', async () => {
            const originalTabs = chrome.tabs;
            // Temporarily remove chrome.tabs to test error handling
            (chrome as { tabs?: typeof chrome.tabs }).tabs = undefined;

            const {result} = renderHook(() => useCurrentTab());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Extension context not available');
            expect(result.current.tab).toBeNull();

            // Restore
            chrome.tabs = originalTabs;
        });
    });
});

