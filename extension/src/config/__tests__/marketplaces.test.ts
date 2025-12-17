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
            }
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
    it('should return correct marketplace config for autoplac URLs', () => {
        const marketplace = getMarketplaceForUrl('https://autoplac.pl/ogloszenie/test-123');
        expect(marketplace).not.toBeNull();
        expect(marketplace?.id).toBe('autoplac');
    });

    it('should return correct marketplace config for otomoto URLs', () => {
        const marketplace = getMarketplaceForUrl('https://www.otomoto.pl/osobowe/oferta/test');
        expect(marketplace).not.toBeNull();
        expect(marketplace?.id).toBe('otomoto');
    });
});

describe('Facebook Marketplace', () => {
    describe('URL detection', () => {
        it('should recognize facebook.com domain', () => {
            expect(isSupportedMarketplace('https://www.facebook.com/marketplace')).toBe(true);
            expect(isSupportedMarketplace('https://facebook.com/marketplace')).toBe(true);
            expect(isSupportedMarketplace('https://m.facebook.com/marketplace')).toBe(true);
        });

        it('should recognize marketplace item URLs as offer pages', () => {
            expect(isOfferPage('https://www.facebook.com/marketplace/item/25767918552814077')).toBe(true);
            expect(isOfferPage('https://www.facebook.com/marketplace/item/808122311823650/?ref=browse_tab')).toBe(true);
            expect(isOfferPage('https://m.facebook.com/marketplace/item/12345')).toBe(true);
        });

        it('should recognize commerce listing URLs as offer pages', () => {
            expect(isOfferPage('https://www.facebook.com/commerce/listing/1290047786300978')).toBe(true);
            expect(isOfferPage('https://www.facebook.com/commerce/listing/1290047786300978/?ref=share_attachment')).toBe(true);
        });

        it('should recognize group post permalink URLs as offer pages', () => {
            expect(isOfferPage('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/')).toBe(true);
            expect(isOfferPage('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/?rdid=test')).toBe(true);
        });

        it('should recognize group post posts URLs as offer pages', () => {
            expect(isOfferPage('https://www.facebook.com/groups/123456789/posts/987654321/')).toBe(true);
        });

        it('should recognize group posts with alphanumeric group IDs (slugs)', () => {
            expect(isOfferPage('https://www.facebook.com/groups/fordedgepl/posts/2441235006294035/')).toBe(true);
            expect(isOfferPage('https://www.facebook.com/groups/fordedgepl/permalink/2441235006294035/')).toBe(true);
            expect(isOfferPage('https://www.facebook.com/groups/bmw-e36-fans/posts/123456789/')).toBe(true);
            expect(isOfferPage('https://www.facebook.com/groups/audi.a4.club/permalink/987654321/')).toBe(true);
        });

        it('should reject marketplace search/browse pages', () => {
            expect(isOfferPage('https://www.facebook.com/marketplace/')).toBe(false);
            expect(isOfferPage('https://www.facebook.com/marketplace/search')).toBe(false);
            expect(isOfferPage('https://www.facebook.com/marketplace/category/vehicles')).toBe(false);
            expect(isOfferPage('https://www.facebook.com/marketplace/you/')).toBe(false);
            expect(isOfferPage('https://www.facebook.com/marketplace/create/')).toBe(false);
        });

        it('should reject group main pages (not posts)', () => {
            expect(isOfferPage('https://www.facebook.com/groups/123456789/')).toBe(false);
            expect(isOfferPage('https://www.facebook.com/groups/123456789/members')).toBe(false);
        });

        it('should be trackable for marketplace item pages', () => {
            expect(isTrackableOfferPage('https://www.facebook.com/marketplace/item/25767918552814077')).toBe(true);
            expect(isTrackableOfferPage('https://www.facebook.com/commerce/listing/1290047786300978')).toBe(true);
        });

        it('should be trackable for group posts', () => {
            expect(isTrackableOfferPage('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/')).toBe(true);
            expect(isTrackableOfferPage('https://www.facebook.com/groups/123456789/posts/987654321/')).toBe(true);
        });

        it('should be trackable for group posts with alphanumeric group IDs', () => {
            expect(isTrackableOfferPage('https://www.facebook.com/groups/fordedgepl/posts/2441235006294035/')).toBe(true);
            expect(isTrackableOfferPage('https://www.facebook.com/groups/bmw-e36-fans/permalink/123456789/')).toBe(true);
        });
    });

    describe('marketplace config', () => {
        it('should return correct config for Facebook URLs', () => {
            const marketplace = getMarketplaceForUrl('https://www.facebook.com/marketplace/item/12345');
            expect(marketplace).not.toBeNull();
            expect(marketplace?.id).toBe('facebook-marketplace');
            expect(marketplace?.name).toBe('Facebook Marketplace');
        });

        it('should return correct config for Facebook group post URLs', () => {
            const marketplace = getMarketplaceForUrl('https://www.facebook.com/groups/2745745475668729/permalink/4268638163379445/');
            expect(marketplace).not.toBeNull();
            expect(marketplace?.id).toBe('facebook-marketplace');
        });

        it('should have neverFetch set to true', () => {
            const marketplace = getMarketplaceForUrl('https://www.facebook.com/marketplace/item/12345');
            expect(marketplace?.neverFetch).toBe(true);
        });

        it('should have neverFetch set to true for group posts', () => {
            const marketplace = getMarketplaceForUrl('https://www.facebook.com/groups/123/permalink/456/');
            expect(marketplace?.neverFetch).toBe(true);
        });

        it('should not have neverFetch for other marketplaces', () => {
            const otomoto = getMarketplaceForUrl('https://www.otomoto.pl/oferta/test');
            const autoplac = getMarketplaceForUrl('https://autoplac.pl/ogloszenie/test');

            // neverFetch should be undefined or false for other marketplaces
            expect(otomoto?.neverFetch).toBeFalsy();
            expect(autoplac?.neverFetch).toBeFalsy();
        });
    });

    describe('display name', () => {
        it('should return friendly name for Facebook', () => {
            expect(getMarketplaceDisplayName('facebook.com')).toBe('Facebook Marketplace');
            expect(getMarketplaceDisplayName('www.facebook.com')).toBe('Facebook Marketplace');
            expect(getMarketplaceDisplayName('m.facebook.com')).toBe('Facebook Marketplace');
        });
    });
});

