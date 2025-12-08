# Investigation: Refresh Status Not Updating in UI

## Issue Description

When the user triggers a background refresh from the Settings page:
1. The "Sync Now" button gets disabled correctly
2. The refresh happens in the background
3. **BUT** the UI doesn't update to show which items are being refreshed
4. After sync finishes, the list of refreshed items appears (which is correct)

Expected behavior:
- When opening settings page, see last refresh results
- During refresh, see items getting refreshed one by one with status updates

## Root Cause Analysis

### How Refresh Status Should Flow

1. Background worker (`background.ts`) updates refresh status in `chrome.storage.session`
2. UI listens for storage changes and reloads refresh status
3. UI displays updated status

### The Problem

The storage change listener in `useChromeMessaging.ts` is listening to the **wrong namespace**:

```typescript
const listener = (
  changes: { [key: string]: StorageChange },
  namespace: string
) => {
  if (namespace === 'local') {  // <-- PROBLEM: listening to 'local'
    handlerRef.current(changes);
  }
};
```

But the refresh status is stored in `chrome.storage.session`:

```typescript
// extensionStorage.ts
const set = async (key: string, value: unknown): Promise<void> => {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    return new Promise((resolve, reject) => {
      chrome.storage.session.set({ [key]: value }, () => {
        // ...
      });
    });
  }
  // ...
};
```

### Why This Breaks Real-Time Updates

1. Background worker writes to `chrome.storage.session`
2. Chrome fires a storage change event with `namespace === 'session'`
3. UI listener checks `if (namespace === 'local')` - **condition is false**
4. Handler is never called
5. UI never reloads refresh status
6. User doesn't see real-time updates

### Why Initial Load Works

Initial load in `reloadRefreshStatus()` directly reads from storage - it doesn't rely on change events. So when the page first loads OR when refresh completes (and sends `LISTING_UPDATED` message), the status is correct.

### Why Final Results Show

When refresh completes:
1. Background sends `{ type: 'LISTING_UPDATED' }` message
2. `useMessageListener` catches this
3. `reloadRefreshStatus()` is called
4. Final status is displayed

But during refresh, no messages are sent - only storage updates happen.

## Solution

1. Fix `useStorageListener` to support different namespaces
2. Use `'session'` namespace for refresh status updates
3. Add a new message type `REFRESH_STATUS_CHANGED` as a backup

## Implementation

### Changes Made

**File: `extension/src/hooks/useChromeMessaging.ts`**

1. Added new message type `REFRESH_STATUS_CHANGED`
2. Updated `useStorageListener` to accept a `namespace` parameter:
   - Default: `'session'`
   - Options: `'session'`, `'local'`, `'all'`

```typescript
export const useStorageListener = (
  handler: (changes: { [key: string]: StorageChange }) => void,
  deps: React.DependencyList = [],
  namespace: 'session' | 'local' | 'all' = 'session'  // NEW parameter
): void => {
  // ...
  const listener = (changes, changedNamespace: string) => {
    if (namespace === 'all' || changedNamespace === namespace) {
      handlerRef.current(changes);
    }
  };
  // ...
};
```

**File: `extension/src/context/AppContext.tsx`**

1. Updated storage listeners to use correct namespaces:
   - `'session'` for refresh status
   - `'local'` for settings
2. Added listener for `REFRESH_STATUS_CHANGED` message

```typescript
// Listen for refresh status storage changes (session storage)
useStorageListener((changes) => {
  if (changes.motorscope_refresh_status) {
    reloadRefreshStatus();
  }
}, [reloadRefreshStatus], 'session');  // Correct namespace

// Listen for settings changes (local storage)
useStorageListener((changes) => {
  if (changes.motorscope_settings || changes.motorscope_gemini_key) {
    reloadSettings();
  }
}, [reloadSettings], 'local');
```

**File: `extension/src/background.ts`**

1. Modified `updateRefreshStatus()` to send a message as backup:

```typescript
const updateRefreshStatus = async (update: Partial<RefreshStatus>): Promise<void> => {
  const current = await getRefreshStatus();
  await setInSessionStorage(STORAGE_KEYS.refreshStatus, { ...current, ...update });
  
  // Notify UI of status change (backup to storage events)
  chrome.runtime.sendMessage({ type: 'REFRESH_STATUS_CHANGED' }).catch(() => {});
};
```

## Testing

1. Open Settings page
2. Click "Sync Now"
3. Verify items appear with "refreshing" spinner one by one
4. Verify items change to checkmark/X when complete
5. Verify countdown timer updates correctly

