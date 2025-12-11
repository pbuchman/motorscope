/**
 * Gemini Client Factory
 *
 * Creates and configures Google GenAI client instances.
 */

import {GoogleGenAI} from "@google/genai";
import {getGeminiApiKey} from "../settings";

/**
 * Create a configured Gemini AI client instance.
 * @throws Error if API key is not configured
 */
export async function createGeminiClient(): Promise<GoogleGenAI> {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
        throw new Error("API Key is missing. Please configure your GEMINI_API_KEY in settings.");
    }
    return new GoogleGenAI({apiKey});
}

