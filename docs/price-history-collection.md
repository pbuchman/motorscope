# Price History Collection

This document describes how MotorScope collects and stores price history data for car listings.

## Overview

MotorScope tracks price changes over time for each saved listing. The price history is displayed as a chart in the grid view, allowing users to see how prices have changed.

## Price Collection Rules

### Daily Price Points

1. **One price point per day**: Each day, only one price point is stored (the most recent from that day)
2. **Always collected**: A price point is recorded on every successful refresh, even if the price hasn't changed
3. **Updates during the day**: If multiple refreshes happen on the same day, only the latest price is kept

### Why This Approach?

- **Consistent data**: Every day has a data point, making charts smooth and predictable
- **Storage efficient**: Only one entry per day prevents data bloat
- **Accurate tracking**: The latest price for each day is always recorded

## Data Structure

```typescript
interface PricePoint {
  date: string;    // ISO date string (e.g., "2025-12-08T14:30:00.000Z")
  price: number;   // Price value
  currency: string; // Currency code (PLN, EUR, etc.)
}

interface CarListing {
  // ... other fields
  priceHistory: PricePoint[];  // Array of daily price points
  currentPrice: number;        // Current asking price
}
```

## Implementation

### Key Functions (`extension/src/services/refresh/priceHistory.ts`)

```typescript
// Update price history with a new daily price point
updateDailyPriceHistory(currentHistory, newPrice, currency): PricePoint[]

// Check if price changed from previous day (for notifications)
hasPriceChangedFromPreviousDay(currentHistory, newPrice): boolean

// Clean up multiple entries per day (migration utility)
consolidateDailyPriceHistory(history): PricePoint[]
```

### Refresh Flow

When a listing is refreshed:

1. Fetch current page data via Gemini AI
2. Determine the price to record:
   - Use new price if valid (> 0)
   - Otherwise keep current price
3. Update price history:
   - If last entry is from today → replace it
   - If last entry is from a previous day → add new entry
4. Check if price changed from previous day (for UI notifications)

## Examples

### Example 1: First Day, Multiple Refreshes

```
8:00 AM refresh: Price = 100,000 PLN → History: [{2025-12-08, 100000}]
12:00 PM refresh: Price = 100,000 PLN → History: [{2025-12-08, 100000}] (updated timestamp)
6:00 PM refresh: Price = 98,000 PLN → History: [{2025-12-08, 98000}] (price updated)
```

Result: One entry for Dec 8 with price 98,000 PLN

### Example 2: Multi-Day Tracking

```
Day 1 (Dec 7): Price = 100,000 PLN → History: [{Dec 7, 100000}]
Day 2 (Dec 8): Price = 100,000 PLN → History: [{Dec 7, 100000}, {Dec 8, 100000}]
Day 3 (Dec 9): Price = 95,000 PLN → History: [{Dec 7, 100000}, {Dec 8, 100000}, {Dec 9, 95000}]
```

Result: Three entries, one per day, showing price drop on Dec 9

### Example 3: Same Day Updates

```
Dec 8, 8:00 AM: Price = 100,000 PLN
Dec 8, 10:00 AM: Price = 99,000 PLN  
Dec 8, 2:00 PM: Price = 98,000 PLN (final)
Dec 9, 8:00 AM: Price = 97,000 PLN

Final History:
- Dec 8: 98,000 PLN (only the 2:00 PM price kept)
- Dec 9: 97,000 PLN
```

## Price Change Detection

The `priceChanged` flag in refresh results indicates if the price changed **from the previous day** (not from the previous refresh on the same day).

This is used for:
- UI notifications ("Price dropped!")
- Dashboard indicators
- Statistics

## Migration

For existing data with multiple entries per day, use:

```typescript
import { consolidateDailyPriceHistory } from './services/refresh';

// Clean up existing listing's history
listing.priceHistory = consolidateDailyPriceHistory(listing.priceHistory);
```

## Chart Display

The PriceChart component displays the price history:

- X-axis: Dates (one point per day)
- Y-axis: Price values
- Shows trend over time
- Tooltip shows exact price and date

Minimum 2 data points required to display the chart.

## Storage Considerations

With one price point per day:
- ~100 bytes per price point
- 365 days = ~36.5 KB per listing
- Manageable even for long-tracked listings

## Files

- `extension/src/services/refresh/priceHistory.ts` - Price history utilities
- `extension/src/services/refresh/refreshListing.ts` - Refresh logic using price history
- `extension/src/components/PriceChart.tsx` - Chart display component
- `extension/src/types.ts` - PricePoint type definition

## ENDED Listing Behavior

When a listing status changes to ENDED (sold, expired, or removed):

### Price History Freeze

- **No new price points are recorded** after a listing becomes ENDED
- The price history is frozen at the moment of status change
- This preserves the accurate final price before the listing ended

### Visual Styling

- ENDED listings are displayed with a subtle pastel red overlay/tint
- The "Ended at" date is shown in the listing details modal
- Status badge shows "ENDED" in red

### Grace Period for Auto-Refresh

- ENDED listings continue to be refreshed for a **configurable grace period** (default: 3 days)
- This allows verification that the ENDED status is correct (not a temporary error)
- After the grace period, listings are excluded from automatic background refresh
- Users can still manually refresh ENDED listings

### Grace Period Configuration

The grace period is configurable in Settings:
- **Range**: 1-30 days
- **Default**: 3 days
- **Purpose**: Margin to ensure ENDED status wasn't mistakenly detected

### Status Change Tracking

- `statusChangedAt` field records when a listing first became ENDED
- Used to calculate grace period expiration
- For existing ENDED listings without this field, `lastSeenAt` is used as fallback

### Migration

Existing ENDED listings without `statusChangedAt` are backfilled via database migration:
- Migration ID: `20251223_backfill_status_changed_at`
- Uses `lastSeenAt` as the baseline for grace period calculations
