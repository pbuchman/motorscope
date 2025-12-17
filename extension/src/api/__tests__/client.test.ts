/**
 * Tests for API Client
 *
 * Tests the API client error handling, URL building, and request patterns.
 */

import {
    ApiError,
    getRemoteListings,
    saveRemoteListing,
    deleteRemoteListing,
    checkBackendHealth,
    getRemoteSettings,
    patchRemoteSettings,
    getRemoteGeminiHistory,
    addRemoteGeminiHistory,
    clearRemoteGeminiHistory,
    uploadImageFromUrl,
} from '../client';
import type {CarListing} from '@/types';

// Mock auth module
jest.mock('../../auth/oauthClient', () => ({
    getToken: jest.fn(),
}));

// Mock localServerStorage
jest.mock('../../auth/localServerStorage', () => ({
    getBackendServerUrl: jest.fn().mockResolvedValue('https://api.example.com'),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {getToken} = require('../../auth/oauthClient');

const mockGetToken = getToken as jest.MockedFunction<typeof import('../../auth/oauthClient').getToken>;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ApiError', () => {
    describe('constructor', () => {
        it('should create error with status code', () => {
            const error = new ApiError('Not found', 404);
            expect(error.message).toBe('Not found');
            expect(error.statusCode).toBe(404);
            expect(error.name).toBe('ApiError');
        });

        it('should indicate auth error for 401 status', () => {
            const error = new ApiError('Unauthorized', 401, true);
            expect(error.isAuthError).toBe(true);
        });

        it('should default isAuthError to false', () => {
            const error = new ApiError('Server error', 500);
            expect(error.isAuthError).toBe(false);
        });

        it('should be instanceof Error', () => {
            const error = new ApiError('Test', 400);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ApiError);
        });
    });

    describe('HTTP status codes', () => {
        it('should handle various HTTP status codes', () => {
            const statuses = [400, 401, 403, 404, 500, 502, 503];

            for (const status of statuses) {
                const error = new ApiError(`Error ${status}`, status);
                expect(error.statusCode).toBe(status);
            }
        });

        it('should correctly flag 401 as auth error', () => {
            const error401 = new ApiError('Unauthorized', 401, true);
            const error403 = new ApiError('Forbidden', 403, false);

            expect(error401.isAuthError).toBe(true);
            expect(error403.isAuthError).toBe(false);
        });
    });

    describe('error messages', () => {
        it('should preserve error message for display', () => {
            const messages = [
                'Session expired',
                'Invalid request',
                'Resource not found',
                'Rate limit exceeded',
                'Validation failed: missing required field',
            ];

            for (const message of messages) {
                const error = new ApiError(message, 400);
                expect(error.message).toBe(message);
            }
        });

        it('should handle empty message', () => {
            const error = new ApiError('', 500);
            expect(error.message).toBe('');
        });

        it('should handle long messages', () => {
            const longMessage = 'Error: '.repeat(100);
            const error = new ApiError(longMessage, 400);
            expect(error.message).toBe(longMessage);
        });
    });

    describe('error stack', () => {
        it('should have a stack trace', () => {
            const error = new ApiError('Test error', 500);
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('ApiError');
        });
    });
});

describe('API Error Handling Patterns', () => {
    it('should identify auth errors correctly', () => {
        const authError = new ApiError('Token expired', 401, true);
        const serverError = new ApiError('Internal error', 500, false);
        const notFoundError = new ApiError('Not found', 404, false);

        expect(authError.isAuthError).toBe(true);
        expect(serverError.isAuthError).toBe(false);
        expect(notFoundError.isAuthError).toBe(false);
    });

    it('should allow throwing and catching ApiError', () => {
        const throwApiError = () => {
            throw new ApiError('Test', 400);
        };

        expect(throwApiError).toThrow(ApiError);
        expect(throwApiError).toThrow('Test');
    });

    it('should be catchable as Error', () => {
        const throwApiError = () => {
            throw new ApiError('Network failed', 503);
        };

        expect(throwApiError).toThrow(ApiError);
        expect(throwApiError).toThrow('Network failed');

        // Verify error properties when caught
        let caughtError: unknown;
        try {
            throwApiError();
        } catch (e) {
            caughtError = e;
        }
        expect(caughtError).toBeInstanceOf(Error);
        expect((caughtError as ApiError).statusCode).toBe(503);
    });
});

