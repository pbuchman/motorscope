import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { CarListing, ExtensionSettings, RefreshStatus } from '../types';
import { getListings, saveListing, removeListing as removeListingFromStorage } from '../services/storageService';
import { getSettings, saveSettings as saveSettingsToStorage, getRefreshStatus, DEFAULT_SETTINGS, DEFAULT_REFRESH_STATUS } from '../services/settingsService';
import { useMessageListener, useStorageListener, useChromeMessaging, MessageTypes } from '../hooks/useChromeMessaging';
import { refreshSingleListing, RefreshResult } from '../services/refreshService';

/**
 * Application state interface
 */
interface AppState {
  // Data
  listings: CarListing[];
  settings: ExtensionSettings;
  refreshStatus: RefreshStatus;

  // Loading states
  isLoadingListings: boolean;
  isLoadingSettings: boolean;

  // Refresh state
  refreshingIds: Set<string>;
}

/**
 * Application actions interface
 */
interface AppActions {
  // Listings
  reloadListings: () => Promise<void>;
  addListing: (listing: CarListing) => Promise<void>;
  removeListing: (id: string) => Promise<void>;
  refreshListing: (listing: CarListing) => Promise<RefreshResult>;

  // Settings
  reloadSettings: () => Promise<void>;
  updateSettings: (settings: ExtensionSettings) => Promise<void>;

  // Refresh status
  reloadRefreshStatus: () => Promise<void>;
}

/**
 * Combined context value
 */
interface AppContextValue extends AppState, AppActions {}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Provider component for application state
 */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Data state
  const [listings, setListings] = useState<CarListing[]>([]);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>(DEFAULT_REFRESH_STATUS);

  // Loading states
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Refresh tracking
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const { notifyListingUpdated, rescheduleAlarm } = useChromeMessaging();

  // Load listings from storage
  const reloadListings = useCallback(async () => {
    try {
      const data = await getListings();
      setListings(data);
    } catch (error) {
      console.error('[AppContext] Failed to load listings:', error);
    } finally {
      setIsLoadingListings(false);
    }
  }, []);

  // Load settings from storage
  const reloadSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('[AppContext] Failed to load settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Load refresh status from storage
  const reloadRefreshStatus = useCallback(async () => {
    try {
      const data = await getRefreshStatus();
      setRefreshStatus(data);
    } catch (error) {
      console.error('[AppContext] Failed to load refresh status:', error);
    }
  }, []);

  // Add or update a listing
  const addListing = useCallback(async (listing: CarListing) => {
    await saveListing(listing);
    await reloadListings();
    notifyListingUpdated();
  }, [reloadListings, notifyListingUpdated]);

  // Remove a listing
  const removeListing = useCallback(async (id: string) => {
    await removeListingFromStorage(id);
    await reloadListings();
    notifyListingUpdated();
  }, [reloadListings, notifyListingUpdated]);

  // Refresh a single listing
  const refreshListing = useCallback(async (listing: CarListing): Promise<RefreshResult> => {
    // Add to refreshing set
    setRefreshingIds(prev => new Set(prev).add(listing.id));

    try {
      const result = await refreshSingleListing(listing);

      // Save the updated listing
      if (result.success || result.listing.lastRefreshStatus === 'error') {
        await saveListing(result.listing);
        await reloadListings();
        notifyListingUpdated();
      }

      return result;
    } finally {
      // Remove from refreshing set
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(listing.id);
        return next;
      });
    }
  }, [reloadListings, notifyListingUpdated]);

  // Update settings
  const updateSettings = useCallback(async (newSettings: ExtensionSettings) => {
    await saveSettingsToStorage(newSettings);
    setSettings(newSettings);

    // Trigger alarm reschedule
    await rescheduleAlarm(newSettings.checkFrequencyMinutes);
  }, [rescheduleAlarm]);

  // Initial data load
  useEffect(() => {
    reloadListings();
    reloadSettings();
    reloadRefreshStatus();
  }, [reloadListings, reloadSettings, reloadRefreshStatus]);

  // Listen for cross-tab/extension messages
  useMessageListener((message) => {
    if (message.type === MessageTypes.LISTING_UPDATED) {
      reloadListings();
      reloadRefreshStatus();
    }
  }, [reloadListings, reloadRefreshStatus]);

  // Listen for storage changes
  useStorageListener((changes) => {
    if (changes.motorscope_listings) {
      reloadListings();
    }
    if (changes.motorscope_settings || changes.motorscope_gemini_key) {
      reloadSettings();
    }
    if (changes.motorscope_refresh_status) {
      reloadRefreshStatus();
    }
  }, [reloadListings, reloadSettings, reloadRefreshStatus]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<AppContextValue>(() => ({
    // State
    listings,
    settings,
    refreshStatus,
    isLoadingListings,
    isLoadingSettings,
    refreshingIds,

    // Actions
    reloadListings,
    addListing,
    removeListing,
    refreshListing,
    reloadSettings,
    updateSettings,
    reloadRefreshStatus,
  }), [
    listings,
    settings,
    refreshStatus,
    isLoadingListings,
    isLoadingSettings,
    refreshingIds,
    reloadListings,
    addListing,
    removeListing,
    refreshListing,
    reloadSettings,
    updateSettings,
    reloadRefreshStatus,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * Hook to access the app context
 * Throws if used outside of AppProvider
 */
export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

/**
 * Hook for listings-specific state and actions
 */
export const useListings = () => {
  const { listings, isLoadingListings, refreshingIds, reloadListings, addListing, removeListing, refreshListing } = useAppContext();
  return {
    listings,
    isLoading: isLoadingListings,
    refreshingIds,
    reload: reloadListings,
    add: addListing,
    remove: removeListing,
    refresh: refreshListing,
  };
};

/**
 * Hook for settings-specific state and actions
 */
export const useSettings = () => {
  const { settings, isLoadingSettings, reloadSettings, updateSettings } = useAppContext();
  return {
    settings,
    isLoading: isLoadingSettings,
    reload: reloadSettings,
    update: updateSettings,
  };
};

/**
 * Hook for refresh status
 */
export const useRefreshStatus = () => {
  const { refreshStatus, reloadRefreshStatus } = useAppContext();
  return {
    status: refreshStatus,
    reload: reloadRefreshStatus,
  };
};

