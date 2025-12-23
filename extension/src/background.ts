// Background service worker for MotorScope (ES Module)
import {CarListing, RefreshedListingInfo, RefreshPendingItem, RefreshStatus} from '@/types';
import {extensionStorage} from '@/services/extensionStorage';
import {
    DEFAULT_ENDED_GRACE_PERIOD_DAYS,
    filterListingsForRefresh,
    refreshSingleListing,
    sortListingsByRefreshPriority,
} from '@/services/refresh';
import {STORAGE_KEYS} from '@/services/settings/storageKeys';
import {DEFAULT_REFRESH_STATUS} from '@/services/settings/refreshStatus';
import {getToken, initializeAuth, isTokenExpired, trySilentLogin} from '@/auth/oauthClient';
import {getStoredToken} from '@/auth/storage';
import {API_PREFIX, LISTINGS_ENDPOINT_PATH, SETTINGS_ENDPOINT_PATH} from '@/auth/config';
import {getBackendServerUrl} from '@/auth/localServerStorage';

const CHECK_ALARM_NAME = 'motorscope_check_alarm';
const AUTH_CHECK_ALARM_NAME = 'motorscope_auth_check';
const DEFAULT_FREQUENCY_MINUTES = 60;
const AUTH_CHECK_INTERVAL_MINUTES = 5; // Check auth every 5 minutes
const RATE_LIMIT_RETRY_MINUTES = 5;

// ============ Session Storage Helpers (for runtime state only) ============

const getFromSessionStorage = async <T>(key: string): Promise<T | null> => {
    const result = await extensionStorage.get<T>(key);
    return result ?? null;
};

const setInSessionStorage = async <T>(key: string, value: T): Promise<void> => {
    await extensionStorage.set(key, value);
};

// ============ Settings (from API) ============

interface Settings {
    checkFrequencyMinutes: number;
    geminiApiKey: string;
    endedListingGracePeriodDays: number;
}

const getSettings = async (): Promise<Settings> => {
    const token = await getToken();
    if (!token) {
        return {
            checkFrequencyMinutes: DEFAULT_FREQUENCY_MINUTES,
            geminiApiKey: '',
            endedListingGracePeriodDays: DEFAULT_ENDED_GRACE_PERIOD_DAYS,
        };
    }

    const backendUrl = await getBackendServerUrl();
    const url = `${backendUrl}${API_PREFIX}${SETTINGS_ENDPOINT_PATH}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.warn(`[BG] Settings fetch failed with status: ${response.status}`);
            return {
                checkFrequencyMinutes: DEFAULT_FREQUENCY_MINUTES,
                geminiApiKey: '',
                endedListingGracePeriodDays: DEFAULT_ENDED_GRACE_PERIOD_DAYS,
            };
        }

        const settings = await response.json();
        return {
            checkFrequencyMinutes: settings.checkFrequencyMinutes || DEFAULT_FREQUENCY_MINUTES,
            geminiApiKey: settings.geminiApiKey || '',
            endedListingGracePeriodDays: settings.endedListingGracePeriodDays ?? DEFAULT_ENDED_GRACE_PERIOD_DAYS,
        };
    } catch (error) {
        console.warn('[BG] Failed to fetch settings from API:', error);
        return {
            checkFrequencyMinutes: DEFAULT_FREQUENCY_MINUTES,
            geminiApiKey: '',
            endedListingGracePeriodDays: DEFAULT_ENDED_GRACE_PERIOD_DAYS,
        };
    }
};

// ============ API Helpers for Background Worker ============

/**
 * Make authenticated API request from background worker
 */
const apiRequest = async <T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> => {
    const token = await getToken();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const backendUrl = await getBackendServerUrl();
    const url = `${backendUrl}${API_PREFIX}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Auth token expired');
        }
        const errorData = await response.json().catch(() => ({message: 'Request failed'}));
        throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
};

// ============ Listings via API ============

