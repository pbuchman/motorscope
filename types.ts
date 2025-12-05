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
  postedDate?: string;
}


export type AppView = 'dashboard' | 'popup' | 'settings';

export interface GeminiCallHistoryEntry {
  id: string;
  url: string;
  promptPreview: string;
  timestamp: string;
}

export interface GeminiStats {
  totalCalls: number;
  history: GeminiCallHistoryEntry[];
}

export interface ExtensionSettings {
  geminiApiKey: string;
  checkFrequencyMinutes: number;
}

export interface RefreshStatus {
  lastRefreshTime: string | null;  // ISO string
  nextRefreshTime: string | null;  // ISO string
  lastRefreshCount: number;
  isRefreshing: boolean;
  // Progress tracking
  currentIndex: number;
  totalCount: number;
  currentListingTitle: string | null;
  // Items pending refresh (full list during refresh)
  pendingItems: RefreshPendingItem[];
  // Recently refreshed listings
  recentlyRefreshed: RefreshedListingInfo[];
  // Refresh errors history
  refreshErrors: RefreshErrorInfo[];
}

export interface RefreshPendingItem {
  id: string;
  title: string;
  url: string;
  status: 'pending' | 'refreshing' | 'success' | 'error';
}

export interface RefreshedListingInfo {
  id: string;
  title: string;
  url: string;
  status: 'success' | 'error' | 'skipped';
  timestamp: string;
  error?: string;
}

export interface RefreshErrorInfo {
  id: string;
  title: string;
  url: string;
  error: string;
  timestamp: string;
}

// Chrome API type definitions for better type safety
export interface PageContentResult {
  title: string;
  content: string;
  image: string | null;
}
