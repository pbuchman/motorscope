/**
 * Tests for Refresh Status Service
 *
 * This tests the actual functions that interact with storage,
 * not just the default constants.
 */

// Mock the storage helpers
jest.mock('../storageHelpers', () => ({
    getWithDefault: jest.fn(),
    setStorage: jest.fn(),
}));

jest.mock('../storageKeys', () => ({
    STORAGE_KEYS: {
        refreshStatus: 'motorscope_refresh_status',
    },
}));

import {DEFAULT_REFRESH_STATUS, getRefreshStatus, saveRefreshStatus, updateRefreshStatus} from '../refreshStatus';
import {getWithDefault, setStorage} from '../storageHelpers';
import {STORAGE_KEYS} from '../storageKeys';
import {RefreshStatus} from '@/types';

const mockGetWithDefault = getWithDefault as jest.MockedFunction<typeof getWithDefault>;
const mockSetStorage = setStorage as jest.MockedFunction<typeof setStorage>;

describe('Refresh Status Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('DEFAULT_REFRESH_STATUS', () => {
        it('should have all required fields', () => {
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('lastRefreshTime');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('nextRefreshTime');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('lastRefreshCount');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('isRefreshing');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('currentIndex');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('totalCount');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('currentListingTitle');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('pendingItems');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('recentlyRefreshed');
            expect(DEFAULT_REFRESH_STATUS).toHaveProperty('refreshErrors');
        });

        it('should have safe default values', () => {
            expect(DEFAULT_REFRESH_STATUS.isRefreshing).toBe(false);
            expect(DEFAULT_REFRESH_STATUS.lastRefreshCount).toBe(0);
            expect(DEFAULT_REFRESH_STATUS.currentIndex).toBe(0);
            expect(DEFAULT_REFRESH_STATUS.totalCount).toBe(0);
            expect(Array.isArray(DEFAULT_REFRESH_STATUS.pendingItems)).toBe(true);
            expect(Array.isArray(DEFAULT_REFRESH_STATUS.recentlyRefreshed)).toBe(true);
            expect(Array.isArray(DEFAULT_REFRESH_STATUS.refreshErrors)).toBe(true);
        });
    });

    describe('getRefreshStatus', () => {
        it('should call getWithDefault with correct key and default', async () => {
            mockGetWithDefault.mockResolvedValue(DEFAULT_REFRESH_STATUS);

            await getRefreshStatus();

            expect(mockGetWithDefault).toHaveBeenCalledWith(
                STORAGE_KEYS.refreshStatus,
                DEFAULT_REFRESH_STATUS,
            );
        });

        it('should return stored status when available', async () => {
            const storedStatus: RefreshStatus = {
                ...DEFAULT_REFRESH_STATUS,
                isRefreshing: true,
                currentIndex: 5,
                totalCount: 10,
                lastRefreshTime: '2024-12-09T10:00:00Z',
            };
            mockGetWithDefault.mockResolvedValue(storedStatus);

            const result = await getRefreshStatus();

            expect(result).toEqual(storedStatus);
            expect(result.isRefreshing).toBe(true);
            expect(result.currentIndex).toBe(5);
        });

        it('should return default status when storage is empty', async () => {
            mockGetWithDefault.mockResolvedValue(DEFAULT_REFRESH_STATUS);

            const result = await getRefreshStatus();

            expect(result).toEqual(DEFAULT_REFRESH_STATUS);
        });
    });

    describe('saveRefreshStatus', () => {
        it('should save status to storage with correct key', async () => {
            mockSetStorage.mockResolvedValue(undefined);
            const status: RefreshStatus = {
                ...DEFAULT_REFRESH_STATUS,
                isRefreshing: true,
                totalCount: 5,
            };

            await saveRefreshStatus(status);

            expect(mockSetStorage).toHaveBeenCalledWith(STORAGE_KEYS.refreshStatus, status);
        });

        it('should handle full status object', async () => {
            mockSetStorage.mockResolvedValue(undefined);
            const fullStatus: RefreshStatus = {
                lastRefreshTime: '2024-12-09T10:00:00Z',
                nextRefreshTime: '2024-12-09T11:00:00Z',
                lastRefreshCount: 15,
                isRefreshing: false,
                currentIndex: 0,
                totalCount: 0,
                currentListingTitle: 'BMW 320d',
                pendingItems: [
                    {id: 'item1', title: 'BMW 320d', url: 'https://example.com/1', status: 'pending'},
                    {id: 'item2', title: 'Audi A4', url: 'https://example.com/2', status: 'pending'},
                ],
                recentlyRefreshed: [
                    {
                        id: 'id1',
                        title: 'Mercedes C200',
                        url: 'https://example.com/3',
                        status: 'success',
                        timestamp: '2024-12-09T09:00:00Z',
                    },
                    {
                        id: 'id2',
                        title: 'VW Golf',
                        url: 'https://example.com/4',
                        status: 'success',
                        timestamp: '2024-12-09T09:01:00Z',
                    },
                    {
                        id: 'id3',
                        title: 'Ford Focus',
                        url: 'https://example.com/5',
                        status: 'error',
                        timestamp: '2024-12-09T09:02:00Z',
                        error: 'Network error',
                    },
                ],
                refreshErrors: [
                    {
                        id: 'err1',
                        title: 'Ford Focus',
                        url: 'https://example.com/5',
                        error: 'Network error',
                        timestamp: '2024-12-09T09:02:00Z',
                    },
                ],
            };

            await saveRefreshStatus(fullStatus);

            expect(mockSetStorage).toHaveBeenCalledWith(STORAGE_KEYS.refreshStatus, fullStatus);
        });

        it('should propagate storage errors', async () => {
            mockSetStorage.mockRejectedValue(new Error('Storage error'));

            await expect(saveRefreshStatus(DEFAULT_REFRESH_STATUS)).rejects.toThrow('Storage error');
        });
    });

    describe('updateRefreshStatus', () => {
        it('should merge partial update with existing status', async () => {
            const existingStatus: RefreshStatus = {
                ...DEFAULT_REFRESH_STATUS,
                lastRefreshTime: '2024-12-09T08:00:00Z',
                lastRefreshCount: 10,
                isRefreshing: false,
            };
            mockGetWithDefault.mockResolvedValue(existingStatus);
            mockSetStorage.mockResolvedValue(undefined);

            await updateRefreshStatus({isRefreshing: true, totalCount: 20});

            expect(mockSetStorage).toHaveBeenCalledWith(STORAGE_KEYS.refreshStatus, {
                ...existingStatus,
                isRefreshing: true,
                totalCount: 20,
            });
        });

        it('should preserve fields not included in update', async () => {
            const existingStatus: RefreshStatus = {
                ...DEFAULT_REFRESH_STATUS,
                lastRefreshTime: '2024-12-09T08:00:00Z',
                recentlyRefreshed: [
                    {
                        id: 'id1',
                        title: 'BMW 320d',
                        url: 'https://example.com/1',
                        status: 'success',
                        timestamp: '2024-12-09T08:00:00Z',
                    },
                    {
                        id: 'id2',
                        title: 'Audi A4',
                        url: 'https://example.com/2',
                        status: 'success',
                        timestamp: '2024-12-09T08:01:00Z',
                    },
                ],
            };
            mockGetWithDefault.mockResolvedValue(existingStatus);
            mockSetStorage.mockResolvedValue(undefined);

            await updateRefreshStatus({currentIndex: 5});

            const savedStatus = mockSetStorage.mock.calls[0][1] as RefreshStatus;
            expect(savedStatus.lastRefreshTime).toBe('2024-12-09T08:00:00Z');
            expect(savedStatus.recentlyRefreshed).toHaveLength(2);
            expect(savedStatus.currentIndex).toBe(5);
        });

        it('should handle empty update (no-op effectively)', async () => {
            const existingStatus: RefreshStatus = {...DEFAULT_REFRESH_STATUS};
            mockGetWithDefault.mockResolvedValue(existingStatus);
            mockSetStorage.mockResolvedValue(undefined);

            await updateRefreshStatus({});

            expect(mockSetStorage).toHaveBeenCalledWith(STORAGE_KEYS.refreshStatus, existingStatus);
        });

        it('should allow updating arrays', async () => {
            mockGetWithDefault.mockResolvedValue(DEFAULT_REFRESH_STATUS);
            mockSetStorage.mockResolvedValue(undefined);

            const newErrors = [
                {
                    id: 'err1',
                    title: 'BMW 320d',
                    url: 'https://example.com/1',
                    error: 'Network error',
                    timestamp: '2024-12-09T10:00:00Z',
                },
                {
                    id: 'err2',
                    title: 'Audi A4',
                    url: 'https://example.com/2',
                    error: 'Rate limited',
                    timestamp: '2024-12-09T10:01:00Z',
                },
            ];

            await updateRefreshStatus({refreshErrors: newErrors});

            const savedStatus = mockSetStorage.mock.calls[0][1] as RefreshStatus;
            expect(savedStatus.refreshErrors).toEqual(newErrors);
        });

        it('should allow setting null for time fields', async () => {
            const existingStatus: RefreshStatus = {
                ...DEFAULT_REFRESH_STATUS,
                lastRefreshTime: '2024-12-09T08:00:00Z',
                nextRefreshTime: '2024-12-09T09:00:00Z',
            };
            mockGetWithDefault.mockResolvedValue(existingStatus);
            mockSetStorage.mockResolvedValue(undefined);

            await updateRefreshStatus({lastRefreshTime: null, nextRefreshTime: null});

            const savedStatus = mockSetStorage.mock.calls[0][1] as RefreshStatus;
            expect(savedStatus.lastRefreshTime).toBeNull();
            expect(savedStatus.nextRefreshTime).toBeNull();
        });
    });
});

