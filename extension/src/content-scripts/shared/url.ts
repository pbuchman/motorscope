/**
 * URL utilities for content scripts
 *
 * Note: Matches normalizeUrl in utils/formatters.ts for consistency.
 * Content scripts are bundled separately, so we duplicate intentionally.
 */

/**
 * Normalize URL for comparison (remove query params and trailing slashes)
 */
export const normalizeUrl = (url: string): string => {
    try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
        return url.replace(/\/$/, '');
    }
};

/**
 * Check if a URL is an OTOMOTO listing detail page
 */
export const isListingUrl = (url: string): boolean => {
    return url.includes('/oferta/');
};

/**
 * Check if a URL is an OTOMOTO search/category page (not a single offer)
 */
export const isSearchUrl = (url: string): boolean => {
    return !isListingUrl(url);
};

/**
 * Check if current page is an OTOMOTO listing detail page
 */
export const isListingPage = (): boolean => {
    return isListingUrl(window.location.href);
};

/**
 * Check if current page is an OTOMOTO search/category page (not a single offer)
 */
export const isSearchPage = (): boolean => {
    return isSearchUrl(window.location.href);
};

