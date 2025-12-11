/**
 * Tests for Migration Module
 *
 * Tests the migration logic including status normalization.
 */

import { describe, it, expect } from '@jest/globals';

// We can't easily test the full migration runner without a Firestore emulator,
// but we can test the migration logic functions by extracting and testing them.

describe('Migration Logic', () => {
  describe('Status Normalization Logic', () => {
    // The migration converts sold/expired/SOLD/EXPIRED to ENDED
    const oldStatuses = ['sold', 'expired', 'SOLD', 'EXPIRED'];
    const newStatus = 'ENDED';

    /**
     * Migration logic: normalize status values
     */
    const normalizeStatus = (status: string): string => {
      if (oldStatuses.includes(status)) {
        return newStatus;
      }
      return status;
    };

    it('should convert "sold" to "ENDED"', () => {
      expect(normalizeStatus('sold')).toBe('ENDED');
    });

    it('should convert "expired" to "ENDED"', () => {
      expect(normalizeStatus('expired')).toBe('ENDED');
    });

    it('should convert "SOLD" to "ENDED"', () => {
      expect(normalizeStatus('SOLD')).toBe('ENDED');
    });

    it('should convert "EXPIRED" to "ENDED"', () => {
      expect(normalizeStatus('EXPIRED')).toBe('ENDED');
    });

    it('should preserve "ACTIVE" status', () => {
      expect(normalizeStatus('ACTIVE')).toBe('ACTIVE');
    });

    it('should preserve "ENDED" status (idempotent)', () => {
      expect(normalizeStatus('ENDED')).toBe('ENDED');
    });

    it('should preserve unknown statuses', () => {
      expect(normalizeStatus('pending')).toBe('pending');
      expect(normalizeStatus('unknown')).toBe('unknown');
    });
  });

  describe('Batch Processing Logic', () => {
    const BATCH_SIZE = 500;

    /**
     * Split array into batches
     */
    const splitIntoBatches = <T>(items: T[]): T[][] => {
      const batches: T[][] = [];
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
      }
      return batches;
    };

    it('should return empty array for empty input', () => {
      expect(splitIntoBatches([])).toEqual([]);
    });

    it('should return single batch for items under limit', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const batches = splitIntoBatches(items);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(100);
    });

    it('should split items at batch size boundary', () => {
      const items = Array.from({ length: 500 }, (_, i) => i);
      const batches = splitIntoBatches(items);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(500);
    });

    it('should split items over batch size into multiple batches', () => {
      const items = Array.from({ length: 501 }, (_, i) => i);
      const batches = splitIntoBatches(items);

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(500);
      expect(batches[1]).toHaveLength(1);
    });

    it('should handle large arrays correctly', () => {
      const items = Array.from({ length: 1250 }, (_, i) => i);
      const batches = splitIntoBatches(items);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(500);
      expect(batches[1]).toHaveLength(500);
      expect(batches[2]).toHaveLength(250);

      // Verify all items are present
      const flattened = batches.flat();
      expect(flattened).toHaveLength(1250);
    });

    it('should preserve item order', () => {
      const items = Array.from({ length: 600 }, (_, i) => i);
      const batches = splitIntoBatches(items);
      const flattened = batches.flat();

      expect(flattened).toEqual(items);
    });
  });

  describe('Migration ID Format', () => {
    // Migration IDs should follow YYYYMMDD_description format
    const migrationIdPattern = /^\d{8}_[a-z_]+$/;

    const sampleMigrationIds = [
      '20241209_status_sold_expired_to_ended',
      '20241210_price_history_dedup',
    ];

    it('should match expected format pattern', () => {
      for (const id of sampleMigrationIds) {
        expect(id).toMatch(migrationIdPattern);
      }
    });

    it('should be sortable chronologically', () => {
      const ids = [
        '20241210_second_migration',
        '20241209_first_migration',
        '20241211_third_migration',
      ];

      const sorted = [...ids].sort();

      expect(sorted).toEqual([
        '20241209_first_migration',
        '20241210_second_migration',
        '20241211_third_migration',
      ]);
    });
  });

  describe('Lock Timeout Logic', () => {
    const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const isLockStale = (lockTime: Date): boolean => {
      const lockAge = Date.now() - lockTime.getTime();
      return lockAge >= LOCK_TIMEOUT_MS;
    };

    it('should consider fresh lock as valid (not stale)', () => {
      const freshLock = new Date();
      expect(isLockStale(freshLock)).toBe(false);
    });

    it('should consider lock from 4 minutes ago as valid', () => {
      const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000);
      expect(isLockStale(fourMinutesAgo)).toBe(false);
    });

    it('should consider lock from 5 minutes ago as stale', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(isLockStale(fiveMinutesAgo)).toBe(true);
    });

    it('should consider lock from 10 minutes ago as stale', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      expect(isLockStale(tenMinutesAgo)).toBe(true);
    });
  });

  describe('Price History Deduplication Logic', () => {
    interface PricePoint {
      date: string;
      price: number;
      currency: string;
    }

    /**
     * Deduplicate price history by keeping only the last entry per day
     */
    const deduplicatePriceHistory = (history: PricePoint[]): PricePoint[] => {
      if (!history || history.length <= 1) {
        return history || [];
      }

      const byDay = new Map<string, PricePoint>();

      for (const point of history) {
        // Extract date part (YYYY-MM-DD)
        const day = point.date.split('T')[0];
        byDay.set(day, point); // Last entry for each day wins
      }

      // Sort by date
      return Array.from(byDay.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    };

    it('should return empty array for empty input', () => {
      expect(deduplicatePriceHistory([])).toEqual([]);
    });

    it('should return single item unchanged', () => {
      const history = [{ date: '2024-12-01T10:00:00Z', price: 100000, currency: 'PLN' }];
      expect(deduplicatePriceHistory(history)).toEqual(history);
    });

    it('should keep entries from different days', () => {
      const history = [
        { date: '2024-12-01T10:00:00Z', price: 100000, currency: 'PLN' },
        { date: '2024-12-02T10:00:00Z', price: 95000, currency: 'PLN' },
        { date: '2024-12-03T10:00:00Z', price: 90000, currency: 'PLN' },
      ];

      const result = deduplicatePriceHistory(history);
      expect(result).toHaveLength(3);
    });

    it('should keep only last entry for same day', () => {
      const history = [
        { date: '2024-12-01T08:00:00Z', price: 100000, currency: 'PLN' },
        { date: '2024-12-01T12:00:00Z', price: 98000, currency: 'PLN' },
        { date: '2024-12-01T18:00:00Z', price: 95000, currency: 'PLN' },
      ];

      const result = deduplicatePriceHistory(history);

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(95000); // Last entry
    });

    it('should handle mixed days with duplicates', () => {
      const history = [
        { date: '2024-12-01T08:00:00Z', price: 100000, currency: 'PLN' },
        { date: '2024-12-01T12:00:00Z', price: 98000, currency: 'PLN' },
        { date: '2024-12-02T10:00:00Z', price: 95000, currency: 'PLN' },
        { date: '2024-12-02T14:00:00Z', price: 92000, currency: 'PLN' },
        { date: '2024-12-03T10:00:00Z', price: 90000, currency: 'PLN' },
      ];

      const result = deduplicatePriceHistory(history);

      expect(result).toHaveLength(3);
      expect(result[0].date).toContain('2024-12-01');
      expect(result[0].price).toBe(98000); // Last entry for Dec 1
      expect(result[1].price).toBe(92000); // Last entry for Dec 2
      expect(result[2].price).toBe(90000); // Only entry for Dec 3
    });

    it('should maintain chronological order', () => {
      const history = [
        { date: '2024-12-03T10:00:00Z', price: 90000, currency: 'PLN' },
        { date: '2024-12-01T10:00:00Z', price: 100000, currency: 'PLN' },
        { date: '2024-12-02T10:00:00Z', price: 95000, currency: 'PLN' },
      ];

      const result = deduplicatePriceHistory(history);

      expect(result[0].date).toContain('2024-12-01');
      expect(result[1].date).toContain('2024-12-02');
      expect(result[2].date).toContain('2024-12-03');
    });

    it('should handle null/undefined input', () => {
      expect(deduplicatePriceHistory(null as any)).toEqual([]);
      expect(deduplicatePriceHistory(undefined as any)).toEqual([]);
    });
  });
});

