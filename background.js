// Background service worker for MotoTracker

const CHECK_ALARM_NAME = 'moto_tracker_check_alarm';
const DEFAULT_FREQUENCY_MINUTES = 60;
const STORAGE_KEYS = {
  listings: 'moto_tracker_listings',
  settings: 'moto_tracker_settings',
  geminiKey: 'moto_tracker_gemini_key',
  refreshStatus: 'moto_tracker_refresh_status',
  geminiStats: 'moto_tracker_gemini_stats',
};

// Schedule the next alarm
const scheduleAlarm = async (minutes = DEFAULT_FREQUENCY_MINUTES) => {
  await chrome.alarms.clear(CHECK_ALARM_NAME);
  chrome.alarms.create(CHECK_ALARM_NAME, { delayInMinutes: minutes });

  const nextRefreshTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  await updateRefreshStatus({ nextRefreshTime });
};

// Get settings from storage
const getSettings = async () => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.settings, STORAGE_KEYS.geminiKey], (result) => {
      const settings = result[STORAGE_KEYS.settings] || {};
      const apiKey = result[STORAGE_KEYS.geminiKey] || '';
      resolve({
        checkFrequencyMinutes: settings.checkFrequencyMinutes || DEFAULT_FREQUENCY_MINUTES,
        geminiApiKey: apiKey,
      });
    });
  });
};

// Get listings from storage
const getListings = async () => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.listings], (result) => {
      resolve(result[STORAGE_KEYS.listings] || []);
    });
  });
};

// Save listings to storage
const saveListings = async (listings) => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEYS.listings]: listings }, resolve);
  });
};

// Update refresh status
const updateRefreshStatus = async (update) => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.refreshStatus], (result) => {
      const current = result[STORAGE_KEYS.refreshStatus] || {
        lastRefreshTime: null,
        nextRefreshTime: null,
        lastRefreshCount: 0,
        isRefreshing: false,
      };
      chrome.storage.local.set({
        [STORAGE_KEYS.refreshStatus]: { ...current, ...update }
      }, resolve);
    });
  });
};

// Record Gemini call for stats
const recordGeminiCall = async (url, prompt) => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.geminiStats], (result) => {
      const stats = result[STORAGE_KEYS.geminiStats] || { totalCalls: 0, history: [] };
      const entry = {
        id: crypto.randomUUID(),
        url,
        promptPreview: prompt,
        timestamp: new Date().toISOString(),
      };
      const history = [entry, ...stats.history].slice(0, 200);
      chrome.storage.local.set({
        [STORAGE_KEYS.geminiStats]: {
          totalCalls: stats.totalCalls + 1,
          history,
        }
      }, resolve);
    });
  });
};

// Call Gemini API to refresh a listing
const refreshListingWithGemini = async (apiKey, url, pageText, pageTitle) => {
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

  let status = 'ACTIVE';
  if (parsed.isSold === true) {
    status = 'SOLD';
  } else if (parsed.isAvailable === false) {
    status = 'EXPIRED';
  }

  return {
    price: typeof parsed.price === 'number' && parsed.price > 0 ? parsed.price : 0,
    currency: parsed.currency || 'PLN',
    status,
  };
};

// Refresh a single listing
const refreshListing = async (listing, apiKey) => {
  try {
    const response = await fetch(listing.url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    if (response.status === 404 || response.status === 410) {
      return { ...listing, status: 'EXPIRED', lastChecked: new Date().toISOString() };
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

// Run the background refresh for all listings
const runBackgroundRefresh = async () => {
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

  let refreshedCount = 0;
  const updatedListings = [];

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

  // Show notification
  const nextRefreshMinutes = settings.checkFrequencyMinutes;
  let timeText;
  if (nextRefreshMinutes < 60) {
    timeText = `${nextRefreshMinutes} minutes`;
  } else if (nextRefreshMinutes < 1440) {
    timeText = `${Math.round(nextRefreshMinutes / 60)} hours`;
  } else {
    timeText = `${Math.round(nextRefreshMinutes / 1440)} days`;
  }

  chrome.notifications.create({
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
    if (changes[STORAGE_KEYS.settings]?.newValue?.checkFrequencyMinutes) {
      await scheduleAlarm(changes[STORAGE_KEYS.settings].newValue.checkFrequencyMinutes);
    }
  }
});

// Handle manual refresh trigger from UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRIGGER_MANUAL_REFRESH') {
    runBackgroundRefresh().then(() => sendResponse({ success: true }));
    return true; // Keep channel open for async response
  }
});