const getListings = async (): Promise<CarListing[]> => {
    try {
        const listings = await apiRequest<CarListing[]>(LISTINGS_ENDPOINT_PATH);
        return listings || [];
    } catch (error) {
        console.error('[BG] Failed to fetch listings from API:', error);
        return [];
    }
};

const saveListing = async (listing: CarListing): Promise<void> => {
    await apiRequest<CarListing>(LISTINGS_ENDPOINT_PATH, {
        method: 'POST',
        body: JSON.stringify(listing),
    });
};

// ============ Refresh Status (session storage - runtime state only) ============

const getRefreshStatus = async (): Promise<RefreshStatus> => {
    const status = await getFromSessionStorage<RefreshStatus>(STORAGE_KEYS.refreshStatus);
    return status || DEFAULT_REFRESH_STATUS;
};

const updateRefreshStatus = async (update: Partial<RefreshStatus>): Promise<void> => {
    const current = await getRefreshStatus();
    await setInSessionStorage(STORAGE_KEYS.refreshStatus, {...current, ...update});

    // Notify UI of status change (backup to storage events which may not fire in all contexts)
    chrome.runtime.sendMessage({type: 'REFRESH_STATUS_CHANGED'}).catch(() => {
        // Ignore errors - UI might not be open
    });
};

/**
 * Persist refresh schedule to the backend API (for cross-session persistence)
 * Only saves lastRefreshTime, nextRefreshTime, lastRefreshCount
 */
