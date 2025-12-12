/**
 * usePageContent Hook Tests
 *
 * Tests for the hook that scrapes content from the current browser tab.
 */

import {renderHook, waitFor, act} from '@testing-library/react';
import {usePageContent} from '@/hooks';

// Chrome API is mocked globally in test setup

describe('usePageContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('with autoFetch enabled (default)', () => {
        it('should fetch content on mount', async () => {
            const mockContent = {
                title: 'Test Page',
                content: 'Page content here',
                image: 'https://example.com/image.jpg',
            };

            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([{id: 1, url: 'https://example.com'}]);
            });

            (chrome.scripting.executeScript as jest.Mock).mockResolvedValue([
                {result: mockContent},
            ]);

            const {result} = renderHook(() => usePageContent());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.content).toEqual(mockContent);
            expect(result.current.error).toBeNull();
        });

        it('should start in loading state', () => {
            (chrome.tabs.query as jest.Mock).mockImplementation(() => {
                // Don't call callback - simulate loading
            });

            const {result} = renderHook(() => usePageContent());

            expect(result.current.isLoading).toBe(true);
            expect(result.current.content).toBeNull();
        });
    });

    describe('with autoFetch disabled', () => {
        it('should not fetch on mount', () => {
            const {result} = renderHook(() => usePageContent(false));

            expect(result.current.isLoading).toBe(false);
            expect(result.current.content).toBeNull();
            expect(chrome.tabs.query).not.toHaveBeenCalled();
        });

        it('should fetch when refresh is called', async () => {
            const mockContent = {
                title: 'Refreshed Page',
                content: 'Updated content',
                image: null,
            };

            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([{id: 1, url: 'https://example.com'}]);
            });

            (chrome.scripting.executeScript as jest.Mock).mockResolvedValue([
                {result: mockContent},
            ]);

            const {result} = renderHook(() => usePageContent(false));

            let refreshResult: unknown;
            await act(async () => {
                refreshResult = await result.current.refresh();
            });

            expect(refreshResult).toEqual(mockContent);
            expect(result.current.content).toEqual(mockContent);
        });
    });

    describe('error handling', () => {
        it('should handle chrome:// pages', async () => {
            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([{id: 1, url: 'chrome://extensions'}]);
            });

            const {result} = renderHook(() => usePageContent());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Cannot access this page');
            expect(result.current.content).toBeNull();
        });

        it('should handle missing tab ID', async () => {
            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([{url: 'https://example.com'}]); // No id
            });

            const {result} = renderHook(() => usePageContent());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Cannot access this page');
        });

        it('should handle script execution failure', async () => {
            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([{id: 1, url: 'https://example.com'}]);
            });

            (chrome.scripting.executeScript as jest.Mock).mockResolvedValue([
                {result: null},
            ]);

            const {result} = renderHook(() => usePageContent());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Failed to extract page content');
        });

        it('should handle script execution rejection', async () => {
            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([{id: 1, url: 'https://example.com'}]);
            });

            (chrome.scripting.executeScript as jest.Mock).mockRejectedValue(
                new Error('Script injection failed'),
            );

            const {result} = renderHook(() => usePageContent());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Failed to extract page content');
        });

        it('should handle empty tabs array', async () => {
            (chrome.tabs.query as jest.Mock).mockImplementation((query, callback) => {
                callback([]);
            });

            const {result} = renderHook(() => usePageContent());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.error).toBe('Cannot access this page');
        });
    });

    describe('when not in extension context', () => {
        it('should handle missing chrome.scripting on refresh', async () => {
            const originalScripting = chrome.scripting;
            // Temporarily remove chrome.scripting to test error handling
            (chrome as { scripting?: typeof chrome.scripting }).scripting = undefined;

            // Start with autoFetch disabled so we can control when fetch happens
            const {result} = renderHook(() => usePageContent(false));

            let refreshResult: unknown;
            await act(async () => {
                refreshResult = await result.current.refresh();
            });

            expect(refreshResult).toBeNull();
            expect(result.current.error).toBe('Extension context not available');

            // Restore
            chrome.scripting = originalScripting;
        });
    });
});

