/**
 * Gemini Response Validation
 *
 * Validates responses from Gemini API before mapping to domain objects.
 */

/**
 * Validate full car listing response from Gemini
 * @throws Error if response is invalid
 */
export function validateParseResponse(data: Record<string, unknown>): void {
    if (!data.title || typeof data.title !== 'string' || (data.title as string).trim().length === 0) {
        throw new Error('AI response is missing or has invalid title');
    }

    const pricing = data.pricing as Record<string, unknown> | undefined;
    if (!pricing || typeof pricing.currentPrice !== 'number' || pricing.currentPrice <= 0) {
        throw new Error('AI response is missing or has invalid price');
    }
    if (!pricing.currency || typeof pricing.currency !== 'string') {
        throw new Error('AI response is missing or has invalid currency');
    }

    if (!data.vehicle || typeof data.vehicle !== 'object') {
        throw new Error('AI response is missing or has invalid vehicle data');
    }
}

/**
 * Validate refresh response from Gemini
 * @throws Error if response is invalid
 */
export function validateRefreshResponse(data: Record<string, unknown>): void {
    if (typeof data.price !== 'number') {
        throw new Error('AI response is missing price');
    }
    if (typeof data.currency !== 'string') {
        throw new Error('AI response is missing currency');
    }
    if (typeof data.isAvailable !== 'boolean') {
        throw new Error('AI response is missing availability status');
    }
}

