/**
 * Application Context
 *
 * Manages application state with support for both local and remote storage.
 * - When logged out: uses local storage
 * - When logged in: uses remote backend API for listings and settings
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { CarListing, ExtensionSettings, RefreshStatus, GeminiStats } from '../types';
import {
  getListings as getLocalListings,
  saveListing as saveLocalListing,
  removeListing as removeLocalListing,
} from '../services/storageService';
import {
  getRemoteListings,
  saveRemoteListing,
  deleteRemoteListing,
  getRemoteSettings,
  saveRemoteSettings,
  ApiError,
} from '../api/client';
import {
  getSettings as getLocalSettings,
  saveSettings as saveLocalSettings,
  getRefreshStatus,
  DEFAULT_SETTINGS,
  DEFAULT_REFRESH_STATUS,
  getGeminiStats as getLocalGeminiStats,
  recordGeminiCall as recordLocalGeminiCall,
} from '../services/settingsService';
import { useMessageListener, useStorageListener, useChromeMessaging, MessageTypes } from '../hooks/useChromeMessaging';
import { refreshSingleListing, RefreshResult } from '../services/refreshService';
import { useAuth } from '../auth/AuthContext';

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

  // Error state
  error: string | null;
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

  // Error handling
  clearError: () => void;
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
  const auth = useAuth();
  const isLoggedIn = auth.status === 'logged_in';

  // Data state
  const [listings, setListings] = useState<CarListing[]>([]);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>(DEFAULT_REFRESH_STATUS);

  // Loading states
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Refresh tracking
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  // Error state
  const [error, setError] = useState<string | null>(null);

  const { notifyListingUpdated, rescheduleAlarm } = useChromeMessaging();

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle API errors (especially auth errors)
  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      if (err.isAuthError) {
        // Token expired or invalid - trigger logout
        auth.logout();
        setError('Your session has expired. Please sign in again.');
      } else {
        setError(err.message);
      }
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('An unexpected error occurred');
    }
  }, [auth]);

  // Load listings from appropriate source
  const reloadListings = useCallback(async () => {
    setIsLoadingListings(true);
    clearError();

    try {
      if (isLoggedIn) {
        // Load from remote backend
        const data = await getRemoteListings();
        setListings(data);
      } else {
        // Load from local storage
        const data = await getLocalListings();
        setListings(data);
      }
    } catch (err) {
      console.error('[AppContext] Failed to load listings:', err);
      handleApiError(err);
    } finally {
      setIsLoadingListings(false);
    }
  }, [isLoggedIn, clearError, handleApiError]);

  // Load settings from appropriate source
  const reloadSettings = useCallback(async () => {
    try {
      if (isLoggedIn) {
        // Load from remote backend (except backendUrl which is always local)
        const remoteSettings = await getRemoteSettings();
        const localSettings = await getLocalSettings();
        setSettings({
          geminiApiKey: remoteSettings.geminiApiKey,
          checkFrequencyMinutes: remoteSettings.checkFrequencyMinutes,
          backendUrl: localSettings.backendUrl, // Backend URL is always local
        });
      } else {
        // Load from local storage
        const data = await getLocalSettings();
        setSettings(data);
      }
    } catch (err) {
      console.error('[AppContext] Failed to load settings:', err);
      // Fallback to local settings on error
      try {
        const data = await getLocalSettings();
        setSettings(data);
      } catch {
        // Use defaults
      }
    } finally {
      setIsLoadingSettings(false);
    }
  }, [isLoggedIn]);

  // Load refresh status from storage
  const reloadRefreshStatus = useCallback(async () => {
    try {
      const data = await getRefreshStatus();
      setRefreshStatus(data);
    } catch (err) {
      console.error('[AppContext] Failed to load refresh status:', err);
    }
  }, []);

  // Add or update a listing
  const addListing = useCallback(async (listing: CarListing) => {
    clearError();

    try {
      if (isLoggedIn) {
        // Save to remote backend
        await saveRemoteListing(listing);
      } else {
        // Save to local storage
        await saveLocalListing(listing);
      }
      await reloadListings();
      notifyListingUpdated();
    } catch (err) {
      console.error('[AppContext] Failed to add listing:', err);
      handleApiError(err);
      throw err;
    }
  }, [isLoggedIn, reloadListings, notifyListingUpdated, clearError, handleApiError]);

  // Remove a listing
  const removeListing = useCallback(async (id: string) => {
    clearError();

    try {
      if (isLoggedIn) {
        // Delete from remote backend
        await deleteRemoteListing(id);
      } else {
        // Remove from local storage
        await removeLocalListing(id);
      }
      await reloadListings();
      notifyListingUpdated();
    } catch (err) {
      console.error('[AppContext] Failed to remove listing:', err);
      handleApiError(err);
      throw err;
    }
  }, [isLoggedIn, reloadListings, notifyListingUpdated, clearError, handleApiError]);

  // Refresh a single listing
  const refreshListing = useCallback(async (listing: CarListing): Promise<RefreshResult> => {
    // Add to refreshing set
    setRefreshingIds(prev => new Set(prev).add(listing.id));

    try {
      const result = await refreshSingleListing(listing);

      // Save the updated listing
      if (result.success || result.listing.lastRefreshStatus === 'error') {
        if (isLoggedIn) {
          await saveRemoteListing(result.listing);
        } else {
          await saveLocalListing(result.listing);
        }
        await reloadListings();
        notifyListingUpdated();
      }

      return result;
    } catch (err) {
      handleApiError(err);
      throw err;
    } finally {
      // Remove from refreshing set
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(listing.id);
        return next;
      });
    }
  }, [isLoggedIn, reloadListings, notifyListingUpdated, handleApiError]);

  // Update settings
  const updateSettings = useCallback(async (newSettings: ExtensionSettings) => {
    // Backend URL is always saved locally
    await saveLocalSettings(newSettings);

    if (isLoggedIn) {
      // Save to remote backend (excluding backendUrl)
      try {
        const localStats = await getLocalGeminiStats();
        await saveRemoteSettings({
          geminiApiKey: newSettings.geminiApiKey,
          checkFrequencyMinutes: newSettings.checkFrequencyMinutes,
          geminiStats: localStats,
        });
      } catch (err) {
        console.error('[AppContext] Failed to save remote settings:', err);
        // Don't throw - local settings are still saved
      }
    }

    setSettings(newSettings);

    // Trigger alarm reschedule
    await rescheduleAlarm(newSettings.checkFrequencyMinutes);
  }, [isLoggedIn, rescheduleAlarm]);

  // Initial data load and reload when auth state changes
  useEffect(() => {
    // Don't load while auth is still initializing
    if (auth.status === 'loading') {
      return;
    }

    reloadListings();
    reloadSettings();
    reloadRefreshStatus();
  }, [auth.status, reloadListings, reloadSettings, reloadRefreshStatus]);

  // Listen for cross-tab/extension messages
  useMessageListener((message) => {
    if (message.type === MessageTypes.LISTING_UPDATED) {
      reloadListings();
      reloadRefreshStatus();
    }
  }, [reloadListings, reloadRefreshStatus]);

  // Listen for storage changes (only relevant for local storage mode)
  useStorageListener((changes) => {
    if (!isLoggedIn) {
      if (changes.motorscope_listings) {
        reloadListings();
      }
    }
    if (changes.motorscope_settings || changes.motorscope_gemini_key) {
      reloadSettings();
    }
    if (changes.motorscope_refresh_status) {
      reloadRefreshStatus();
    }
  }, [isLoggedIn, reloadListings, reloadSettings, reloadRefreshStatus]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<AppContextValue>(() => ({
    // State
    listings,
    settings,
    refreshStatus,
    isLoadingListings,
    isLoadingSettings,
    refreshingIds,
    error,

    // Actions
    reloadListings,
    addListing,
    removeListing,
    refreshListing,
    reloadSettings,
    updateSettings,
    reloadRefreshStatus,
    clearError,
  }), [
    listings,
    settings,
    refreshStatus,
    isLoadingListings,
    isLoadingSettings,
    refreshingIds,
    error,
    reloadListings,
    addListing,
    removeListing,
    refreshListing,
    reloadSettings,
    updateSettings,
    reloadRefreshStatus,
    clearError,
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
  const { listings, isLoadingListings, refreshingIds, reloadListings, addListing, removeListing, refreshListing, error, clearError } = useAppContext();
  return {
    listings,
    isLoading: isLoadingListings,
    refreshingIds,
    reload: reloadListings,
    add: addListing,
    remove: removeListing,
    refresh: refreshListing,
    error,
    clearError,
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
