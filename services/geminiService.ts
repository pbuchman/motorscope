import { GoogleGenAI, Type } from "@google/genai";
import { CarListing, ListingStatus, GeminiCallHistoryEntry, Vehicle, Location, Seller } from "../types";
import { getGeminiApiKey, recordGeminiCall } from "./settingsService";
import { normalizeUrl, cleanVin } from "../utils/formatters";

// Unified Gemini API interface for car listing extraction
// All Gemini calls in the application should go through this service

// Schema version for data compatibility
const SCHEMA_VERSION = "1.0.0";

// Error class for rate limiting - exported for use in background.ts
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Helper to format JSON response for display
const formatJsonResponse = (data: unknown): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

// Generate ID: prefer VIN if available, otherwise use normalized URL hash
const generateListingId = (vin: string | undefined, normalizedUrl: string): string => {
  const validVin = cleanVin(vin);
  if (validVin) {
    return `vin_${validVin}`;
  }
  return `url_${btoa(normalizedUrl).substring(0, 16)}`;
};

// Create Gemini AI instance
const createGeminiClient = async (): Promise<GoogleGenAI> => {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure your GEMINI_API_KEY in settings.");
  }
  return new GoogleGenAI({ apiKey });
};

// Record a successful Gemini call with full raw response
const recordSuccess = async (url: string, prompt: string, rawResponse: unknown): Promise<void> => {
  const entry: GeminiCallHistoryEntry = {
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    rawResponse: formatJsonResponse(rawResponse),
    status: 'success',
    timestamp: new Date().toISOString(),
  };
  await recordGeminiCall(entry);
};

// Record a failed Gemini call with full error response
const recordError = async (url: string, prompt: string, errorResponse: string): Promise<void> => {
  const entry: GeminiCallHistoryEntry = {
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    error: errorResponse,
    status: 'error',
    timestamp: new Date().toISOString(),
  };
  await recordGeminiCall(entry);
};

