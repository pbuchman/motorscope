/**
 * Refresh Service - Barrel Export
 *
 * Listing refresh utilities for the extension.
 */

// Core refresh logic
export { refreshSingleListing } from './refreshListing';
export type { RefreshResult } from './refreshListing';

// Page fetching
export { fetchPageContent, checkListingExpired } from './fetcher';

// Sorting utilities
export { sortListingsByRefreshPriority } from './sorter';

// Price history utilities
export {
  updateDailyPriceHistory,
  hasPriceChangedFromPreviousDay,
  consolidateDailyPriceHistory,
  getDateKey,
  getTodayKey,
} from './priceHistory';

