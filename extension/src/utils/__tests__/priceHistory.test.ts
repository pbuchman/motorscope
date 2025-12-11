/**
 * Tests for UI Price History utilities (deduplication)
 */

import {deduplicatePricePointsByLocalDay, getLocalDateString} from '../priceHistory';
import {PricePoint} from '@/types';

describe('Price History UI Utilities', () => {
    describe('deduplicatePricePointsByLocalDay', () => {
        it('should return empty array for empty input', () => {
            expect(deduplicatePricePointsByLocalDay([])).toEqual([]);
        });

        it('should return same array for single item', () => {
            const history: PricePoint[] = [
                {date: '2025-12-09T10:00:00.000Z', price: 100000, currency: 'PLN'},
            ];
            const result = deduplicatePricePointsByLocalDay(history);
            expect(result).toHaveLength(1);
            expect(result[0].price).toBe(100000);
        });

        it('should return original array for null/undefined', () => {
            expect(deduplicatePricePointsByLocalDay(null as any)).toEqual([]);
            expect(deduplicatePricePointsByLocalDay(undefined as any)).toEqual([]);
        });

        it('should keep only last price point per day', () => {
            const history: PricePoint[] = [
                {date: '2025-12-09T08:00:00.000Z', price: 100000, currency: 'PLN'},
                {date: '2025-12-09T12:00:00.000Z', price: 99000, currency: 'PLN'},
                {date: '2025-12-09T18:00:00.000Z', price: 98000, currency: 'PLN'},
            ];
            const result = deduplicatePricePointsByLocalDay(history);
            expect(result).toHaveLength(1);
            expect(result[0].price).toBe(98000);
        });

        it('should preserve different days', () => {
            const history: PricePoint[] = [
                {date: '2025-12-07T10:00:00.000Z', price: 110000, currency: 'PLN'},
                {date: '2025-12-08T10:00:00.000Z', price: 105000, currency: 'PLN'},
                {date: '2025-12-09T10:00:00.000Z', price: 100000, currency: 'PLN'},
            ];
            const result = deduplicatePricePointsByLocalDay(history);
            expect(result).toHaveLength(3);
            expect(result[0].price).toBe(110000);
            expect(result[1].price).toBe(105000);
            expect(result[2].price).toBe(100000);
        });

        it('should sort results chronologically', () => {
            const history: PricePoint[] = [
                {date: '2025-12-09T10:00:00.000Z', price: 100000, currency: 'PLN'},
                {date: '2025-12-07T10:00:00.000Z', price: 110000, currency: 'PLN'},
                {date: '2025-12-08T10:00:00.000Z', price: 105000, currency: 'PLN'},
            ];
            const result = deduplicatePricePointsByLocalDay(history);
            expect(result).toHaveLength(3);
            expect(result[0].price).toBe(110000); // Dec 7
            expect(result[1].price).toBe(105000); // Dec 8
            expect(result[2].price).toBe(100000); // Dec 9
        });

        it('should handle mixed multiple entries per day', () => {
            const history: PricePoint[] = [
                {date: '2025-12-07T08:00:00.000Z', price: 110000, currency: 'PLN'},
                {date: '2025-12-07T20:00:00.000Z', price: 108000, currency: 'PLN'},
                {date: '2025-12-08T10:00:00.000Z', price: 105000, currency: 'PLN'},
                {date: '2025-12-09T08:00:00.000Z', price: 102000, currency: 'PLN'},
                {date: '2025-12-09T12:00:00.000Z', price: 100000, currency: 'PLN'},
            ];
            const result = deduplicatePricePointsByLocalDay(history);
            expect(result).toHaveLength(3);
            expect(result[0].price).toBe(108000); // Dec 7 last
            expect(result[1].price).toBe(105000); // Dec 8 only
            expect(result[2].price).toBe(100000); // Dec 9 last
        });

        it('should preserve currency from last entry', () => {
            const history: PricePoint[] = [
                {date: '2025-12-09T08:00:00.000Z', price: 100000, currency: 'PLN'},
                {date: '2025-12-09T12:00:00.000Z', price: 25000, currency: 'EUR'},
            ];
            const result = deduplicatePricePointsByLocalDay(history);
            expect(result).toHaveLength(1);
            expect(result[0].currency).toBe('EUR');
        });
    });

    describe('getLocalDateString', () => {
        it('should return YYYY-MM-DD format', () => {
            const result = getLocalDateString('2025-12-09T10:00:00.000Z');
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should handle different dates', () => {
            // These tests depend on timezone, but format should be consistent
            const result1 = getLocalDateString('2025-01-15T10:00:00.000Z');
            const result2 = getLocalDateString('2025-12-31T23:59:59.000Z');
            expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});

