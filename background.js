// Background service worker
const CHECK_ALARM_NAME = 'moto_tracker_check_alarm';
const DEFAULT_FREQUENCY_MINUTES = 60;

const scheduleAlarm = (minutes = DEFAULT_FREQUENCY_MINUTES) => {
  chrome.alarms.create(CHECK_ALARM_NAME, { periodInMinutes: minutes, delayInMinutes: 1 });
};

chrome.runtime.onInstalled.addListener(() => {
  if (chrome.runtime.lastError) {
    // Handle installation errors silently in production
    return;
  }
  // Extension installed successfully
  scheduleAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CHECK_ALARM_NAME) return;
  chrome.runtime.sendMessage({ type: 'RUN_BACKGROUND_CHECK' }).catch(() => {});
});

// Listen for storage changes to sync across extension pages
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.moto_tracker_listings) {
      // Notify all open extension pages about the change
      chrome.runtime.sendMessage({ type: 'LISTING_UPDATED' }).catch(() => {
        // Ignore errors if no listeners are active
      });
    }
    if (changes.moto_tracker_settings?.newValue?.checkFrequencyMinutes) {
      scheduleAlarm(changes.moto_tracker_settings.newValue.checkFrequencyMinutes);
    }
  }
});
