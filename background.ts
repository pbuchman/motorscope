// Background service worker for MotoTracker (ES Module)
import { ListingStatus, CarListing, RefreshStatus, GeminiStats } from './types';

const CHECK_ALARM_NAME = 'moto_tracker_check_alarm';
const DEFAULT_FREQUENCY_MINUTES = 60;

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
  };
};

const updateRefreshStatus = async (update: Partial<RefreshStatus>): Promise<void> => {
  const current = await getRefreshStatus();
  await setInStorage(STORAGE_KEYS.refreshStatus, { ...current, ...update });
};

// ============ Gemini Stats ============

const recordGeminiCall = async (url: string, prompt: string): Promise<void> => {
  const stats = await getFromStorage<GeminiStats>(STORAGE_KEYS.geminiStats) || { totalCalls: 0, history: [] };
  const entry = {
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    timestamp: new Date().toISOString(),
  };
  const history = [entry, ...stats.history].slice(0, 200);
  await setInStorage(STORAGE_KEYS.geminiStats, {
    totalCalls: stats.totalCalls + 1,
    history,
  });
};

// ============ Alarm Scheduling ============

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

// ============ Gemini API ============

interface GeminiRefreshResult {
  price: number;
  currency: string;
  status: ListingStatus;
}

const refreshListingWithGemini = async (
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  await recordGeminiCall(url, prompt);

  const parsed = JSON.parse(text);

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

const refreshListing = async (listing: CarListing, apiKey: string): Promise<CarListing> => {
  try {
    const response = await fetch(listing.url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (response.status === 404 || response.status === 410) {
      return { ...listing, status: ListingStatus.EXPIRED, lastChecked: new Date().toISOString() };
    }

    if (!response.ok) {
      return { ...listing, lastChecked: new Date().toISOString() };
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

    const result = await refreshListingWithGemini(apiKey, listing.url, textContent, pageTitle);

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

    return updatedListing;
  } catch (error) {
    console.error(`Failed to refresh listing ${listing.url}:`, error);
    return { ...listing, lastChecked: new Date().toISOString() };
  }
};

// ============ Background Refresh All ============

const runBackgroundRefresh = async (): Promise<void> => {
  const settings = await getSettings();

  if (!settings.geminiApiKey) {
    console.log('No Gemini API key configured, skipping background refresh');
    await scheduleAlarm(settings.checkFrequencyMinutes);
    return;
  }

  const listings = await getListings();

  if (listings.length === 0) {
    console.log('No listings to refresh');
    await scheduleAlarm(settings.checkFrequencyMinutes);
    return;
  }

  await updateRefreshStatus({ isRefreshing: true });

  // Show notification when refresh starts
  chrome.notifications.create('refresh-start', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'MotoTracker Refreshing',
    message: `Starting refresh of ${listings.length} listing${listings.length !== 1 ? 's' : ''}...`,
    priority: 0,
  });

  let refreshedCount = 0;
  const updatedListings: CarListing[] = [];

  for (const listing of listings) {
    try {
      const updated = await refreshListing(listing, settings.geminiApiKey);
      updatedListings.push(updated);
      refreshedCount++;
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error refreshing ${listing.url}:`, error);
      updatedListings.push(listing);
    }
  }

  await saveListings(updatedListings);

  const now = new Date().toISOString();
  const nextRefreshTime = new Date(Date.now() + settings.checkFrequencyMinutes * 60 * 1000).toISOString();

  await updateRefreshStatus({
    lastRefreshTime: now,
    nextRefreshTime,
    lastRefreshCount: refreshedCount,
    isRefreshing: false,
  });

  // Show notification when refresh completes
  const nextRefreshMinutes = settings.checkFrequencyMinutes;
  let timeText: string;
  if (nextRefreshMinutes < 60) {
    timeText = `${nextRefreshMinutes} minutes`;
  } else if (nextRefreshMinutes < 1440) {
    timeText = `${Math.round(nextRefreshMinutes / 60)} hours`;
  } else {
    timeText = `${Math.round(nextRefreshMinutes / 1440)} days`;
  }

  chrome.notifications.create('refresh-complete', {
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'MotoTracker Refresh Complete',
    message: `Refreshed ${refreshedCount} listing${refreshedCount !== 1 ? 's' : ''}. Next refresh in ${timeText}.`,
    priority: 0,
  });

  // Notify UI
  chrome.runtime.sendMessage({ type: 'LISTING_UPDATED' }).catch(() => {});

  // Schedule next alarm
  await scheduleAlarm(settings.checkFrequencyMinutes);
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
});

// Log that the service worker has started
console.log('MotoTracker background service worker started');

