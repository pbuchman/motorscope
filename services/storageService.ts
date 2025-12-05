import { CarListing, PricePoint } from "../types";
import { extensionStorage } from "./extensionStorage";

const STORAGE_KEY = "moto_tracker_listings";

export const getListings = async (): Promise<CarListing[]> => {
  const data = await extensionStorage.get<CarListing[]>(STORAGE_KEY);
  return data || [];
};

export const saveListing = async (listing: CarListing): Promise<void> => {
  const listings = await getListings();
  const existingIndex = listings.findIndex((l) => l.url === listing.url);

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
      priceHistory: existing.priceHistory,
      dateAdded: existing.dateAdded,
      postedDate: existing.postedDate ?? listing.postedDate
    };
  } else {
    // Add new
    listings.push({ ...listing, postedDate: listing.postedDate });
  }
  await extensionStorage.set(STORAGE_KEY, listings);
};

export const removeListing = async (id: string): Promise<void> => {
  const listings = await getListings();
  const filtered = listings.filter((l) => l.id !== id);
  await extensionStorage.set(STORAGE_KEY, filtered);
};

export const updatePrice = async (id: string, newPrice: number): Promise<void> => {
  const listings = await getListings();
  const index = listings.findIndex((l) => l.id === id);

  if (index >= 0) {
    const item = listings[index];
    // Only update if price changed
    if (item.currentPrice !== newPrice) {
      const newPoint: PricePoint = {
        date: new Date().toISOString(),
        price: newPrice,
        currency: item.currency,
      };
      item.priceHistory.push(newPoint);
      item.currentPrice = newPrice;
      item.lastChecked = new Date().toISOString();
      
      await extensionStorage.set(STORAGE_KEY, listings);
    }
  }
};
