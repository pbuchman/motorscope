/**
 * Firestore Database Service
 *
 * Initializes Firestore using Application Default Credentials (ADC).
 * On Cloud Run, ADC automatically uses the service account assigned to the service.
 *
 * IMPORTANT: Ensure the Cloud Run service account has the following IAM roles:
 * - roles/datastore.user (for Firestore read/write)
 *
 * INDEXING NOTE:
 * The "listings" collection requires a single-field index on the "userId" field
 * for efficient queries. This index is typically auto-created by Firestore,
 * but you can verify/create it in the Firebase Console:
 * 1. Go to Firestore > Indexes
 * 2. Ensure "listings" collection has an index on "userId" (Ascending)
 */

import {Firestore, Timestamp} from '@google-cloud/firestore';
import {
    FIRESTORE_DATABASE_ID,
    FIRESTORE_GEMINI_HISTORY_COLLECTION,
    FIRESTORE_LISTINGS_COLLECTION,
    FIRESTORE_LISTINGS_USER_FIELD,
    FIRESTORE_TOKEN_BLACKLIST_COLLECTION,
    FIRESTORE_USERS_COLLECTION,
    GCP_PROJECT_ID,
} from './config.js';
import type {
    CarListing,
    GeminiCallHistoryEntry,
    GeminiHistoryDocument,
    ListingDocument,
    User,
    UserSettings
} from './types.js';

// Initialize Firestore with ADC
// Cloud Run automatically provides credentials via the service account
const firestore = new Firestore({
    projectId: GCP_PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID,
});

// Collection references
const usersCollection = firestore.collection(FIRESTORE_USERS_COLLECTION);
const listingsCollection = firestore.collection(FIRESTORE_LISTINGS_COLLECTION);

// =============================================================================
// User Operations
// =============================================================================

/**
 * Get a user by their internal ID
 */
export async function getUserById(userId: string): Promise<User | null> {
    const doc = await usersCollection.doc(userId).get();
    if (!doc.exists) {
        return null;
    }
    return doc.data() as User;
}

/**
 * Create or update a user document
 * Used during authentication to upsert user on login
 */
export async function upsertUser(user: User): Promise<User> {
    const docRef = usersCollection.doc(user.id);
    const existingDoc = await docRef.get();

    if (existingDoc.exists) {
        // Update existing user - only update lastLoginAt
        await docRef.update({
            lastLoginAt: user.lastLoginAt,
            // Update displayName if provided and different
            ...(user.displayName && {displayName: user.displayName}),
        });
        const updated = await docRef.get();
        return updated.data() as User;
    } else {
        // Create new user
        await docRef.set(user);
        return user;
    }
}

// =============================================================================
// Listing Operations
// =============================================================================

/**
 * Get all listings for a specific user
 *
 * INDEXING: This query uses a simple where() on userId field.
 * Firestore will use a single-field index on "userId" which is
 * automatically created. No composite index required.
 */
export async function getListingsByUserId(userId: string): Promise<ListingDocument[]> {
    // Query listings where userId matches
    // This uses the single-field index on FIRESTORE_LISTINGS_USER_FIELD
    const snapshot = await listingsCollection
        .where(FIRESTORE_LISTINGS_USER_FIELD, '==', userId)
        .get();

    const listings: ListingDocument[] = [];
    snapshot.forEach((doc) => {
        listings.push({
            ...doc.data() as ListingDocument,
            docId: doc.id,
        });
    });

    return listings;
}

/**
 * Get a single listing by ID for a specific user
 */
export async function getListingById(
    listingId: string,
    userId: string
): Promise<ListingDocument | null> {
    const doc = await listingsCollection.doc(listingId).get();

    if (!doc.exists) {
        return null;
    }

    const listing = doc.data() as ListingDocument;

    // Verify ownership
    if (listing.userId !== userId) {
        return null;
    }

    return {...listing, docId: doc.id};
}

/**
 * Save or update a single listing
 */
export async function saveListing(
    listing: CarListing,
    userId: string
): Promise<ListingDocument> {
    const listingDoc: ListingDocument = {
        ...listing,
        userId,
    };

    // Use listing.id as the document ID for easy lookup
    await listingsCollection.doc(listing.id).set(listingDoc);

    return listingDoc;
}

