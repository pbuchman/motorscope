/**
 * usePageContent Hook
 *
 * Provides functionality to scrape content from the current browser tab.
 * Handles the Chrome scripting API with proper callbacks.
 */

import {useCallback, useEffect, useState} from 'react';
import {PageContentResult} from '../types';
import {isChromeExtension} from './useChromeMessaging';

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
const extractPageContent = (): PageContentResult => {
    // Try og:image first (works for most sites)
    let image = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;

    // Facebook-specific: Look for product images if og:image not found
    if (!image) {
        // Try to find Facebook Marketplace product image
        // Facebook uses img tags with alt text like "Zdjęcie produktu" or product name
        const fbProductImg = document.querySelector('img[alt^="Zdjęcie produktu"]') as HTMLImageElement
            || document.querySelector('img[alt*="Photo of"]') as HTMLImageElement;
        if (fbProductImg?.src) {
            image = fbProductImg.src;
        }
    }

    // Fallback: Find the largest image on the page (likely the main product image)
    if (!image) {
        const images = Array.from(document.querySelectorAll('img[src]')) as HTMLImageElement[];
        const largeImage = images
            .filter(img => img.naturalWidth > 200 && img.naturalHeight > 200)
            .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))[0];
        if (largeImage?.src) {
            image = largeImage.src;
        }
    }

    return {
        title: document.title,
        content: document.body.innerText.substring(0, 20000),
        image,
    };
};

/**
 * Execute content extraction script in a tab
 */
const executeContentScript = async (tabId: number): Promise<PageContentResult | null> => {
    try {
        const results = await chrome.scripting.executeScript({
            target: {tabId},
            func: extractPageContent,
        });
        if (results?.[0]?.result) {
            return results[0].result as PageContentResult;
        }
        return null;
    } catch {
        return null;
    }
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
                chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
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

