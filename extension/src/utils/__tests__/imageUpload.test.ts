/**
 * Image Upload Utility Tests
 */

import {CarListing, ListingStatus} from '@/types';
import * as apiClient from '@/api/client';
import * as localServerStorage from '@/auth/localServerStorage';
import {uploadListingThumbnail, isApiImageUrl, isExternalImageUrl} from '../imageUpload';

// Mock dependencies
jest.mock('@/api/client');
jest.mock('@/auth/localServerStorage');

const mockUploadImageFromUrl = apiClient.uploadImageFromUrl as jest.MockedFunction<typeof apiClient.uploadImageFromUrl>;
const mockGetBackendServerUrl = localServerStorage.getBackendServerUrl as jest.MockedFunction<typeof localServerStorage.getBackendServerUrl>;

describe('imageUpload utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetBackendServerUrl.mockResolvedValue('https://api.example.com');
    });

    describe('uploadListingThumbnail', () => {
        const mockListing: CarListing = {
            id: 'vin_ABC123',
            schemaVersion: '1.0.0',
            source: {
                platform: 'otomoto.pl',
                url: 'https://otomoto.pl/listing/123',
                listingId: '123',
                countryCode: 'PL',
            },
            title: 'Test Car',
            thumbnailUrl: 'https://external.com/image.jpg',
            currentPrice: 50000,
            currency: 'PLN',
            priceHistory: [],
            originalPrice: null,
            negotiable: null,
            vehicle: {
                vin: 'ABC123',
                make: 'Test',
                model: 'Car',
                generation: null,
                trim: null,
                bodyType: null,
                productionYear: 2020,
                firstRegistrationYear: null,
                mileage: {value: 10000, unit: 'km'},
                engine: {
                    capacityCc: null,
                    fuelType: null,
                    powerKw: null,
                    powerHp: null,
                    engineCode: null,
                    euroStandard: null,
                    hybridType: null,
                },
                drivetrain: {
                    transmissionType: null,
                    transmissionSubtype: null,
                    gearsCount: null,
                    driveType: null,
                },
                condition: {
                    isNew: null,
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
            location: {city: null, region: null, postalCode: null, countryCode: 'PL'},
            seller: {type: null, name: null, phone: null, isCompany: null},
            status: ListingStatus.ACTIVE,
            postedDate: null,
            firstSeenAt: '2024-01-01T00:00:00.000Z',
            lastSeenAt: '2024-01-01T00:00:00.000Z',
        };

        it('should upload external thumbnail and update listing', async () => {
            mockUploadImageFromUrl.mockResolvedValue({
                url: '/api/images/user123/vin_ABC123/12345.jpg',
                path: 'images/user123/vin_ABC123/12345.jpg',
            });

            const result = await uploadListingThumbnail(mockListing);

            expect(mockUploadImageFromUrl).toHaveBeenCalledWith(
                'https://external.com/image.jpg',
                'vin_ABC123'
            );
            expect(result.thumbnailUrl).toBe('https://api.example.com/api/images/user123/vin_ABC123/12345.jpg');
        });

        it('should skip upload for API image URLs', async () => {
            const listingWithApiImage = {
                ...mockListing,
                thumbnailUrl: '/api/images/user123/vin_ABC123/12345.jpg',
            };

            const result = await uploadListingThumbnail(listingWithApiImage);

            expect(mockUploadImageFromUrl).not.toHaveBeenCalled();
            expect(result.thumbnailUrl).toBe('/api/images/user123/vin_ABC123/12345.jpg');
        });

        it('should skip upload for placeholder images', async () => {
            const listingWithPlaceholder = {
                ...mockListing,
                thumbnailUrl: 'https://placehold.co/600x400?text=No+Image',
            };

            const result = await uploadListingThumbnail(listingWithPlaceholder);

            expect(mockUploadImageFromUrl).not.toHaveBeenCalled();
            expect(result.thumbnailUrl).toBe('https://placehold.co/600x400?text=No+Image');
        });

        it('should return original listing if upload fails', async () => {
            mockUploadImageFromUrl.mockRejectedValue(new Error('Upload failed'));

            const result = await uploadListingThumbnail(mockListing);

            expect(result.thumbnailUrl).toBe('https://external.com/image.jpg');
        });
    });

    describe('isApiImageUrl', () => {
        it('should return true for API image URLs', () => {
            expect(isApiImageUrl('/api/images/user123/vin_ABC/12345.jpg')).toBe(true);
            expect(isApiImageUrl('https://api.example.com/api/images/user123/vin_ABC/12345.jpg')).toBe(true);
        });

        it('should return false for external URLs', () => {
            expect(isApiImageUrl('https://external.com/image.jpg')).toBe(false);
            expect(isApiImageUrl('https://placehold.co/600x400')).toBe(false);
        });
    });

    describe('isExternalImageUrl', () => {
        it('should return true for external image URLs', () => {
            expect(isExternalImageUrl('https://external.com/image.jpg')).toBe(true);
            expect(isExternalImageUrl('http://example.com/photo.png')).toBe(true);
        });

        it('should return false for API image URLs', () => {
            expect(isExternalImageUrl('/api/images/user123/vin_ABC/12345.jpg')).toBe(false);
            expect(isExternalImageUrl('https://api.example.com/api/images/user123/vin_ABC/12345.jpg')).toBe(false);
        });

        it('should return false for placeholders', () => {
            expect(isExternalImageUrl('https://placehold.co/600x400')).toBe(false);
        });

        it('should return false for non-HTTP URLs', () => {
            expect(isExternalImageUrl('/local/image.jpg')).toBe(false);
        });
    });
});
