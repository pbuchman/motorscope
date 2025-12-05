import { GoogleGenAI, Type } from "@google/genai";
import { CarListing, ListingStatus } from "../types";

const parseCarDataWithGemini = async (
  url: string, 
  pageText: string,
  pageTitle: string,
  scrapedImageUrl?: string | null
): Promise<Partial<CarListing>> => {
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API Key is missing. Please configure your GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      price: { type: Type.NUMBER },
      currency: { type: Type.STRING },
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
    - Look specifically for VIN number patterns.
    - Infer Model/Make from URL if not clear in text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (!response.text) throw new Error("No response from AI");

    const data = JSON.parse(response.text);

    // Generate a consistent ID from the URL (simple hash replacement)
    const id = btoa(url).substring(0, 12);

    return {
      id: id,
      url: url,
      title: data.title || pageTitle,
      thumbnailUrl: scrapedImageUrl || "https://placehold.co/600x400?text=No+Image",
      currentPrice: data.price,
      currency: data.currency,
      details: data.details,
      status: ListingStatus.ACTIVE,
      priceHistory: [
        {
          date: new Date().toISOString(),
          price: data.price,
          currency: data.currency
        }
      ],
      dateAdded: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
    };

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};

export { parseCarDataWithGemini };