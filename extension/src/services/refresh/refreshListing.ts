/**
 * Single Listing Refresh
 *
 * Core logic for refreshing a single listing with AI analysis.
 */

import { CarListing, ListingStatus } from '../../types';
import { refreshListingWithGemini, RateLimitError } from '../gemini';
import { fetchListingPage, FetchError } from './fetcher';
import { updateDailyPriceHistory, hasPriceChangedFromPreviousDay } from './priceHistory';

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
 *
 * Price history behavior:
 * - Always records a price point for each day (even if price unchanged)
 * - Only keeps one price point per day (the most recent)
 * - priceChanged flag indicates if price changed from previous day
 */
export async function refreshSingleListing(listing: CarListing): Promise<RefreshResult> {
  try {
    // Fetch page content (single request - checks status and gets content)
    const fetchResult = await fetchListingPage(listing.source.url);

    // Check for expired listing (404/410)
    if (fetchResult.expired) {
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
    if (fetchResult.status !== 200) {
      return {
        listing: {
          ...listing,
          lastRefreshStatus: 'error',
          lastRefreshError: `HTTP ${fetchResult.status}`,
        },
        success: false,
        error: `HTTP error: ${fetchResult.status}`,
      };
    }

    // Use Gemini to analyze the page
    const result = await refreshListingWithGemini(
      listing.source.url,
      fetchResult.textContent || '',
      fetchResult.pageTitle || listing.title
    );

    const updatedListing = { ...listing };

    // Determine the price to record (use result price if valid, otherwise keep current)
    const priceToRecord = result.price > 0 ? result.price : listing.currentPrice;
    const currencyToUse = result.currency || listing.currency;

    // Check if price changed from previous day (for UI notification purposes)
    const priceChanged = hasPriceChangedFromPreviousDay(
      listing.priceHistory,
      priceToRecord
    );

    // Always update price history with today's price point
    // This ensures one price point per day (updates existing or adds new)
    updatedListing.priceHistory = updateDailyPriceHistory(
      listing.priceHistory,
      priceToRecord,
      currencyToUse
    );

    // Update current price if we got a valid new price
    if (result.price > 0) {
      updatedListing.currentPrice = result.price;
    }

    updatedListing.currency = currencyToUse;
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
    const isRateLimited = error instanceof RateLimitError;
    const isCorsError = error instanceof FetchError && error.isCorsError;

    // Provide a user-friendly error message for CORS errors
    let errorMsg: string;
    if (isCorsError) {
      errorMsg = 'Login required - please log in to the marketplace site';
    } else {
      errorMsg = error instanceof Error ? error.message : String(error);
    }

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

