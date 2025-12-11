/**
 * Tests for Database Module
 *
 * Tests Firestore operations with mocked Firestore client.
 */

import {beforeEach, describe, expect, it, jest} from '@jest/globals';

// Create mock Firestore before importing db module
const mockDocGet = jest.fn<() => Promise<any>>();
const mockDocSet = jest.fn<() => Promise<any>>();
const mockDocUpdate = jest.fn<() => Promise<any>>();
const mockDocDelete = jest.fn<() => Promise<any>>();
const mockDoc = jest.fn(() => ({
    get: mockDocGet,
    set: mockDocSet,
    update: mockDocUpdate,
    delete: mockDocDelete,
}));

const mockWhere = jest.fn<() => any>();
const mockOrderBy = jest.fn<() => any>();
const mockLimit = jest.fn<() => any>();
const mockQueryGet = jest.fn<() => Promise<any>>();

const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    where: mockWhere,
}));

const mockBatchSet = jest.fn<() => void>();
const mockBatchDelete = jest.fn<() => void>();
const mockBatchCommit = jest.fn<() => Promise<any>>();
const mockBatch = jest.fn(() => ({
    set: mockBatchSet,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
}));

const mockListCollections = jest.fn<() => Promise<any>>();

jest.unstable_mockModule('@google-cloud/firestore', () => ({
    Firestore: jest.fn(() => ({
        collection: mockCollection,
        batch: mockBatch,
        listCollections: mockListCollections,
    })),
    Timestamp: {
        now: jest.fn(() => ({toDate: () => new Date()})),
        fromDate: jest.fn((date: Date) => ({toDate: () => date})),
    },
}));

// Import db module after mocking
const dbModule = await import('../db.js');

const {
    getUserById,
    upsertUser,
    getListingsByUserId,
    getListingById,
    saveListing,
    saveAllListings,
    deleteListing,
    checkFirestoreHealth,
    getUserSettings,
    saveUserSettings,
    getGeminiHistory,
    addGeminiHistoryEntry,
    addGeminiHistoryEntries,
    clearGeminiHistory,
    blacklistToken,
    isTokenBlacklisted,
    cleanupExpiredBlacklistedTokens,
} = dbModule;

