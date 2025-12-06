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

import { Firestore } from '@google-cloud/firestore';
import {
  GCP_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  FIRESTORE_USERS_COLLECTION,
  FIRESTORE_LISTINGS_COLLECTION,
  FIRESTORE_LISTINGS_USER_FIELD,
} from './config.js';
import type { User, ListingDocument, CarListing, UserSettings } from './types.js';

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
      ...(user.displayName && { displayName: user.displayName }),
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

  return { ...listing, docId: doc.id };
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
  const existingIds = new Set(existingListings.map((l) => l.id));
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

/** Default settings for new users */
const DEFAULT_SETTINGS: Omit<UserSettings, 'userId' | 'updatedAt'> = {
  geminiApiKey: '',
  checkFrequencyMinutes: 60,
  geminiStats: {
    allTimeTotalCalls: 0,
    totalCalls: 0,
    successCount: 0,
    errorCount: 0,
    history: [],
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

// Export firestore instance for advanced use cases
export { firestore };

