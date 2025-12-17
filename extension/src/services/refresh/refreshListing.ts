/**
 * Single Listing Refresh
 *
 * Core logic for refreshing a single listing with AI analysis.
 */

import {CarListing, ListingStatus} from '@/types';
import {RateLimitError, refreshListingWithGemini} from '../gemini';
import {FetchError, fetchListingPage} from './fetcher';
import {hasPriceChangedFromPreviousDay, updateDailyPriceHistory} from './priceHistory';
import {isFacebookMarketplaceUrl} from '@/utils/formatters';

/**
 * Result of a listing refresh operation
 */
export interface RefreshResult {
    listing: CarListing;
    success: boolean;
    error?: string;
    rateLimited?: boolean;
    priceChanged?: boolean;
    /** Whether background tab was used (due to Cloudflare/network fallback) */
    usedBackgroundTab?: boolean;
}

/**
 * Refresh a single listing with AI analysis.
 * Shared logic used by both Dashboard and background service worker.
 *
 * Price history behavior:
 * - Always records a new price point on each refresh (full audit trail)
 * - Deduplication (one per day) happens on UI side based on user's timezone
 * - priceChanged flag indicates if price changed from previous day
 *
 * @param listing The listing to refresh
 * @param forceBackgroundTab If true, skip fetch() and use background tab directly
 */
export async function refreshSingleListing(
    listing: CarListing,
    forceBackgroundTab: boolean = false,
): Promise<RefreshResult> {
    try {
        // Fetch page content (single request - checks status and gets content)
        const fetchResult = await fetchListingPage(listing.source.url, forceBackgroundTab);

        // Check for expired listing (404/410)
        if (fetchResult.expired) {
            return {
                listing: {
                    ...listing,
                    status: ListingStatus.ENDED,
                    lastSeenAt: new Date().toISOString(),
                    lastRefreshStatus: 'success',
                    lastRefreshError: undefined,
                },
                success: true,
                usedBackgroundTab: fetchResult.usedBackgroundTab,
            };
        }

        // Non-OK response (including status 0, which indicates a network error)
        if (fetchResult.status !== 200) {
            // 520 is a Cloudflare error typically meaning the origin needs authentication
            // 401 is returned when Facebook login is required
            const isLoginRequired = fetchResult.status === 520 || fetchResult.status === 0 || fetchResult.status === 401;
            const isFacebookLogin = fetchResult.status === 401 && isFacebookMarketplaceUrl(listing.source.url);

            let errorMsg: string;
            if (isFacebookLogin) {
                errorMsg = 'Facebook login required - please log in to Facebook';
            } else if (isLoginRequired) {
                errorMsg = 'Login required - please log in to the marketplace site';
            } else {
                errorMsg = `HTTP ${fetchResult.status}`;
            }

            return {
                listing: {
                    ...listing,
                    lastRefreshStatus: 'error',
                    lastRefreshError: errorMsg,
                },
                success: false,
                error: isLoginRequired ? errorMsg : `HTTP error: ${fetchResult.status}`,
                usedBackgroundTab: fetchResult.usedBackgroundTab,
            };
        }

        // Use Gemini to analyze the page
        const result = await refreshListingWithGemini(
            listing.source.url,
            fetchResult.textContent || '',
            fetchResult.pageTitle || listing.title,
        );

        const updatedListing = {...listing};

        // Determine the price to record (use result price if valid, otherwise keep current)
        const priceToRecord = result.price > 0 ? result.price : listing.currentPrice;
        const currencyToUse = result.currency || listing.currency;

        // Check if price changed from previous day (for UI notification purposes)
        const priceChanged = hasPriceChangedFromPreviousDay(
            listing.priceHistory,
            priceToRecord,
        );

        // Always add new price point to history (deduplication happens on UI)
        updatedListing.priceHistory = updateDailyPriceHistory(
            listing.priceHistory,
            priceToRecord,
            currencyToUse,
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
            usedBackgroundTab: fetchResult.usedBackgroundTab,
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
