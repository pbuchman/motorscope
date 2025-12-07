/**
 * Gemini Call History Tracking
 *
 * Records successful and failed Gemini API calls for debugging and analytics.
 */

import { GeminiCallHistoryEntry } from "../../types";
import { recordGeminiCall } from "../settings";

/**
 * Format data as JSON for logging
 */
export function formatJsonResponse(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/**
 * Record a successful Gemini API call
 */
export async function recordSuccess(
  url: string,
  prompt: string,
  rawResponse: unknown
): Promise<void> {
  const entry: GeminiCallHistoryEntry = {
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    rawResponse: formatJsonResponse(rawResponse),
    status: 'success',
    timestamp: new Date().toISOString(),
  };
  await recordGeminiCall(entry);
}

/**
 * Record a failed Gemini API call
 */
export async function recordError(
  url: string,
  prompt: string,
  errorResponse: string
): Promise<void> {
  const entry: GeminiCallHistoryEntry = {
    id: crypto.randomUUID(),
    url,
    promptPreview: prompt,
    error: errorResponse,
    status: 'error',
    timestamp: new Date().toISOString(),
  };
  await recordGeminiCall(entry);
}

