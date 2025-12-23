export interface PricePoint {
    date: string; // ISO String
    price: number;
    currency: string;
}

export interface Mileage {
    value: number | null;
    unit: 'km' | 'mi' | null;
}

export interface Engine {
    capacityCc: number | null;
    fuelType: string | null;
    powerKw: number | null;
    powerHp: number | null;
    engineCode: string | null;
    euroStandard: string | null;
    hybridType: string | null;
}

export interface Drivetrain {
    transmissionType: string | null;
    transmissionSubtype: string | null;
    gearsCount: number | null;
    driveType: string | null;
}

export interface VehicleCondition {
    isNew: boolean | null;
    isImported: boolean | null;
    accidentFreeDeclared: boolean | null;
    serviceHistoryDeclared: boolean | null;
}

export interface ColorAndInterior {
    exteriorColor: string | null;
    interiorColor: string | null;
    upholsteryType: string | null;
}

export interface Registration {
    plateNumber: string | null;
    originCountry: string | null;
    registeredInCountryCode: string | null;
}

export interface Location {
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
}

export interface Seller {
    type: string | null;
    name: string | null;
    phone: string | null;
    isCompany: boolean | null;
}

export interface Vehicle {
    vin: string | null;
    make: string | null;
    model: string | null;
    generation: string | null;
    trim: string | null;
    bodyType: string | null;
    productionYear: number | null;
    firstRegistrationYear: number | null;
    mileage: Mileage;
    engine: Engine;
    drivetrain: Drivetrain;
    registration: Registration;
    condition: VehicleCondition;
    colorAndInterior: ColorAndInterior;
}

export enum ListingStatus {
    ACTIVE = 'ACTIVE',
    ENDED = 'ENDED',
}

export interface CarListing {
    id: string; // Unique ID - VIN-based (vin_XXX) or URL-based (url_XXX)
    schemaVersion: string; // Schema version for data compatibility

    // Source info - where the listing was found
    source: {
        platform: string; // e.g., "otomoto.pl", "mobile.de"
        url: string; // Full URL to the listing
        listingId: string | null; // Platform-specific listing ID
        countryCode: string | null; // Country code of the platform (PL, DE, etc.)
    };

    // Display info
    title: string; // Listing title
    thumbnailUrl: string; // Main image URL

    // Pricing
    currentPrice: number; // Current asking price
    currency: string; // Currency code (PLN, EUR, USD)
    priceHistory: PricePoint[]; // Price change history
    originalPrice: number | null; // Original price if discounted
    negotiable: boolean | null; // Whether price is negotiable

    // Vehicle data - normalized structure
    vehicle: Vehicle;

    // Location & Seller
    location: Location;
    seller: Seller;

    // Status & Tracking
    status: ListingStatus;
    statusChangedAt: string | null; // When status changed to ENDED (ISO string)
    postedDate: string | null; // When the listing was posted (ISO string)
    firstSeenAt: string; // When we first saw this listing (ISO string)
    lastSeenAt: string; // When we last checked this listing (ISO string)

    // Archive status - archived listings are excluded from auto-refresh
    isArchived?: boolean;

    // Refresh status tracking
    lastRefreshStatus?: 'success' | 'error' | 'pending';
    lastRefreshError?: string;
}


export type AppView = 'dashboard' | 'popup' | 'settings';

export interface GeminiCallHistoryEntry {
    id: string;
    url: string;
    promptPreview: string;
    rawResponse?: string; // Full raw API response JSON (formatted)
    error?: string; // Error message/response if failed
    status: 'success' | 'error';
    timestamp: string;
}

export interface GeminiStats {
    allTimeTotalCalls: number; // Never resets
    totalCalls: number; // Resets with clear
    successCount: number; // Resets with clear
    errorCount: number; // Resets with clear
}

export interface DashboardPreferences {
    filters: {
        status: string;
        archived: string;
        makes: string[];
        models: string[];
        sources: string[];
    };
    sortBy: string;
    viewMode: string;
}

export interface ExtensionSettings {
    geminiApiKey: string;
    checkFrequencyMinutes: number;
    endedListingGracePeriodDays: number; // Days to keep refreshing ENDED listings (1-30, default 3)
    dashboardPreferences?: DashboardPreferences;
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
