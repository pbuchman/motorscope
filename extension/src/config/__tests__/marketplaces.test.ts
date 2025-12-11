/**
 * Tests for Marketplace Configuration
 */

import {
    getEnabledMarketplaces,
    getMarketplaceDisplayName,
    getMarketplaceForUrl,
    getSupportedDomains,
    isOfferPage,
    isSupportedMarketplace,
    isTrackableOfferPage,
    SUPPORTED_MARKETPLACES,
} from '@/config/marketplaces';

describe('Marketplace Configuration', () => {
    describe('SUPPORTED_MARKETPLACES', () => {
        it('should have at least one marketplace', () => {
            expect(SUPPORTED_MARKETPLACES.length).toBeGreaterThan(0);
        });

        it('should have unique IDs', () => {
            const ids = SUPPORTED_MARKETPLACES.map(m => m.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have required fields for each marketplace', () => {
            for (const marketplace of SUPPORTED_MARKETPLACES) {
                expect(marketplace.id).toBeDefined();
                expect(marketplace.name).toBeDefined();
                expect(marketplace.domains).toBeDefined();
                expect(marketplace.domains.length).toBeGreaterThan(0);
                expect(marketplace.countries).toBeDefined();
                expect(marketplace.url).toBeDefined();
                expect(typeof marketplace.enabled).toBe('boolean');
                expect(marketplace.offerPagePatterns).toBeDefined();
            // useBackgroundTab is optional, but if defined must be boolean
        if (marketplace.useBackgroundTab !== undefined) {
          expect(typeof marketplace.useBackgroundTab).toBe('boolean');
        }}
        });
    });

    describe('getEnabledMarketplaces', () => {
        it('should return only enabled marketplaces', () => {
            const enabled = getEnabledMarketplaces();
            for (const marketplace of enabled) {
                expect(marketplace.enabled).toBe(true);
            }
        });
    });

    describe('getSupportedDomains', () => {
        it('should return domains from enabled marketplaces', () => {
            const domains = getSupportedDomains();
            expect(domains.length).toBeGreaterThan(0);
            expect(domains).toContain('otomoto.pl');
        });

        it('should include www variants', () => {
            const domains = getSupportedDomains();
            const hasWww = domains.some(d => d.startsWith('www.'));
            expect(hasWww).toBe(true);
        });
    });

    describe('getMarketplaceDisplayName', () => {
        it('should return friendly name for known platforms', () => {
            expect(getMarketplaceDisplayName('otomoto.pl')).toBe('OTOMOTO');
            expect(getMarketplaceDisplayName('www.otomoto.pl')).toBe('OTOMOTO');
        });

        it('should be case-insensitive', () => {
            expect(getMarketplaceDisplayName('OTOMOTO.PL')).toBe('OTOMOTO');
            expect(getMarketplaceDisplayName('OtoMoto.Pl')).toBe('OTOMOTO');
        });

        it('should return original string for unknown platforms', () => {
            expect(getMarketplaceDisplayName('unknown.com')).toBe('unknown.com');
        });

        it('should handle platform IDs', () => {
            expect(getMarketplaceDisplayName('otomoto')).toBe('OTOMOTO');
        });
    });

    describe('isSupportedMarketplace', () => {
        it('should return true for supported domains', () => {
            expect(isSupportedMarketplace('https://otomoto.pl')).toBe(true);
            expect(isSupportedMarketplace('https://www.otomoto.pl')).toBe(true);
            expect(isSupportedMarketplace('https://www.otomoto.pl/osobowe')).toBe(true);
        });

        it('should return false for unsupported domains', () => {
            expect(isSupportedMarketplace('https://google.com')).toBe(false);
            expect(isSupportedMarketplace('https://allegro.pl')).toBe(false);
        });

        it('should return false for empty/null URL', () => {
            expect(isSupportedMarketplace('')).toBe(false);
            expect(isSupportedMarketplace(null as any)).toBe(false);
        });

        it('should be case-insensitive', () => {
            expect(isSupportedMarketplace('https://OTOMOTO.PL/test')).toBe(true);
        });
    });

    describe('isOfferPage', () => {
        describe('OTOMOTO patterns', () => {
            it('should recognize offer pages', () => {
                expect(isOfferPage('https://www.otomoto.pl/osobowe/oferta/ford-ranger-ID6HEcgy.html')).toBe(true);
                expect(isOfferPage('https://otomoto.pl/oferta/test-car-123')).toBe(true);
            });

            it('should reject search pages', () => {
                expect(isOfferPage('https://www.otomoto.pl/osobowe/szukaj')).toBe(false);
                expect(isOfferPage('https://www.otomoto.pl/osobowe?search=bmw')).toBe(false);
            });

            it('should reject category pages without /oferta/', () => {
                expect(isOfferPage('https://www.otomoto.pl/osobowe/')).toBe(false);
                expect(isOfferPage('https://www.otomoto.pl/')).toBe(false);
            });
        });

        it('should return false for unsupported marketplace URLs', () => {
            expect(isOfferPage('https://google.com/oferta/something')).toBe(false);
        });

        it('should return false for empty URL', () => {
            expect(isOfferPage('')).toBe(false);
            expect(isOfferPage(null as any)).toBe(false);
        });
    });

    describe('isTrackableOfferPage', () => {
        it('should return true only for supported marketplace offer pages', () => {
            // Valid offer page on supported marketplace
            expect(isTrackableOfferPage('https://www.otomoto.pl/osobowe/oferta/test-ID123.html')).toBe(true);
        });

        it('should return false for supported marketplace non-offer pages', () => {
            expect(isTrackableOfferPage('https://www.otomoto.pl/osobowe/')).toBe(false);
            expect(isTrackableOfferPage('https://www.otomoto.pl/szukaj')).toBe(false);
        });

        it('should return false for unsupported marketplaces', () => {
            expect(isTrackableOfferPage('https://allegro.pl/oferta/car-123')).toBe(false);
        });

        it('should return false for empty URL', () => {
            expect(isTrackableOfferPage('')).toBe(false);
        });
    });

    describe('getMarketplaceForUrl', () => {
        it('should return marketplace config for known URLs', () => {
            const result = getMarketplaceForUrl('https://www.otomoto.pl/test');
            expect(result).not.toBeNull();
            expect(result?.id).toBe('otomoto');
            expect(result?.name).toBe('OTOMOTO');
        });

        it('should return null for unknown URLs', () => {
            const result = getMarketplaceForUrl('https://unknown-site.com/test');
            expect(result).toBeNull();
        });

        it('should return null for empty URL', () => {
            expect(getMarketplaceForUrl('')).toBeNull();
            expect(getMarketplaceForUrl(null as any)).toBeNull();
        });

        it('should only return enabled marketplaces', () => {
            const enabled = getEnabledMarketplaces();
            const result = getMarketplaceForUrl('https://www.otomoto.pl/test');

            if (result) {
                expect(enabled.map(m => m.id)).toContain(result.id);
            }
        });
    });
});

describe('Edge Cases', () => {
    it('should handle URLs with query parameters', () => {
        expect(isTrackableOfferPage('https://www.otomoto.pl/osobowe/oferta/test-ID123.html?ref=fb')).toBe(true);
    });

    it('should handle URLs with hash fragments', () => {
        expect(isTrackableOfferPage('https://www.otomoto.pl/osobowe/oferta/test-ID123.html#details')).toBe(true);
    });

    it('should handle malformed URLs gracefully', () => {
        expect(isSupportedMarketplace('not-a-valid-url')).toBe(false);
        expect(isOfferPage('not-a-valid-url')).toBe(false);
        expect(isTrackableOfferPage('not-a-valid-url')).toBe(false);
    });
});

describe('Background Tab Configuration', () => {
  it('should configure otomoto to use standard fetch', () => {
    const otomoto = SUPPORTED_MARKETPLACES.find(m => m.id === 'otomoto');
    expect(otomoto).toBeDefined();
    expect(otomoto?.useBackgroundTab).toBe(false);
  });

  it('should configure autoplac to use background tab', () => {
    const autoplac = SUPPORTED_MARKETPLACES.find(m => m.id === 'autoplac');
    expect(autoplac).toBeDefined();
    expect(autoplac?.useBackgroundTab).toBe(true);
  });

  it('should return correct marketplace config for autoplac URLs', () => {
    const marketplace = getMarketplaceForUrl('https://autoplac.pl/ogloszenie/test-123');
    expect(marketplace).not.toBeNull();
    expect(marketplace?.id).toBe('autoplac');
    expect(marketplace?.useBackgroundTab).toBe(true);
  });

  it('should return correct marketplace config for otomoto URLs', () => {
    const marketplace = getMarketplaceForUrl('https://www.otomoto.pl/osobowe/oferta/test');
    expect(marketplace).not.toBeNull();
    expect(marketplace?.id).toBe('otomoto');
    expect(marketplace?.useBackgroundTab).toBe(false);
  });
});

