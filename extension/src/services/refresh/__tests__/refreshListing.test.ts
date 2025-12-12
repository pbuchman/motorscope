/**
 * Tests for Single Listing Refresh Service
 *
 * Tests the core refresh logic for individual listings.
 */

// Create RateLimitError mock class that matches the real implementation
class MockRateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

// Mock dependencies
jest.mock('../../gemini', () => ({
    refreshListingWithGemini: jest.fn(),
    RateLimitError: MockRateLimitError,
}));

// Create FetchError mock class
class MockFetchError extends Error {
    constructor(message: string, public isCorsError: boolean = false, public httpStatus?: number) {
        super(message);
        this.name = 'FetchError';
    }
}

jest.mock('../fetcher', () => ({
    fetchListingPage: jest.fn(),
    FetchError: MockFetchError,
}));

jest.mock('../priceHistory', () => ({
    updateDailyPriceHistory: jest.fn((history, price, currency) => [
        ...history,
        {date: new Date().toISOString(), price, currency},
    ]),
    hasPriceChangedFromPreviousDay: jest.fn(() => false),
}));

import {refreshSingleListing} from '../refreshListing';
import {refreshListingWithGemini} from '../../gemini';
import {fetchListingPage} from '../fetcher';
import {hasPriceChangedFromPreviousDay, updateDailyPriceHistory} from '../priceHistory';
import {CarListing, ListingStatus} from '@/types';

const mockRefreshWithGemini = refreshListingWithGemini as jest.MockedFunction<typeof refreshListingWithGemini>;
const mockFetchListingPage = fetchListingPage as jest.MockedFunction<typeof fetchListingPage>;
const mockUpdatePriceHistory = updateDailyPriceHistory as jest.MockedFunction<typeof updateDailyPriceHistory>;
const mockHasPriceChanged = hasPriceChangedFromPreviousDay as jest.MockedFunction<typeof hasPriceChangedFromPreviousDay>;

