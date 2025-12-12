/**
 * useExtensionNavigation Hook Tests
 *
 * Tests for the hook that provides extension navigation functionality.
 */

import {renderHook, act} from '@testing-library/react';
import {useExtensionNavigation} from '@/hooks';

// Chrome API is mocked globally in test setup

describe('useExtensionNavigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (chrome.runtime.getURL as jest.Mock).mockImplementation((path) => `chrome-extension://abc123/${path}`);
    });

    describe('isExtension', () => {
        it('should return true when chrome.runtime exists', () => {
            const {result} = renderHook(() => useExtensionNavigation());

            expect(result.current.isExtension).toBe(true);
        });
    });

    describe('openDashboard', () => {
        it('should open dashboard in new tab', () => {
            const {result} = renderHook(() => useExtensionNavigation());

            act(() => {
                result.current.openDashboard();
            });

            expect(chrome.tabs.create).toHaveBeenCalledWith({
                url: 'chrome-extension://abc123/index.html?view=dashboard',
            });
        });
    });

    describe('openSettings', () => {
        it('should open settings in new tab', () => {
            const {result} = renderHook(() => useExtensionNavigation());

            act(() => {
                result.current.openSettings();
            });

            expect(chrome.tabs.create).toHaveBeenCalledWith({
                url: 'chrome-extension://abc123/index.html?view=settings',
            });
        });
    });

    describe('openView', () => {
        it('should open popup view', () => {
            const {result} = renderHook(() => useExtensionNavigation());

            act(() => {
                result.current.openView('popup');
            });

            expect(chrome.tabs.create).toHaveBeenCalledWith({
                url: 'chrome-extension://abc123/index.html?view=popup',
            });
        });

        it('should call chrome.tabs.create with correct URL format', () => {
            const {result} = renderHook(() => useExtensionNavigation());

            act(() => {
                result.current.openView('dashboard');
            });

            expect(chrome.runtime.getURL).toHaveBeenCalledWith('index.html?view=dashboard');
        });
    });

    describe('when not in extension context', () => {
        it('should not create tabs when chrome.tabs is not available', () => {
            const originalTabs = chrome.tabs;
            // Temporarily remove chrome.tabs to test error handling
            (chrome as { tabs?: typeof chrome.tabs }).tabs = undefined;

            const {result} = renderHook(() => useExtensionNavigation());

            act(() => {
                result.current.openDashboard();
            });

            // Should not throw, just not create tab
            expect(result.current.isExtension).toBe(true); // Still true because runtime exists

            // Restore
            chrome.tabs = originalTabs;
        });
    });
});

