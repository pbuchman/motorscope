/**
 * Gemini Parse Service
 *
 * Extracts full car listing data from webpage content using Gemini AI.
 */

import {CarListing} from "@/types";
import {createGeminiClient} from "./client";
import {carListingSchema} from "./schemas";
import {buildParsePrompt} from "./prompts";
import {validateParseResponse} from "./validation";
import {mapToCarListing} from "./mapper";
import {recordError, recordSuccess} from "./history";

/**
 * Parse car listing data from webpage content using Gemini AI.
 *
 * @param url - The URL of the listing page
 * @param pageText - Text content extracted from the page
 * @param pageTitle - Title of the page
 * @param scrapedImageUrl - Optional image URL scraped from the page
 * @returns Partial car listing data
 * @throws Error if parsing fails or validation fails
 */
export async function parseCarDataWithGemini(
    url: string,
    pageText: string,
    pageTitle: string,
    scrapedImageUrl?: string | null
): Promise<Partial<CarListing>> {
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
    const prompt = buildParsePrompt(pageTitle, url, pageText);

    let response;
    try {
        response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: carListingSchema,
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await recordError(url, prompt, errorMessage);
        throw error;
    }

    if (!response.text) {
        const errorMessage = "No response from AI";
        await recordError(url, prompt, errorMessage);
        throw new Error(errorMessage);
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

    // Validate and map response
    validateParseResponse(data);
    return mapToCarListing(data, url, pageTitle, scrapedImageUrl);
}

