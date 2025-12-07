/**
 * Refresh Status Service
 *
 * Manages background sync status tracking for the extension.
 * Tracks progress, pending items, and recent activity.
 */

import { RefreshStatus } from '../../types';
import { STORAGE_KEYS } from './storageKeys';
import { getWithDefault, setStorage } from './storageHelpers';

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_REFRESH_STATUS: RefreshStatus = {
  lastRefreshTime: null,
  nextRefreshTime: null,
  lastRefreshCount: 0,
  isRefreshing: false,
  currentIndex: 0,
  totalCount: 0,
  currentListingTitle: null,
  pendingItems: [],
  recentlyRefreshed: [],
  refreshErrors: [],
};

// ============================================================================
// Operations
// ============================================================================

export async function getRefreshStatus(): Promise<RefreshStatus> {
  return getWithDefault(STORAGE_KEYS.refreshStatus, DEFAULT_REFRESH_STATUS);
}

export async function saveRefreshStatus(status: RefreshStatus): Promise<void> {
  await setStorage(STORAGE_KEYS.refreshStatus, status);
}

/** Update specific fields of refresh status (partial update) */
export async function updateRefreshStatus(update: Partial<RefreshStatus>): Promise<void> {
  const current = await getRefreshStatus();
  await saveRefreshStatus({ ...current, ...update });
}

