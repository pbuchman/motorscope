/**
 * Page Fetcher
 *
 * Utilities for fetching and parsing webpage content.
 * Supports both standard fetch() and background tab fetching for sites with restrictions.
 *
 * Strategy: Always try fetch() first, then automatically fallback to background tab
 * if Cloudflare or network errors are detected.
 */

// Constants for content extraction and timeouts
const MAX_TEXT_CONTENT_LENGTH = 20000;
const TAB_LOADING_TIMEOUT_MS = 30000;


/**
 * Custom error for CORS/network issues that may indicate login required
 */
export class FetchError extends Error {
    constructor(
        message: string,
        public readonly isCorsError: boolean = false,
        public readonly httpStatus?: number,
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
    /** Whether background tab was used (due to fetch fallback) */
    usedBackgroundTab?: boolean;
}

/**
 * Fetch listing page using a background tab
 * Used for marketplaces with Cloudflare or similar restrictions
 */
async function fetchListingPageWithTab(url: string): Promise<FetchPageResult> {
    return new Promise((resolve, reject) => {
        // Create a new tab in the background (not focused)
        chrome.tabs.create({url, active: false}, async (tab) => {
            if (!tab || !tab.id) {
                reject(new FetchError('Failed to create background tab'));
                return;
            }

            const tabId = tab.id;
            let resolved = false;

            // Clean up function
            const cleanup = (timeoutId: ReturnType<typeof setTimeout>) => {
                clearTimeout(timeoutId);
                chrome.tabs.remove(tabId).catch(() => {
                    // Ignore errors - tab might already be closed
                });
            };

            // Set timeout for page load
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    cleanup(timeoutId);
                    reject(new FetchError('Tab loading timeout'));
                }
            }, TAB_LOADING_TIMEOUT_MS);

            // Listen for tab updates
            const updateListener = async (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo, _updatedTab: chrome.tabs.Tab) => {
                if (updatedTabId !== tabId || resolved) return;

                // Check if page has finished loading
                if (changeInfo.status === 'complete') {
                    resolved = true;
                    chrome.tabs.onUpdated.removeListener(updateListener);

                    try {
                        // Check if we got a 404 or similar error page
                        // We'll inject a script to get the page content and status
                        const results = await chrome.scripting.executeScript({
                            target: {tabId},
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

                        cleanup(timeoutId);

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
                        cleanup(timeoutId);
                        reject(new FetchError(
                            error instanceof Error ? error.message : String(error),
                            false,
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
        // The HTML sanitization here is basic because we only need plain text, not secure HTML
        const textContent = html
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
                true,
            );
        }
        // Wrap other errors
        throw new FetchError(
            error instanceof Error ? error.message : String(error),
            false,
        );
    }
}

/**
 * Check if an error indicates a Cloudflare or network issue that may be resolved with background tab
 */
function isCloudflareOrNetworkError(error: unknown): boolean {
    // TypeError is thrown for CORS/network failures or fetch network issues
    return error instanceof TypeError || (error instanceof FetchError && error.isCorsError);
}

/**
 * Check if HTTP status indicates Cloudflare restriction
 * 520-530 range are Cloudflare-specific error codes
 */
function isCloudflareStatusCode(status: number): boolean {
    return status >= 520 && status <= 530;
}

/**
 * Fetch listing page and return status + content in a single request
 * This combines the expired check and content fetch to avoid duplicate HTTP requests
 *
 * Strategy:
 * 1. First attempt using standard fetch()
 * 2. If Cloudflare/network error occurs, automatically fallback to background tab
 * 3. This provides a generic approach that works for all marketplaces
 */
export async function fetchListingPage(url: string, forceBackgroundTab: boolean = false): Promise<FetchPageResult> {
    // If forced to use background tab, skip fetch attempt
    if (forceBackgroundTab) {
        const result = await fetchListingPageWithTab(url);
        return {...result, usedBackgroundTab: true};
    }

    // First, try standard fetch
    try {
        const result = await fetchListingPageWithFetch(url);

        // If we got a Cloudflare status code, fallback to background tab
        if (isCloudflareStatusCode(result.status)) {
            console.log(`[Fetcher] Got Cloudflare status ${result.status}, falling back to background tab for ${url}`);
            const tabResult = await fetchListingPageWithTab(url);
            return {...tabResult, usedBackgroundTab: true};
        }

        return {...result, usedBackgroundTab: false};
    } catch (error) {
        // If it's a Cloudflare/network error, fallback to background tab
        if (isCloudflareOrNetworkError(error)) {
            console.log(`[Fetcher] Fetch failed with network/CORS error, falling back to background tab for ${url}`);
            try {
                const tabResult = await fetchListingPageWithTab(url);
                return {...tabResult, usedBackgroundTab: true};
            } catch (tabError) {
                // Both methods failed, re-throw the original error
                console.error(`[Fetcher] Background tab also failed for ${url}:`, tabError);
                throw error;
            }
        }

        // Not a Cloudflare error, re-throw
        throw error;
    }
}