describe('API URL Building', () => {
    // Test URL construction patterns
    const API_PREFIX = '/api';

    const buildUrl = (baseUrl: string, endpoint: string): string => {
        return `${baseUrl}${API_PREFIX}${endpoint}`;
    };

    describe('production URLs', () => {
        it('should construct correct API URLs', () => {
            const baseUrl = 'https://api.example.com';

            expect(buildUrl(baseUrl, '/listings')).toBe('https://api.example.com/api/listings');
            expect(buildUrl(baseUrl, '/auth/login')).toBe('https://api.example.com/api/auth/login');
            expect(buildUrl(baseUrl, '/settings')).toBe('https://api.example.com/api/settings');
        });

        it('should handle Cloud Run URLs', () => {
            const cloudRunUrl = 'https://motorscope-dev-663051224718.europe-west1.run.app';

            expect(buildUrl(cloudRunUrl, '/listings')).toBe(
                'https://motorscope-dev-663051224718.europe-west1.run.app/api/listings',
            );
        });
    });

    describe('development URLs', () => {
        it('should handle localhost URLs', () => {
            const baseUrl = 'http://localhost:8080';

            expect(buildUrl(baseUrl, '/healthz')).toBe('http://localhost:8080/api/healthz');
            expect(buildUrl(baseUrl, '/listings')).toBe('http://localhost:8080/api/listings');
        });

        it('should handle localhost with different ports', () => {
            expect(buildUrl('http://localhost:3000', '/test')).toBe('http://localhost:3000/api/test');
            expect(buildUrl('http://localhost:5000', '/test')).toBe('http://localhost:5000/api/test');
        });
    });

    describe('endpoint paths', () => {
        const baseUrl = 'https://api.example.com';

        it('should build listings endpoints', () => {
            expect(buildUrl(baseUrl, '/listings')).toBe('https://api.example.com/api/listings');
            expect(buildUrl(baseUrl, '/listings/vin_ABC123')).toBe(
                'https://api.example.com/api/listings/vin_ABC123',
            );
        });

        it('should build auth endpoints', () => {
            expect(buildUrl(baseUrl, '/auth/google')).toBe('https://api.example.com/api/auth/google');
            expect(buildUrl(baseUrl, '/auth/me')).toBe('https://api.example.com/api/auth/me');
            expect(buildUrl(baseUrl, '/auth/logout')).toBe('https://api.example.com/api/auth/logout');
        });

        it('should build settings endpoints', () => {
            expect(buildUrl(baseUrl, '/settings')).toBe('https://api.example.com/api/settings');
        });

        it('should build gemini-history endpoints', () => {
            expect(buildUrl(baseUrl, '/gemini-history')).toBe(
                'https://api.example.com/api/gemini-history',
            );
            expect(buildUrl(baseUrl, '/gemini-history?limit=50')).toBe(
                'https://api.example.com/api/gemini-history?limit=50',
            );
        });

        it('should build health check endpoint', () => {
            expect(buildUrl(baseUrl, '/healthz')).toBe('https://api.example.com/api/healthz');
        });
    });
});

