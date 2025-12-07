/**
 * Gemini Refresh Service
 *
 * Refreshes listing price and status using Gemini AI.
 * Lighter operation than full parsing - only extracts price and availability.
 */

import { ListingStatus } from "../../types";
import { createGeminiClient } from "./client";
import { refreshSchema } from "./schemas";
import { buildRefreshPrompt } from "./prompts";
import { recordSuccess, recordError } from "./history";
import { RateLimitError, isRateLimitError } from "./errors";

/**
 * Result of a listing refresh operation
 */
export interface RefreshResult {
  price: number;
  currency: string;
  status: ListingStatus;
}

/**
 * Refresh listing data - extracts only price and status.
 *
 * @param url - The URL of the listing page
 * @param pageText - Text content extracted from the page
 * @param pageTitle - Title of the page
 * @returns Refresh result with price, currency, and status
 * @throws RateLimitError if API rate limit is hit
 * @throws Error for other failures
 */
export async function refreshListingWithGemini(
  url: string,
  pageText: string,
  pageTitle: string
): Promise<RefreshResult> {
  if (!pageText || typeof pageText !== 'string' || pageText.trim().length === 0) {
    throw new Error("Page content is empty or invalid");
  }

  const ai = await createGeminiClient();
  const prompt = buildRefreshPrompt(pageTitle, url, pageText);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: refreshSchema,
      },
    });

    if (!response.text) {
      throw new Error("No response from AI");
    }

    const data = JSON.parse(response.text);

    // Build response object for logging
    const fullResponse = {
      text: response.text,
      parsedData: data,
      // @ts-ignore - SDK may expose these properties
      usageMetadata: response.usageMetadata || null,
      // @ts-ignore
      modelVersion: response.modelVersion || "gemini-2.5-flash",
    };

    await recordSuccess(url, prompt, fullResponse);

    // Determine listing status
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
    await recordError(url, prompt, errorMessage);

    // Wrap rate limit errors
    if (isRateLimitError(errorMessage)) {
      throw new RateLimitError(errorMessage);
    }
    throw error;
  }
}

