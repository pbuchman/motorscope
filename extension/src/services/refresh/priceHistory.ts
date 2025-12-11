/**
 * Price History Utilities
 *
 * Handles price point collection:
 * - Always adds a new price point on each refresh
 * - Deduplication happens on the UI side (in user's timezone)
 * - This preserves full refresh history for audit/debugging
 */

import {PricePoint} from '@/types';

/**
 * Get the local date string (YYYY-MM-DD) from an ISO date string
 * Uses local timezone to determine the day
 */
export function getDateKey(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's local date key (YYYY-MM-DD)
 */
export function getTodayKey(): string {
    return getDateKey(new Date().toISOString());
}

/**
 * Add a new price point to the history.
 *
 * Always adds a new price point on each refresh.
 * Deduplication (one price per day) is handled on the UI side
 * based on user's timezone. This preserves full refresh history.
 *
 * @param currentHistory - Existing price history
 * @param newPrice - New price value
 * @param currency - Currency code
 * @returns Updated price history array with new price point appended
 */
export function updateDailyPriceHistory(
    currentHistory: PricePoint[],
    newPrice: number,
    currency: string
): PricePoint[] {
    const now = new Date().toISOString();

    const newPricePoint: PricePoint = {
        date: now,
        price: newPrice,
        currency,
    };

    // Always append new price point
    return [
        ...(currentHistory || []),
        newPricePoint,
    ];
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