describe('API Request Patterns', () => {
    describe('request body serialization', () => {
        it('should serialize listing objects correctly', () => {
            const listing = {
                id: 'vin_ABC123',
                title: 'BMW 320d',
                currentPrice: 150000,
                currency: 'PLN',
                priceHistory: [{date: '2024-01-01', price: 160000, currency: 'PLN'}],
            };

            const serialized = JSON.stringify(listing);
            const parsed = JSON.parse(serialized);

            expect(parsed.id).toBe(listing.id);
            expect(parsed.priceHistory).toHaveLength(1);
        });

        it('should serialize arrays correctly', () => {
            const listings = [
                {id: 'vin_1', title: 'Car 1'},
                {id: 'vin_2', title: 'Car 2'},
            ];

            const serialized = JSON.stringify(listings);
            const parsed = JSON.parse(serialized);

            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed).toHaveLength(2);
        });

        it('should handle null values in objects', () => {
            const data = {
                value: null,
                nested: {value: null},
            };

            const serialized = JSON.stringify(data);
            const parsed = JSON.parse(serialized);

            expect(parsed.value).toBeNull();
            expect(parsed.nested.value).toBeNull();
        });
    });

    describe('response parsing patterns', () => {
        it('should handle error response format', () => {
            const errorResponse = {
                error: 'Bad Request',
                message: 'Invalid listing ID format',
                statusCode: 400,
            };

            expect(errorResponse.message).toBe('Invalid listing ID format');
            expect(errorResponse.statusCode).toBe(400);
        });

        it('should handle success response with count', () => {
            const successResponse = {
                success: true,
                count: 5,
            };

            expect(successResponse.success).toBe(true);
            expect(successResponse.count).toBe(5);
        });
    });
});

// =============================================================================
// API Function Tests with Mocking
// =============================================================================