describe('Database Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset chain mocks
        mockWhere.mockReturnValue({
            get: mockQueryGet,
            where: mockWhere,
            orderBy: mockOrderBy,
            limit: mockLimit,
        });
        mockOrderBy.mockReturnValue({
            get: mockQueryGet,
            limit: mockLimit,
        });
        mockLimit.mockReturnValue({
            get: mockQueryGet,
        });
        mockBatchCommit.mockResolvedValue(undefined);
    });

    // ==========================================================================
    // User Operations
    // ==========================================================================
    describe('getUserById', () => {
        it('should return user when exists', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                displayName: 'Test User',
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLoginAt: '2024-01-01T00:00:00.000Z',
            };
            mockDocGet.mockResolvedValue({
                exists: true,
                data: () => mockUser,
            });

            const user = await getUserById('user-123');

            expect(user).toEqual(mockUser);
            expect(mockDoc).toHaveBeenCalledWith('user-123');
        });

        it('should return null when user does not exist', async () => {
            mockDocGet.mockResolvedValue({
                exists: false,
            });

            const user = await getUserById('non-existent');

            expect(user).toBeNull();
        });
    });

    describe('upsertUser', () => {
        it('should create new user when not exists', async () => {
            const newUser = {
                id: 'new-user',
                email: 'new@example.com',
                displayName: 'New User',
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLoginAt: '2024-01-01T00:00:00.000Z',
            };
            mockDocGet.mockResolvedValue({
                exists: false,
            });
            mockDocSet.mockResolvedValue(undefined);

            const result = await upsertUser(newUser);

            expect(result).toEqual(newUser);
            expect(mockDocSet).toHaveBeenCalledWith(newUser);
        });

        it('should update existing user', async () => {
            const existingUser = {
                id: 'existing-user',
                email: 'existing@example.com',
                displayName: 'Existing User',
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLoginAt: '2024-01-01T00:00:00.000Z',
            };
            const updatedUser = {
                ...existingUser,
                lastLoginAt: '2024-01-02T00:00:00.000Z',
            };

            mockDocGet
                .mockResolvedValueOnce({exists: true, data: () => existingUser})
                .mockResolvedValueOnce({exists: true, data: () => updatedUser});
            mockDocUpdate.mockResolvedValue(undefined);

            const result = await upsertUser(updatedUser);

            expect(mockDocUpdate).toHaveBeenCalled();
            expect(result).toEqual(updatedUser);
        });
    });

    // ==========================================================================
    // Listing Operations
    // ==========================================================================
    describe('getListingsByUserId', () => {
        it('should return listings for user', async () => {
            const mockListings = [
                {id: 'listing-1', title: 'BMW 320d', userId: 'user-123'},
                {id: 'listing-2', title: 'Audi A4', userId: 'user-123'},
            ];
            mockQueryGet.mockResolvedValue({
                forEach: (callback: Function) => {
                    mockListings.forEach((listing, index) => {
                        callback({data: () => listing, id: `doc-${index}`});
                    });
                },
            });

            const listings = await getListingsByUserId('user-123');

            expect(listings).toHaveLength(2);
            expect(listings[0].title).toBe('BMW 320d');
            expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-123');
        });

        it('should return empty array when no listings', async () => {
            mockQueryGet.mockResolvedValue({
                forEach: () => {
                },
            });

            const listings = await getListingsByUserId('user-no-listings');

            expect(listings).toEqual([]);
        });
    });

    describe('getListingById', () => {
        it('should return listing when exists and owned by user', async () => {
            const mockListing = {
                id: 'listing-1',
                title: 'BMW 320d',
                userId: 'user-123',
            };
            mockDocGet.mockResolvedValue({
                exists: true,
                data: () => mockListing,
                id: 'listing-1',
            });

            const listing = await getListingById('listing-1', 'user-123');

            expect(listing?.title).toBe('BMW 320d');
        });

        it('should return null when listing does not exist', async () => {
            mockDocGet.mockResolvedValue({
                exists: false,
            });

            const listing = await getListingById('non-existent', 'user-123');

            expect(listing).toBeNull();
        });

        it('should return null when listing not owned by user', async () => {
            const mockListing = {
                id: 'listing-1',
                title: 'BMW 320d',
                userId: 'other-user',
            };
            mockDocGet.mockResolvedValue({
                exists: true,
                data: () => mockListing,
            });

            const listing = await getListingById('listing-1', 'user-123');

            expect(listing).toBeNull();
        });
    });

    describe('saveListing', () => {
        it('should save listing with userId', async () => {
            const listing = {
                id: 'listing-1',
                title: 'BMW 320d',
                currentPrice: 50000,
            };
            mockDocSet.mockResolvedValue(undefined);

            const result = await saveListing(listing as any, 'user-123');

            expect(result.userId).toBe('user-123');
            expect(mockDocSet).toHaveBeenCalled();
        });
    });

    describe('saveAllListings', () => {
        it('should batch save listings', async () => {
            const listings = [
                {id: 'listing-1', title: 'BMW 320d'},
                {id: 'listing-2', title: 'Audi A4'},
            ];
            mockQueryGet.mockResolvedValue({
                forEach: () => {
                },
                map: () => [],
            });

            const result = await saveAllListings(listings as any[], 'user-123');

            expect(result).toHaveLength(2);
            expect(mockBatchSet).toHaveBeenCalledTimes(2);
            expect(mockBatchCommit).toHaveBeenCalled();
        });

        it('should delete old listings not in new list', async () => {
            const existingListings = [
                {id: 'old-listing', title: 'Old Car', userId: 'user-123'},
            ];
            const newListings = [
                {id: 'new-listing', title: 'New Car'},
            ];
            mockQueryGet.mockResolvedValue({
                forEach: (callback: Function) => {
                    existingListings.forEach(listing => {
                        callback({data: () => listing, id: listing.id});
                    });
                },
            });

            await saveAllListings(newListings as any[], 'user-123');

            expect(mockBatchDelete).toHaveBeenCalled();
        });
    });

    describe('deleteListing', () => {
        it('should delete listing when owned by user', async () => {
            const mockListing = {
                id: 'listing-1',
                title: 'BMW 320d',
                userId: 'user-123',
            };
            mockDocGet.mockResolvedValue({
                exists: true,
                data: () => mockListing,
                id: 'listing-1',
            });
            mockDocDelete.mockResolvedValue(undefined);

            const result = await deleteListing('listing-1', 'user-123');

            expect(result).toBe(true);
            expect(mockDocDelete).toHaveBeenCalled();
        });

        it('should return false when listing not found', async () => {
            mockDocGet.mockResolvedValue({
                exists: false,
            });

            const result = await deleteListing('non-existent', 'user-123');

            expect(result).toBe(false);
        });
    });

    // ==========================================================================
    // Health Check
    // ==========================================================================
    describe('checkFirestoreHealth', () => {
        it('should return true when Firestore is connected', async () => {
            mockListCollections.mockResolvedValue([]);

            const result = await checkFirestoreHealth();

            expect(result).toBe(true);
        });

        it('should return false when Firestore is disconnected', async () => {
            mockListCollections.mockRejectedValue(new Error('Connection failed'));

            const result = await checkFirestoreHealth();

            expect(result).toBe(false);
        });
    });

    // ==========================================================================
    // Settings Operations
    // ==========================================================================
    describe('getUserSettings', () => {
        it('should return settings when exists', async () => {
            const mockSettings = {
                userId: 'user-123',
                geminiApiKey: 'api-key',
                checkFrequencyMinutes: 60,
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            mockDocGet.mockResolvedValue({
                exists: true,
                data: () => mockSettings,
            });

            const settings = await getUserSettings('user-123');

            expect(settings.geminiApiKey).toBe('api-key');
        });

        it('should return default settings when not exists', async () => {
            mockDocGet.mockResolvedValue({
                exists: false,
            });

            const settings = await getUserSettings('user-123');

            expect(settings.userId).toBe('user-123');
            expect(settings.geminiApiKey).toBe('');
            expect(settings.checkFrequencyMinutes).toBe(60);
        });
    });

    describe('saveUserSettings', () => {
        it('should save updated settings', async () => {
            const existingSettings = {
                userId: 'user-123',
                geminiApiKey: 'old-key',
                checkFrequencyMinutes: 60,
                updatedAt: '2024-01-01T00:00:00.000Z',
            };
            mockDocGet.mockResolvedValue({
                exists: true,
                data: () => existingSettings,
            });
            mockDocSet.mockResolvedValue(undefined);

            const result = await saveUserSettings('user-123', {
                checkFrequencyMinutes: 120,
            });

            expect(result.checkFrequencyMinutes).toBe(120);
            expect(mockDocSet).toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // Gemini History Operations
    // ==========================================================================
    describe('getGeminiHistory', () => {
        it('should return history entries', async () => {
            const mockHistory = [
                {id: 'entry-1', url: 'http://example.com', userId: 'user-123', status: 'success'},
            ];
            mockQueryGet.mockResolvedValue({
                forEach: (callback: Function) => {
                    mockHistory.forEach(entry => {
                        callback({data: () => entry});
                    });
                },
            });

            const history = await getGeminiHistory('user-123', 100);

            expect(history).toHaveLength(1);
            expect(history[0].status).toBe('success');
            // userId should be removed
            expect((history[0] as any).userId).toBeUndefined();
        });
    });

    describe('addGeminiHistoryEntry', () => {
        it('should add single history entry', async () => {
            const entry = {
                id: 'entry-1',
                url: 'http://example.com',
                promptPreview: 'test',
                status: 'success' as const,
                timestamp: '2024-01-01T00:00:00.000Z',
            };
            mockDocSet.mockResolvedValue(undefined);

            const result = await addGeminiHistoryEntry(entry, 'user-123');

            expect(result.userId).toBe('user-123');
            expect(mockDocSet).toHaveBeenCalled();
        });
    });

    describe('addGeminiHistoryEntries', () => {
        it('should batch add entries', async () => {
            const entries = [
                {
                    id: 'entry-1',
                    url: 'http://example.com',
                    promptPreview: 'test',
                    status: 'success' as const,
                    timestamp: '2024-01-01'
                },
                {
                    id: 'entry-2',
                    url: 'http://example.com/2',
                    promptPreview: 'test2',
                    status: 'error' as const,
                    timestamp: '2024-01-02'
                },
            ];

            await addGeminiHistoryEntries(entries, 'user-123');

            expect(mockBatchSet).toHaveBeenCalledTimes(2);
            expect(mockBatchCommit).toHaveBeenCalled();
        });

        it('should handle empty entries array', async () => {
            await addGeminiHistoryEntries([], 'user-123');

            expect(mockBatchSet).not.toHaveBeenCalled();
        });
    });

    describe('clearGeminiHistory', () => {
        it('should delete all history entries', async () => {
            const mockEntries = [
                {ref: {id: 'entry-1'}},
                {ref: {id: 'entry-2'}},
            ];
            mockQueryGet.mockResolvedValue({
                empty: false,
                size: 2,
                forEach: (callback: Function) => {
                    mockEntries.forEach(entry => callback(entry));
                },
            });

            const count = await clearGeminiHistory('user-123');

            expect(count).toBe(2);
            expect(mockBatchDelete).toHaveBeenCalledTimes(2);
        });

        it('should return 0 when no entries', async () => {
            mockQueryGet.mockResolvedValue({
                empty: true,
                size: 0,
            });

            const count = await clearGeminiHistory('user-123');

            expect(count).toBe(0);
        });
    });

    // ==========================================================================
    // Token Blacklist Operations
    // ==========================================================================
    describe('blacklistToken', () => {
        it('should add token to blacklist', async () => {
            mockDocSet.mockResolvedValue(undefined);

            await blacklistToken('token-jti', 'user-123', new Date('2024-01-02'));

            expect(mockDocSet).toHaveBeenCalled();
        });
    });

    describe('isTokenBlacklisted', () => {
        it('should return true when token is blacklisted', async () => {
            mockDocGet.mockResolvedValue({
                exists: true,
            });

            const result = await isTokenBlacklisted('blacklisted-token');

            expect(result).toBe(true);
        });

        it('should return false when token is not blacklisted', async () => {
            mockDocGet.mockResolvedValue({
                exists: false,
            });

            const result = await isTokenBlacklisted('valid-token');

            expect(result).toBe(false);
        });
    });

    describe('cleanupExpiredBlacklistedTokens', () => {
        it('should delete expired tokens', async () => {
            const expiredTokens = [
                {ref: {id: 'expired-1'}},
                {ref: {id: 'expired-2'}},
            ];
            mockQueryGet.mockResolvedValue({
                empty: false,
                size: 2,
                forEach: (callback: Function) => {
                    expiredTokens.forEach(token => callback(token));
                },
            });

            const count = await cleanupExpiredBlacklistedTokens();

            expect(count).toBe(2);
            expect(mockBatchDelete).toHaveBeenCalledTimes(2);
        });

        it('should return 0 when no expired tokens', async () => {
            mockQueryGet.mockResolvedValue({
                empty: true,
                size: 0,
            });

            const count = await cleanupExpiredBlacklistedTokens();

            expect(count).toBe(0);
        });
    });
});
