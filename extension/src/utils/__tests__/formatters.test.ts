/**
 * Tests for formatters utility functions
 */

import {
    cleanVin,
    formatEuropeanDateShort,
    formatEuropeanDateTime,
    formatEuropeanDateTimeWithSeconds,
    isValidVin,
    normalizeUrl,
} from '../formatters';

describe('Date Formatters', () => {
    describe('formatEuropeanDateTime', () => {
        it('should format ISO date to DD/MM/YYYY HH:mm', () => {
            // Note: These tests use local timezone, so we test the format pattern
            const date = new Date(2025, 11, 9, 14, 30, 45); // Dec 9, 2025, 14:30:45
            const result = formatEuropeanDateTime(date.toISOString());
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        });

        it('should handle timestamp number', () => {
            const timestamp = new Date(2025, 11, 9, 10, 15).getTime();
            const result = formatEuropeanDateTime(timestamp);
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        });

        it('should pad single digits with zeros', () => {
            const date = new Date(2025, 0, 5, 8, 5); // Jan 5, 2025, 08:05
            const result = formatEuropeanDateTime(date.toISOString());
            expect(result).toContain('/01/2025');
            expect(result).toContain('05/');
        });
    });

    describe('formatEuropeanDateTimeWithSeconds', () => {
        it('should format with seconds DD/MM/YYYY HH:mm:ss', () => {
            const date = new Date(2025, 11, 9, 14, 30, 45);
            const result = formatEuropeanDateTimeWithSeconds(date.toISOString());
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
        });

        it('should include seconds in output', () => {
            const date = new Date(2025, 5, 15, 10, 20, 35);
            const result = formatEuropeanDateTimeWithSeconds(date.toISOString());
            expect(result).toContain(':35');
        });
    });

    describe('formatEuropeanDateShort', () => {
        it('should format to DD/MM', () => {
            const date = new Date(2025, 11, 9);
            const result = formatEuropeanDateShort(date.toISOString());
            expect(result).toMatch(/^\d{2}\/\d{2}$/);
        });

        it('should pad single digit day and month', () => {
            const date = new Date(2025, 0, 5); // Jan 5
            const result = formatEuropeanDateShort(date.toISOString());
            expect(result).toBe('05/01');
        });
    });
});

describe('URL Utilities', () => {
    describe('normalizeUrl', () => {
        it('should remove query parameters', () => {
            const url = 'https://example.com/listing/123?ref=facebook&utm_source=test';
            const result = normalizeUrl(url);
            expect(result).toBe('https://example.com/listing/123');
        });

        it('should remove hash fragments', () => {
            const url = 'https://example.com/listing/123#section';
            const result = normalizeUrl(url);
            expect(result).toBe('https://example.com/listing/123');
        });

        it('should preserve protocol and host', () => {
            const url = 'https://www.otomoto.pl/oferta/bmw-123';
            const result = normalizeUrl(url);
            expect(result).toBe('https://www.otomoto.pl/oferta/bmw-123');
        });

        it('should handle URLs without query params', () => {
            const url = 'https://example.com/path';
            const result = normalizeUrl(url);
            expect(result).toBe('https://example.com/path');
        });

        it('should return original string for invalid URLs', () => {
            const invalidUrl = 'not-a-valid-url';
            const result = normalizeUrl(invalidUrl);
            expect(result).toBe(invalidUrl);
        });

        it('should handle URLs with ports', () => {
            const url = 'http://localhost:3000/api/test?query=1';
            const result = normalizeUrl(url);
            expect(result).toBe('http://localhost:3000/api/test');
        });
    });
});

describe('VIN Validation', () => {
    describe('isValidVin', () => {
        it('should return true for valid 17-character VIN', () => {
            expect(isValidVin('1C4SDJCT8LC248766')).toBe(true);
            expect(isValidVin('WAUZZZ4F1BN034466')).toBe(true);
            expect(isValidVin('WBA5R71070FJ35943')).toBe(true);
        });

        it('should return false for VIN with invalid characters (I, O, Q)', () => {
            expect(isValidVin('1C4SDJCTILC248766')).toBe(false); // I is invalid
            expect(isValidVin('WAUZZZ4O1BN034466')).toBe(false); // O is invalid
            expect(isValidVin('WBA5R71Q70FJ35943')).toBe(false); // Q is invalid
        });

        it('should return false for wrong length', () => {
            expect(isValidVin('1C4SDJCT8LC24876')).toBe(false);  // 16 chars
            expect(isValidVin('1C4SDJCT8LC2487660')).toBe(false); // 18 chars
            expect(isValidVin('')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isValidVin(null)).toBe(false);
            expect(isValidVin(undefined)).toBe(false);
        });

        it('should be case-insensitive', () => {
            expect(isValidVin('1c4sdjct8lc248766')).toBe(true);
            expect(isValidVin('wauzzz4f1bn034466')).toBe(true);
        });

        it('should handle VIN with whitespace', () => {
            expect(isValidVin(' 1C4SDJCT8LC248766 ')).toBe(true);
            expect(isValidVin('1C4SDJCT8LC248766\n')).toBe(true);
        });

        it('should return false for VIN with special characters', () => {
            expect(isValidVin('1C4-DJCT8LC248766')).toBe(false);
            expect(isValidVin('1C4SDJCT8LC24876!')).toBe(false);
        });
    });

    describe('cleanVin', () => {
        it('should return uppercase cleaned VIN for valid input', () => {
            expect(cleanVin('1c4sdjct8lc248766')).toBe('1C4SDJCT8LC248766');
        });

        it('should remove invalid characters and validate', () => {
            expect(cleanVin('1C4-SDJCT8LC248766')).toBe('1C4SDJCT8LC248766');
            expect(cleanVin('1C4 SDJCT8LC248766')).toBe('1C4SDJCT8LC248766');
        });

        it('should return undefined for invalid VIN after cleaning', () => {
            expect(cleanVin('1C4SDJCT')).toBeUndefined(); // Too short after cleaning
            expect(cleanVin('INVALID')).toBeUndefined();
        });

        it('should return undefined for null/undefined', () => {
            expect(cleanVin(null)).toBeUndefined();
            expect(cleanVin(undefined)).toBeUndefined();
        });

        it('should trim whitespace', () => {
            expect(cleanVin('  1C4SDJCT8LC248766  ')).toBe('1C4SDJCT8LC248766');
        });
    });
});

