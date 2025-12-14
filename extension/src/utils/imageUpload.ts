/**
 * Image Upload Utility
 *
 * Handles uploading listing images to the API storage.
 */

import {CarListing} from '@/types';
import {uploadImageFromUrl} from '@/api/client';
import {getBackendServerUrl} from '@/auth/localServerStorage';

/** API path prefix for image endpoints */
const API_IMAGES_PATH = '/api/images/';

/** Placeholder image URL pattern */
const PLACEHOLDER_PATTERN = 'placehold';

/**
 * Upload listing thumbnail to API storage and update the listing
 *
 * @param listing - Listing with external thumbnail URL
 * @returns Updated listing with API thumbnail URL
 */
export async function uploadListingThumbnail(listing: CarListing): Promise<CarListing> {
    const {thumbnailUrl, id} = listing;

    // Skip if already using API storage or placeholder
    if (thumbnailUrl.startsWith(API_IMAGES_PATH) || thumbnailUrl.includes(PLACEHOLDER_PATTERN)) {
        return listing;
    }

    try {
        // Upload image to API storage
        const {url: apiPath} = await uploadImageFromUrl(thumbnailUrl, id);

        // apiPath is already in format: /api/images/userId/listingId/filename.ext
        // Build full API URL for the image
        const backendUrl = await getBackendServerUrl();
        const fullImageUrl = `${backendUrl}${apiPath}`;

        // Return listing with updated thumbnail URL
        return {
            ...listing,
            thumbnailUrl: fullImageUrl,
        };
    } catch (error) {
        console.error('[ImageUpload] Failed to upload thumbnail:', error);
        // Return original listing if upload fails - better to save with external URL than fail
        return listing;
    }
}

/**
 * Check if a URL is an API image URL
 *
 * @param url - URL to check
 * @returns True if the URL is an API image URL
 */
export function isApiImageUrl(url: string): boolean {
    return url.includes(API_IMAGES_PATH);
}

/**
 * Check if a URL is an external image URL
 *
 * @param url - URL to check
 * @returns True if the URL is an external image URL
 */
export function isExternalImageUrl(url: string): boolean {
    return url.startsWith('http') && !isApiImageUrl(url) && !url.includes(PLACEHOLDER_PATTERN);
}
