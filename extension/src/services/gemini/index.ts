/**
 * Gemini Service - Barrel Export
 *
 * Unified Gemini API interface for car listing extraction.
 * All Gemini calls in the application should go through this service.
 */

// Main API functions
export {parseCarDataWithGemini} from './parse';
export {refreshListingWithGemini} from './refresh';
export type {RefreshResult} from './refresh';

// Error types
export {RateLimitError, isRateLimitError} from './errors';

// Client (for advanced use cases)
export {createGeminiClient} from './client';

