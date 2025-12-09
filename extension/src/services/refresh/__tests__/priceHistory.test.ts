/**
 * Tests for Price History Utilities
 */

import {
  getDateKey,
  getTodayKey,
  updateDailyPriceHistory,
  hasPriceChangedFromPreviousDay,
  consolidateDailyPriceHistory,
} from '../priceHistory';
import { PricePoint } from '@/types';

describe('Price History Utilities', () => {
  describe('getDateKey', () => {
    it('should extract date from ISO string', () => {
      expect(getDateKey('2025-12-08T10:30:00.000Z')).toBe('2025-12-08');
      expect(getDateKey('2025-01-01T00:00:00.000Z')).toBe('2025-01-01');
    });
  });

  describe('getTodayKey', () => {
    it('should return today date in YYYY-MM-DD format', () => {
      const todayKey = getTodayKey();
      expect(todayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('updateDailyPriceHistory', () => {
    const mockDate = '2025-12-08T12:00:00.000Z';

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(mockDate));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should add first price point to empty history', () => {
      const result = updateDailyPriceHistory([], 100000, 'PLN');

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(100000);
      expect(result[0].currency).toBe('PLN');
      expect(getDateKey(result[0].date)).toBe('2025-12-08');
    });

    it('should always add new price point even if same day', () => {
      const existingHistory: PricePoint[] = [
        { date: '2025-12-08T08:00:00.000Z', price: 100000, currency: 'PLN' },
      ];

      const result = updateDailyPriceHistory(existingHistory, 95000, 'PLN');

      // Now we always add, deduplication happens on UI
      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(100000);
      expect(result[1].price).toBe(95000);
    });

    it('should add new price point for different day', () => {
      const existingHistory: PricePoint[] = [
        { date: '2025-12-07T18:00:00.000Z', price: 100000, currency: 'PLN' },
      ];

      const result = updateDailyPriceHistory(existingHistory, 95000, 'PLN');

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(100000);
      expect(result[1].price).toBe(95000);
      expect(getDateKey(result[0].date)).toBe('2025-12-07');
      expect(getDateKey(result[1].date)).toBe('2025-12-08');
    });

    it('should preserve all history when adding new entries', () => {
      const existingHistory: PricePoint[] = [
        { date: '2025-12-05T10:00:00.000Z', price: 110000, currency: 'PLN' },
        { date: '2025-12-06T10:00:00.000Z', price: 105000, currency: 'PLN' },
        { date: '2025-12-07T10:00:00.000Z', price: 100000, currency: 'PLN' },
      ];

      const result = updateDailyPriceHistory(existingHistory, 98000, 'PLN');

      expect(result).toHaveLength(4);
      expect(result[3].price).toBe(98000);
    });
  });

  describe('hasPriceChangedFromPreviousDay', () => {
    const mockDate = '2025-12-08T12:00:00.000Z';

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(mockDate));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false for empty history', () => {
      expect(hasPriceChangedFromPreviousDay([], 100000)).toBe(false);
    });

    it('should detect price change from previous day', () => {
      const history: PricePoint[] = [
        { date: '2025-12-07T10:00:00.000Z', price: 100000, currency: 'PLN' },
      ];

      expect(hasPriceChangedFromPreviousDay(history, 95000)).toBe(true);
      expect(hasPriceChangedFromPreviousDay(history, 100000)).toBe(false);
    });

    it('should ignore today when comparing', () => {
      const history: PricePoint[] = [
        { date: '2025-12-07T10:00:00.000Z', price: 100000, currency: 'PLN' },
        { date: '2025-12-08T08:00:00.000Z', price: 98000, currency: 'PLN' }, // Today
      ];

      // Should compare with Dec 7, not Dec 8
      expect(hasPriceChangedFromPreviousDay(history, 95000)).toBe(true);
      expect(hasPriceChangedFromPreviousDay(history, 100000)).toBe(false);
    });
  });

  describe('consolidateDailyPriceHistory', () => {
    it('should return empty array for empty input', () => {
      expect(consolidateDailyPriceHistory([])).toEqual([]);
    });

    it('should return single item for single input', () => {
      const history: PricePoint[] = [
        { date: '2025-12-08T10:00:00.000Z', price: 100000, currency: 'PLN' },
      ];
      expect(consolidateDailyPriceHistory(history)).toEqual(history);
    });

    it('should keep only latest entry per day', () => {
      const history: PricePoint[] = [
        { date: '2025-12-08T08:00:00.000Z', price: 100000, currency: 'PLN' },
        { date: '2025-12-08T10:00:00.000Z', price: 99000, currency: 'PLN' },
        { date: '2025-12-08T14:00:00.000Z', price: 98000, currency: 'PLN' },
      ];

      const result = consolidateDailyPriceHistory(history);

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(98000);
      expect(result[0].date).toBe('2025-12-08T14:00:00.000Z');
    });

    it('should consolidate multiple days correctly', () => {
      const history: PricePoint[] = [
        { date: '2025-12-07T08:00:00.000Z', price: 110000, currency: 'PLN' },
        { date: '2025-12-07T18:00:00.000Z', price: 105000, currency: 'PLN' },
        { date: '2025-12-08T08:00:00.000Z', price: 100000, currency: 'PLN' },
        { date: '2025-12-08T12:00:00.000Z', price: 98000, currency: 'PLN' },
      ];

      const result = consolidateDailyPriceHistory(history);

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(105000); // Dec 7 latest
      expect(result[1].price).toBe(98000);  // Dec 8 latest
    });

    it('should sort results by date', () => {
      const history: PricePoint[] = [
        { date: '2025-12-08T10:00:00.000Z', price: 98000, currency: 'PLN' },
        { date: '2025-12-06T10:00:00.000Z', price: 110000, currency: 'PLN' },
        { date: '2025-12-07T10:00:00.000Z', price: 105000, currency: 'PLN' },
      ];

      const result = consolidateDailyPriceHistory(history);

      expect(result).toHaveLength(3);
      expect(getDateKey(result[0].date)).toBe('2025-12-06');
      expect(getDateKey(result[1].date)).toBe('2025-12-07');
      expect(getDateKey(result[2].date)).toBe('2025-12-08');
    });
  });
});

