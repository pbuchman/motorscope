/**
 * Image Upload Utility
 *
 * Handles uploading listing images to the API storage.
 */

import {CarListing} from '@/types';
import {uploadImageFromUrl} from '@/api/client';

/** GCS storage URL pattern */
const GCS_STORAGE_PATTERN = 'storage.googleapis.com';

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

    // Skip if already using GCS storage or placeholder
    if (thumbnailUrl.includes(GCS_STORAGE_PATTERN) || thumbnailUrl.includes(PLACEHOLDER_PATTERN)) {
        return listing;
    }

    try {
        // Upload image to API storage
        // API returns full GCS URL (https://storage.googleapis.com/...)
        const {url: gcsUrl} = await uploadImageFromUrl(thumbnailUrl, id);

        // Return listing with updated thumbnail URL
        return {
            ...listing,
            thumbnailUrl: gcsUrl,
        };
    } catch (error) {
        console.error('[ImageUpload] Failed to upload thumbnail:', error);
        // Return original listing if upload fails - better to save with external URL than fail
        return listing;
    }
}

/**
 * Check if a URL is a GCS storage URL (uploaded via API)
 *
 * @param url - URL to check
 * @returns True if the URL is a GCS storage URL
 */
export function isApiImageUrl(url: string): boolean {
    return url.includes(GCS_STORAGE_PATTERN);
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