const parseCarDataWithGemini = async (
  url: string,
  pageText: string,
  pageTitle: string,
  scrapedImageUrl?: string | null
): Promise<Partial<CarListing>> => {
  // Input validation
  if (!url || typeof url !== 'string') {
    throw new Error("Invalid URL provided");
  }
  
  if (!pageText || typeof pageText !== 'string' || pageText.trim().length === 0) {
    throw new Error("Page content is empty or invalid");
  }
  
  if (!pageTitle || typeof pageTitle !== 'string') {
    throw new Error("Page title is missing or invalid");
  }

  const ai = await createGeminiClient();

  // Schema for structured output - normalized car listing structure
  // See: docs/car-listing-schema.json for full documentation
  const responseSchema = {
    type: Type.OBJECT,
    description: "Extracted car listing data from a vehicle marketplace page",
    properties: {
      title: {
        type: Type.STRING,
        description: "The listing title, usually containing make, model, and year"
      },

      vehicle: {
        type: Type.OBJECT,
        description: "All vehicle-specific information",
        properties: {
          vin: {
            type: Type.STRING,
            nullable: true,
            description: "Vehicle Identification Number - EXACTLY 17 alphanumeric characters (excluding I, O, Q). Set to null if not found or invalid."
          },
          make: {
            type: Type.STRING,
            nullable: true,
            description: "Vehicle manufacturer (e.g., BMW, Audi, Toyota)"
          },
          model: {
            type: Type.STRING,
            nullable: true,
            description: "Vehicle model name (e.g., Seria 5, A4, Camry)"
          },
          generation: {
            type: Type.STRING,
            nullable: true,
            description: "Model generation code if available (e.g., G30, B9, XV70)"
          },
          trim: {
            type: Type.STRING,
            nullable: true,
            description: "Trim level or package (e.g., M Sport, S-line, Limited)"
          },
          bodyType: {
            type: Type.STRING,
            nullable: true,
            description: "Body style (e.g., Sedan, SUV, Kombi/Estate, Hatchback, Coupe)"
          },
          productionYear: {
            type: Type.NUMBER,
            nullable: true,
            description: "Year the vehicle was manufactured"
          },
          firstRegistrationYear: {
            type: Type.NUMBER,
            nullable: true,
            description: "Year of first registration (may differ from production year)"
          },
          mileage: {
            type: Type.OBJECT,
            description: "Vehicle odometer reading",
            properties: {
              value: {
                type: Type.NUMBER,
                nullable: true,
                description: "Numeric mileage value (e.g., 125000)"
              },
              unit: {
                type: Type.STRING,
                nullable: true,
                description: "Unit of measurement: 'km' or 'mi'"
              },
            },
          },
          engine: {
            type: Type.OBJECT,
            description: "Engine specifications",
            properties: {
              capacityCc: {
                type: Type.NUMBER,
                nullable: true,
                description: "Engine displacement in cubic centimeters (e.g., 1998 for 2.0L)"
              },
              fuelType: {
                type: Type.STRING,
                nullable: true,
                description: "Fuel type (e.g., Benzyna/Petrol, Diesel, Elektryczny/Electric, Hybryda/Hybrid, LPG)"
              },
              powerKw: {
                type: Type.NUMBER,
                nullable: true,
                description: "Engine power in kilowatts"
              },
              powerHp: {
                type: Type.NUMBER,
                nullable: true,
                description: "Engine power in horsepower (KM/PS/HP)"
              },
              engineCode: {
                type: Type.STRING,
                nullable: true,
                description: "Manufacturer engine code (e.g., B47, EA888)"
              },
              euroStandard: {
                type: Type.STRING,
                nullable: true,
                description: "Emission standard (e.g., Euro 6, Euro 5)"
              },
              hybridType: {
                type: Type.STRING,
                nullable: true,
                description: "For hybrids: 'mild', 'full', 'plug-in'"
              },
            },
          },
          drivetrain: {
            type: Type.OBJECT,
            description: "Transmission and drive configuration",
            properties: {
              transmissionType: {
                type: Type.STRING,
                nullable: true,
                description: "Transmission type (e.g., Automatyczna/Automatic, Manualna/Manual)"
              },
              transmissionSubtype: {
                type: Type.STRING,
                nullable: true,
                description: "Specific transmission type (e.g., DSG, CVT, Tiptronic)"
              },
              gearsCount: {
                type: Type.NUMBER,
                nullable: true,
                description: "Number of gears"
              },
              driveType: {
                type: Type.STRING,
                nullable: true,
                description: "Drive configuration (e.g., FWD, RWD, AWD/4x4)"
              },
            },
          },
          condition: {
            type: Type.OBJECT,
            description: "Vehicle condition declarations - only set if explicitly stated in listing",
            properties: {
              isNew: {
                type: Type.BOOLEAN,
                nullable: true,
                description: "true if vehicle is brand new, false if used, null if not stated"
              },
              isImported: {
                type: Type.BOOLEAN,
                nullable: true,
                description: "true if imported from another country, null if not stated"
              },
              accidentFreeDeclared: {
                type: Type.BOOLEAN,
                nullable: true,
                description: "true if seller declares 'bezwypadkowy'/accident-free, null if not stated"
              },
              serviceHistoryDeclared: {
                type: Type.BOOLEAN,
                nullable: true,
                description: "true if seller mentions full service history/ASO, null if not stated"
              },
            },
          },
          colorAndInterior: {
            type: Type.OBJECT,
            description: "Color and interior details",
            properties: {
              exteriorColor: {
                type: Type.STRING,
                nullable: true,
                description: "Exterior paint color (e.g., Czarny/Black, Biały/White)"
              },
              interiorColor: {
                type: Type.STRING,
                nullable: true,
                description: "Interior color"
              },
              upholsteryType: {
                type: Type.STRING,
                nullable: true,
                description: "Interior material (e.g., Skóra/Leather, Alcantara, Tkanina/Fabric)"
              },
            },
          },
          registration: {
            type: Type.OBJECT,
            description: "Registration and origin information",
            properties: {
              plateNumber: {
                type: Type.STRING,
                nullable: true,
                description: "License plate number if visible"
              },
              originCountry: {
                type: Type.STRING,
                nullable: true,
                description: "Country the vehicle was IMPORTED FROM or originally registered in (e.g., 'Niemcy'/'Germany', 'USA'). This is the ORIGIN country, not current location."
              },
              registeredInCountryCode: {
                type: Type.STRING,
                nullable: true,
                description: "Country code where vehicle is currently registered (e.g., 'PL', 'DE')"
              },
            },
          },
        },
      },

      pricing: {
        type: Type.OBJECT,
        description: "Pricing information",
        properties: {
          currency: {
            type: Type.STRING,
            description: "Currency code (PLN, EUR, USD, GBP)"
          },
          currentPrice: {
            type: Type.NUMBER,
            description: "Current asking price as a number (no formatting)"
          },
          originalPrice: {
            type: Type.NUMBER,
            nullable: true,
            description: "Original price before discount, if shown"
          },
          negotiable: {
            type: Type.BOOLEAN,
            nullable: true,
            description: "true if price is marked as negotiable"
          },
        },
        required: ["currency", "currentPrice"],
      },

      location: {
        type: Type.OBJECT,
        description: "Seller/vehicle location",
        properties: {
          city: {
            type: Type.STRING,
            nullable: true,
            description: "City name"
          },
          region: {
            type: Type.STRING,
            nullable: true,
            description: "Region/voivodeship/state"
          },
          postalCode: {
            type: Type.STRING,
            nullable: true,
            description: "Postal/ZIP code"
          },
          countryCode: {
            type: Type.STRING,
            nullable: true,
            description: "Country code (PL, DE, etc.)"
          },
        },
      },

      seller: {
        type: Type.OBJECT,
        description: "Seller information",
        properties: {
          type: {
            type: Type.STRING,
            nullable: true,
            description: "Seller type (e.g., 'private', 'dealer')"
          },
          name: {
            type: Type.STRING,
            nullable: true,
            description: "Seller or dealership name"
          },
          phone: {
            type: Type.STRING,
            nullable: true,
            description: "Seller phone number if visible on the listing"
          },
          isCompany: {
            type: Type.BOOLEAN,
            nullable: true,
            description: "true if seller is a company/dealer"
          },
        },
      },

      dates: {
        type: Type.OBJECT,
        description: "Listing date information",
        properties: {
          postedAt: {
            type: Type.STRING,
            nullable: true,
            description: "When the listing was posted (ISO 8601 format)"
          },
        },
      },
    },
    required: ["title", "pricing", "vehicle"],
  };

  const prompt = `
Extract car listing data from this webpage into the JSON schema.

Page Title: ${pageTitle}
Page URL: ${url}
Page Content:
${pageText.substring(0, 15000)}

Key extraction rules:
1. VIN: Must be EXACTLY 17 characters (A-Z, 0-9, excluding I, O, Q). If invalid or not found, set to null.
2. POSTED DATE (CRITICAL): Find when the listing was posted. On otomoto.pl, the date is usually just BEFORE the "ID:" line.
   Examples of posted date patterns:
   - "3 grudnia 2025 6:23" followed by "ID: 6143969486"
   - "3 grudnia 2025 15:52" followed by "ID: 6144015463"
   Polish month names: stycznia, lutego, marca, kwietnia, maja, czerwca, lipca, sierpnia, września, października, listopada, grudnia
   Convert to ISO 8601 format (e.g., "2025-12-03T06:23:00.000Z").
3. Mileage: Extract numeric value and unit (km/mi).
4. Engine capacity: Convert to cubic centimeters (e.g., 2.0L = 1998cc).
5. Price: Extract as number without formatting. Currency as code (PLN/EUR/USD).
6. Origin country (registration.originCountry): The country the vehicle was IMPORTED FROM or originally came from - NOT the current location.
7. Condition fields: Only set true/false if EXPLICITLY stated in listing, otherwise null.
8. Infer make/model from URL or title if not explicitly stated.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) throw new Error("No response from AI");

    const data = JSON.parse(response.text);
    
    // Build full response object for logging (similar to REST API structure)
    const fullResponse = {
      text: response.text,
      parsedData: data,
      // @ts-ignore - SDK may expose these properties
      usageMetadata: response.usageMetadata || null,
      // @ts-ignore
      modelVersion: response.modelVersion || "gemini-2.5-flash",
    };

    // Record successful call with full response
    await recordSuccess(url, prompt, fullResponse);

    // Validate the parsed data with specific type checks
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error("AI response is missing or has invalid title");
    }
    if (!data.pricing || typeof data.pricing.currentPrice !== 'number' || data.pricing.currentPrice <= 0) {
      throw new Error("AI response is missing or has invalid price");
    }
    if (!data.pricing.currency || typeof data.pricing.currency !== 'string') {
      throw new Error("AI response is missing or has invalid currency");
    }
    if (!data.vehicle || typeof data.vehicle !== 'object') {
      throw new Error("AI response is missing or has invalid vehicle data");
    }

    // Normalize the URL (remove query params)
    const normalizedUrl = normalizeUrl(url);

    // Clean and validate VIN
    const validatedVin = cleanVin(data.vehicle?.vin);

    // Generate ID: prefer VIN if available
    const id = generateListingId(validatedVin, normalizedUrl);

    // Extract platform from URL
    const urlObj = new URL(url);
    const platform = urlObj.hostname;

    // Build the vehicle object
    const vehicle: Vehicle = {
      vin: validatedVin || null,
      make: data.vehicle?.make || null,
      model: data.vehicle?.model || null,
      generation: data.vehicle?.generation || null,
      trim: data.vehicle?.trim || null,
      bodyType: data.vehicle?.bodyType || null,
      productionYear: data.vehicle?.productionYear || null,
      firstRegistrationYear: data.vehicle?.firstRegistrationYear || null,
      mileage: {
        value: data.vehicle?.mileage?.value || null,
        unit: data.vehicle?.mileage?.unit || 'km',
      },
      engine: {
        capacityCc: data.vehicle?.engine?.capacityCc || null,
        fuelType: data.vehicle?.engine?.fuelType || null,
        powerKw: data.vehicle?.engine?.powerKw || null,
        powerHp: data.vehicle?.engine?.powerHp || null,
        engineCode: data.vehicle?.engine?.engineCode || null,
        euroStandard: data.vehicle?.engine?.euroStandard || null,
        hybridType: data.vehicle?.engine?.hybridType || null,
      },
      drivetrain: {
        transmissionType: data.vehicle?.drivetrain?.transmissionType || null,
        transmissionSubtype: data.vehicle?.drivetrain?.transmissionSubtype || null,
        gearsCount: data.vehicle?.drivetrain?.gearsCount || null,
        driveType: data.vehicle?.drivetrain?.driveType || null,
      },
      condition: {
        isNew: data.vehicle?.condition?.isNew ?? null,
        isImported: data.vehicle?.condition?.isImported ?? null,
        accidentFreeDeclared: data.vehicle?.condition?.accidentFreeDeclared ?? null,
        serviceHistoryDeclared: data.vehicle?.condition?.serviceHistoryDeclared ?? null,
      },
      colorAndInterior: {
        exteriorColor: data.vehicle?.colorAndInterior?.exteriorColor || null,
        interiorColor: data.vehicle?.colorAndInterior?.interiorColor || null,
        upholsteryType: data.vehicle?.colorAndInterior?.upholsteryType || null,
      },
      registration: {
        plateNumber: data.vehicle?.registration?.plateNumber || null,
        originCountry: data.vehicle?.registration?.originCountry || null,
        registeredInCountryCode: data.vehicle?.registration?.registeredInCountryCode || null,
      },
    };

    // Build location object
    const location: Location = {
      city: data.location?.city || null,
      region: data.location?.region || null,
      postalCode: data.location?.postalCode || null,
      countryCode: data.location?.countryCode || null,
    };

    // Build seller object
    const seller: Seller = {
      type: data.seller?.type || null,
      name: data.seller?.name || null,
      phone: data.seller?.phone || null,
      isCompany: data.seller?.isCompany ?? null,
    };

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
      title: data.title || pageTitle,
      thumbnailUrl: scrapedImageUrl || "https://placehold.co/600x400?text=No+Image",
      currentPrice: data.pricing.currentPrice,
      currency: data.pricing.currency,
      originalPrice: data.pricing.originalPrice || null,
      negotiable: data.pricing.negotiable ?? null,
      priceHistory: [
        {
          date: now,
          price: data.pricing.currentPrice,
          currency: data.pricing.currency,
        },
      ],
      vehicle,
      location,
      seller,
      status: ListingStatus.ACTIVE,
      postedDate: data.dates?.postedAt || null,
      firstSeenAt: now,
      lastSeenAt: now,
      lastRefreshStatus: 'success',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Record the error
    await recordError(url, prompt, errorMessage);
    throw error;
  }
};

// Refresh listing data - only extracts price and status, doesn't update VIN
interface RefreshResult {
  price: number;
  currency: string;
  status: ListingStatus;
}

const refreshListingWithGemini = async (
  url: string,
  pageText: string,
  pageTitle: string
): Promise<RefreshResult> => {
  // Input validation
  if (!pageText || typeof pageText !== 'string' || pageText.trim().length === 0) {
    throw new Error("Page content is empty or invalid");
  }

  const ai = await createGeminiClient();

  // Schema for refresh - only need price and status
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      price: { type: Type.NUMBER },
      currency: { type: Type.STRING },
      isAvailable: { type: Type.BOOLEAN },
      isSold: { type: Type.BOOLEAN },
    },
    required: ["price", "currency", "isAvailable"],
  };

  const prompt = `
    Analyze the following car listing page and extract the current price and availability status.

    Page Title: ${pageTitle}
    Page URL: ${url}
    Page Content: ${pageText.substring(0, 10000)}... (truncated)

    Instructions:
    - Extract the current listing price as a number (no formatting, just the number)
    - Extract the currency (PLN, EUR, USD, etc.)
    - Set isAvailable to false if the page shows the listing is no longer available, removed, expired, or redirects to a "not found" type page
    - Set isSold to true if the page explicitly indicates the vehicle was sold
    - If the page looks like a normal active listing, set isAvailable to true and isSold to false
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) throw new Error("No response from AI");

    const data = JSON.parse(response.text);

    // Build full response object for logging (similar to REST API structure)
    const fullResponse = {
      text: response.text,
      parsedData: data,
      // @ts-ignore - SDK may expose these properties
      usageMetadata: response.usageMetadata || null,
      // @ts-ignore
      modelVersion: response.modelVersion || "gemini-2.5-flash",
    };

    // Record successful call with full response
    await recordSuccess(url, prompt, fullResponse);

    // Determine status
    let status = ListingStatus.ACTIVE;
    if (data.isSold === true) {
      status = ListingStatus.SOLD;
    } else if (data.isAvailable === false) {
      status = ListingStatus.EXPIRED;
    }

    return {
      price: typeof data.price === 'number' && data.price > 0 ? data.price : 0,
      currency: data.currency || 'PLN',
      status,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Detect rate limiting from error message (Google AI SDK includes status codes in error messages)
    const isRateLimited = errorMessage.includes('429') ||
                          errorMessage.toLowerCase().includes('rate limit') ||
                          errorMessage.toLowerCase().includes('quota exceeded') ||
                          errorMessage.toLowerCase().includes('resource exhausted');

    // Record the error
    await recordError(url, prompt, errorMessage);

    // Throw RateLimitError for rate limiting, regular error otherwise
    if (isRateLimited) {
      throw new RateLimitError(errorMessage);
    }
    throw error;
  }
};

export { parseCarDataWithGemini, refreshListingWithGemini };
