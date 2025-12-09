/**
 * Test Mock Data Factories
 *
 * Provides factory functions to create mock data for testing.
 */

import { CarListing, ListingStatus, ExtensionSettings, RefreshStatus } from '@/types';

/**
 * Create a mock car listing with sensible defaults
 */
export function createMockListing(overrides: Partial<CarListing> = {}): CarListing {
  return {
    id: `listing-${Math.random().toString(36).substr(2, 9)}`,
    schemaVersion: '1.0.0',
    source: {
      platform: 'otomoto.pl',
      url: 'https://www.otomoto.pl/test-listing',
      listingId: 'otomoto-123456',
      countryCode: 'PL',
    },
    title: 'BMW 320d M Sport 2020',
    thumbnailUrl: 'https://example.com/image.jpg',
    currentPrice: 125000,
    originalPrice: null,
    currency: 'PLN',
    negotiable: false,
    postedDate: '2024-01-15T10:00:00Z',
    status: ListingStatus.ACTIVE,
    isArchived: false,
    vehicle: {
      vin: 'WBAXXXXXXXX123456',
      make: 'BMW',
      model: '320d',
      generation: 'G20',
      trim: 'M Sport',
      bodyType: 'Sedan',
      productionYear: 2020,
      firstRegistrationYear: 2020,
      mileage: {
        value: 45000,
        unit: 'km',
      },
      engine: {
        capacityCc: 1995,
        fuelType: 'Diesel',
        powerKw: 140,
        powerHp: 190,
        engineCode: 'B47D20',
        euroStandard: 'Euro 6',
        hybridType: null,
      },
      drivetrain: {
        transmissionType: 'Automatic',
        transmissionSubtype: 'Steptronic',
        gearsCount: 8,
        driveType: 'RWD',
      },
      registration: {
        plateNumber: null,
        originCountry: 'Germany',
        registeredInCountryCode: 'PL',
      },
      condition: {
        isNew: false,
        isImported: true,
        accidentFreeDeclared: true,
        serviceHistoryDeclared: true,
      },
      colorAndInterior: {
        exteriorColor: 'Black',
        interiorColor: 'Black',
        upholsteryType: 'Leather',
      },
    },
    location: {
      city: 'Warsaw',
      region: 'Mazowieckie',
      postalCode: '00-001',
      countryCode: 'PL',
    },
    seller: {
      type: 'dealer',
      name: 'BMW Premium Selection',
      phone: '+48 123 456 789',
      isCompany: true,
    },
    priceHistory: [
      { date: '2024-01-15T10:00:00Z', price: 129000, currency: 'PLN' },
      { date: '2024-01-20T10:00:00Z', price: 125000, currency: 'PLN' },
    ],
    firstSeenAt: '2024-01-15T10:00:00Z',
    lastSeenAt: '2024-01-25T10:00:00Z',
    lastRefreshStatus: 'success',
    ...overrides,
  };
}

/**
 * Create mock extension settings
 */
export function createMockSettings(overrides: Partial<ExtensionSettings> = {}): ExtensionSettings {
  return {
    geminiApiKey: 'test-gemini-api-key',
    checkFrequencyMinutes: 60,
    dashboardPreferences: {
      viewMode: 'grid',
      sortBy: 'newest',
      filters: {
        status: 'all',
        archived: 'active',
        makes: [],
        models: [],
        sources: [],
      },
    },
    ...overrides,
  };
}

/**
 * Create mock refresh status
 */
export function createMockRefreshStatus(overrides: Partial<RefreshStatus> = {}): RefreshStatus {
  return {
    lastRefreshTime: null,
    nextRefreshTime: null,
    lastRefreshCount: 0,
    isRefreshing: false,
    currentIndex: 0,
    totalCount: 0,
    currentListingTitle: null,
    pendingItems: [],
    recentlyRefreshed: [],
    refreshErrors: [],
    ...overrides,
  };
}

/**
 * Create mock auth state
 */
export interface MockAuthState {
  status: 'loading' | 'logged_out' | 'logged_in';
  user: { email: string; id: string } | null;
  token: string | null;
  error: string | null;
  isLoggingIn: boolean;
}

export function createMockAuthState(overrides: Partial<MockAuthState> = {}): MockAuthState {
  return {
    status: 'logged_out',
    user: null,
    token: null,
    error: null,
    isLoggingIn: false,
    ...overrides,
  };
}

/**
 * Create a logged-in auth state
 */
export function createLoggedInAuthState(email = 'test@example.com'): MockAuthState {
  return {
    status: 'logged_in',
    user: { email, id: 'user-123' },
    token: 'mock-jwt-token',
    error: null,
    isLoggingIn: false,
  };
}

