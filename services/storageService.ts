import { CarListing, PricePoint } from "../types";

const STORAGE_KEY = "moto_tracker_listings";

export const getListings = (): CarListing[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveListing = (listing: CarListing): void => {
  const listings = getListings();
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
      dateAdded: existing.dateAdded 
    };
  } else {
    // Add new
    listings.push(listing);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
};

export const removeListing = (id: string): void => {
  const listings = getListings().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
};

export const updatePrice = (id: string, newPrice: number): void => {
  const listings = getListings();
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
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
    }
  }
};