/**
 * Tests for Listing Sorter
 */

import {
    filterListingsForRefresh,
    shouldExcludeEndedListing,
    sortListingsByRefreshPriority,
} from '../sorter';
import {CarListing, ListingStatus} from '@/types';

// Helper to create a minimal listing for testing
const createListing = (overrides: Partial<CarListing> = {}): CarListing => ({
    id: `listing_${Math.random().toString(36).substring(7)}`,
    schemaVersion: '1.0.0',
    source: {
        platform: 'otomoto.pl',
        url: 'https://otomoto.pl/test',
        listingId: 'test123',
        countryCode: 'PL',
    },
    title: 'Test Car',
    thumbnailUrl: 'https://example.com/image.jpg',
    currentPrice: 100000,
    currency: 'PLN',
    originalPrice: null,
    negotiable: null,
    priceHistory: [],
    vehicle: {
        vin: null,
        make: 'BMW',
        model: '320d',
        generation: null,
        trim: null,
        bodyType: null,
        productionYear: 2020,
        firstRegistrationYear: null,
        mileage: {value: 50000, unit: 'km'},
        engine: {
            capacityCc: null,
            fuelType: 'Diesel',
            powerKw: null,
            powerHp: 190,
            engineCode: null,
            euroStandard: null,
            hybridType: null,
        },
        drivetrain: {
            transmissionType: 'Automatic',
            transmissionSubtype: null,
            gearsCount: null,
            driveType: null,
        },
        condition: {
            isNew: false,
            isImported: null,
            accidentFreeDeclared: null,
            serviceHistoryDeclared: null,
        },
        colorAndInterior: {
            exteriorColor: null,
            interiorColor: null,
            upholsteryType: null,
        },
        registration: {
            plateNumber: null,
            originCountry: null,
            registeredInCountryCode: null,
        },
    },
    location: {
        city: null,
        region: null,
        postalCode: null,
        countryCode: 'PL',
    },
    seller: {
        type: null,
        name: null,
        phone: null,
        isCompany: null,
    },
    status: ListingStatus.ACTIVE,
    statusChangedAt: null,
    postedDate: null,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: undefined,
    lastRefreshStatus: undefined,
    lastRefreshError: undefined,
    isArchived: false,
    ...overrides,
});

