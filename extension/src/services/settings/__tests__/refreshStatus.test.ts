/**
 * Tests for Refresh Status Service
 */

import {DEFAULT_REFRESH_STATUS} from '../refreshStatus';

describe('Refresh Status', () => {
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

        it('should have null for time fields by default', () => {
            expect(DEFAULT_REFRESH_STATUS.lastRefreshTime).toBeNull();
            expect(DEFAULT_REFRESH_STATUS.nextRefreshTime).toBeNull();
            expect(DEFAULT_REFRESH_STATUS.currentListingTitle).toBeNull();
        });

        it('should have zero counters by default', () => {
            expect(DEFAULT_REFRESH_STATUS.lastRefreshCount).toBe(0);
            expect(DEFAULT_REFRESH_STATUS.currentIndex).toBe(0);
            expect(DEFAULT_REFRESH_STATUS.totalCount).toBe(0);
        });

        it('should not be refreshing by default', () => {
            expect(DEFAULT_REFRESH_STATUS.isRefreshing).toBe(false);
        });

        it('should have empty arrays by default', () => {
            expect(DEFAULT_REFRESH_STATUS.pendingItems).toEqual([]);
            expect(DEFAULT_REFRESH_STATUS.recentlyRefreshed).toEqual([]);
            expect(DEFAULT_REFRESH_STATUS.refreshErrors).toEqual([]);
        });
    });
});

