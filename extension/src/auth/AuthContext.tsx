/**
 * Authentication Context
 *
 * Manages authentication state and provides login/logout functionality.
 * Handles the merge flow when logging in with existing local data.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  loginWithProvider,
  logout as logoutFromProvider,
  getAuthState,
  UserProfile,
  AuthState,
} from './oauthClient';
import { getRemoteListings, saveRemoteListings, ApiError } from '../api/client';
import { getListings as getLocalListings, clearAllLocalListings } from '../services/storageService';
import { CarListing } from '../types';
import { STORAGE_KEY_LOCAL_STATE_PREFIX } from './config';
import { extensionStorage } from '../services/extensionStorage';

/**
 * Auth context state
 */
interface AuthContextState {
  status: 'loading' | 'logged_out' | 'logged_in';
  user: UserProfile | null;
  token: string | null;
  error: string | null;
}

/**
 * Merge dialog state
 */
interface MergeDialogState {
  isOpen: boolean;
  localCount: number;
  onMerge: () => Promise<void>;
  onDiscard: () => Promise<void>;
}

/**
 * Auth context value exposed to consumers
 */
interface AuthContextValue extends AuthContextState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  mergeDialog: MergeDialogState;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Merge local listings into remote listings
 *
 * Strategy:
 * - Use listing.id as the unique key
 * - If a listing exists in both, prefer the one with the more recent lastSeenAt
 * - Add local listings that don't exist in remote
 */
const mergeListings = (
  localListings: CarListing[],
  remoteListings: CarListing[]
): CarListing[] => {
  const mergedMap = new Map<string, CarListing>();

  // Add all remote listings first
  for (const listing of remoteListings) {
    mergedMap.set(listing.id, listing);
  }

  // Merge in local listings
  for (const localListing of localListings) {
    const existing = mergedMap.get(localListing.id);

    if (!existing) {
      // New listing from local, add it
      mergedMap.set(localListing.id, localListing);
    } else {
      // Listing exists in both - merge intelligently
      const localDate = new Date(localListing.lastSeenAt).getTime();
      const remoteDate = new Date(existing.lastSeenAt).getTime();

      if (localDate > remoteDate) {
        // Local is more recent, use it but merge price histories
        const mergedHistory = mergeListingPriceHistory(
          localListing.priceHistory,
          existing.priceHistory
        );
        mergedMap.set(localListing.id, {
          ...localListing,
          priceHistory: mergedHistory,
          // Preserve earliest firstSeenAt
          firstSeenAt: new Date(localListing.firstSeenAt) < new Date(existing.firstSeenAt)
            ? localListing.firstSeenAt
            : existing.firstSeenAt,
        });
      } else {
        // Remote is more recent, keep it but merge price histories
        const mergedHistory = mergeListingPriceHistory(
          existing.priceHistory,
          localListing.priceHistory
        );
        mergedMap.set(existing.id, {
          ...existing,
          priceHistory: mergedHistory,
          firstSeenAt: new Date(localListing.firstSeenAt) < new Date(existing.firstSeenAt)
            ? localListing.firstSeenAt
            : existing.firstSeenAt,
        });
      }
    }
  }

  return Array.from(mergedMap.values());
};

/**
 * Merge price histories from two sources, removing duplicates
 */
const mergeListingPriceHistory = (
  primary: CarListing['priceHistory'],
  secondary: CarListing['priceHistory']
): CarListing['priceHistory'] => {
  const historyMap = new Map<string, CarListing['priceHistory'][0]>();

  // Add all entries, using date as key to dedupe
  for (const entry of [...primary, ...secondary]) {
    const key = `${entry.date}-${entry.price}-${entry.currency}`;
    if (!historyMap.has(key)) {
      historyMap.set(key, entry);
    }
  }

  // Sort by date ascending
  return Array.from(historyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

/**
 * Auth Provider component
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthContextState>({
    status: 'loading',
    user: null,
    token: null,
    error: null,
  });

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<MergeDialogState>({
    isOpen: false,
    localCount: 0,
    onMerge: async () => {},
    onDiscard: async () => {},
  });

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const authState = await getAuthState();
        setState({
          status: authState.status,
          user: authState.user,
          token: authState.token,
          error: null,
        });
      } catch (error) {
        console.error('[AuthContext] Failed to initialize auth:', error);
        setState({
          status: 'logged_out',
          user: null,
          token: null,
          error: null,
        });
      }
    };

    initAuth();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Complete the login process after merge decision
  const completeLogin = useCallback(async (user: UserProfile, token: string) => {
    setState({
      status: 'logged_in',
      user,
      token,
      error: null,
    });
  }, []);

  // Login with Google
  const login = useCallback(async () => {
    setIsLoggingIn(true);
    clearError();

    try {
      // Step 1: Authenticate with Google and backend
      const { user, token } = await loginWithProvider();

      // Step 2: Check for local data
      const localListings = await getLocalListings();
      const hasLocalData = localListings.length > 0;

      if (!hasLocalData) {
        // No local data, just complete login
        await completeLogin(user, token);
        setIsLoggingIn(false);
        return;
      }

      // Step 3: Show merge dialog
      setMergeDialog({
        isOpen: true,
        localCount: localListings.length,
        onMerge: async () => {
          try {
            // Fetch remote listings
            const remoteListings = await getRemoteListings();

            // Merge local into remote
            const mergedListings = mergeListings(localListings, remoteListings);

            // Save merged listings to backend
            await saveRemoteListings(mergedListings);

            // Clear local listings
            await clearAllLocalListings();

            // Close dialog and complete login
            setMergeDialog(prev => ({ ...prev, isOpen: false }));
            await completeLogin(user, token);
          } catch (error) {
            console.error('[AuthContext] Merge failed:', error);
            const message = error instanceof Error ? error.message : 'Merge failed';
            setState(prev => ({ ...prev, error: message }));
          } finally {
            setIsLoggingIn(false);
          }
        },
        onDiscard: async () => {
          try {
            // Just clear local listings
            await clearAllLocalListings();

            // Close dialog and complete login
            setMergeDialog(prev => ({ ...prev, isOpen: false }));
            await completeLogin(user, token);
          } catch (error) {
            console.error('[AuthContext] Discard failed:', error);
            const message = error instanceof Error ? error.message : 'Failed to clear local data';
            setState(prev => ({ ...prev, error: message }));
          } finally {
            setIsLoggingIn(false);
          }
        },
      });
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({ ...prev, error: message }));
      setIsLoggingIn(false);
    }
  }, [clearError, completeLogin]);

  // Logout - clears auth state and local listings
  const logout = useCallback(async () => {
    try {
      await logoutFromProvider();

      // Clear local listings so user starts fresh
      await clearAllLocalListings();

      setState({
        status: 'logged_out',
        user: null,
        token: null,
        error: null,
      });
    } catch (error) {
      console.error('[AuthContext] Logout failed:', error);
      const message = error instanceof Error ? error.message : 'Logout failed';
      setState(prev => ({ ...prev, error: message }));
    }
  }, []);

  // Memoize context value
  const contextValue = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      clearError,
      mergeDialog,
      isLoggingIn,
    }),
    [state, login, logout, clearError, mergeDialog, isLoggingIn]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { status } = useAuth();
  return status === 'logged_in';
};

