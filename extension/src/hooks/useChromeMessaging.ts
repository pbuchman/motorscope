import { useEffect, useCallback, useRef } from 'react';

/**
 * Message types for extension communication
 */
export const MessageTypes = {
  LISTING_UPDATED: 'LISTING_UPDATED',
  TRIGGER_MANUAL_REFRESH: 'TRIGGER_MANUAL_REFRESH',
  RESCHEDULE_ALARM: 'RESCHEDULE_ALARM',
  REFRESH_STATUS_CHANGED: 'REFRESH_STATUS_CHANGED',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];

export interface ExtensionMessage {
  type: MessageType;
  [key: string]: unknown;
}

/**
 * Storage change event shape
 */
interface StorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Check if running in Chrome extension context
 */
export const isChromeExtension = (): boolean => {
  try {
    return typeof chrome !== 'undefined' &&
           typeof chrome.runtime !== 'undefined' &&
           typeof chrome.runtime.getURL === 'function';
  } catch {
    return false;
  }
};

/**
 * Check if Chrome storage is available
 */
export const hasChromeStorage = (): boolean => {
  return typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined';
};

/**
 * Send a message via Chrome runtime
 * Falls back silently in non-extension context
 */
export const sendMessage = async <T = unknown>(message: ExtensionMessage): Promise<T | null> => {
  if (!isChromeExtension()) {
    console.debug('[MotorScope] Not in extension context, skipping message:', message.type);
    return null;
  }

  try {
    const response = await chrome.runtime.sendMessage(message);
    return response as T;
  } catch (error) {
    // Connection errors are expected when no listeners exist
    if ((error as Error)?.message?.includes('Receiving end does not exist')) {
      console.debug('[MotorScope] No listener for message:', message.type);
      return null;
    }
    console.error('[MotorScope] Message send failed:', error);
    throw error;
  }
};

/**
 * Hook to listen for Chrome runtime messages
 */
export const useMessageListener = (
  handler: (message: ExtensionMessage) => void,
  deps: React.DependencyList = []
): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!isChromeExtension() || !chrome.runtime.onMessage) {
      return;
    }

    const listener = (message: ExtensionMessage) => {
      handlerRef.current(message);
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * Hook to listen for Chrome storage changes
 *
 * @param handler - Callback for storage changes
 * @param deps - React dependency list
 * @param namespace - Storage namespace to listen to ('session', 'local', or 'all')
 */
export const useStorageListener = (
  handler: (changes: { [key: string]: StorageChange }) => void,
  deps: React.DependencyList = [],
  namespace: 'session' | 'local' | 'all' = 'session'
): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!hasChromeStorage()) {
      return;
    }

    const listener = (
      changes: { [key: string]: StorageChange },
      changedNamespace: string
    ) => {
      // Filter by namespace
      if (namespace === 'all' || changedNamespace === namespace) {
        handlerRef.current(changes);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

/**
 * Hook for common extension messaging patterns
 */
export const useChromeMessaging = () => {
  const notifyListingUpdated = useCallback(() => {
    sendMessage({ type: MessageTypes.LISTING_UPDATED });
  }, []);

  const triggerManualRefresh = useCallback(async () => {
    return sendMessage<{ success: boolean; error?: string }>({
      type: MessageTypes.TRIGGER_MANUAL_REFRESH,
    });
  }, []);

  const rescheduleAlarm = useCallback(async (minutes: number) => {
    return sendMessage({
      type: MessageTypes.RESCHEDULE_ALARM,
      minutes,
    });
  }, []);

  return {
    notifyListingUpdated,
    triggerManualRefresh,
    rescheduleAlarm,
    sendMessage,
    isChromeExtension: isChromeExtension(),
  };
};
