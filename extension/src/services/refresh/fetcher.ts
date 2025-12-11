/**
 * Page Fetcher
 *
 * Utilities for fetching and parsing webpage content.
 */

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
 * Fetch listing page and return status + content in a single request
 * This combines the expired check and content fetch to avoid duplicate HTTP requests
 */
export async function fetchListingPage(url: string): Promise<FetchPageResult> {
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
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 20000);

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


