/**
 * Storage Service Tests
 *
 * Tests for Google Cloud Storage image operations.
 */

import {beforeEach, describe, expect, it, jest} from '@jest/globals';

// Create proper mocks before importing storage module
const mockSave = jest.fn<any>().mockResolvedValue(undefined);
const mockGetMetadata = jest.fn<any>().mockResolvedValue([{
    contentType: 'image/jpeg',
    size: 12345,
    timeCreated: '2024-01-01T00:00:00.000Z',
}]);
const mockExists = jest.fn<any>().mockResolvedValue([true]);
const mockSetMetadata = jest.fn<any>().mockResolvedValue(undefined);

const mockFile = {
    save: mockSave,
    getMetadata: mockGetMetadata,
    exists: mockExists,
    setMetadata: mockSetMetadata,
};

const mockBucketGetMetadata = jest.fn<any>().mockResolvedValue([{}]);
const mockBucket = jest.fn(() => ({
    file: jest.fn(() => mockFile),
    getMetadata: mockBucketGetMetadata,
})) as jest.Mock;

// Mock @google-cloud/storage module using unstable_mockModule for ES modules
jest.unstable_mockModule('@google-cloud/storage', () => ({
    Storage: jest.fn(() => ({
        bucket: mockBucket,
    })),
}));

// Mock crypto for consistent random IDs in tests
jest.unstable_mockModule('crypto', () => ({
    default: {
        randomBytes: jest.fn(() => ({
            toString: () => 'abc12345',
        })),
    },
}));

// Mock global fetch with proper typing
const mockFetch = jest.fn<typeof global.fetch>();
global.fetch = mockFetch as typeof global.fetch;

// Import the module under test after mocking
const storageModule = await import('../storage.js');

const {
    uploadImage,
    downloadImageFromUrl,
    getImageMetadata,
    scheduleImageDeletion,
    checkStorageHealth,
} = storageModule;

describe('Storage Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('uploadImage', () => {
        it('should upload image to GCS and return public URL and path', async () => {
            const buffer = Buffer.from('test image data');
            const contentType = 'image/jpeg';
            const listingId = 'vin_ABC123';

            const result = await uploadImage(buffer, contentType, listingId);

            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('path');
            expect(result.path).toContain(`listings/${listingId}`);
            expect(result.path).toMatch(/\.jpg$/);
            expect(result.url).toMatch(/^https:\/\/storage\.googleapis\.com\//);
            expect(result.url).toContain(result.path);
            expect(mockSave).toHaveBeenCalledWith(
                buffer,
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        contentType,
                    }),
                    public: true,
                }),
            );
        });

        it('should use correct file extension for different content types', async () => {
            const buffer = Buffer.from('test');
            const listingId = 'vin_ABC';

            const pngResult = await uploadImage(buffer, 'image/png', listingId);
            expect(pngResult.path).toMatch(/\.png$/);

            const webpResult = await uploadImage(buffer, 'image/webp', listingId);
            expect(webpResult.path).toMatch(/\.webp$/);
        });
    });

    describe('downloadImageFromUrl', () => {
        it('should download image from URL', async () => {
            const mockArrayBuffer = new ArrayBuffer(100);
            mockFetch.mockResolvedValue({
                ok: true,
                headers: {
                    get: () => 'image/jpeg',
                },
                arrayBuffer: async () => mockArrayBuffer,
            } as any);

            const result = await downloadImageFromUrl('https://example.com/image.jpg');

            expect(result).toHaveProperty('buffer');
            expect(result).toHaveProperty('contentType');
            expect(result.contentType).toBe('image/jpeg');
            expect(result.buffer).toBeInstanceOf(Buffer);
        });

        it('should throw error for failed download', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                statusText: 'Not Found',
            } as any);

            await expect(downloadImageFromUrl('https://example.com/missing.jpg'))
                .rejects.toThrow('Failed to download image');
        });

        it('should throw error for invalid content type', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                headers: {
                    get: () => 'text/html',
                },
                arrayBuffer: async () => new ArrayBuffer(100),
            } as any);

            await expect(downloadImageFromUrl('https://example.com/page.html'))
                .rejects.toThrow('Invalid content type');
        });

        it('should throw error for images exceeding size limit', async () => {
            const largeBuffer = new ArrayBuffer(11 * 1024 * 1024); // 11MB
            mockFetch.mockResolvedValue({
                ok: true,
                headers: {
                    get: () => 'image/jpeg',
                },
                arrayBuffer: async () => largeBuffer,
            } as any);

            await expect(downloadImageFromUrl('https://example.com/large.jpg'))
                .rejects.toThrow('Image too large');
        });
    });

    describe('getImageMetadata', () => {
        it('should return image metadata with public URL', async () => {
            const filePath = 'listings/vin_ABC/abc12345.jpg';

            const result = await getImageMetadata(filePath);

            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('contentType');
            expect(result).toHaveProperty('size');
            expect(result).toHaveProperty('created');
            expect(result.url).toMatch(/^https:\/\/storage\.googleapis\.com\//);
            expect(result.url).toContain(filePath);
            expect(result.contentType).toBe('image/jpeg');
            expect(result.size).toBe(12345);
            expect(mockGetMetadata).toHaveBeenCalled();
        });
    });

    describe('scheduleImageDeletion', () => {
        it('should schedule image for deletion', async () => {
            mockExists.mockResolvedValueOnce([true]);

            const filePath = 'listings/vin_ABC/abc12345.jpg';
            const result = await scheduleImageDeletion(filePath);

            expect(result).toBe(true);
            expect(mockSetMetadata).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        deletedAt: expect.any(String),
                        scheduledDeletion: expect.any(String),
                    }),
                }),
            );
        });

        it('should return false if image does not exist', async () => {
            mockExists.mockResolvedValueOnce([false]);

            const result = await scheduleImageDeletion('nonexistent.jpg');

            expect(result).toBe(false);
            expect(mockSetMetadata).not.toHaveBeenCalled();
        });
    });

    describe('checkStorageHealth', () => {
        it('should return true when storage is accessible', async () => {
            mockBucketGetMetadata.mockResolvedValueOnce([{}]);

            const result = await checkStorageHealth();
            expect(result).toBe(true);
        });

        it('should return false on error', async () => {
            mockBucketGetMetadata.mockRejectedValueOnce(new Error('Connection failed'));

            const result = await checkStorageHealth();
            expect(result).toBe(false);
        });
    });
});
