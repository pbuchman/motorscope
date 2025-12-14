/**
 * Google Cloud Storage Service
 *
 * Handles image upload, download, and deletion using Google Cloud Storage.
 * Images are stored with a 30-day expiration after deletion.
 */

import {Storage} from '@google-cloud/storage';
import {GCS_BUCKET_NAME, GCP_PROJECT_ID, IMAGE_DELETION_EXPIRATION_DAYS, IMAGE_MAX_SIZE_BYTES} from './config.js';

/** GCS client instance */
let storageClient: Storage | null = null;

/**
 * Get or create GCS client instance
 */
function getStorageClient(): Storage {
    if (!storageClient) {
        storageClient = new Storage({
            projectId: GCP_PROJECT_ID,
        });
    }
    return storageClient;
}

/**
 * Get the GCS bucket instance
 */
function getBucket() {
    const storage = getStorageClient();
    return storage.bucket(GCS_BUCKET_NAME);
}

/**
 * Upload image to GCS
 *
 * @param imageBuffer - Image data as buffer
 * @param contentType - MIME type of the image
 * @param userId - User ID for organizing images
 * @param listingId - Listing ID for organizing images
 * @returns API URL path and GCS file path
 */
export async function uploadImage(
    imageBuffer: Buffer,
    contentType: string,
    userId: string,
    listingId: string,
): Promise<{url: string; path: string}> {
    const bucket = getBucket();
    const timestamp = Date.now();
    const ext = getExtensionFromContentType(contentType);
    const filePath = `images/${userId}/${listingId}/${timestamp}${ext}`;
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
        metadata: {
            contentType,
            metadata: {
                userId,
                listingId,
                uploadedAt: new Date().toISOString(),
            },
        },
        public: false,
        validation: 'crc32c',
    });

    // Return API path format: /api/images/userId/listingId/filename.ext
    const filename = `${timestamp}${ext}`;
    const apiPath = `/api/images/${userId}/${listingId}/${filename}`;

    return {url: apiPath, path: filePath};
}

/**
 * Download image from external URL
 *
 * @param imageUrl - External image URL
 * @returns Image buffer and content type
 */
export async function downloadImageFromUrl(
    imageUrl: string,
): Promise<{buffer: Buffer; contentType: string}> {
    const response = await fetch(imageUrl);

    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate content type
    if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
    }

    // Validate file size (max 10MB)
    if (buffer.length > IMAGE_MAX_SIZE_BYTES) {
        throw new Error('Image too large (max 10MB)');
    }

    return {buffer, contentType};
}

/**
 * Get image metadata from GCS
 *
 * @param filePath - Path to the file in GCS
 * @returns Image metadata including public URL
 */
export async function getImageMetadata(filePath: string): Promise<{
    url: string;
    contentType: string;
    size: number;
    created: string;
}> {
    const bucket = getBucket();
    const file = bucket.file(filePath);

    const [metadata] = await file.getMetadata();

    // Generate signed URL valid for 7 days
    const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return {
        url,
        contentType: metadata.contentType || 'image/jpeg',
        size: typeof metadata.size === 'string' ? parseInt(metadata.size, 10) : (metadata.size || 0),
        created: metadata.timeCreated || new Date().toISOString(),
    };
}

/**
 * Delete image from GCS by setting lifecycle expiration
 *
 * @param filePath - Path to the file in GCS
 * @returns True if deletion was scheduled successfully
 */
export async function scheduleImageDeletion(filePath: string): Promise<boolean> {
    const bucket = getBucket();
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
        return false;
    }

    // Set metadata to mark for deletion
    // Note: GCS lifecycle rules will handle actual deletion based on custom metadata
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + IMAGE_DELETION_EXPIRATION_DAYS);

    await file.setMetadata({
        metadata: {
            scheduledDeletion: expirationDate.toISOString(),
            deletedAt: new Date().toISOString(),
        },
    });

    return true;
}

/**
 * Check GCS health (bucket accessibility)
 */
export async function checkStorageHealth(): Promise<boolean> {
    try {
        const bucket = getBucket();
        await bucket.getMetadata();
        return true;
    } catch (error) {
        console.error('GCS health check failed:', error);
        return false;
    }
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
    };
    return typeMap[contentType] || '.jpg';
}
