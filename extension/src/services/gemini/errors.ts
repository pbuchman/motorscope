/**
 * Gemini Error Types
 *
 * Custom error classes for Gemini API error handling.
 */

/**
 * Error thrown when Gemini API rate limit is exceeded.
 * Used to signal the background refresh service to back off.
 */
export class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

/**
 * Check if an error message indicates rate limiting
 */
export function isRateLimitError(errorMessage: string): boolean {
    return errorMessage.includes('429') ||
        errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('quota exceeded') ||
        errorMessage.toLowerCase().includes('resource exhausted');
}

