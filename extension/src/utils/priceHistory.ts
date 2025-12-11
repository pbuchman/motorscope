/**
 * Price History Utilities
 *
 * Functions for processing price history data, including
 * timezone-aware deduplication for chart display.
 */

import {PricePoint} from '../types';

/**
 * Deduplicate price points by day in user's local timezone.
 * Keeps only the last price point for each day.
 *
 * This is used for chart display to avoid showing multiple points
 * on the same day when the user's timezone differs from UTC.
 *
 * @param priceHistory - Array of price points with UTC timestamps
 * @returns Deduplicated array with one price point per local day
 */
export function deduplicatePricePointsByLocalDay(priceHistory: PricePoint[]): PricePoint[] {
    if (!priceHistory || priceHistory.length <= 1) {
        return priceHistory || [];
    }

    // Get user's timezone from browser
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Group by local day (YYYY-MM-DD in user's timezone)
    const byDay = new Map<string, PricePoint[]>();

    priceHistory.forEach((point) => {
        // Convert UTC timestamp to local date string (YYYY-MM-DD)
        const localDay = new Date(point.date).toLocaleDateString('sv-SE', {
            timeZone: userTimezone,
        });

        if (!byDay.has(localDay)) {
            byDay.set(localDay, []);
        }
        byDay.get(localDay)!.push(point);
    });

    // Keep last point per day, sorted chronologically
    return Array.from(byDay.entries())
        .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
        .map(([, points]) => points[points.length - 1]);
}

/**
 * Get the local date string (YYYY-MM-DD) for a UTC timestamp
 * in the user's browser timezone.
 */
export function getLocalDateString(utcDateString: string): string {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Date(utcDateString).toLocaleDateString('sv-SE', {
        timeZone: userTimezone,
    });
}

