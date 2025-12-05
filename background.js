// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.runtime.lastError) {
    // Handle installation errors silently in production
    return;
  }
  // Extension installed successfully
});

// Listen for storage changes to sync across extension pages
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.moto_tracker_listings) {
    // Notify all open extension pages about the change
    chrome.runtime.sendMessage({ type: 'LISTING_UPDATED' }).catch(() => {
      // Ignore errors if no listeners are active
    });
  }
});