describe('Refresh Listing Service', () => {
    const baseListing: CarListing = {
        id: 'vin_ABC123',
        schemaVersion: '1.0.0',
        source: {
            platform: 'otomoto.pl',
            url: 'https://otomoto.pl/oferta/bmw-123',
            listingId: 'vin_ABC123',
            countryCode: 'PL',
        },
        title: 'BMW 320d 2020',
        thumbnailUrl: 'https://example.com/image.jpg',
        currentPrice: 150000,
        currency: 'PLN',
        priceHistory: [
            {date: '2024-12-01T10:00:00Z', price: 160000, currency: 'PLN'},
            {date: '2024-12-05T10:00:00Z', price: 150000, currency: 'PLN'},
        ],
        originalPrice: 160000,
        negotiable: true,
        vehicle: {
            vin: 'ABC123',
            make: 'BMW',
            model: '320d',
            generation: 'G20',
            trim: 'M Sport',
            bodyType: 'Sedan',
            productionYear: 2020,
            firstRegistrationYear: 2020,
            mileage: {value: 50000, unit: 'km'},
            engine: {
                capacityCc: 1995,
                fuelType: 'Diesel',
                powerKw: 140,
                powerHp: 190,
                engineCode: 'B47',
                euroStandard: 'Euro 6',
                hybridType: null,
            },
            drivetrain: {
                transmissionType: 'Automatic',
                transmissionSubtype: 'ZF8',
                gearsCount: 8,
                driveType: 'RWD',
            },
            condition: {
                isNew: false,
                isImported: false,
                accidentFreeDeclared: true,
                serviceHistoryDeclared: true,
            },
            colorAndInterior: {
                exteriorColor: 'Black',
                interiorColor: 'Black',
                upholsteryType: 'Leather',
            },
            registration: {
                plateNumber: null,
                originCountry: 'DE',
                registeredInCountryCode: 'PL',
            },
        },
        location: {
            city: 'Warsaw',
            region: 'Mazowieckie',
            postalCode: '00-001',
            countryCode: 'PL',
        },
        seller: {
            type: 'Dealer',
            name: 'BMW Dealer',
            phone: null,
            isCompany: true,
        },
        status: ListingStatus.ACTIVE,
        postedDate: '2024-11-01T10:00:00Z',
        firstSeenAt: '2024-11-05T10:00:00Z',
        lastSeenAt: '2024-12-05T10:00:00Z',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('successful refresh', () => {
        it('should update listing with new price and keep status active', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'BMW 320d listing content',
                pageTitle: 'BMW 320d - Otomoto',
            });

            mockRefreshWithGemini.mockResolvedValue({
                price: 145000,
                currency: 'PLN',
                status: ListingStatus.ACTIVE,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(true);
            expect(result.listing.currentPrice).toBe(145000);
            expect(result.listing.status).toBe(ListingStatus.ACTIVE);
            expect(result.listing.lastRefreshStatus).toBe('success');
            expect(result.listing.lastRefreshError).toBeUndefined();
        });

        it('should update lastSeenAt on successful refresh', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'content',
                pageTitle: 'title',
            });

            mockRefreshWithGemini.mockResolvedValue({
                price: 150000,
                currency: 'PLN',
                status: ListingStatus.ACTIVE,
            });

            const beforeRefresh = Date.now();
            const result = await refreshSingleListing(baseListing);
            const afterRefresh = Date.now();

            const lastSeenAt = new Date(result.listing.lastSeenAt).getTime();
            expect(lastSeenAt).toBeGreaterThanOrEqual(beforeRefresh);
            expect(lastSeenAt).toBeLessThanOrEqual(afterRefresh);
        });

        it('should update price history', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'content',
                pageTitle: 'title',
            });

            mockRefreshWithGemini.mockResolvedValue({
                price: 145000,
                currency: 'PLN',
                status: ListingStatus.ACTIVE,
            });

            await refreshSingleListing(baseListing);

            expect(mockUpdatePriceHistory).toHaveBeenCalledWith(
                baseListing.priceHistory,
                145000,
                'PLN',
            );
        });

        it('should detect price change', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'content',
                pageTitle: 'title',
            });

            mockRefreshWithGemini.mockResolvedValue({
                price: 140000,
                currency: 'PLN',
                status: ListingStatus.ACTIVE,
            });

            mockHasPriceChanged.mockReturnValue(true);

            const result = await refreshSingleListing(baseListing);

            expect(result.priceChanged).toBe(true);
            expect(mockHasPriceChanged).toHaveBeenCalledWith(
                baseListing.priceHistory,
                140000,
            );
        });

        it('should keep current price when AI returns 0', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'content',
                pageTitle: 'title',
            });

            mockRefreshWithGemini.mockResolvedValue({
                price: 0, // AI couldn't extract price
                currency: 'PLN',
                status: ListingStatus.ACTIVE,
            });

            const result = await refreshSingleListing(baseListing);

            // Should keep original price, not update to 0
            expect(result.listing.currentPrice).toBe(150000);
        });
    });

    describe('expired listing detection', () => {
        it('should mark listing as ENDED when page returns 404', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: true,
                status: 404,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(true);
            expect(result.listing.status).toBe(ListingStatus.ENDED);
            expect(result.listing.lastRefreshStatus).toBe('success');
        });

        it('should mark listing as ENDED when page returns 410', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: true,
                status: 410,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(true);
            expect(result.listing.status).toBe(ListingStatus.ENDED);
        });

        it('should update lastSeenAt even for expired listings', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: true,
                status: 404,
            });

            const beforeRefresh = Date.now();
            const result = await refreshSingleListing(baseListing);
            const afterRefresh = Date.now();

            const lastSeenAt = new Date(result.listing.lastSeenAt).getTime();
            expect(lastSeenAt).toBeGreaterThanOrEqual(beforeRefresh);
            expect(lastSeenAt).toBeLessThanOrEqual(afterRefresh);
        });

        it('should not call Gemini API for expired listings', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: true,
                status: 404,
            });

            await refreshSingleListing(baseListing);

            expect(mockRefreshWithGemini).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should mark failure for non-200 status codes', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 500,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(false);
            expect(result.listing.lastRefreshStatus).toBe('error');
            expect(result.listing.lastRefreshError).toContain('HTTP 500');
        });

        it('should handle 403 forbidden errors', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 403,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(false);
            expect(result.error).toContain('403');
        });

        it('should handle network errors (status 0) as login required', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 0,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(false);
            expect(result.listing.lastRefreshStatus).toBe('error');
            expect(result.listing.lastRefreshError).toContain('Login required');
            expect(result.listing.lastRefreshError).toContain('Login required');
        });

        it('should handle 520 Cloudflare error as login required', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 520,
            });
            const result = await refreshSingleListing(baseListing);
            expect(result.success).toBe(false);
            expect(result.listing.lastRefreshStatus).toBe('error');
            expect(result.listing.lastRefreshError).toContain('Login required');
            expect(result.error).toContain('Login required');
        });
        it('should handle CORS/fetch errors', async () => {
            const fetchError = new MockFetchError('CORS blocked', true);
            mockFetchListingPage.mockRejectedValue(fetchError);

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Login required');
        });

        it('should flag rate limited errors', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'content',
                pageTitle: 'title',
            });

            const rateLimitError = new MockRateLimitError('Rate limit exceeded');
            mockRefreshWithGemini.mockRejectedValue(rateLimitError);

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(false);
            expect(result.rateLimited).toBe(true);
        });

        it('should not preserve original values on fetch error', async () => {
            mockFetchListingPage.mockRejectedValue(new Error('Network error'));

            const result = await refreshSingleListing(baseListing);

            expect(result.success).toBe(false);
            expect(result.listing.currentPrice).toBe(baseListing.currentPrice); // Should still have original price
            expect(result.listing.status).toBe(baseListing.status); // Should still have original status
        });
    });

    describe('status transitions', () => {
        it('should change status from ACTIVE to ENDED when listing is sold', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'SOLD',
                pageTitle: 'BMW - Sold',
            });

            mockRefreshWithGemini.mockResolvedValue({
                price: 145000,
                currency: 'PLN',
                status: ListingStatus.ENDED,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.listing.status).toBe(ListingStatus.ENDED);
        });

        it('should preserve currency from AI response', async () => {
            mockFetchListingPage.mockResolvedValue({
                expired: false,
                status: 200,
                textContent: 'EUR listing',
                pageTitle: 'title',
            });

            mockRefreshWithGemini.mockResolvedValue({
                price: 35000,
                currency: 'EUR',
                status: ListingStatus.ACTIVE,
            });

            const result = await refreshSingleListing(baseListing);

            expect(result.listing.currency).toBe('EUR');
        });
    });
});
