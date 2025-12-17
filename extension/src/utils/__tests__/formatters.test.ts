/**
 * Tests for formatters utility functions
 */

import {
    cleanVin,
    extractFacebookListingId,
    formatEuropeanDateShort,
    formatEuropeanDateTime,
    formatEuropeanDateTimeWithSeconds,
    isFacebookGroupPost,
    isFacebookMarketplaceUrl,
    isValidVin,
    normalizeUrl,
} from '../formatters';

describe('Date Formatters', () => {
    describe('formatEuropeanDateTime', () => {
        it('should format ISO date to DD/MM/YYYY HH:mm', () => {
            const date = new Date(2025, 11, 9, 14, 30, 45);
            const result = formatEuropeanDateTime(date.toISOString());
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        });

        it('should handle timestamp number', () => {
            const timestamp = new Date(2025, 11, 9, 10, 15).getTime();
            const result = formatEuropeanDateTime(timestamp);
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        });

        it('should pad single digits with zeros', () => {
            const date = new Date(2025, 0, 5, 8, 5);
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
            const date = new Date(2025, 0, 5);
            const result = formatEuropeanDateShort(date.toISOString());
            expect(result).toBe('05/01');
        });
    });
});

describe('URL Utilities', () => {
    describe('normalizeUrl', () => {
        it('should remove query parameters', () => {
            const url = 'https://example.com/listing/123?ref=facebook&utm_source=test';
            expect(normalizeUrl(url)).toBe('https://example.com/listing/123');
        });

        it('should remove hash fragments', () => {
            const url = 'https://example.com/listing/123#section';
            expect(normalizeUrl(url)).toBe('https://example.com/listing/123');
        });

        it('should preserve protocol and host', () => {
            const url = 'https://www.otomoto.pl/oferta/bmw-123';
            expect(normalizeUrl(url)).toBe('https://www.otomoto.pl/oferta/bmw-123');
        });

        it('should handle URLs without query params', () => {
            const url = 'https://example.com/path';
            expect(normalizeUrl(url)).toBe('https://example.com/path');
        });

        it('should return original string for invalid URLs', () => {
            expect(normalizeUrl('not-a-valid-url')).toBe('not-a-valid-url');
        });

        it('should handle URLs with ports', () => {
            const url = 'http://localhost:3000/api/test?query=1';
            expect(normalizeUrl(url)).toBe('http://localhost:3000/api/test');
        });

        describe('Facebook URL handling', () => {
            it('should remove tracking parameters from marketplace item URLs', () => {
                const dirtyUrl = 'https://www.facebook.com/marketplace/item/808122311823650/?ref=browse_tab&referral_code=marketplace_top_picks';
                expect(normalizeUrl(dirtyUrl)).toBe('https://www.facebook.com/marketplace/item/808122311823650');
            });

            it('should remove tracking parameters from commerce listing URLs', () => {
                const dirtyUrl = 'https://www.facebook.com/commerce/listing/1290047786300978/?ref=share_attachment';
                expect(normalizeUrl(dirtyUrl)).toBe('https://www.facebook.com/commerce/listing/1290047786300978');
            });

            it('should handle already clean Facebook URLs', () => {
                const cleanUrl = 'https://www.facebook.com/marketplace/item/25767918552814077';
                expect(normalizeUrl(cleanUrl)).toBe(cleanUrl);
            });

            it('should preserve the Facebook item ID', () => {
                const url = 'https://www.facebook.com/marketplace/item/1780648822615124/?ref=browse_tab';
                expect(normalizeUrl(url)).toContain('1780648822615124');
            });

            it('should work for mobile Facebook URLs', () => {
                const url = 'https://m.facebook.com/marketplace/item/12345/?ref=test';
                expect(normalizeUrl(url)).toBe('https://m.facebook.com/marketplace/item/12345');
            });

            it('should normalize group permalink URLs', () => {
                const dirtyUrl = 'https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/?rdid=XIBj3E07c9YRQBWw#';
                expect(normalizeUrl(dirtyUrl)).toBe('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445');
            });

            it('should normalize group posts URLs to permalink format', () => {
                const url = 'https://www.facebook.com/groups/123456789/posts/987654321/?ref=test';
                expect(normalizeUrl(url)).toBe('https://www.facebook.com/groups/123456789/permalink/987654321');
            });

            it('should preserve group and post IDs', () => {
                const url = 'https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/';
                const normalized = normalizeUrl(url);
                expect(normalized).toContain('2745745475668729');
                expect(normalized).toContain('4268638163379445');
            });
        });
    });
});

