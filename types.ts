export interface PricePoint {
  date: string; // ISO String
  price: number;
  currency: string;
}

export interface CarDetails {
  make: string;
  model: string;
  year: number;
  mileage: number;
  fuelType: string;
  engineCapacity?: string;
  transmission?: string;
  vin?: string;
  color?: string;
  location?: string;
}

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
}

export interface CarListing {
  id: string; // Unique ID (often from URL)
  url: string;
  title: string;
  thumbnailUrl: string; // Placeholder or extracted
  currentPrice: number;
  currency: string;
  priceHistory: PricePoint[];
  details: CarDetails;
  status: ListingStatus;
  dateAdded: string;
  lastChecked: string;
}

export type ViewMode = 'DASHBOARD' | 'POPUP';
