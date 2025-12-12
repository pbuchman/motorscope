/**
 * Local Storage for Backend Server Configuration
 *
 * Uses chrome.storage.local for persistent storage of the backend server URL.
 * This is the ONLY setting stored locally - all other settings come from the API.
 *
 * Why local storage?
 * - The backend URL must be known BEFORE making API calls
 * - It should persist across browser sessions
 * - It should be independent of authentication state
 */

import {BACKEND_SERVER_OPTIONS, DEFAULT_BACKEND_URL} from './config';

// Storage key for the backend server URL
const STORAGE_KEY_BACKEND_SERVER = 'motorscope_backend_server';

/**
 * Check if running in Chrome extension context with local storage
 */
const isChromeExtension = (): boolean => {
    return typeof chrome !== 'undefined' && !!chrome.storage?.local;
};

/**
 * Get the stored backend server URL from local storage
 * Returns the default (cloud) URL if not set
 */
export const getBackendServerUrl = async (): Promise<string> => {
    if (!isChromeExtension()) {
        // Fallback to localStorage for development
        const stored = localStorage.getItem(STORAGE_KEY_BACKEND_SERVER);
        return stored || DEFAULT_BACKEND_URL;
    }

    return new Promise((resolve) => {
        chrome.storage.local.get(STORAGE_KEY_BACKEND_SERVER, (result) => {
            const stored = result[STORAGE_KEY_BACKEND_SERVER];
            // Validate that stored value is one of the valid options
            if (stored && BACKEND_SERVER_OPTIONS.some(opt => opt.value === stored)) {
                resolve(stored);
            } else {
                resolve(DEFAULT_BACKEND_URL);
            }
        });
    });
};

/**
 * Set the backend server URL in local storage
 */
export const setBackendServerUrl = async (url: string): Promise<void> => {
    // Validate the URL is one of the allowed options
    if (!BACKEND_SERVER_OPTIONS.some(opt => opt.value === url)) {
        throw new Error(`Invalid backend server URL: ${url}`);
    }

    if (!isChromeExtension()) {
        // Fallback to localStorage for development
        localStorage.setItem(STORAGE_KEY_BACKEND_SERVER, url);
        return;
    }

    return new Promise((resolve) => {
        chrome.storage.local.set({[STORAGE_KEY_BACKEND_SERVER]: url}, resolve);
    });
};

/**
 * Clear the backend server URL from local storage (resets to default)
 */
export const clearBackendServerUrl = async (): Promise<void> => {
    if (!isChromeExtension()) {
        localStorage.removeItem(STORAGE_KEY_BACKEND_SERVER);
        return;
    }

    return new Promise((resolve) => {
        chrome.storage.local.remove([STORAGE_KEY_BACKEND_SERVER], resolve);
    });
};