describe('Listing Sorter', () => {
    describe('sortListingsByRefreshPriority', () => {
        it('should return empty array for empty input', () => {
            const result = sortListingsByRefreshPriority([]);
            expect(result).toEqual([]);
        });

        it('should return same array for single item', () => {
            const listing = createListing();
            const result = sortListingsByRefreshPriority([listing]);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(listing.id);
        });

        it('should prioritize never-refreshed items first', () => {
            const neverRefreshed = createListing({
                lastSeenAt: undefined,
                lastRefreshStatus: undefined,
            });
            const refreshedSuccess = createListing({
                lastSeenAt: new Date().toISOString(),
                lastRefreshStatus: 'success',
            });

            const result = sortListingsByRefreshPriority([refreshedSuccess, neverRefreshed]);
            expect(result[0].id).toBe(neverRefreshed.id);
            expect(result[1].id).toBe(refreshedSuccess.id);
        });

        it('should prioritize success over error', () => {
            const success = createListing({
                lastSeenAt: new Date().toISOString(),
                lastRefreshStatus: 'success',
            });
            const error = createListing({
                lastSeenAt: new Date().toISOString(),
                lastRefreshStatus: 'error',
            });

            const result = sortListingsByRefreshPriority([error, success]);
            expect(result[0].id).toBe(success.id);
            expect(result[1].id).toBe(error.id);
        });

        it('should sort by lastSeenAt (oldest first) among same status', () => {
            const older = createListing({
                lastSeenAt: '2025-12-01T10:00:00.000Z',
                lastRefreshStatus: 'success',
            });
            const newer = createListing({
                lastSeenAt: '2025-12-09T10:00:00.000Z',
                lastRefreshStatus: 'success',
            });

            const result = sortListingsByRefreshPriority([newer, older]);
            expect(result[0].id).toBe(older.id);
            expect(result[1].id).toBe(newer.id);
        });

        it('should handle complex sorting with mixed statuses', () => {
            const neverRefreshed = createListing({
                id: 'never',
                lastSeenAt: undefined,
                lastRefreshStatus: undefined,
            });
            const oldSuccess = createListing({
                id: 'old_success',
                lastSeenAt: '2025-12-01T10:00:00.000Z',
                lastRefreshStatus: 'success',
            });
            const newSuccess = createListing({
                id: 'new_success',
                lastSeenAt: '2025-12-09T10:00:00.000Z',
                lastRefreshStatus: 'success',
            });
            const error = createListing({
                id: 'error',
                lastSeenAt: '2025-12-05T10:00:00.000Z',
                lastRefreshStatus: 'error',
            });

            const result = sortListingsByRefreshPriority([newSuccess, error, neverRefreshed, oldSuccess]);

            // Order should be: never -> old_success -> new_success -> error
            expect(result.map(l => l.id)).toEqual(['never', 'old_success', 'new_success', 'error']);
        });

        it('should not mutate original array', () => {
            const listings = [
                createListing({lastSeenAt: new Date().toISOString(), lastRefreshStatus: 'success'}),
                createListing({lastSeenAt: undefined, lastRefreshStatus: undefined}),
            ];
            const originalOrder = [...listings.map(l => l.id)];

            sortListingsByRefreshPriority(listings);

            expect(listings.map(l => l.id)).toEqual(originalOrder);
        });

        it('should handle items with only lastSeenAt but no lastRefreshStatus', () => {
            const hasSeenAt = createListing({
                lastSeenAt: new Date().toISOString(),
                lastRefreshStatus: undefined,
            });
            const hasStatus = createListing({
                lastSeenAt: undefined,
                lastRefreshStatus: 'success',
            });

            const result = sortListingsByRefreshPriority([hasStatus, hasSeenAt]);
            // Both should be considered "never refreshed" due to missing one field
            expect(result).toHaveLength(2);
        });
    });

    describe('shouldExcludeEndedListing', () => {
        it('should return false for ACTIVE listings', () => {
            const listing = createListing({status: ListingStatus.ACTIVE});
            expect(shouldExcludeEndedListing(listing)).toBe(false);
        });

        it('should return false for ENDED listing within grace period', () => {
            // statusChangedAt 1 day ago, grace period 3 days
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const listing = createListing({
                status: ListingStatus.ENDED,
                statusChangedAt: oneDayAgo,
            });
            expect(shouldExcludeEndedListing(listing, 3)).toBe(false);
        });

        it('should return true for ENDED listing past grace period', () => {
            // statusChangedAt 5 days ago, grace period 3 days
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const listing = createListing({
                status: ListingStatus.ENDED,
                statusChangedAt: fiveDaysAgo,
            });
            expect(shouldExcludeEndedListing(listing, 3)).toBe(true);
        });

        it('should use lastSeenAt as fallback when statusChangedAt is missing', () => {
            // lastSeenAt 5 days ago, no statusChangedAt, grace period 3 days
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const listing = createListing({
                status: ListingStatus.ENDED,
                statusChangedAt: null,
                lastSeenAt: fiveDaysAgo,
            });
            expect(shouldExcludeEndedListing(listing, 3)).toBe(true);
        });

        it('should use default grace period when not specified', () => {
            // statusChangedAt 5 days ago, default grace period is 3 days
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const listing = createListing({
                status: ListingStatus.ENDED,
                statusChangedAt: fiveDaysAgo,
            });
            // Default is 3 days, so 5 days ago should be excluded
            expect(shouldExcludeEndedListing(listing)).toBe(true);
        });

        it('should respect custom grace period', () => {
            // statusChangedAt 5 days ago, grace period 7 days
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const listing = createListing({
                status: ListingStatus.ENDED,
                statusChangedAt: fiveDaysAgo,
            });
            // 7 day grace period, so 5 days ago should NOT be excluded
            expect(shouldExcludeEndedListing(listing, 7)).toBe(false);
        });
    });

    describe('filterListingsForRefresh', () => {
        it('should keep all ACTIVE listings', () => {
            const listings = [
                createListing({id: 'active-1', status: ListingStatus.ACTIVE}),
                createListing({id: 'active-2', status: ListingStatus.ACTIVE}),
            ];
            const result = filterListingsForRefresh(listings);
            expect(result).toHaveLength(2);
        });

        it('should filter out ENDED listings past grace period', () => {
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const listings = [
                createListing({id: 'active', status: ListingStatus.ACTIVE}),
                createListing({
                    id: 'ended-old',
                    status: ListingStatus.ENDED,
                    statusChangedAt: fiveDaysAgo,
                }),
                createListing({
                    id: 'ended-recent',
                    status: ListingStatus.ENDED,
                    statusChangedAt: oneDayAgo,
                }),
            ];

            const result = filterListingsForRefresh(listings, 3);
            expect(result).toHaveLength(2);
            expect(result.map(l => l.id)).toContain('active');
            expect(result.map(l => l.id)).toContain('ended-recent');
            expect(result.map(l => l.id)).not.toContain('ended-old');
        });

        it('should use default grace period when not specified', () => {
            const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const listings = [
                createListing({
                    id: 'ended-old',
                    status: ListingStatus.ENDED,
                    statusChangedAt: fiveDaysAgo,
                }),
            ];

            const result = filterListingsForRefresh(listings);
            expect(result).toHaveLength(0);
        });
    });
});
