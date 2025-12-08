/**
 * usePageContent Hook
 *
 * Provides functionality to scrape content from the current browser tab.
 * Handles the Chrome scripting API with proper callbacks.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageContentResult } from '../types';
import { isChromeExtension } from './useChromeMessaging';

interface UsePageContentResult {
  /** Page content data */
  content: PageContentResult | null;
  /** Whether content is being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to refresh the page content */
  refresh: () => Promise<PageContentResult | null>;
}

/**
 * Function to inject into the page to extract content
 */
const extractPageContent = (): PageContentResult => ({
  title: document.title,
  content: document.body.innerText.substring(0, 20000),
  image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null,
});

/**
 * Execute content extraction script in a tab
 */
const executeContentScript = (tabId: number): Promise<PageContentResult | null> => {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: extractPageContent,
      },
      (results) => {
        if (results?.[0]?.result) {
          resolve(results[0].result as PageContentResult);
        } else {
          resolve(null);
        }
      }
    );
  });
};

/**
 * Hook to manage page content scraping from the current tab
 *
 * @param autoFetch - Whether to automatically fetch content on mount
 */
export const usePageContent = (autoFetch = true): UsePageContentResult => {
  const [content, setContent] = useState<PageContentResult | null>(null);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (): Promise<PageContentResult | null> => {
    if (!isChromeExtension() || !chrome.tabs || !chrome.scripting) {
      setError('Extension context not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          const activeTab = tabs[0];

          if (!activeTab?.id || activeTab.url?.startsWith('chrome://')) {
            setError('Cannot access this page');
            setIsLoading(false);
            resolve(null);
            return;
          }

          const result = await executeContentScript(activeTab.id);

          if (result) {
            setContent(result);
            resolve(result);
          } else {
            setError('Failed to extract page content');
            resolve(null);
          }

          setIsLoading(false);
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch content';
      setError(message);
      setIsLoading(false);
      return null;
    }
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchContent();
    }
  }, [autoFetch, fetchContent]);

  return {
    content,
    isLoading,
    error,
    refresh: fetchContent,
  };
};