describe('VIN Validation', () => {
    describe('isValidVin', () => {
        it('should return true for valid 17-character VIN', () => {
            expect(isValidVin('1C4SDJCT8LC248766')).toBe(true);
            expect(isValidVin('WAUZZZ4F1BN034466')).toBe(true);
        });

        it('should return false for VIN with invalid characters (I, O, Q)', () => {
            expect(isValidVin('1C4SDJCTILC248766')).toBe(false);
            expect(isValidVin('WAUZZZ4O1BN034466')).toBe(false);
        });

        it('should return false for wrong length', () => {
            expect(isValidVin('1C4SDJCT8LC24876')).toBe(false);
            expect(isValidVin('')).toBe(false);
        });

        it('should return false for null/undefined', () => {
            expect(isValidVin(null)).toBe(false);
            expect(isValidVin(undefined)).toBe(false);
        });

        it('should be case-insensitive', () => {
            expect(isValidVin('1c4sdjct8lc248766')).toBe(true);
        });

        it('should handle VIN with whitespace', () => {
            expect(isValidVin(' 1C4SDJCT8LC248766 ')).toBe(true);
        });
    });

    describe('cleanVin', () => {
        it('should return uppercase cleaned VIN for valid input', () => {
            expect(cleanVin('1c4sdjct8lc248766')).toBe('1C4SDJCT8LC248766');
        });

        it('should remove invalid characters and validate', () => {
            expect(cleanVin('1C4-SDJCT8LC248766')).toBe('1C4SDJCT8LC248766');
        });

        it('should return undefined for invalid VIN after cleaning', () => {
            expect(cleanVin('1C4SDJCT')).toBeUndefined();
            expect(cleanVin('INVALID')).toBeUndefined();
        });

        it('should return undefined for null/undefined', () => {
            expect(cleanVin(null)).toBeUndefined();
            expect(cleanVin(undefined)).toBeUndefined();
        });
    });
});

describe('Facebook URL Utilities', () => {
    describe('isFacebookMarketplaceUrl', () => {
        it('should return true for marketplace item URLs', () => {
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/marketplace/item/25767918552814077')).toBe(true);
            expect(isFacebookMarketplaceUrl('https://facebook.com/marketplace/item/12345')).toBe(true);
            expect(isFacebookMarketplaceUrl('https://m.facebook.com/marketplace/item/12345')).toBe(true);
        });

        it('should return true for commerce listing URLs', () => {
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/commerce/listing/1290047786300978')).toBe(true);
        });

        it('should return true for group post URLs (permalink format)', () => {
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/')).toBe(true);
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/?rdid=XIBj3E07c9YRQBWw')).toBe(true);
        });

        it('should return true for group post URLs (posts format)', () => {
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/groups/123456789/posts/987654321/')).toBe(true);
        });

        it('should return false for marketplace browse pages', () => {
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/marketplace/')).toBe(false);
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/marketplace/search')).toBe(false);
        });

        it('should return false for group main pages (not posts)', () => {
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/groups/2745745475668729/')).toBe(false);
            expect(isFacebookMarketplaceUrl('https://www.facebook.com/groups/2745745475668729/members')).toBe(false);
        });

        it('should return false for non-Facebook URLs', () => {
            expect(isFacebookMarketplaceUrl('https://www.otomoto.pl/oferta/123')).toBe(false);
        });

        it('should return false for invalid URLs', () => {
            expect(isFacebookMarketplaceUrl('not-a-url')).toBe(false);
            expect(isFacebookMarketplaceUrl('')).toBe(false);
        });
    });

    describe('extractFacebookListingId', () => {
        it('should extract ID from marketplace item URL', () => {
            expect(extractFacebookListingId('https://www.facebook.com/marketplace/item/25767918552814077')).toBe('25767918552814077');
            expect(extractFacebookListingId('https://www.facebook.com/marketplace/item/808122311823650/?ref=browse_tab')).toBe('808122311823650');
        });

        it('should extract ID from commerce listing URL', () => {
            expect(extractFacebookListingId('https://www.facebook.com/commerce/listing/1290047786300978')).toBe('1290047786300978');
        });

        it('should extract post ID from group permalink URL', () => {
            expect(extractFacebookListingId('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/')).toBe('4268638163379445');
            expect(extractFacebookListingId('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/?rdid=test')).toBe('4268638163379445');
        });

        it('should extract post ID from group posts URL', () => {
            expect(extractFacebookListingId('https://www.facebook.com/groups/123456789/posts/987654321/')).toBe('987654321');
        });

        it('should return null for non-listing URLs', () => {
            expect(extractFacebookListingId('https://www.facebook.com/marketplace/')).toBeNull();
            expect(extractFacebookListingId('https://www.facebook.com/groups/123456789/')).toBeNull();
        });

        it('should return null for invalid URLs', () => {
            expect(extractFacebookListingId('not-a-url')).toBeNull();
        });
    });

    describe('isFacebookGroupPost', () => {
        it('should return true for group permalink URLs', () => {
            expect(isFacebookGroupPost('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/')).toBe(true);
        });

        it('should return true for group posts URLs', () => {
            expect(isFacebookGroupPost('https://www.facebook.com/groups/123456789/posts/987654321/')).toBe(true);
        });

        it('should return false for marketplace item URLs', () => {
            expect(isFacebookGroupPost('https://www.facebook.com/marketplace/item/12345')).toBe(false);
        });

        it('should return false for commerce listing URLs', () => {
            expect(isFacebookGroupPost('https://www.facebook.com/commerce/listing/12345')).toBe(false);
        });

        it('should return false for group main page', () => {
            expect(isFacebookGroupPost('https://www.facebook.com/groups/12345/')).toBe(false);
        });

        it('should return false for non-Facebook URLs', () => {
            expect(isFacebookGroupPost('https://www.otomoto.pl/oferta/123')).toBe(false);
        });
    });
});
