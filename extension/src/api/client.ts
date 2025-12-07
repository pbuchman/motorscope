/**
 * API Client for Backend Communication
 *
 * Handles all API calls to the backend for listing operations.
 * Automatically includes authentication token in requests.
 */

import { CarListing, GeminiStats, GeminiCallHistoryEntry } from '../types';
import { getToken } from '../auth/oauthClient';
import { LISTINGS_ENDPOINT_PATH, SETTINGS_ENDPOINT_PATH, DEFAULT_BACKEND_URL, API_PREFIX } from '../auth/config';
import { getBackendUrl } from '../services/settingsService';

const GEMINI_HISTORY_ENDPOINT_PATH = '/gemini-history';

/**
 * API Error class for handling backend errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isAuthError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get the configured backend base URL
 */
const getBaseUrl = async (): Promise<string> => {
  try {
    return await getBackendUrl();
  } catch {
    return DEFAULT_BACKEND_URL;
  }
};

/**
 * Build full API URL from base URL and endpoint
 */
const buildApiUrl = (baseUrl: string, endpoint: string): string => {
  return `${baseUrl}${API_PREFIX}${endpoint}`;
};

/**
 * Make an authenticated API request
 *
 * @param endpoint - API endpoint path (e.g., /listings)
 * @param options - Fetch options
 * @returns Response data
 */
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = await getToken();

  if (!token) {
    throw new ApiError('Not authenticated', 401, true);
  }

  const baseUrl = await getBaseUrl();
  const url = buildApiUrl(baseUrl, endpoint);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const isAuthError = response.status === 401;
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(
      errorData.message || `Request failed: ${response.status}`,
      response.status,
      isAuthError
    );
  }

  return response.json();
};

/**
 * Get all listings for the authenticated user
 *
 * @returns Array of car listings
 */
export const getRemoteListings = async (): Promise<CarListing[]> => {
  return apiRequest<CarListing[]>(LISTINGS_ENDPOINT_PATH);
};

/**
 * Save/sync all listings to the backend (full replacement)
 *
 * @param listings - Array of listings to save
 * @returns Success response
 */
export const saveRemoteListings = async (
  listings: CarListing[]
): Promise<{ success: boolean; count: number }> => {
  return apiRequest<{ success: boolean; count: number }>(LISTINGS_ENDPOINT_PATH, {
    method: 'PUT',
    body: JSON.stringify(listings),
  });
};

/**
 * Add or update a single listing
 *
 * @param listing - Listing to save
 * @returns Saved listing
 */
export const saveRemoteListing = async (listing: CarListing): Promise<CarListing> => {
  return apiRequest<CarListing>(LISTINGS_ENDPOINT_PATH, {
    method: 'POST',
    body: JSON.stringify(listing),
  });
};

/**
 * Delete a listing from the backend
 *
 * @param listingId - ID of the listing to delete
 * @returns Success response
 */
export const deleteRemoteListing = async (
  listingId: string
): Promise<{ success: boolean }> => {
  return apiRequest<{ success: boolean }>(`${LISTINGS_ENDPOINT_PATH}/${listingId}`, {
    method: 'DELETE',
  });
};

/**
 * Check if the backend is healthy
 *
 * @returns Health status
 */
export const checkBackendHealth = async (): Promise<{ status: string; firestore: string }> => {
  const baseUrl = await getBaseUrl();
  const response = await fetch(buildApiUrl(baseUrl, '/healthz'));
  if (!response.ok) {
    throw new Error('Backend health check failed');
  }
  return response.json();
};

// =============================================================================
// Settings API (for remote settings storage when logged in)
// =============================================================================

export interface RemoteSettings {
  geminiApiKey: string;
  checkFrequencyMinutes: number;
  geminiStats: GeminiStats;
}

/**
 * Get user settings from the backend
 */
export const getRemoteSettings = async (): Promise<RemoteSettings> => {
  return apiRequest<RemoteSettings>(SETTINGS_ENDPOINT_PATH);
};

/**
 * Save user settings to the backend
 */
export const saveRemoteSettings = async (settings: RemoteSettings): Promise<RemoteSettings> => {
  return apiRequest<RemoteSettings>(SETTINGS_ENDPOINT_PATH, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

// =============================================================================
// Gemini History API
// =============================================================================

/**
 * Get Gemini API call history from the backend
 */
export const getRemoteGeminiHistory = async (limit: number = 100): Promise<GeminiCallHistoryEntry[]> => {
  return apiRequest<GeminiCallHistoryEntry[]>(`${GEMINI_HISTORY_ENDPOINT_PATH}?limit=${limit}`);
};

/**
 * Add Gemini history entries to the backend
 */
export const addRemoteGeminiHistory = async (
  entries: GeminiCallHistoryEntry | GeminiCallHistoryEntry[]
): Promise<{ success: boolean; count: number }> => {
  return apiRequest<{ success: boolean; count: number }>(GEMINI_HISTORY_ENDPOINT_PATH, {
    method: 'POST',
    body: JSON.stringify(entries),
  });
};

/**
 * Clear all Gemini history on the backend
 */
export const clearRemoteGeminiHistory = async (): Promise<{ success: boolean; deleted: number }> => {
  return apiRequest<{ success: boolean; deleted: number }>(GEMINI_HISTORY_ENDPOINT_PATH, {
    method: 'DELETE',
  });
};

