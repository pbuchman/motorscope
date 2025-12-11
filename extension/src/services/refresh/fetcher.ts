/**
 * Page Fetcher
 *
 * Utilities for fetching and parsing webpage content.
 * Supports both standard fetch() and background tab fetching for sites with restrictions.
 */

import { getMarketplaceForUrl } from '@/config/marketplaces';

// Constants for content extraction and timeouts
const MAX_TEXT_CONTENT_LENGTH = 20000;
const TAB_LOADING_TIMEOUT_MS = 30000;

// Common error indicators for detecting expired listings
const ERROR_404_INDICATORS = ['404', 'not found', 'nie znaleziono'];
const ERROR_410_INDICATORS = ['410', 'gone'];

/**
 * Custom error for CORS/network issues that may indicate login required
 */
export class FetchError extends Error {
    constructor(
        message: string,
        public readonly isCorsError: boolean = false,
        public readonly httpStatus?: number
    ) {
        super(message);
        this.name = 'FetchError';
    }
}

/**
 * Result of fetching a listing page
 */
export interface FetchPageResult {
    /** Whether the listing is expired (404/410) */
    expired: boolean;
    /** HTTP status code (0 for network errors) */
    status: number;
    /** Extracted text content (only if status 200) */
    textContent?: string;
    /** Page title (only if status 200) */
    pageTitle?: string;
}

/**
 * Fetch listing page using a background tab
 * Used for marketplaces with Cloudflare or similar restrictions
 */
async function fetchListingPageWithTab(url: string): Promise<FetchPageResult> {
  return new Promise((resolve, reject) => {
    // Create a new tab in the background (not focused)
    chrome.tabs.create({ url, active: false }, async (tab) => {
      if (!tab || !tab.id) {
        reject(new FetchError('Failed to create background tab'));
        return;
      }

      const tabId = tab.id;
      let timeoutId: number;
      let resolved = false;

      // Clean up function
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        chrome.tabs.remove(tabId).catch(() => {
          // Ignore errors - tab might already be closed
        });
      };

      // Set timeout for page load
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new FetchError('Tab loading timeout'));
        }
      }, TAB_LOADING_TIMEOUT_MS);

      // Listen for tab updates
      const updateListener = async (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo, updatedTab: chrome.tabs.Tab) => {
        if (updatedTabId !== tabId || resolved) return;

        // Check if page has finished loading
        if (changeInfo.status === 'complete') {
          resolved = true;
          chrome.tabs.onUpdated.removeListener(updateListener);

          try {
            // Check if we got a 404 or similar error page
            // We'll inject a script to get the page content and status
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                // Extract page information
                const title = document.title || '';
                const bodyText = document.body?.innerText || '';
                const html = document.documentElement?.outerHTML || '';

                // Check for common error indicators (case-insensitive)
                const lowerTitle = title.toLowerCase();
                const lowerBody = bodyText.toLowerCase();

                const is404 = lowerTitle.includes('404') ||
                              lowerTitle.includes('not found') ||
                              lowerBody.includes('404') ||
                              lowerBody.includes('nie znaleziono');

                const is410 = lowerTitle.includes('410') ||
                              lowerTitle.includes('gone');

                return {
                  title,
                  html,
                  is404,
                  is410,
                };
              },
            });

            cleanup();

            if (!results || results.length === 0 || !results[0].result) {
              reject(new FetchError('Failed to extract page content from tab'));
              return;
            }

            const pageData = results[0].result;

            // Check for expired listing
            if (pageData.is404) {
              resolve({
                expired: true,
                status: 404,
              });
              return;
            }

            if (pageData.is410) {
              resolve({
                expired: true,
                status: 410,
              });
              return;
            }

            // Extract text content from HTML for AI analysis
            // Note: This is NOT for DOM insertion - only for text extraction to send to Gemini API
            // The HTML sanitization here is basic because we only need plain text, not secure HTML
            const textContent = pageData.html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, MAX_TEXT_CONTENT_LENGTH);

            resolve({
              expired: false,
              status: 200,
              textContent,
              pageTitle: pageData.title,
            });
          } catch (error) {
            cleanup();
            reject(new FetchError(
              error instanceof Error ? error.message : String(error),
              false
            ));
          }
        }
      };

      chrome.tabs.onUpdated.addListener(updateListener);
    });
  });
}

/**
 * Fetch listing page using standard fetch()
 * Used for marketplaces without special restrictions
 */
async function fetchListingPageWithFetch(url: string): Promise<FetchPageResult> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
        });

        // Check for expired listing (404/410)
        if (response.status === 404 || response.status === 410) {
            return {
                expired: true,
                status: response.status,
            };
        }

        // Non-OK response
        if (!response.ok) {
            return {
                expired: false,
                status: response.status,
            };
        }

        // Success - parse the content
        const html = await response.text();

        // Extract page title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : '';

        // Strip HTML for text content (scripts, styles, tags)
        // Note: This is NOT for DOM insertion - only for text extraction to send to Gemini API
    // The HTML sanitization here is basic because we only need plain text, not secure HTMLconst textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, MAX_TEXT_CONTENT_LENGTH);

        return {
            expired: false,
            status: response.status,
            textContent,
            pageTitle,
        };
    } catch (error) {
        // Check if it's a network/CORS error (TypeError is thrown for CORS issues)
        if (error instanceof TypeError) {
            // This typically means CORS error or network failure
            // Common when user is logged out and site redirects to login
            throw new FetchError(
                'Network error - you may need to log in to the marketplace site',
                true
            );
        }
        // Wrap other errors
        throw new FetchError(
            error instanceof Error ? error.message : String(error),
            false
        );
    }
}

/**
 * Fetch listing page and return status + content in a single request
 * This combines the expired check and content fetch to avoid duplicate HTTP requests
 *
 * Automatically selects the appropriate fetching method based on marketplace configuration:
 * - Background tab for marketplaces with Cloudflare/restrictions (e.g., autoplac.pl)
 * - Standard fetch() for other marketplaces (e.g., otomoto.pl)
 */
export async function fetchListingPage(url: string): Promise<FetchPageResult> {
  // Get marketplace configuration to determine fetch method
  const marketplace = getMarketplaceForUrl(url);

  // Use background tab if configured, otherwise use standard fetch
  if (marketplace?.useBackgroundTab) {
    return fetchListingPageWithTab(url);
  } else {
    return fetchListingPageWithFetch(url);
  }
}