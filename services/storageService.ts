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
    // Update existing
    listings[existingIndex] = { ...listings[existingIndex], ...listing };
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

// Simulation helper: randomly fluctuate prices for demo purposes
export const simulateMarketChanges = (): CarListing[] => {
  const listings = getListings();
  const updatedListings = listings.map(listing => {
    // 30% chance to change price
    if (Math.random() > 0.7) {
      const changePercent = (Math.random() * 0.1) - 0.05; // -5% to +5%
      const newPrice = Math.floor(listing.currentPrice * (1 + changePercent));
      
      const newPoint: PricePoint = {
        date: new Date().toISOString(),
        price: newPrice,
        currency: listing.currency,
      };
      
      return {
        ...listing,
        currentPrice: newPrice,
        priceHistory: [...listing.priceHistory, newPoint],
        lastChecked: new Date().toISOString()
      };
    }
    return listing;
  });
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedListings));
  return updatedListings;
};
