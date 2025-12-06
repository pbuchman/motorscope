import { CarListing, ListingStatus, PricePoint } from "../types";
import { extensionStorage } from "./extensionStorage";
import { normalizeUrl } from "../utils/formatters";

export const STORAGE_KEY = "motorscope_listings";

export const getListings = async (): Promise<CarListing[]> => {
  const data = await extensionStorage.get<CarListing[]>(STORAGE_KEY);
  return data || [];
};

/**
 * Check if there are any local listings
 */
export const hasLocalListings = async (): Promise<boolean> => {
  const listings = await getListings();
  return listings.length > 0;
};

/**
 * Clear all local listings (used when switching to remote storage)
 */
export const clearAllLocalListings = async (): Promise<void> => {
  await extensionStorage.set(STORAGE_KEY, []);
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
  await extensionStorage.set(STORAGE_KEY, listings);
};

// Refresh listing: update price history, status, and refresh status
export const refreshListing = async (
  id: string,
  newPrice: number,
  currency: string,
  status: ListingStatus,
  refreshStatus: 'success' | 'error' = 'success',
  refreshError?: string
): Promise<void> => {
  const listings = await getListings();
  const index = listings.findIndex((l) => l.id === id);

  if (index >= 0) {
    const item = listings[index];

    // Only add to price history if price changed
    if (item.currentPrice !== newPrice) {
      const newPoint: PricePoint = {
        date: new Date().toISOString(),
        price: newPrice,
        currency: currency,
      };
      item.priceHistory.push(newPoint);
      item.currentPrice = newPrice;
    }

    item.status = status;
    item.currency = currency;

    // Update refresh status
    item.lastRefreshStatus = refreshStatus;
    if (refreshStatus === 'success') {
      item.lastSeenAt = new Date().toISOString();
      item.lastRefreshError = undefined;
    } else {
      // On error, don't update lastSeenAt, but store the error
      item.lastRefreshError = refreshError;
    }

    await extensionStorage.set(STORAGE_KEY, listings);
  }
};

export const removeListing = async (id: string): Promise<void> => {
  const listings = await getListings();
  const filtered = listings.filter((l) => l.id !== id);
  await extensionStorage.set(STORAGE_KEY, filtered);
};

/**
 * Save all listings (replaces existing listings)
 * Used for syncing from remote
 */
export const saveAllListings = async (listings: CarListing[]): Promise<void> => {
  await extensionStorage.set(STORAGE_KEY, listings);
};

