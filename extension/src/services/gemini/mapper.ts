/**
 * Listing Data Mapper
 *
 * Transforms raw Gemini response data into CarListing objects.
 */

import { CarListing, ListingStatus, Vehicle, Location, Seller } from "../../types";
import { normalizeUrl, cleanVin } from "../../utils/formatters";

/** Schema version for data compatibility */
const SCHEMA_VERSION = "1.0.0";

/**
 * Generate listing ID from VIN or URL
 * Prefers VIN if available for deduplication across URLs
 */
export function generateListingId(vin: string | undefined, normalizedUrl: string): string {
  const validVin = cleanVin(vin);
  if (validVin) {
    return `vin_${validVin}`;
  }
  return `url_${btoa(normalizedUrl).substring(0, 16)}`;
}

/**
 * Build Vehicle object from raw Gemini response
 */
function buildVehicle(data: Record<string, unknown>): Vehicle {
  const vehicle = data.vehicle as Record<string, unknown> | undefined;
  const validatedVin = cleanVin(vehicle?.vin as string | undefined);

  return {
    vin: validatedVin || null,
    make: (vehicle?.make as string) || null,
    model: (vehicle?.model as string) || null,
    generation: (vehicle?.generation as string) || null,
    trim: (vehicle?.trim as string) || null,
    bodyType: (vehicle?.bodyType as string) || null,
    productionYear: (vehicle?.productionYear as number) || null,
    firstRegistrationYear: (vehicle?.firstRegistrationYear as number) || null,
    mileage: {
      value: ((vehicle?.mileage as Record<string, unknown>)?.value as number) || null,
      unit: ((vehicle?.mileage as Record<string, unknown>)?.unit as 'km' | 'mi') || 'km',
    },
    engine: {
      capacityCc: ((vehicle?.engine as Record<string, unknown>)?.capacityCc as number) || null,
      fuelType: ((vehicle?.engine as Record<string, unknown>)?.fuelType as string) || null,
      powerKw: ((vehicle?.engine as Record<string, unknown>)?.powerKw as number) || null,
      powerHp: ((vehicle?.engine as Record<string, unknown>)?.powerHp as number) || null,
      engineCode: ((vehicle?.engine as Record<string, unknown>)?.engineCode as string) || null,
      euroStandard: ((vehicle?.engine as Record<string, unknown>)?.euroStandard as string) || null,
      hybridType: ((vehicle?.engine as Record<string, unknown>)?.hybridType as string) || null,
    },
    drivetrain: {
      transmissionType: ((vehicle?.drivetrain as Record<string, unknown>)?.transmissionType as string) || null,
      transmissionSubtype: ((vehicle?.drivetrain as Record<string, unknown>)?.transmissionSubtype as string) || null,
      gearsCount: ((vehicle?.drivetrain as Record<string, unknown>)?.gearsCount as number) || null,
      driveType: ((vehicle?.drivetrain as Record<string, unknown>)?.driveType as string) || null,
    },
    condition: {
      isNew: ((vehicle?.condition as Record<string, unknown>)?.isNew as boolean) ?? null,
      isImported: ((vehicle?.condition as Record<string, unknown>)?.isImported as boolean) ?? null,
      accidentFreeDeclared: ((vehicle?.condition as Record<string, unknown>)?.accidentFreeDeclared as boolean) ?? null,
      serviceHistoryDeclared: ((vehicle?.condition as Record<string, unknown>)?.serviceHistoryDeclared as boolean) ?? null,
    },
    colorAndInterior: {
      exteriorColor: ((vehicle?.colorAndInterior as Record<string, unknown>)?.exteriorColor as string) || null,
      interiorColor: ((vehicle?.colorAndInterior as Record<string, unknown>)?.interiorColor as string) || null,
      upholsteryType: ((vehicle?.colorAndInterior as Record<string, unknown>)?.upholsteryType as string) || null,
    },
    registration: {
      plateNumber: ((vehicle?.registration as Record<string, unknown>)?.plateNumber as string) || null,
      originCountry: ((vehicle?.registration as Record<string, unknown>)?.originCountry as string) || null,
      registeredInCountryCode: ((vehicle?.registration as Record<string, unknown>)?.registeredInCountryCode as string) || null,
    },
  };
}

/**
 * Build Location object from raw Gemini response
 */
function buildLocation(data: Record<string, unknown>): Location {
  const location = data.location as Record<string, unknown> | undefined;
  return {
    city: (location?.city as string) || null,
    region: (location?.region as string) || null,
    postalCode: (location?.postalCode as string) || null,
    countryCode: (location?.countryCode as string) || null,
  };
}

/**
 * Build Seller object from raw Gemini response
 */
function buildSeller(data: Record<string, unknown>): Seller {
  const seller = data.seller as Record<string, unknown> | undefined;
  return {
    type: (seller?.type as string) || null,
    name: (seller?.name as string) || null,
    phone: (seller?.phone as string) || null,
    isCompany: (seller?.isCompany as boolean) ?? null,
  };
}

/**
 * Transform raw Gemini response into a CarListing object
 */
export function mapToCarListing(
  data: Record<string, unknown>,
  url: string,
  pageTitle: string,
  scrapedImageUrl?: string | null
): Partial<CarListing> {
  const pricing = data.pricing as Record<string, unknown>;
  const dates = data.dates as Record<string, unknown> | undefined;
  const vehicle = buildVehicle(data);
  const location = buildLocation(data);
  const seller = buildSeller(data);

  const normalizedUrl = normalizeUrl(url);
  const id = generateListingId(vehicle.vin ?? undefined, normalizedUrl);

  const urlObj = new URL(url);
  const platform = urlObj.hostname;
  const now = new Date().toISOString();

  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    source: {
      platform,
      url: normalizedUrl,
      listingId: id,
      countryCode: location.countryCode,
    },
    title: (data.title as string) || pageTitle,
    thumbnailUrl: scrapedImageUrl || "https://placehold.co/600x400?text=No+Image",
    currentPrice: pricing.currentPrice as number,
    currency: pricing.currency as string,
    originalPrice: (pricing.originalPrice as number) || null,
    negotiable: (pricing.negotiable as boolean) ?? null,
    priceHistory: [
      {
        date: now,
        price: pricing.currentPrice as number,
        currency: pricing.currency as string,
      },
    ],
    vehicle,
    location,
    seller,
    status: ListingStatus.ACTIVE,
    postedDate: (dates?.postedAt as string) || null,
    firstSeenAt: now,
    lastSeenAt: now,
    lastRefreshStatus: 'success',
  };
}

