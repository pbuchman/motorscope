import { GoogleGenAI, Type } from "@google/genai";
import { CarListing, ListingStatus } from "../types";

const parseCarDataWithGemini = async (url: string, rawTextOrHtml: string): Promise<Partial<CarListing>> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      listingId: { type: Type.STRING, description: "Extract ID from URL or content" },
    },
    required: ["title", "price", "currency", "details"],
  };

  const prompt = `
    Analyze the following simulated car listing data (URL and potentially raw text).
    Extract the vehicle details into the specified JSON structure.
    If exact data is missing, reasonably infer it based on the URL structure (e.g., 'ford-edge' in URL implies Ford Edge).
    
    URL: ${url}
    Content Context: ${rawTextOrHtml}
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

    return {
      id: data.listingId || Math.random().toString(36).substring(7),
      url: url,
      title: data.title,
      thumbnailUrl: `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`, // Simulate image extraction
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
