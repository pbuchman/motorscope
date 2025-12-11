/**
 * Response Utilities
 *
 * Centralized helpers for consistent API response formatting.
 * Eliminates duplication of error/success response structure across routes.
 */

import type {Response} from 'express';
import type {ErrorResponse} from '../types.js';

/**
 * HTTP status code to error name mapping
 */
const HTTP_STATUS_NAMES: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
    503: 'Service Unavailable',
};

/**
 * Send a standardized error response
 *
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param message - Human-readable error message
 */
export function sendError(res: Response, statusCode: number, message: string): void {
    const errorResponse: ErrorResponse = {
        error: HTTP_STATUS_NAMES[statusCode] || 'Error',
        message,
        statusCode,
    };
    res.status(statusCode).json(errorResponse);
}

/**
 * Send a standardized success response with data
 *
 * @param res - Express response object
 * @param data - Response payload
 * @param statusCode - HTTP status code (default: 200)
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
    res.status(statusCode).json(data);
}

/**
 * Send a success response indicating an operation completed
 *
 * @param res - Express response object
 * @param message - Optional success message
 * @param extra - Optional additional fields to include
 */
export function sendOperationSuccess(
    res: Response,
    message?: string,
    extra?: Record<string, unknown>
): void {
    const response: Record<string, unknown> = {success: true};
    if (message) {
        response.message = message;
    }
    if (extra) {
        Object.assign(response, extra);
    }
    res.status(200).json(response);
}

/**
 * Handle errors and send appropriate response
 * Logs the error and sends a generic 500 response
 *
 * @param res - Express response object
 * @param error - The caught error
 * @param context - Context string for logging (e.g., "fetching listings")
 */
export function handleError(res: Response, error: unknown, context: string): void {
    console.error(`Error ${context}:`, error);
    sendError(res, 500, `Failed to ${context.replace(/ing$/, '').replace(/^fetch/, 'fetch ')}`);
}

