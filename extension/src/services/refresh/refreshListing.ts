/**
 * Single Listing Refresh
 *
 * Core logic for refreshing a single listing with AI analysis.
 */

import { CarListing, ListingStatus } from '../../types';
import { refreshListingWithGemini, RateLimitError } from '../gemini';
import { fetchPageContent, checkListingExpired } from './fetcher';

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
 * Refresh a single listing with AI analysis.
 * Shared logic used by both Dashboard and background service worker.
 */
export async function refreshSingleListing(listing: CarListing): Promise<RefreshResult> {
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

    // Non-OK response (including status 0, which indicates a network error)
    if (status !== 200) {
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
    const isRateLimited = error instanceof RateLimitError;

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
}

