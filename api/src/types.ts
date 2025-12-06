/**
 * Shared TypeScript Types for MotorScope
 *
 * These types are shared between the extension and the API.
 * They define the shape of documents stored in Firestore.
 */

// =============================================================================
// Vehicle & Listing Types (from extension)
// =============================================================================

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
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
}

/**
 * CarListing document shape
 * This is the main document structure stored in the listings collection.
 */
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
  postedDate: string | null; // When the listing was posted (ISO string)
  firstSeenAt: string; // When we first saw this listing (ISO string)
  lastSeenAt: string; // When we last checked this listing (ISO string)

  // Refresh status tracking
  lastRefreshStatus?: 'success' | 'error' | 'pending';
  lastRefreshError?: string;
}

// =============================================================================
// API-Specific Types
// =============================================================================

/**
 * User document shape stored in Firestore
 */
export interface User {
  /** Internal user ID (derived from Google sub) */
  id: string;

  /** User's email address */
  email: string;

  /** User's display name (optional) */
  displayName?: string;

  /** Timestamp when the user was created */
  createdAt: string;

  /** Timestamp of last login */
  lastLoginAt: string;
}

/**
 * Listing document as stored in Firestore
 * Extends CarListing with userId for ownership
 */
export interface ListingDocument extends CarListing {
  /** User ID that owns this listing */
  userId: string;

  /** Firestore document ID (same as listing.id) */
  docId?: string;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  /** User ID */
  userId: string;

  /** User email */
  email: string;

  /** Issued at timestamp */
  iat?: number;

  /** Expiration timestamp */
  exp?: number;
}

/**
 * Authentication response from POST /api/auth/google
 */
export interface AuthResponse {
  /** JWT token for subsequent API calls */
  token: string;

  /** User information */
  user: {
    id: string;
    email: string;
    displayName?: string;
  };
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'ok' | 'error';
  firestore: 'ok' | 'error';
  timestamp: string;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

