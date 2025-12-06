/**
 * Authentication Context
 *
 * Manages authentication state and provides login/logout functionality.
 * Implements the complete auth flow:
 * - Startup: Check JWT validity, try silent login if expired
 * - Login: Interactive Google OAuth → Backend JWT
 * - Logout: Clear all auth state
 *
 * Also handles the merge flow when logging in with existing local data.
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
  initializeAuth,
  trySilentLogin,
  User,
} from './oauthClient';
import { getRemoteListings, saveRemoteListings } from '../api/client';
import { getListings as getLocalListings, clearAllLocalListings } from '../services/storageService';
import { CarListing } from '../types';

// Re-export User type as UserProfile for backward compatibility
export type UserProfile = User;

/**
 * Auth context state
 */
interface AuthContextState {
  status: 'loading' | 'logged_out' | 'logged_in';
  user: User | null;
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
      mergedMap.set(localListing.id, localListing);
    } else {
      // Merge intelligently - prefer more recent, combine histories
      const localDate = new Date(localListing.lastSeenAt).getTime();
      const remoteDate = new Date(existing.lastSeenAt).getTime();
      const primary = localDate > remoteDate ? localListing : existing;
      const secondary = localDate > remoteDate ? existing : localListing;

      const mergedHistory = mergeListingPriceHistory(
        primary.priceHistory,
        secondary.priceHistory
      );

      mergedMap.set(primary.id, {
        ...primary,
        priceHistory: mergedHistory,
        firstSeenAt: new Date(localListing.firstSeenAt) < new Date(existing.firstSeenAt)
          ? localListing.firstSeenAt
          : existing.firstSeenAt,
      });
    }
  }

  return Array.from(mergedMap.values());
};

/**
 * Merge price histories from two sources
 */
const mergeListingPriceHistory = (
  primary: CarListing['priceHistory'],
  secondary: CarListing['priceHistory']
): CarListing['priceHistory'] => {
  const historyMap = new Map<string, CarListing['priceHistory'][0]>();

  for (const entry of [...primary, ...secondary]) {
    const key = `${entry.date}-${entry.price}-${entry.currency}`;
    if (!historyMap.has(key)) {
      historyMap.set(key, entry);
    }
  }

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
    const init = async () => {
      try {
        // initializeAuth handles:
        // 1. Check stored JWT
        // 2. If valid → logged_in
        // 3. If expired → try silent login
        // 4. If silent fails → logged_out
        const authState = await initializeAuth();

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

    init();
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Complete the login process after merge decision
  const completeLogin = useCallback(async (user: User, token: string) => {
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
      // Interactive login (may show consent screen first time)
      const { user, token } = await loginWithProvider();

      // Check for local data to potentially merge
      const localListings = await getLocalListings();
      const hasLocalData = localListings.length > 0;

      if (!hasLocalData) {
        await completeLogin(user, token);
        setIsLoggingIn(false);
        return;
      }

      // Show merge dialog
      setMergeDialog({
        isOpen: true,
        localCount: localListings.length,
        onMerge: async () => {
          try {
            const remoteListings = await getRemoteListings();
            const mergedListings = mergeListings(localListings, remoteListings);
            await saveRemoteListings(mergedListings);
            await clearAllLocalListings();
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
            await clearAllLocalListings();
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

  // Logout
  const logout = useCallback(async () => {
    try {
      await logoutFromProvider();
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

