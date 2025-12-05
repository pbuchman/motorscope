// Background service worker for MotoTracker (ES Module)
import { ListingStatus, CarListing, RefreshStatus, GeminiStats, RefreshedListingInfo, RefreshPendingItem, GeminiCallHistoryEntry } from './types';

const CHECK_ALARM_NAME = 'moto_tracker_check_alarm';
const DEFAULT_FREQUENCY_MINUTES = 60;
const RATE_LIMIT_RETRY_MINUTES = 1; // Schedule retry in 1 minute if rate limited

const STORAGE_KEYS = {
  listings: 'moto_tracker_listings',
  settings: 'moto_tracker_settings',
  geminiKey: 'moto_tracker_gemini_key',
  refreshStatus: 'moto_tracker_refresh_status',
  geminiStats: 'moto_tracker_gemini_stats',
};

// ============ Storage Helpers ============

const getFromStorage = <T>(key: string): Promise<T | null> => {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] ?? null);
    });
  });
};

const setInStorage = <T>(key: string, value: T): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
};

// ============ Settings ============

interface Settings {
  checkFrequencyMinutes: number;
  geminiApiKey: string;
}

const getSettings = async (): Promise<Settings> => {
  const settings = await getFromStorage<{ checkFrequencyMinutes?: number }>(STORAGE_KEYS.settings);
  const apiKey = await getFromStorage<string>(STORAGE_KEYS.geminiKey);
  return {
    checkFrequencyMinutes: settings?.checkFrequencyMinutes || DEFAULT_FREQUENCY_MINUTES,
    geminiApiKey: apiKey || '',
  };
};

// ============ Listings ============

const getListings = async (): Promise<CarListing[]> => {
  const listings = await getFromStorage<CarListing[]>(STORAGE_KEYS.listings);
  return listings || [];
};

const saveListings = async (listings: CarListing[]): Promise<void> => {
  await setInStorage(STORAGE_KEYS.listings, listings);
};

// ============ Refresh Status ============

const getRefreshStatus = async (): Promise<RefreshStatus> => {
  const status = await getFromStorage<RefreshStatus>(STORAGE_KEYS.refreshStatus);
  return status || {
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
};

const updateRefreshStatus = async (update: Partial<RefreshStatus>): Promise<void> => {
  const current = await getRefreshStatus();
  await setInStorage(STORAGE_KEYS.refreshStatus, { ...current, ...update });
};

// ============ Gemini Stats ============

const recordGeminiCall = async (entry: GeminiCallHistoryEntry): Promise<void> => {
  const stats = await getFromStorage<GeminiStats>(STORAGE_KEYS.geminiStats) || { totalCalls: 0, successCount: 0, errorCount: 0, history: [] };
  const history = [entry, ...stats.history].slice(0, 200);
  await setInStorage(STORAGE_KEYS.geminiStats, {
    totalCalls: stats.totalCalls + 1,
    successCount: entry.status === 'success' ? (stats.successCount || 0) + 1 : (stats.successCount || 0),
    errorCount: entry.status === 'error' ? (stats.errorCount || 0) + 1 : (stats.errorCount || 0),
    history,
  });
};

// Helper to format JSON response for display
const formatJsonResponse = (data: unknown): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
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
// For shorter intervals, we still use alarms but with minimum delay
const scheduleAlarm = async (minutes: number = DEFAULT_FREQUENCY_MINUTES): Promise<void> => {
  await chrome.alarms.clear(CHECK_ALARM_NAME);

  // Chrome MV3 alarms have a minimum of about 0.5 minutes (30 seconds) in dev mode
  // Use the actual value but it will be clamped by Chrome if too low
  const delayMinutes = Math.max(0.1, minutes); // Minimum ~6 seconds for testing
  chrome.alarms.create(CHECK_ALARM_NAME, { delayInMinutes: delayMinutes });

  const nextRefreshTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  await updateRefreshStatus({ nextRefreshTime });

  console.log(`Alarm scheduled for ${minutes} minutes (${Math.round(minutes * 60)} seconds)`);
};

// ============ Gemini API via library ============

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GeminiRefreshResult {
  price: number;
  currency: string;
  status: ListingStatus;
}

// Error class for rate limiting
class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

const refreshListingWithGeminiAPI = async (
  apiKey: string,
  url: string,
  pageText: string,
  pageTitle: string
): Promise<GeminiRefreshResult> => {
  const prompt = `
    Analyze the following car listing page and extract the current price and availability status.

    Page Title: ${pageTitle}
    Page URL: ${url}
    Page Content: ${pageText.substring(0, 10000)}

    Instructions:
    - Extract the current listing price as a number (no formatting, just the number)
    - Extract the currency (PLN, EUR, USD, etc.)
    - Set isAvailable to false if the page shows the listing is no longer available, removed, expired, or redirects to a "not found" type page
    - Set isSold to true if the page explicitly indicates the vehicle was sold
    - If the page looks like a normal active listing, set isAvailable to true and isSold to false
  `;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              price: { type: 'number' },
              currency: { type: 'string' },
              isAvailable: { type: 'boolean' },
              isSold: { type: 'boolean' },
            },
            required: ['price', 'currency', 'isAvailable'],
          },
        },
      }),
    }
  );

  // Handle rate limiting (429) - throw special error to skip item
  if (response.status === 429) {
    const errorMsg = 'Rate limited (429) - API quota exceeded';
    await recordGeminiCall({
      id: crypto.randomUUID(),
      url,
      promptPreview: prompt,
      error: errorMsg,
      status: 'error',
      timestamp: new Date().toISOString(),
    });
    throw new RateLimitError(errorMsg);
  }

  if (!response.ok) {
    const errorMsg = `Gemini API error: ${response.status}`;
    await recordGeminiCall({
      id: crypto.randomUUID(),
      url,
      promptPreview: prompt,
      error: errorMsg,
      status: 'error',
      timestamp: new Date().toISOString(),
    });
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    const errorMsg = 'No response from Gemini';
    await recordGeminiCall({
      id: crypto.randomUUID(),
      url,
      promptPreview: prompt,
      error: errorMsg,
      status: 'error',
      timestamp: new Date().toISOString(),
    });
    throw new Error(errorMsg);
  }

  const parsed = JSON.parse(text);

  // Record success with response
  await recordGeminiCall({
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    response: formatJsonResponse(parsed),
    status: 'success',
    timestamp: new Date().toISOString(),
  });

  let status: ListingStatus = ListingStatus.ACTIVE;
  if (parsed.isSold === true) {
    status = ListingStatus.SOLD;
  } else if (parsed.isAvailable === false) {
    status = ListingStatus.EXPIRED;
  }

  return {
    price: typeof parsed.price === 'number' && parsed.price > 0 ? parsed.price : 0,
    currency: parsed.currency || 'PLN',
    status,
  };
};

