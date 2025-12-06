/**
 * API Client for Backend Communication
 *
 * Handles all API calls to the backend for listing operations.
 * Automatically includes authentication token in requests.
 */

import { CarListing } from '../types';
import { getToken } from '../auth/oauthClient';
import { BACKEND_BASE_URL, LISTINGS_ENDPOINT_PATH } from '../auth/config';

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
 * Make an authenticated API request
 *
 * @param endpoint - API endpoint path
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

  const url = `${BACKEND_BASE_URL}${endpoint}`;

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
  const response = await fetch(`${BACKEND_BASE_URL}/healthz`);
  if (!response.ok) {
    throw new Error('Backend health check failed');
  }
  return response.json();
};