const persistRefreshScheduleToApi = async (schedule: {
    lastRefreshTime?: string | null;
    nextRefreshTime?: string | null;
    lastRefreshCount?: number;
}): Promise<void> => {
    try {
        const token = await getToken();
        if (!token) {
            console.log('[BG] Not authenticated, skipping refresh schedule persistence');
            return;
        }

        const backendUrl = await getBackendServerUrl();
        const url = `${backendUrl}${API_PREFIX}${SETTINGS_ENDPOINT_PATH}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(schedule),
        });

        if (!response.ok) {
            console.warn('[BG] Failed to persist refresh schedule:', response.status);
        } else {
            console.log('[BG] Refresh schedule persisted to API');
        }
    } catch (error) {
        console.warn('[BG] Error persisting refresh schedule:', error);
    }
};

// ============ Alarm Scheduling ============

// Format time text for notifications
const formatTimeText = (minutes: number): string => {
    if (minutes < 1) {
        return `${Math.round(minutes * 60)} seconds`;
    } else if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes < 1440) {
        const hours = Math.round(minutes / 60);
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        const days = Math.round(minutes / 1440);
        return `${days} day${days !== 1 ? 's' : ''}`;
    }
};

// Chrome alarms have a minimum delay of ~1 minute in production
const scheduleAlarm = async (minutes: number = DEFAULT_FREQUENCY_MINUTES): Promise<void> => {
    await chrome.alarms.clear(CHECK_ALARM_NAME);

    const delayMinutes = Math.max(0.1, minutes);
    chrome.alarms.create(CHECK_ALARM_NAME, {delayInMinutes: delayMinutes});

    const nextRefreshTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await updateRefreshStatus({nextRefreshTime});

    // Persist to API for cross-session persistence
    await persistRefreshScheduleToApi({nextRefreshTime});

    console.log(`Alarm scheduled for ${minutes} minutes (${Math.round(minutes * 60)} seconds)`);
};

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============ Background Refresh All ============

const runBackgroundRefresh = async (): Promise<void> => {
    // Check if already refreshing - prevent concurrent refreshes
    const currentStatus = await getRefreshStatus();
    if (currentStatus.isRefreshing) {
        console.log('Refresh already in progress, skipping');
        return;
    }

    // Check if user is authenticated
    const token = await getToken();
    if (!token) {
        console.log('Not authenticated, skipping background refresh');
        const settings = await getSettings();
        await scheduleAlarm(settings.checkFrequencyMinutes);
        return;
    }

    const settings = await getSettings();

    if (!settings.geminiApiKey) {
        console.log('No Gemini API key configured, skipping background refresh');
        await scheduleAlarm(settings.checkFrequencyMinutes);
        return;
    }

    const allListings = await getListings();

    if (allListings.length === 0) {
        console.log('No listings to refresh');
        await scheduleAlarm(settings.checkFrequencyMinutes);
        return;
    }

    // Filter out archived listings - they should only be refreshed manually
    const nonArchivedListings = allListings.filter(l => !l.isArchived);

    if (nonArchivedListings.length === 0) {
        console.log('All listings are archived, skipping background refresh');
        await scheduleAlarm(settings.checkFrequencyMinutes);
        return;
    }

    // Filter out ENDED listings past the grace period
    const activeListings = filterListingsForRefresh(
        nonArchivedListings,
        settings.endedListingGracePeriodDays,
    );

    if (activeListings.length === 0) {
        console.log('All listings are archived or ended past grace period, skipping background refresh');
        await scheduleAlarm(settings.checkFrequencyMinutes);
        return;
    }

    // Sort listings by refresh priority
    const sortedListings = sortListingsByRefreshPriority(activeListings);

    // Build initial pending items list
    const pendingItems: RefreshPendingItem[] = sortedListings.map(l => ({
        id: l.id,
        title: l.title,
        url: l.source.url,
        status: 'pending' as const,
    }));

    // Initialize refresh status with progress tracking and pending items
    await updateRefreshStatus({
        isRefreshing: true,
        currentIndex: 0,
        totalCount: sortedListings.length,
        currentListingTitle: null,
        pendingItems,
        recentlyRefreshed: [],
    });

    // Show notification when refresh starts
    chrome.notifications.create(`refresh-start-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'MotorScope Refreshing',
        message: `Starting refresh of ${sortedListings.length} listing${sortedListings.length !== 1 ? 's' : ''}...`,
        priority: 2,
    });

    let refreshedCount = 0;
    let errorCount = 0;
    let rateLimitHit = false;
    let useBackgroundTabMode = false; // Track if we should force background tab for remaining listings
    const recentlyRefreshed: RefreshedListingInfo[] = [];

    for (let i = 0; i < sortedListings.length; i++) {
        const listing = sortedListings[i];

        // Update pending items - mark current as refreshing
        pendingItems[i] = {...pendingItems[i], status: 'refreshing'};

        // Update progress with current item being refreshed
        await updateRefreshStatus({
            currentIndex: i + 1,
            totalCount: sortedListings.length,
            currentListingTitle: listing.title,
            pendingItems: [...pendingItems],
        });

        // Pass the forceBackgroundTab flag if we've already encountered Cloudflare issues
        const result = await refreshSingleListing(listing, useBackgroundTabMode);

        // If background tab was used (due to Cloudflare fallback), enable it for remaining listings
        if (result.usedBackgroundTab && !useBackgroundTabMode) {
            console.log('[BG] Cloudflare fallback triggered, switching to background tab mode for remaining listings');
            useBackgroundTabMode = true;
        }

        // Save the updated listing to the API
        if (result.success || result.listing.lastRefreshStatus === 'error') {
            try {
                await saveListing(result.listing);
            } catch (err) {
                console.error('[BG] Failed to save updated listing:', err);
            }
        }

        if (result.success) {
            refreshedCount++;
            pendingItems[i] = {...pendingItems[i], status: 'success'};

            recentlyRefreshed.push({
                id: listing.id,
                title: listing.title,
                url: listing.source.url,
                status: 'success',
                timestamp: new Date().toISOString(),
            });
        } else {
            errorCount++;
            pendingItems[i] = {...pendingItems[i], status: 'error'};

            recentlyRefreshed.push({
                id: listing.id,
                title: listing.title,
                url: listing.source.url,
                status: 'error',
                timestamp: new Date().toISOString(),
            });

            // Check if we hit rate limit - if so, stop processing and schedule retry
            if (result.rateLimited) {
                rateLimitHit = true;
                console.log('Rate limit hit, stopping refresh and scheduling retry in 1 minute');
                break;
            }
        }

        // Update status after each item
        await updateRefreshStatus({
            pendingItems: [...pendingItems],
            recentlyRefreshed: [...recentlyRefreshed],
        });

        // Delay between requests (only if not rate limited)
        if (!rateLimitHit) {
            await delay(2000);
        }
    }

    const now = new Date().toISOString();

    // If rate limited, schedule retry in 1 minute, otherwise use normal interval
    const nextRefreshMinutes = rateLimitHit ? RATE_LIMIT_RETRY_MINUTES : settings.checkFrequencyMinutes;
    const nextRefreshTime = new Date(Date.now() + nextRefreshMinutes * 60 * 1000).toISOString();

    await updateRefreshStatus({
        lastRefreshTime: now,
        nextRefreshTime,
        lastRefreshCount: refreshedCount,
        isRefreshing: false,
        currentIndex: 0,
        totalCount: 0,
        currentListingTitle: null,
        pendingItems: [],
        recentlyRefreshed: recentlyRefreshed.slice(0, 50),
    });

    // Persist refresh schedule to API for cross-session persistence
    await persistRefreshScheduleToApi({
        lastRefreshTime: now,
        nextRefreshTime,
        lastRefreshCount: refreshedCount,
    });

    // Show notification when refresh completes
    const timeText = formatTimeText(nextRefreshMinutes);
    let message = `Refreshed ${refreshedCount} listing${refreshedCount !== 1 ? 's' : ''}`;
    if (errorCount > 0) {
        message += `, ${errorCount} failed`;
    }
    if (rateLimitHit) {
        message += `. Rate limited - retrying in ${timeText}.`;
    } else {
        message += `. Next refresh in ${timeText}.`;
    }

    chrome.notifications.create(`refresh-complete-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icon.png',
        title: rateLimitHit ? 'MotorScope Rate Limited' : 'MotorScope Refresh Complete',
        message,
        priority: 2,
    });

    // Notify UI
    chrome.runtime.sendMessage({type: 'LISTING_UPDATED'}).catch(() => {
    });

    // Schedule next alarm
    await scheduleAlarm(nextRefreshMinutes);
};

// ============ Event Listeners ============

// ============ Auth Token Management ============

/**
 * Check and refresh auth token if expired
 */
const checkAndRefreshAuth = async (): Promise<void> => {
    try {
        const token = await getStoredToken();
        if (!token) {
            console.log('[BG Auth] No token stored, skipping refresh');
            return;
        }

        const expired = await isTokenExpired();
        if (!expired) {
            console.log('[BG Auth] Token still valid');
            return;
        }

        console.log('[BG Auth] Token expired, attempting silent refresh...');
        const result = await trySilentLogin();

        if (result) {
            console.log('[BG Auth] Silent refresh successful');
            chrome.runtime.sendMessage({type: 'AUTH_STATE_CHANGED', status: 'logged_in'}).catch(() => {
            });
        } else {
            console.log('[BG Auth] Silent refresh failed, user needs to re-login');
            chrome.runtime.sendMessage({type: 'AUTH_STATE_CHANGED', status: 'logged_out'}).catch(() => {
            });
        }
    } catch (error) {
        console.error('[BG Auth] Error checking auth:', error);
    }
};

/**
 * Schedule periodic auth token checks
 */
const scheduleAuthCheck = async (): Promise<void> => {
    await chrome.alarms.clear(AUTH_CHECK_ALARM_NAME);
    chrome.alarms.create(AUTH_CHECK_ALARM_NAME, {
        delayInMinutes: AUTH_CHECK_INTERVAL_MINUTES,
        periodInMinutes: AUTH_CHECK_INTERVAL_MINUTES,
    });
    console.log('[BG Auth] Auth check alarm scheduled');
};

// Helper to schedule alarm based on stored nextRefreshTime or default interval
const initializeAlarm = async (): Promise<void> => {
    // Check if user is authenticated - only schedule alarms for logged in users
    const token = await getToken();
    if (!token) {
        console.log('[BG] User not authenticated, skipping alarm initialization');
        // Clear any existing alarm since user is not logged in
        await chrome.alarms.clear(CHECK_ALARM_NAME);
        return;
    }

    const settings = await getSettings();
    let refreshStatus = await getRefreshStatus();

    // If session storage has no nextRefreshTime, try to load from API settings
    // This handles the case where browser was restarted
    if (!refreshStatus.nextRefreshTime || !refreshStatus.lastRefreshTime) {
        try {
            const backendUrl = await getBackendServerUrl();
            const url = `${backendUrl}${API_PREFIX}${SETTINGS_ENDPOINT_PATH}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const apiSettings = await response.json();

                // Merge API refresh schedule into session storage
                if (apiSettings.nextRefreshTime || apiSettings.lastRefreshTime) {
                    const updatedStatus = {
                        ...refreshStatus,
                        lastRefreshTime: apiSettings.lastRefreshTime || refreshStatus.lastRefreshTime,
                        nextRefreshTime: apiSettings.nextRefreshTime || refreshStatus.nextRefreshTime,
                        lastRefreshCount: apiSettings.lastRefreshCount || refreshStatus.lastRefreshCount,
                    };
                    await updateRefreshStatus(updatedStatus);
                    refreshStatus = updatedStatus;
                    console.log('[BG] Restored refresh schedule from API');
                }
            }
        } catch (error) {
            console.warn('[BG] Could not load refresh schedule from API:', error);
        }
    }

    // Check if there's a stored nextRefreshTime
    if (refreshStatus.nextRefreshTime) {
        const nextRefreshDate = new Date(refreshStatus.nextRefreshTime);
        const now = new Date();

        if (nextRefreshDate > now) {
            // Next refresh is still in the future - schedule for remaining time
            const remainingMs = nextRefreshDate.getTime() - now.getTime();
            const remainingMinutes = remainingMs / (1000 * 60);

            console.log(`[BG] Restoring scheduled refresh in ${Math.round(remainingMinutes)} minutes`);

            await chrome.alarms.clear(CHECK_ALARM_NAME);
            chrome.alarms.create(CHECK_ALARM_NAME, {delayInMinutes: Math.max(0.1, remainingMinutes)});
            return;
        } else {
            // Next refresh time is in the past - we're behind schedule
            // This happens when user was logged out or browser was closed
            // Trigger immediate refresh
            const overdueMs = now.getTime() - nextRefreshDate.getTime();
            const overdueMinutes = Math.round(overdueMs / (1000 * 60));
            console.log(`[BG] Scheduled refresh is ${overdueMinutes} minutes overdue, triggering immediate refresh`);

            // Run refresh immediately (don't await - let it run in background)
            runBackgroundRefresh().catch(err => {
                console.error('[BG] Failed to run overdue refresh:', err);
            });
            return;
        }
    }

    console.log(`[BG] No valid stored refresh time, scheduling for ${settings.checkFrequencyMinutes} minutes`);
    await scheduleAlarm(settings.checkFrequencyMinutes);
};

