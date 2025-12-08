/**
 * Price History Utilities
 *
 * Handles daily price point collection:
 * - One price point per day (the most recent)
 * - Updates existing day's price point if same day
 * - Adds new price point if new day
 */

import { PricePoint } from '../../types';

/**
 * Get the date string (YYYY-MM-DD) from an ISO date string
 */
export function getDateKey(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Get today's date key (YYYY-MM-DD)
 */
export function getTodayKey(): string {
  return getDateKey(new Date().toISOString());
}

/**
 * Update price history with a new price point.
 *
 * Rules:
 * - If there's already a price point for today, update it (keep only the latest)
 * - If it's a new day, add a new price point
 * - This ensures exactly one price point per day
 *
 * @param currentHistory - Existing price history
 * @param newPrice - New price value
 * @param currency - Currency code
 * @returns Updated price history array
 */
export function updateDailyPriceHistory(
  currentHistory: PricePoint[],
  newPrice: number,
  currency: string
): PricePoint[] {
  const now = new Date().toISOString();
  const todayKey = getDateKey(now);

  const newPricePoint: PricePoint = {
    date: now,
    price: newPrice,
    currency,
  };

  // If history is empty, start with this price point
  if (currentHistory.length === 0) {
    return [newPricePoint];
  }

  // Check if the last entry is from today
  const lastEntry = currentHistory[currentHistory.length - 1];
  const lastEntryDateKey = getDateKey(lastEntry.date);

  if (lastEntryDateKey === todayKey) {
    // Same day - replace the last entry with updated timestamp and price
    return [
      ...currentHistory.slice(0, -1),
      newPricePoint,
    ];
  } else {
    // New day - add new price point
    return [
      ...currentHistory,
      newPricePoint,
    ];
  }
}

/**
 * Check if the price has changed from the previous day's price
 *
 * @param currentHistory - Current price history
 * @param newPrice - New price to compare
 * @returns true if price changed from previous day
 */
export function hasPriceChangedFromPreviousDay(
  currentHistory: PricePoint[],
  newPrice: number
): boolean {
  if (currentHistory.length === 0) {
    return false; // No previous price to compare
  }

  const todayKey = getTodayKey();

  // Find the most recent price point that's NOT from today
  for (let i = currentHistory.length - 1; i >= 0; i--) {
    const entryDateKey = getDateKey(currentHistory[i].date);
    if (entryDateKey !== todayKey) {
      return currentHistory[i].price !== newPrice;
    }
  }

  // If all entries are from today, compare with today's first recorded price
  return currentHistory[0].price !== newPrice;
}

/**
 * Clean up price history to ensure only one entry per day
 * (keeps the latest entry for each day)
 *
 * This is useful for migrating existing data that may have
 * multiple entries per day.
 *
 * @param history - Price history to clean
 * @returns Cleaned price history with one entry per day
 */
export function consolidateDailyPriceHistory(history: PricePoint[]): PricePoint[] {
  if (history.length <= 1) {
    return history;
  }

  // Sort by date (oldest first)
  const sorted = [...history].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group by day and keep only the latest entry per day
  const byDay = new Map<string, PricePoint>();

  for (const point of sorted) {
    const dateKey = getDateKey(point.date);
    byDay.set(dateKey, point); // Later entries overwrite earlier ones
  }

  // Convert back to array, sorted by date
  return Array.from(byDay.values()).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