// ============ Refresh Single Listing ============

interface RefreshListingResult {
  listing: CarListing;
  success: boolean;
  error?: string;
  rateLimited?: boolean;
}

const refreshListing = async (listing: CarListing, apiKey: string): Promise<RefreshListingResult> => {
  try {
    const response = await fetch(listing.url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (response.status === 404 || response.status === 410) {
      return {
        listing: {
          ...listing,
          status: ListingStatus.EXPIRED,
          lastChecked: new Date().toISOString(),
          lastRefreshStatus: 'success',
        },
        success: true,
      };
    }

    if (!response.ok) {
      return {
        listing: { ...listing, lastRefreshStatus: 'error', lastRefreshError: `HTTP ${response.status}` },
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const html = await response.text();

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : listing.title;

    // Strip HTML for text content
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 20000);

    const result = await refreshListingWithGeminiAPI(apiKey, listing.url, textContent, pageTitle);

    const updatedListing = { ...listing };

    // Update price if changed
    if (result.price > 0 && result.price !== listing.currentPrice) {
      updatedListing.priceHistory = [
        ...listing.priceHistory,
        {
          date: new Date().toISOString(),
          price: result.price,
          currency: result.currency,
        },
      ];
      updatedListing.currentPrice = result.price;
    }

    updatedListing.currency = result.currency || listing.currency;
    updatedListing.status = result.status;
    updatedListing.lastChecked = new Date().toISOString();
    updatedListing.lastRefreshStatus = 'success';
    updatedListing.lastRefreshError = undefined;

    return { listing: updatedListing, success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isRateLimited = error instanceof RateLimitError;

    console.error(`Failed to refresh listing ${listing.url}:`, error);

    // Don't update lastChecked or mark as refreshed on error
    return {
      listing: {
        ...listing,
        lastRefreshStatus: 'error',
        lastRefreshError: errorMsg,
      },
      success: false,
      error: errorMsg,
      rateLimited: isRateLimited,
    };
  }
};

// ============ Sort listings by refresh priority ============

const sortListingsByRefreshPriority = (listings: CarListing[]): CarListing[] => {
  return [...listings].sort((a, b) => {
    // Priority 1: Items never refreshed (no lastChecked or no lastRefreshStatus)
    const aHasNeverRefreshed = !a.lastChecked || !a.lastRefreshStatus;
    const bHasNeverRefreshed = !b.lastChecked || !b.lastRefreshStatus;

    if (aHasNeverRefreshed && !bHasNeverRefreshed) return -1;
    if (!aHasNeverRefreshed && bHasNeverRefreshed) return 1;

    // Priority 2: Items that were successfully refreshed (older first)
    const aIsSuccess = a.lastRefreshStatus === 'success';
    const bIsSuccess = b.lastRefreshStatus === 'success';

    if (aIsSuccess && !bIsSuccess) return -1;
    if (!aIsSuccess && bIsSuccess) return 1;

    // Priority 3: Within same status, sort by lastChecked (oldest first)
    const aTime = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
    const bTime = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;

    return aTime - bTime;
  });
};

// ============ Background Refresh All ============

const runBackgroundRefresh = async (): Promise<void> => {
  // Check if already refreshing - prevent concurrent refreshes
  const currentStatus = await getRefreshStatus();
  if (currentStatus.isRefreshing) {
    console.log('Refresh already in progress, skipping');
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

  // Sort listings by refresh priority
  const sortedListings = sortListingsByRefreshPriority(allListings);

  // Build initial pending items list
  const pendingItems: RefreshPendingItem[] = sortedListings.map(l => ({
    id: l.id,
    title: l.title,
    url: l.url,
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
  chrome.notifications.create('refresh-start', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'MotoTracker Refreshing',
    message: `Starting refresh of ${sortedListings.length} listing${sortedListings.length !== 1 ? 's' : ''}...`,
    priority: 2,
  });

  let refreshedCount = 0;
  let errorCount = 0;
  let rateLimitHit = false;
  const listingsMap = new Map(allListings.map(l => [l.id, l]));
  const recentlyRefreshed: RefreshedListingInfo[] = [];

  for (let i = 0; i < sortedListings.length; i++) {
    const listing = sortedListings[i];

    // Update pending items - mark current as refreshing
    pendingItems[i] = { ...pendingItems[i], status: 'refreshing' };

    // Update progress with current item being refreshed
    await updateRefreshStatus({
      currentIndex: i + 1,
      totalCount: sortedListings.length,
      currentListingTitle: listing.title,
      pendingItems: [...pendingItems],
    });

    const result = await refreshListing(listing, settings.geminiApiKey);

    // Update the listing in the map
    listingsMap.set(listing.id, result.listing);

    if (result.success) {
      refreshedCount++;
      pendingItems[i] = { ...pendingItems[i], status: 'success' };

      recentlyRefreshed.push({
        id: listing.id,
        title: listing.title,
        url: listing.url,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } else {
      errorCount++;
      pendingItems[i] = { ...pendingItems[i], status: 'error' };

      recentlyRefreshed.push({
        id: listing.id,
        title: listing.title,
        url: listing.url,
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

  // Save all updated listings
  await saveListings(Array.from(listingsMap.values()));

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

  chrome.notifications.create('refresh-complete', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: rateLimitHit ? 'MotoTracker Rate Limited' : 'MotoTracker Refresh Complete',
    message,
    priority: 2,
  });

  // Notify UI
  chrome.runtime.sendMessage({ type: 'LISTING_UPDATED' }).catch(() => {});

  // Schedule next alarm
  await scheduleAlarm(nextRefreshMinutes);
};

// ============ Event Listeners ============

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await scheduleAlarm(settings.checkFrequencyMinutes);
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await scheduleAlarm(settings.checkFrequencyMinutes);
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CHECK_ALARM_NAME) {
    await runBackgroundRefresh();
  }
});

// Listen for settings changes to update alarm schedule
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local') {
    if (changes[STORAGE_KEYS.listings]) {
      chrome.runtime.sendMessage({ type: 'LISTING_UPDATED' }).catch(() => {});
    }
    // Check if settings changed - reschedule alarm
    if (changes[STORAGE_KEYS.settings]?.newValue) {
      const newFrequency = changes[STORAGE_KEYS.settings].newValue.checkFrequencyMinutes;
      if (typeof newFrequency === 'number' && newFrequency > 0) {
        console.log(`Settings changed, rescheduling alarm for ${newFrequency} minutes`);
        await scheduleAlarm(newFrequency);

        // Show notification about schedule change
        chrome.notifications.create('settings-changed', {
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'MotoTracker Schedule Updated',
          message: `Refresh interval changed to ${formatTimeText(newFrequency)}.`,
          priority: 2,
        });
      }
    }
  }
});

// Handle manual refresh trigger from UI
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'TRIGGER_MANUAL_REFRESH') {
    runBackgroundRefresh()
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Manual refresh failed:', error);
        sendResponse({ success: false, error: String(error) });
      });
    return true; // Keep channel open for async response
  }

  if (request.type === 'RESCHEDULE_ALARM') {
    const minutes = request.minutes || DEFAULT_FREQUENCY_MINUTES;
    scheduleAlarm(minutes)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: String(error) }));
    return true;
  }

  if (request.type === 'CLEAR_REFRESH_ERRORS') {
    updateRefreshStatus({ refreshErrors: [] })
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: String(error) }));
    return true;
  }
});

// Log that the service worker has started
console.log('MotoTracker background service worker started');

