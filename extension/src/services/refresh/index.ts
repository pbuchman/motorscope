/**
 * Refresh Service - Barrel Export
 *
 * Listing refresh utilities for the extension.
 */

// Core refresh logic
export {refreshSingleListing} from './refreshListing';
export type {RefreshResult} from './refreshListing';

// Page fetching
export {fetchListingPage, FetchError} from './fetcher';
export type {FetchPageResult} from './fetcher';

// Sorting and filtering utilities
export {
    sortListingsByRefreshPriority,
    shouldExcludeEndedListing,
    filterListingsForRefresh,
    DEFAULT_ENDED_GRACE_PERIOD_DAYS,
    MIN_ENDED_GRACE_PERIOD_DAYS,
    MAX_ENDED_GRACE_PERIOD_DAYS,
} from './sorter';

// Price history utilities
export {
    updateDailyPriceHistory,
    hasPriceChangedFromPreviousDay,
    consolidateDailyPriceHistory,
    getDateKey,
    getTodayKey,
} from './priceHistory';

