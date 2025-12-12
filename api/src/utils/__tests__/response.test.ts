/**
 * Tests for Response Utilities
 */

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {handleError, sendError, sendOperationSuccess, sendSuccess} from '../response.js';

// Create mock response
const createMockResponse = () => {
    const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
};

describe('Response Utilities', () => {
    let mockRes: any;

    beforeEach(() => {
        mockRes = createMockResponse();
        jest.spyOn(console, 'error').mockImplementation(() => {
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('sendError', () => {
        it('should send 400 Bad Request error', () => {
            sendError(mockRes, 400, 'Invalid input');

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: 'Invalid input',
                statusCode: 400,
            });
        });

        it('should send 401 Unauthorized error', () => {
            sendError(mockRes, 401, 'Token expired');

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Token expired',
                statusCode: 401,
            });
        });

        it('should send 403 Forbidden error', () => {
            sendError(mockRes, 403, 'Access denied');

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Access denied',
                statusCode: 403,
            });
        });

        it('should send 404 Not Found error', () => {
            sendError(mockRes, 404, 'Listing not found');

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Not Found',
                message: 'Listing not found',
                statusCode: 404,
            });
        });

        it('should send 500 Internal Server Error', () => {
            sendError(mockRes, 500, 'Database connection failed');

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Database connection failed',
                statusCode: 500,
            });
        });

        it('should send 503 Service Unavailable error', () => {
            sendError(mockRes, 503, 'Service temporarily unavailable');

            expect(mockRes.status).toHaveBeenCalledWith(503);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Service Unavailable',
                message: 'Service temporarily unavailable',
                statusCode: 503,
            });
        });

        it('should handle unknown status codes gracefully', () => {
            sendError(mockRes, 418, 'I am a teapot');

            expect(mockRes.status).toHaveBeenCalledWith(418);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error', // Fallback for unknown status
                message: 'I am a teapot',
                statusCode: 418,
            });
        });

        it('should handle empty message', () => {
            sendError(mockRes, 400, '');

            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Bad Request',
                message: '',
                statusCode: 400,
            });
        });
    });

    describe('sendSuccess', () => {
        it('should send data with default 200 status', () => {
            const data = {id: '123', name: 'Test'};

            sendSuccess(mockRes, data);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(data);
        });

        it('should send data with custom status code', () => {
            const data = {created: true};

            sendSuccess(mockRes, data, 201);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(data);
        });

        it('should send array data', () => {
            const data = [{id: '1'}, {id: '2'}];

            sendSuccess(mockRes, data);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(data);
        });

        it('should send null data', () => {
            sendSuccess(mockRes, null);

            expect(mockRes.json).toHaveBeenCalledWith(null);
        });

        it('should send complex nested data', () => {
            const data = {
                user: {id: '1', email: 'test@test.com'},
                listings: [{id: 'listing-1'}],
                stats: {total: 10},
            };

            sendSuccess(mockRes, data);

            expect(mockRes.json).toHaveBeenCalledWith(data);
        });
    });

    describe('sendOperationSuccess', () => {
        it('should send success with no message', () => {
            sendOperationSuccess(mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({success: true});
        });

        it('should send success with message', () => {
            sendOperationSuccess(mockRes, 'Operation completed');

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Operation completed',
            });
        });

        it('should send success with extra fields', () => {
            sendOperationSuccess(mockRes, undefined, {count: 5, deleted: 3});

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                count: 5,
                deleted: 3,
            });
        });

        it('should send success with message and extra fields', () => {
            sendOperationSuccess(mockRes, 'Listings saved', {count: 10});

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                message: 'Listings saved',
                count: 10,
            });
        });

        it('should not include message if empty string', () => {
            sendOperationSuccess(mockRes, '');

            expect(mockRes.json).toHaveBeenCalledWith({success: true});
        });
    });

    describe('handleError', () => {
        it('should log error and send 500 response', () => {
            const error = new Error('Database error');

            handleError(mockRes, error, 'fetching listings');

            expect(console.error).toHaveBeenCalledWith('Error fetching listings:', error);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: expect.stringContaining('Failed to'),
                statusCode: 500,
            });
        });

        it('should handle non-Error objects', () => {
            const error = {code: 'UNKNOWN', message: 'Something went wrong'};

            handleError(mockRes, error, 'saving data');

            expect(console.error).toHaveBeenCalledWith('Error saving data:', error);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should handle string errors', () => {
            handleError(mockRes, 'Network timeout', 'connecting');

            expect(console.error).toHaveBeenCalledWith('Error connecting:', 'Network timeout');
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should format context in error message', () => {
            handleError(mockRes, new Error('test'), 'fetching user');

            const jsonCall = mockRes.json.mock.calls[0][0];
            expect(jsonCall.message).toContain('fetch');
        });
    });
});

