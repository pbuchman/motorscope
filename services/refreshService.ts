import { CarListing, ListingStatus } from '../types';
import { refreshListingWithGemini } from './geminiService';

/**
 * Result of a listing refresh operation
 */
export interface RefreshResult {
  listing: CarListing;
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  priceChanged?: boolean;
}

/**
 * Fetch and sanitize page content for AI analysis
 */
export const fetchPageContent = async (url: string): Promise<{
  html: string;
  textContent: string;
  pageTitle: string;
  status: number;
}> => {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

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

  return { html, textContent, pageTitle, status: response.status };
};

/**
 * Check if a listing URL is expired (404/410)
 */
export const checkListingExpired = async (url: string): Promise<{ expired: boolean; status: number }> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    return {
      expired: response.status === 404 || response.status === 410,
      status: response.status,
    };
  } catch {
    return { expired: false, status: 0 };
  }
};

/**
 * Refresh a single listing with AI analysis
 * Shared logic used by both Dashboard and background service worker
 */
export const refreshSingleListing = async (listing: CarListing): Promise<RefreshResult> => {
  try {
    // Check for expired listing first
    const { expired, status } = await checkListingExpired(listing.source.url);

    if (expired) {
      return {
        listing: {
          ...listing,
          status: ListingStatus.EXPIRED,
          lastSeenAt: new Date().toISOString(),
          lastRefreshStatus: 'success',
          lastRefreshError: undefined,
        },
        success: true,
      };
    }

    // Non-OK response that isn't 404/410
    if (status !== 0 && status !== 200) {
      return {
        listing: {
          ...listing,
          lastRefreshStatus: 'error',
          lastRefreshError: `HTTP ${status}`,
        },
        success: false,
        error: `HTTP error: ${status}`,
      };
    }

    // Fetch and parse page content
    const { textContent, pageTitle } = await fetchPageContent(listing.source.url);

    // Use Gemini to analyze the page
    const result = await refreshListingWithGemini(
      listing.source.url,
      textContent,
      pageTitle || listing.title
    );

    const updatedListing = { ...listing };
    let priceChanged = false;

    // Update price if changed
    if (result.price > 0 && result.price !== listing.currentPrice) {
      priceChanged = true;
      updatedListing.priceHistory = [
        ...listing.priceHistory,
        {
          date: new Date().toISOString(),
          price: result.price,
          currency: result.currency,
        },
      ];
      updatedListing.currentPrice = result.price;
    }

    updatedListing.currency = result.currency || listing.currency;
    updatedListing.status = result.status;
    updatedListing.lastSeenAt = new Date().toISOString();
    updatedListing.lastRefreshStatus = 'success';
    updatedListing.lastRefreshError = undefined;

    return {
      listing: updatedListing,
      success: true,
      priceChanged,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isRateLimited = error instanceof Error && error.name === 'RateLimitError';

    console.error(`[RefreshService] Failed to refresh ${listing.source.url}:`, error);

    return {
      listing: {
        ...listing,
        lastRefreshStatus: 'error',
        lastRefreshError: errorMsg,
      },
      success: false,
      error: errorMsg,
      rateLimited: isRateLimited,
    };
  }
};

/**
 * Sort listings by refresh priority
 * - Never refreshed items first
 * - Successfully refreshed items (oldest first)
 * - Failed items last
 */
export const sortListingsByRefreshPriority = (listings: CarListing[]): CarListing[] => {
  return [...listings].sort((a, b) => {
    // Priority 1: Items never refreshed
    const aHasNeverRefreshed = !a.lastSeenAt || !a.lastRefreshStatus;
    const bHasNeverRefreshed = !b.lastSeenAt || !b.lastRefreshStatus;

    if (aHasNeverRefreshed && !bHasNeverRefreshed) return -1;
    if (!aHasNeverRefreshed && bHasNeverRefreshed) return 1;

    // Priority 2: Successfully refreshed items (older first)
    const aIsSuccess = a.lastRefreshStatus === 'success';
    const bIsSuccess = b.lastRefreshStatus === 'success';

    if (aIsSuccess && !bIsSuccess) return -1;
    if (!aIsSuccess && bIsSuccess) return 1;

    // Priority 3: Sort by lastSeenAt (oldest first)
    const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
    const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;

    return aTime - bTime;
  });
};

