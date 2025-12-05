import { CarListing, ListingStatus, PricePoint } from "../types";
import { extensionStorage } from "./extensionStorage";

const STORAGE_KEY = "moto_tracker_listings";

// Normalize URL by removing query parameters
const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
};

export const getListings = async (): Promise<CarListing[]> => {
  const data = await extensionStorage.get<CarListing[]>(STORAGE_KEY);
  return data || [];
};

// Find listing by ID, VIN, or normalized URL
export const findExistingListing = async (url: string, vin?: string): Promise<CarListing | null> => {
  const listings = await getListings();
  const normalizedUrl = normalizeUrl(url);

  // First try to find by VIN if available
  if (vin && vin.trim().length > 0) {
    const byVin = listings.find(l => l.details.vin?.toUpperCase() === vin.toUpperCase());
    if (byVin) return byVin;
  }

  // Then try by normalized URL
  const byUrl = listings.find(l => normalizeUrl(l.url) === normalizedUrl);
  return byUrl || null;
};

export const saveListing = async (listing: CarListing): Promise<void> => {
  const listings = await getListings();
  const normalizedUrl = normalizeUrl(listing.url);

  // Find by ID or normalized URL
  const existingIndex = listings.findIndex((l) =>
    l.id === listing.id || normalizeUrl(l.url) === normalizedUrl
  );

  if (existingIndex >= 0) {
    // Update existing, preserving history
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
      url: normalizedUrl,
      priceHistory: existing.priceHistory,
      dateAdded: existing.dateAdded,
      postedDate: existing.postedDate ?? listing.postedDate,
      // Preserve VIN if already set (never overwrite with empty)
      details: {
        ...listing.details,
        vin: existing.details.vin || listing.details.vin
      }
    };
  } else {
    // Add new with normalized URL
    listings.push({ ...listing, url: normalizedUrl });
  }
  await extensionStorage.set(STORAGE_KEY, listings);
};

// Refresh listing: update price history and status only
export const refreshListing = async (
  id: string,
  newPrice: number,
  currency: string,
  status: ListingStatus
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
    item.lastChecked = new Date().toISOString();
    item.currency = currency;

    await extensionStorage.set(STORAGE_KEY, listings);
  }
};

export const removeListing = async (id: string): Promise<void> => {
  const listings = await getListings();
  const filtered = listings.filter((l) => l.id !== id);
  await extensionStorage.set(STORAGE_KEY, filtered);
};
