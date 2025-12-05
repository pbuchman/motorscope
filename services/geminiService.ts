import { GoogleGenAI, Type } from "@google/genai";
import { CarListing, ListingStatus, GeminiCallHistoryEntry } from "../types";
import { getGeminiApiKey, recordGeminiCall } from "./settingsService";
import { normalizeUrl, cleanVin } from "../utils/formatters";

// Unified Gemini API interface
// All Gemini calls in the application should go through this service

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

// Record a successful Gemini call
const recordSuccess = async (url: string, prompt: string, response: unknown): Promise<void> => {
  const entry: GeminiCallHistoryEntry = {
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    response: formatJsonResponse(response),
    status: 'success',
    timestamp: new Date().toISOString(),
  };
  await recordGeminiCall(entry);
};

// Record a failed Gemini call
const recordError = async (url: string, prompt: string, error: string): Promise<void> => {
  const entry: GeminiCallHistoryEntry = {
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    error,
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

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      price: { type: Type.NUMBER },
      currency: { type: Type.STRING },
      postedDate: { type: Type.STRING },
      details: {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING },
          model: { type: Type.STRING },
          year: { type: Type.NUMBER },
          mileage: { type: Type.NUMBER },
          fuelType: { type: Type.STRING },
          vin: { type: Type.STRING },
          engineCapacity: { type: Type.STRING },
          transmission: { type: Type.STRING },
          location: { type: Type.STRING },
        },
      },
    },
    required: ["title", "price", "currency", "details"],
  };

  const prompt = `
    Analyze the following car listing text scraped from a webpage.
    Extract the vehicle details into the specified JSON structure.

    Page Title: ${pageTitle}
    Page URL: ${url}
    Page Content: ${pageText.substring(0, 15000)}... (truncated)

    Notes:
    - If mileage is in km, convert to number.
    - If price contains currency symbol, split it.
    - VIN (Vehicle Identification Number) must be EXACTLY 17 alphanumeric characters. It cannot contain letters I, O, or Q. If you cannot find a valid 17-character VIN, leave the vin field empty or null - do NOT guess or provide partial VINs.
    - Infer Model/Make from URL if not clear in text.
    - Capture the date when the seller posted the listing as ISO 8601 if available (postedDate field).
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
    
    // Record successful call with response
    await recordSuccess(url, prompt, data);

    // Validate the parsed data with specific type checks
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error("AI response is missing or has invalid title");
    }
    if (typeof data.price !== 'number' || data.price <= 0) {
      throw new Error("AI response is missing or has invalid price");
    }
    if (!data.currency || typeof data.currency !== 'string') {
      throw new Error("AI response is missing or has invalid currency");
    }
    if (!data.details || typeof data.details !== 'object') {
      throw new Error("AI response is missing or has invalid details");
    }

    // Normalize the URL (remove query params)
    const normalizedUrl = normalizeUrl(url);

    // Clean and validate VIN
    const validatedVin = cleanVin(data.details?.vin);

    // Generate ID: prefer VIN if available
    const id = generateListingId(validatedVin, normalizedUrl);

    return {
      id,
      url: normalizedUrl,
      title: data.title || pageTitle,
      thumbnailUrl: scrapedImageUrl || "https://placehold.co/600x400?text=No+Image",
      currentPrice: data.price,
      currency: data.currency,
      details: {
        ...data.details,
        vin: validatedVin, // Only set VIN if it's valid
      },
      status: ListingStatus.ACTIVE,
      priceHistory: [
        {
          date: new Date().toISOString(),
          price: data.price,
          currency: data.currency,
        },
      ],
      postedDate: data.postedDate || new Date().toISOString(),
      dateAdded: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
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

    // Record successful call with response
    await recordSuccess(url, prompt, data);

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
