/**
 * Listing Sorter
 *
 * Utilities for sorting listings by various criteria.
 */

import { CarListing } from '../../types';

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