/**
 * Save multiple listings for a user (batch operation)
 * This replaces all listings for the user with the provided list
 */
export async function saveAllListings(
    listings: CarListing[],
    userId: string
): Promise<ListingDocument[]> {
    // Get existing listings to determine what to delete
    const existingListings = await getListingsByUserId(userId);
    const newIds = new Set(listings.map((l) => l.id));

    // Use batched writes for atomicity
    const batch = firestore.batch();

    // Delete listings that are no longer in the new list
    for (const existing of existingListings) {
        if (!newIds.has(existing.id)) {
            batch.delete(listingsCollection.doc(existing.id));
        }
    }

    // Add or update listings
    const savedListings: ListingDocument[] = [];
    for (const listing of listings) {
        const listingDoc: ListingDocument = {
            ...listing,
            userId,
        };
        batch.set(listingsCollection.doc(listing.id), listingDoc);
        savedListings.push(listingDoc);
    }

    // Commit the batch
    await batch.commit();

    return savedListings;
}

/**
 * Delete a listing by ID (with ownership check)
 */
export async function deleteListing(
    listingId: string,
    userId: string
): Promise<boolean> {
    const listing = await getListingById(listingId, userId);

    if (!listing) {
        return false;
    }

    await listingsCollection.doc(listingId).delete();
    return true;
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check Firestore connectivity
 * Performs a simple list operation to verify the connection
 */
export async function checkFirestoreHealth(): Promise<boolean> {
    try {
        // Try to list collections (lightweight operation)
        await firestore.listCollections();
        return true;
    } catch (error) {
        console.error('Firestore health check failed:', error);
        return false;
    }
}

// =============================================================================
// Settings Operations
// =============================================================================

const settingsCollection = firestore.collection('settings');
const geminiHistoryCollection = firestore.collection(FIRESTORE_GEMINI_HISTORY_COLLECTION);

/** Default settings for new users */
const DEFAULT_SETTINGS: Omit<UserSettings, 'userId' | 'updatedAt'> = {
    geminiApiKey: '',
    checkFrequencyMinutes: 60,
    geminiStats: {
        allTimeTotalCalls: 0,
        totalCalls: 0,
        successCount: 0,
        errorCount: 0,
    },
};

/**
 * Get settings for a user
 * Returns default settings if none exist
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
    const doc = await settingsCollection.doc(userId).get();

    if (!doc.exists) {
        return {
            ...DEFAULT_SETTINGS,
            userId,
            updatedAt: new Date().toISOString(),
        };
    }

    return doc.data() as UserSettings;
}

/**
 * Save or update user settings
 */
export async function saveUserSettings(
    userId: string,
    settings: Partial<Omit<UserSettings, 'userId' | 'updatedAt'>>
): Promise<UserSettings> {
    const existingSettings = await getUserSettings(userId);

    const updatedSettings: UserSettings = {
        ...existingSettings,
        ...settings,
        userId,
        updatedAt: new Date().toISOString(),
    };

    await settingsCollection.doc(userId).set(updatedSettings);

    return updatedSettings;
}

// =============================================================================
// Gemini History Operations
// =============================================================================

/**
 * Get Gemini call history for a user
 * Returns the most recent entries, ordered by timestamp descending
 */
export async function getGeminiHistory(
    userId: string,
    limit: number = 100
): Promise<GeminiCallHistoryEntry[]> {
    const snapshot = await geminiHistoryCollection
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

    const history: GeminiCallHistoryEntry[] = [];
    snapshot.forEach((doc) => {
        const data = doc.data() as GeminiHistoryDocument;
        // Remove userId from returned data
        const {userId: _uid, ...entry} = data;
        history.push(entry);
    });

    return history;
}

/**
 * Add a new Gemini history entry
 */
export async function addGeminiHistoryEntry(
    entry: GeminiCallHistoryEntry,
    userId: string
): Promise<GeminiHistoryDocument> {
    const historyDoc: GeminiHistoryDocument = {
        ...entry,
        userId,
    };

    // Use the entry's id as the document ID
    await geminiHistoryCollection.doc(entry.id).set(historyDoc);

    return historyDoc;
}

/**
 * Add multiple Gemini history entries (batch operation)
 */
export async function addGeminiHistoryEntries(
    entries: GeminiCallHistoryEntry[],
    userId: string
): Promise<void> {
    if (entries.length === 0) return;

    const batch = firestore.batch();

    for (const entry of entries) {
        const historyDoc: GeminiHistoryDocument = {
            ...entry,
            userId,
        };
        batch.set(geminiHistoryCollection.doc(entry.id), historyDoc);
    }

    await batch.commit();
}

/**
 * Clear all Gemini history for a user
 */
export async function clearGeminiHistory(userId: string): Promise<number> {
    const snapshot = await geminiHistoryCollection
        .where('userId', '==', userId)
        .get();

    if (snapshot.empty) {
        return 0;
    }

    const batch = firestore.batch();
    snapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    return snapshot.size;
}

// =============================================================================
// Token Blacklist Operations (for logout/token invalidation)
// =============================================================================

const tokenBlacklistCollection = firestore.collection(FIRESTORE_TOKEN_BLACKLIST_COLLECTION);

/**
 * Token blacklist entry stored in Firestore
 *
 * IMPORTANT: The `expireAt` field is a Firestore Timestamp used for automatic
 * TTL (Time-To-Live) deletion. You MUST configure TTL in Firebase Console:
 *
 * 1. Go to Firebase Console > Firestore Database
 * 2. Click on "Time-to-live" in the left sidebar
 * 3. Click "Create policy"
 * 4. Collection group: "token_blacklist"
 * 5. Timestamp field: "expireAt"
 * 6. Click "Create"
 *
 * Once configured, Firestore will automatically delete documents
 * when their `expireAt` timestamp is reached (within 24-72 hours typically).
 */
interface BlacklistedToken {
    /** JWT ID or hash - unique identifier for the token */
    tokenId: string;
    /** User ID who owned the token */
    userId: string;
    /** When the token was blacklisted (ISO string for readability) */
    blacklistedAt: string;
    /** When the token expires - Firestore Timestamp for TTL auto-deletion */
    expireAt: Timestamp;
}

/**
 * Add a token to the blacklist (called on logout)
 *
 * The token will be automatically deleted by Firestore TTL after it expires.
 *
 * @param tokenId - Unique identifier for the token (jti claim or hash)
 * @param userId - User ID who owned the token
 * @param expiresAt - Token expiration timestamp
 */
export async function blacklistToken(
    tokenId: string,
    userId: string,
    expiresAt: Date
): Promise<void> {
    const entry: BlacklistedToken = {
        tokenId,
        userId,
        blacklistedAt: new Date().toISOString(),
        expireAt: Timestamp.fromDate(expiresAt),
    };

    await tokenBlacklistCollection.doc(tokenId).set(entry);
    console.log(`[DB] Token blacklisted for user ${userId}, expires at ${expiresAt.toISOString()}`);
}

/**
 * Check if a token is blacklisted
 *
 * @param tokenId - Unique identifier for the token
 * @returns true if token is blacklisted (invalid)
 */
export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
    const doc = await tokenBlacklistCollection.doc(tokenId).get();
    return doc.exists;
}

/**
 * Clean up expired tokens from the blacklist
 *
 * NOTE: If Firestore TTL is configured, this is not strictly necessary
 * as documents will be auto-deleted. However, this can be used for:
 * - Immediate cleanup before TTL kicks in
 * - Testing/development environments
 * - Backup cleanup if TTL is not configured
 *
 * @returns Number of tokens cleaned up
 */
export async function cleanupExpiredBlacklistedTokens(): Promise<number> {
    const now = Timestamp.now();

    const snapshot = await tokenBlacklistCollection
        .where('expireAt', '<', now)
        .limit(500) // Process in batches
        .get();

    if (snapshot.empty) {
        return 0;
    }

    const batch = firestore.batch();
    snapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`[DB] Cleaned up ${snapshot.size} expired blacklisted tokens`);

    return snapshot.size;
}

// Export firestore instance for advanced use cases
export {firestore};

