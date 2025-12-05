import { GoogleGenAI, Type } from "@google/genai";
import { CarListing, ListingStatus } from "../types";
import { getGeminiApiKey, recordGeminiCall } from "./settingsService";

// Normalize URL by removing query parameters
const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
};

// Validate VIN number - must be exactly 17 alphanumeric characters (excluding I, O, Q)
const isValidVin = (vin: string | undefined | null): boolean => {
  if (!vin || typeof vin !== 'string') return false;
  const cleaned = vin.trim().toUpperCase();
  // VIN must be exactly 17 characters, alphanumeric, no I, O, Q
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(cleaned);
};

// Clean and validate VIN - returns valid VIN or undefined
const cleanVin = (vin: string | undefined | null): string | undefined => {
  if (!vin || typeof vin !== 'string') return undefined;
  const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  return isValidVin(cleaned) ? cleaned : undefined;
};

// Generate ID: prefer VIN if available, otherwise use normalized URL hash
const generateListingId = (vin: string | undefined, normalizedUrl: string): string => {
  const validVin = cleanVin(vin);
  if (validVin) {
    return `vin_${validVin}`;
  }
  return `url_${btoa(normalizedUrl).substring(0, 16)}`;
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
  
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure your GEMINI_API_KEY in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

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

    await recordGeminiCall({
      id: crypto.randomUUID(),
      url,
      promptPreview: prompt,
      timestamp: new Date().toISOString(),
    });

    const data = JSON.parse(response.text);
    
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
    };

  } catch (error) {
    // Log error for debugging in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error("Gemini Extraction Error:", error);
    }
    throw error;
  }
};

export { parseCarDataWithGemini };