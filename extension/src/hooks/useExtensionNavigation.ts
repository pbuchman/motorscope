/**
 * useExtensionNavigation Hook
 *
 * Provides helpers for navigating within the extension.
 */

import {useCallback} from 'react';
import {isChromeExtension} from './useChromeMessaging';

type ExtensionView = 'dashboard' | 'settings' | 'popup';

interface UseExtensionNavigationResult {
    /** Open the dashboard in a new tab */
    openDashboard: () => void;
    /** Open the settings page in a new tab */
    openSettings: () => void;
    /** Open any extension view in a new tab */
    openView: (view: ExtensionView) => void;
    /** Check if we're in extension context */
    isExtension: boolean;
}

/**
 * Hook for navigating to extension pages
 */
export const useExtensionNavigation = (): UseExtensionNavigationResult => {
    const isExtension = isChromeExtension();

    const openView = useCallback((view: ExtensionView) => {
        if (isExtension && chrome.tabs) {
            chrome.tabs.create({
                url: chrome.runtime.getURL(`index.html?view=${view}`),
            });
        }
    }, [isExtension]);

    const openDashboard = useCallback(() => {
        openView('dashboard');
    }, [openView]);

    const openSettings = useCallback(() => {
        openView('settings');
    }, [openView]);

    return {
        openDashboard,
        openSettings,
        openView,
        isExtension,
    };
};

