/**
 * Authentication Context
 *
 * Manages authentication state and provides login/logout functionality.
 * User must be logged in to use the extension.
 */

import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState,} from 'react';
import {initializeAuth, loginWithProvider, logout as logoutFromProvider, trySilentLogin, User,} from './oauthClient';

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
 * Auth context value exposed to consumers
 */
interface AuthContextValue extends AuthContextState {
    login: () => Promise<void>;
    logout: (backendUrl?: string) => Promise<void>;
    clearError: () => void;
    isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth Provider component
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [state, setState] = useState<AuthContextState>({
        status: 'loading',
        user: null,
        token: null,
        error: null,
    });

    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Initialize auth state on mount
    useEffect(() => {
        const init = async () => {
            try {
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
        setState(prev => ({...prev, error: null}));
    }, []);

    // Login with Google
    const login = useCallback(async () => {
        setIsLoggingIn(true);
        clearError();

        try {
            // First, try silent login (uses cached Google token if available)
            let result = await trySilentLogin();

            // If silent login fails, do interactive login
            if (!result) {
                console.log('[AuthContext] Silent login failed, trying interactive...');
                result = await loginWithProvider();
            }

            const {user, token} = result;

            setState({
                status: 'logged_in',
                user,
                token,
                error: null,
            });
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            const message = error instanceof Error ? error.message : 'Login failed';
            setState(prev => ({...prev, error: message}));
        } finally {
            setIsLoggingIn(false);
        }
    }, [clearError]);

    // Logout
    const logout = useCallback(async (backendUrl?: string) => {
        try {
            await logoutFromProvider(backendUrl);

            setState({
                status: 'logged_out',
                user: null,
                token: null,
                error: null,
            });
        } catch (error) {
            console.error('[AuthContext] Logout failed:', error);
            const message = error instanceof Error ? error.message : 'Logout failed';
            setState(prev => ({...prev, error: message}));
        }
    }, []);

    // Memoize context value
    const contextValue = useMemo<AuthContextValue>(
        () => ({
            ...state,
            login,
            logout,
            clearError,
            isLoggingIn,
        }),
        [state, login, logout, clearError, isLoggingIn]
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