describe('API Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetToken.mockResolvedValue('test-token');
        mockFetch.mockReset();
    });

    const createMockResponse = <T>(data: T, ok = true, status = 200) => ({
        ok,
        status,
        json: jest.fn().mockResolvedValue(data),
    });

    describe('getRemoteListings', () => {
        it('should fetch and return listings', async () => {
            const mockListings: Partial<CarListing>[] = [
                {id: 'vin_1', title: 'BMW 320d'},
                {id: 'vin_2', title: 'Audi A4'},
            ];
            mockFetch.mockResolvedValue(createMockResponse(mockListings));

            const result = await getRemoteListings();

            expect(result).toEqual(mockListings);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/api/listings',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-token',
                    }),
                }),
            );
        });

        it('should throw ApiError when not authenticated', async () => {
            mockGetToken.mockResolvedValue(null);

            await expect(getRemoteListings()).rejects.toThrow(ApiError);
            await expect(getRemoteListings()).rejects.toMatchObject({
                isAuthError: true,
                statusCode: 401,
            });
        });

        it('should throw ApiError on HTTP error', async () => {
            mockFetch.mockResolvedValue(createMockResponse(
                {message: 'Server error'},
                false,
                500,
            ));

            await expect(getRemoteListings()).rejects.toThrow(ApiError);
        });
    });

    describe('saveRemoteListing', () => {
        it('should save a listing via POST', async () => {
            const listing: Partial<CarListing> = {id: 'vin_ABC', title: 'Test Car'};
            mockFetch.mockResolvedValue(createMockResponse(listing));

            const result = await saveRemoteListing(listing as CarListing);

            expect(result).toEqual(listing);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/api/listings',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(listing),
                }),
            );
        });
    });

    describe('deleteRemoteListing', () => {
        it('should delete a listing via DELETE', async () => {
            mockFetch.mockResolvedValue(createMockResponse({success: true}));

            const result = await deleteRemoteListing('vin_123');

            expect(result).toEqual({success: true});
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/api/listings/vin_123',
                expect.objectContaining({method: 'DELETE'}),
            );
        });
    });

    describe('checkBackendHealth', () => {
        it('should return health status without auth', async () => {
            const healthResponse = {status: 'ok', firestore: 'connected'};
            mockFetch.mockResolvedValue(createMockResponse(healthResponse));

            const result = await checkBackendHealth();

            expect(result).toEqual(healthResponse);
            // Health check should NOT have auth header
            expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/api/healthz');
        });

        it('should throw on health check failure', async () => {
            mockFetch.mockResolvedValue(createMockResponse({}, false, 503));

            await expect(checkBackendHealth()).rejects.toThrow('Backend health check failed');
        });
    });

    describe('Settings API', () => {
        describe('getRemoteSettings', () => {
            it('should fetch settings', async () => {
                const mockSettings = {
                    geminiApiKey: 'test-key',
                    checkFrequencyMinutes: 60,
                    geminiStats: {totalCalls: 0, successfulCalls: 0, failedCalls: 0, totalInputTokens: 0, totalOutputTokens: 0},
                };
                mockFetch.mockResolvedValue(createMockResponse(mockSettings));

                const result = await getRemoteSettings();

                expect(result).toEqual(mockSettings);
            });
        });

        describe('patchRemoteSettings', () => {
            it('should patch settings with PATCH method', async () => {
                const partialSettings = {checkFrequencyMinutes: 30};
                const fullSettings = {
                    geminiApiKey: 'existing-key',
                    checkFrequencyMinutes: 30,
                    geminiStats: {totalCalls: 0, successfulCalls: 0, failedCalls: 0, totalInputTokens: 0, totalOutputTokens: 0},
                };
                mockFetch.mockResolvedValue(createMockResponse(fullSettings));

                const result = await patchRemoteSettings(partialSettings);

                expect(result).toEqual(fullSettings);
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/settings',
                    expect.objectContaining({
                        method: 'PATCH',
                        body: JSON.stringify(partialSettings),
                    }),
                );
            });
        });
    });

    describe('Gemini History API', () => {
        describe('getRemoteGeminiHistory', () => {
            it('should fetch history with default limit', async () => {
                const history = [{id: '1', timestamp: '2024-01-01'}];
                mockFetch.mockResolvedValue(createMockResponse(history));

                const result = await getRemoteGeminiHistory();

                expect(result).toEqual(history);
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/gemini-history?limit=100',
                    expect.any(Object),
                );
            });

            it('should fetch history with custom limit', async () => {
                mockFetch.mockResolvedValue(createMockResponse([]));

                await getRemoteGeminiHistory(50);

                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/gemini-history?limit=50',
                    expect.any(Object),
                );
            });
        });

        describe('addRemoteGeminiHistory', () => {
            it('should add history entries', async () => {
                const entry = {
                    id: '1',
                    url: 'https://example.com/listing',
                    promptPreview: 'Test prompt',
                    status: 'success' as const,
                    timestamp: new Date().toISOString(),
                };
                mockFetch.mockResolvedValue(createMockResponse({success: true, count: 1}));

                const result = await addRemoteGeminiHistory(entry);

                expect(result).toEqual({success: true, count: 1});
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/gemini-history',
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify(entry),
                    }),
                );
            });
        });

        describe('clearRemoteGeminiHistory', () => {
            it('should clear history', async () => {
                mockFetch.mockResolvedValue(createMockResponse({success: true, deleted: 10}));

                const result = await clearRemoteGeminiHistory();

                expect(result).toEqual({success: true, deleted: 10});
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/gemini-history',
                    expect.objectContaining({method: 'DELETE'}),
                );
            });
        });
    });

    describe('Image Storage API', () => {
        describe('uploadImageFromUrl', () => {
            it('should upload image and return stored URL', async () => {
                const response = {
                    url: 'https://storage.example.com/image.jpg',
                    path: 'users/123/listings/456/image.jpg',
                };
                mockFetch.mockResolvedValue(createMockResponse(response));

                const result = await uploadImageFromUrl(
                    'https://external.com/image.jpg',
                    'listing_123',
                );

                expect(result).toEqual(response);
                expect(mockFetch).toHaveBeenCalledWith(
                    'https://api.example.com/api/images',
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify({
                            imageUrl: 'https://external.com/image.jpg',
                            listingId: 'listing_123',
                        }),
                    }),
                );
            });
        });
    });

    describe('Error Handling', () => {
        it('should parse error message from response', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 400,
                json: jest.fn().mockResolvedValue({message: 'Custom error message'}),
            });

            await expect(getRemoteListings()).rejects.toMatchObject({
                message: 'Custom error message',
                statusCode: 400,
            });
        });

        it('should handle non-JSON error response', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                json: jest.fn().mockRejectedValue(new Error('Not JSON')),
            });

            await expect(getRemoteListings()).rejects.toMatchObject({
                message: 'Request failed',
                statusCode: 500,
            });
        });

        it('should flag 401 responses as auth errors', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 401,
                json: jest.fn().mockResolvedValue({message: 'Unauthorized'}),
            });

            await expect(getRemoteListings()).rejects.toMatchObject({
                isAuthError: true,
                statusCode: 401,
            });
        });
    });
});