// ============ Stale Sync Recovery ============

/**
 * Recover from interrupted sync state on extension startup.
 *
 * When browser closes during sync:
 * - isRefreshing remains true
 * - Some items stuck as "refreshing"
 * - Remaining items stuck as "pending"
 *
 * This function detects and fixes this stale state.
 */
const recoverStaleSyncState = async (): Promise<void> => {
    const status = await getRefreshStatus();

    if (!status.isRefreshing) {
        return; // No recovery needed
    }

    console.log('[BG] Detected stale sync state, recovering...');

    // Reset any items stuck in "refreshing" back to "pending"
    const recoveredPendingItems = status.pendingItems.map(item =>
        item.status === 'refreshing'
            ? {...item, status: 'pending' as const}
            : item,
    );

    // Count unfinished items for logging
    const unfinishedCount = recoveredPendingItems.filter(
        item => item.status === 'pending',
    ).length;

    await updateRefreshStatus({
        isRefreshing: false,
        currentListingTitle: null,
        pendingItems: recoveredPendingItems,
    });

    console.log(`[BG] Sync state recovered. ${unfinishedCount} items remain pending.`);

    // Notify UI that state has changed
    chrome.runtime.sendMessage({type: 'REFRESH_STATUS_CHANGED'}).catch(() => {
        // Ignore - UI might not be open
    });
};

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
    await recoverStaleSyncState(); // Recover from any stale sync state first
    await initializeAlarm();
    await scheduleAuthCheck();
    await initializeAuth().catch(err => console.error('[BG] Auth init failed:', err));
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
    await initializeAlarm();
    await scheduleAuthCheck();
    await checkAndRefreshAuth().catch(err => console.error('[BG] Auth check failed:', err));
    await recoverStaleSyncState(); // Recover from any stale sync state
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === CHECK_ALARM_NAME) {
        await runBackgroundRefresh();
    } else if (alarm.name === AUTH_CHECK_ALARM_NAME) {
        await checkAndRefreshAuth();
    }
});

