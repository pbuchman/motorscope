import { CarListing } from "../types";
import { extensionStorage } from "./extensionStorage";
import { normalizeUrl } from "../utils/formatters";
import { STORAGE_KEYS } from "./settingsService";

export const getListings = async (): Promise<CarListing[]> => {
  const data = await extensionStorage.get<CarListing[]>(STORAGE_KEYS.listings);
  return data || [];
};

/**
 * Clear all local listings (used when switching to remote storage)
 */
export const clearAllLocalListings = async (): Promise<void> => {
  await extensionStorage.set(STORAGE_KEYS.listings, []);
};


export const saveListing = async (listing: CarListing): Promise<void> => {
  const listings = await getListings();
  const normalizedUrl = normalizeUrl(listing.source.url);

  // Find by ID or normalized URL
  const existingIndex = listings.findIndex((l) =>
    l.id === listing.id || normalizeUrl(l.source.url) === normalizedUrl
  );

  if (existingIndex >= 0) {
    // Update existing, preserving history and timestamps
    const existing = listings[existingIndex];
    
    // Check if price changed during this manual re-save
    if (existing.currentPrice !== listing.currentPrice) {
      existing.priceHistory.push({
        date: new Date().toISOString(),
        price: listing.currentPrice,
        currency: listing.currency
      });
    }

    listings[existingIndex] = { 
      ...listing, 
      priceHistory: existing.priceHistory,
      firstSeenAt: existing.firstSeenAt,
      postedDate: existing.postedDate ?? listing.postedDate,
      lastSeenAt: new Date().toISOString(),
      // Preserve VIN if already set (never overwrite with empty)
      vehicle: {
        ...listing.vehicle,
        vin: existing.vehicle.vin || listing.vehicle.vin
      },
    };
  } else {
    // Add new listing
    listings.push(listing);
  }
  await extensionStorage.set(STORAGE_KEYS.listings, listings);
};


export const removeListing = async (id: string): Promise<void> => {
  const listings = await getListings();
  const filtered = listings.filter((l) => l.id !== id);
  await extensionStorage.set(STORAGE_KEYS.listings, filtered);
};

/**
 * Save all listings (replaces existing listings)
 * Used for syncing from remote
 */
export const saveAllListings = async (listings: CarListing[]): Promise<void> => {
  await extensionStorage.set(STORAGE_KEYS.listings, listings);
};

