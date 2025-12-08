/**
 * useCurrentTab Hook
 *
 * Provides access to the current browser tab's URL and information.
 * Only works in Chrome extension context.
 */

import { useState, useEffect } from 'react';
import { isChromeExtension } from './useChromeMessaging';

interface TabInfo {
  url: string;
  title: string;
  id: number | undefined;
}

interface UseCurrentTabResult {
  /** Current tab information */
  tab: TabInfo | null;
  /** Whether the tab info is still loading */
  isLoading: boolean;
  /** Error if failed to get tab info */
  error: string | null;
}

/**
 * Hook to get the current active tab's information
 */
export const useCurrentTab = (): UseCurrentTabResult => {
  const [tab, setTab] = useState<TabInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isChromeExtension() || !chrome.tabs) {
      setError('Extension context not available');
      setIsLoading(false);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url) {
        setTab({
          url: activeTab.url,
          title: activeTab.title || '',
          id: activeTab.id,
        });
      } else {
        setError('Could not get current tab');
      }
      setIsLoading(false);
    });
  }, []);

  return { tab, isLoading, error };
};