// Listen for settings changes to update alarm schedule
// Note: Settings are now stored in API, not local storage.
// Settings changes are communicated via RESCHEDULE_ALARM message from the UI.

// Handle manual refresh trigger from UI
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.type === 'TRIGGER_MANUAL_REFRESH') {
        runBackgroundRefresh()
            .then(() => sendResponse({success: true}))
            .catch((error) => {
                console.error('Manual refresh failed:', error);
                sendResponse({success: false, error: String(error)});
            });
        return true;
    }

    if (request.type === 'RESCHEDULE_ALARM') {
        const minutes = request.minutes || DEFAULT_FREQUENCY_MINUTES;
        scheduleAlarm(minutes)
            .then(() => {
                console.log(`Alarm rescheduled for ${minutes} minutes`);
                sendResponse({success: true});
            })
            .catch((error) => sendResponse({success: false, error: String(error)}));
        return true;
    }

    if (request.type === 'CLEAR_REFRESH_ERRORS') {
        updateRefreshStatus({refreshErrors: []})
            .then(() => sendResponse({success: true}))
            .catch((error) => sendResponse({success: false, error: String(error)}));
        return true;
    }

    if (request.type === 'CHECK_AUTH') {
        checkAndRefreshAuth()
            .then(() => sendResponse({success: true}))
            .catch((error) => sendResponse({success: false, error: String(error)}));
        return true;
    }

    if (request.type === 'TRY_SILENT_LOGIN') {
        trySilentLogin()
            .then((result) => sendResponse({success: !!result, result}))
            .catch((error) => sendResponse({success: false, error: String(error)}));
        return true;
    }

    if (request.type === 'INITIALIZE_ALARM') {
        initializeAlarm()
            .then(() => {
                console.log('[BG] Alarm initialized via message');
                sendResponse({success: true});
            })
            .catch((error) => sendResponse({success: false, error: String(error)}));
        return true;
    }

    // Get tracked listing URLs for content script
    if (request.type === 'GET_TRACKED_URLS') {
        getListings()
            .then((listings) => {
                const urls = listings.map((l) => l.source.url);
                sendResponse({success: true, urls});
            })
            .catch((error) => {
                console.error('[BG] Failed to get tracked URLs:', error);
                sendResponse({success: false, urls: [], error: String(error)});
            });
        return true;
    }

    // Open dashboard with a specific listing
    if (request.type === 'OPEN_DASHBOARD_WITH_LISTING') {
        const listingUrl = request.url;
        const dashboardUrl = chrome.runtime.getURL(
            `index.html?view=dashboard&openListing=${encodeURIComponent(listingUrl)}`,
        );
        chrome.tabs.create({url: dashboardUrl}, () => {
            sendResponse({success: true});
        });
        return true;
    }
});

// Log that the service worker has started
console.log('MotorScope background service worker started');

