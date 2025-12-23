/**
 * Listing Sorter
 *
 * Utilities for sorting and filtering listings for refresh.
 */

import {CarListing, ListingStatus} from '@/types';

/** Default grace period for ENDED listings (days) */
export const DEFAULT_ENDED_GRACE_PERIOD_DAYS = 3;

/** Minimum grace period (days) */
export const MIN_ENDED_GRACE_PERIOD_DAYS = 1;

/** Maximum grace period (days) */
export const MAX_ENDED_GRACE_PERIOD_DAYS = 30;

/**
 * Check if an ENDED listing should be excluded from automatic refresh.
 *
 * Listings are excluded if:
 * - Status is ENDED
 * - statusChangedAt exists and is older than gracePeriodDays
 *
 * The grace period allows for:
 * - Verification that the ENDED status is correct (not a temporary error)
 * - Final price confirmation
 *
 * @param listing The listing to check
 * @param gracePeriodDays Number of days to keep refreshing after ENDED (default: 3)
 * @returns true if listing should be excluded from auto-refresh
 */
export function shouldExcludeEndedListing(
    listing: CarListing,
    gracePeriodDays: number = DEFAULT_ENDED_GRACE_PERIOD_DAYS,
): boolean {
    if (listing.status !== ListingStatus.ENDED) {
        return false;
    }

    if (!listing.statusChangedAt) {
        // No statusChangedAt means it was ENDED before we tracked this field
        // Use lastSeenAt as fallback
        const endedAt = listing.lastSeenAt;
        const endedDate = new Date(endedAt);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

        return endedDate < cutoffDate;
    }

    const statusChangedDate = new Date(listing.statusChangedAt);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

    return statusChangedDate < cutoffDate;
}

/**
 * Filter listings to exclude ENDED listings past grace period.
 *
 * @param listings List of listings to filter
 * @param gracePeriodDays Number of days to keep refreshing after ENDED
 * @returns Listings eligible for auto-refresh
 */
export function filterListingsForRefresh(
    listings: CarListing[],
    gracePeriodDays: number = DEFAULT_ENDED_GRACE_PERIOD_DAYS,
): CarListing[] {
    return listings.filter(listing => !shouldExcludeEndedListing(listing, gracePeriodDays));
}

/**
 * Sort listings by refresh priority:
 * 1. Never refreshed items first
 * 2. Successfully refreshed items (oldest first)
 * 3. Failed items last
 */
export function sortListingsByRefreshPriority(listings: CarListing[]): CarListing[] {
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
}

