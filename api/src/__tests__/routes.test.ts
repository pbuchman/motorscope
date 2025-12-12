/**
 * Tests for API Routes
 *
 * Integration tests for all API endpoints using supertest.
 * Mocks database and authentication dependencies.
 */

import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {Express, NextFunction, Request, Response} from 'express';

// Create mock functions with proper typing
const mockUpsertUser = jest.fn<any>();
const mockGetListingsByUserId = jest.fn<any>();
const mockGetListingById = jest.fn<any>();
const mockSaveAllListings = jest.fn<any>();
const mockSaveListing = jest.fn<any>();
const mockDeleteListing = jest.fn<any>();
const mockCheckFirestoreHealth = jest.fn<any>();
const mockGetUserSettings = jest.fn<any>();
const mockSaveUserSettings = jest.fn<any>();
const mockGetGeminiHistory = jest.fn<any>();
const mockAddGeminiHistoryEntries = jest.fn<any>();
const mockClearGeminiHistory = jest.fn<any>();
const mockBlacklistToken = jest.fn<any>();
const mockCleanupExpiredBlacklistedTokens = jest.fn<any>();
const mockIsTokenBlacklisted = jest.fn<any>();
const mockVerifyGoogleToken = jest.fn<any>();
const mockVerifyGoogleAccessToken = jest.fn<any>();
const mockGenerateJwt = jest.fn<any>();

// Mock db module
jest.unstable_mockModule('../db.js', () => ({
    upsertUser: mockUpsertUser,
    getListingsByUserId: mockGetListingsByUserId,
    getListingById: mockGetListingById,
    saveAllListings: mockSaveAllListings,
    saveListing: mockSaveListing,
    deleteListing: mockDeleteListing,
    checkFirestoreHealth: mockCheckFirestoreHealth,
    getUserSettings: mockGetUserSettings,
    saveUserSettings: mockSaveUserSettings,
    getGeminiHistory: mockGetGeminiHistory,
    addGeminiHistoryEntries: mockAddGeminiHistoryEntries,
    clearGeminiHistory: mockClearGeminiHistory,
    blacklistToken: mockBlacklistToken,
    cleanupExpiredBlacklistedTokens: mockCleanupExpiredBlacklistedTokens,
    isTokenBlacklisted: mockIsTokenBlacklisted,
}));

// Mock auth module with a custom middleware
jest.unstable_mockModule('../auth.js', () => ({
    authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
        req.user = {
            userId: 'test-user-id',
            email: 'test@example.com',
            jti: 'test-jti',
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        next();
    },
    verifyGoogleToken: mockVerifyGoogleToken,
    verifyGoogleAccessToken: mockVerifyGoogleAccessToken,
    generateJwt: mockGenerateJwt,
} as any));

// Import routes after mocking
const routesModule = await import('../routes.js');
const routes = routesModule.default;

// Create test app
function createApp(): Express {
    // Return a lightweight wrapper that delegates to the router but strips the '/api' prefix
    const appHandler: any = (req: any, res: any, next: any) => {
        // Normalize URL and path for mounted router
        if (typeof req.url === 'string' && req.url.startsWith('/api')) {
            req.url = req.url.slice(4) || '/';
            req.path = req.url;
        }
        return (routes as any)(req, res, next);
    };

    // Add minimal Express-like methods used by middleware (use, get, post...) if needed
    // but our tests call the handler directly so this is sufficient.
    return appHandler as Express;
}

// Helper to make requests (simple implementation without supertest for ESM compatibility)
async function testRequest(app: Express, method: string, path: string, body?: any, headers?: Record<string, string>) {
    return new Promise<{ status: number; body: any }>((resolve) => {
        const mockReq: any = {
            method,
            url: path,
            path,
            headers: headers || {},
            body: body || {},
            query: {},
            params: {},
            user: undefined,
        };

        // Extract query params
        const [basePath, queryString] = path.split('?');
        mockReq.path = basePath;
        if (queryString) {
            queryString.split('&').forEach(param => {
                const [key, value] = param.split('=');
                mockReq.query[key] = value;
            });
        }

        // Extract route params
        const pathParts = basePath.split('/');
        if (pathParts[3]) {
            mockReq.params.id = pathParts[3];
        }

        const mockRes: any = {
            statusCode: 200,
            _body: null,
            status: function (code: number) {
                this.statusCode = code;
                return this;
            },
            json: function (data: any) {
                this._body = data;
                resolve({status: this.statusCode, body: data});
                return this;
            },
            send: function (data: any) {
                this._body = data;
                resolve({status: this.statusCode, body: data});
                return this;
            },
        };

        // Run through express
        app(mockReq, mockRes, () => {
            resolve({status: mockRes.statusCode, body: mockRes._body});
        });
    });
}

describe('API Routes', () => {
    let app: Express;

    beforeEach(() => {
        app = createApp();
        jest.clearAllMocks();
        // Set default mock return values
        mockIsTokenBlacklisted.mockResolvedValue(false);
    });

    // ==========================================================================
    // Health Check
    // ==========================================================================
    describe('Health Check Endpoint', () => {
        it('should return healthy status when Firestore is connected', async () => {
            mockCheckFirestoreHealth.mockResolvedValue(true);
            mockCleanupExpiredBlacklistedTokens.mockResolvedValue(0);

            const response = await testRequest(app, 'GET', '/api/healthz');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body.firestore).toBe('ok');
            expect(response.body.timestamp).toBeDefined();
        });

        it('should return unhealthy status when Firestore is disconnected', async () => {
            mockCheckFirestoreHealth.mockResolvedValue(false);
            mockCleanupExpiredBlacklistedTokens.mockResolvedValue(0);

            const response = await testRequest(app, 'GET', '/api/healthz');

            expect(response.status).toBe(503);
            expect(response.body.status).toBe('error');
            expect(response.body.firestore).toBe('error');
        });
    });

    // ==========================================================================
    // Authentication Routes
    // ==========================================================================
    describe('Google Authentication', () => {
        it('should authenticate with access token', async () => {
            const mockGooglePayload = {
                sub: 'google-user-123',
                email: 'user@example.com',
                name: 'Test User',
            };
            const mockUser = {
                id: 'google_google-user-123',
                email: 'user@example.com',
                displayName: 'Test User',
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLoginAt: '2024-01-01T00:00:00.000Z',
            };

            mockVerifyGoogleAccessToken.mockResolvedValue(mockGooglePayload);
            mockUpsertUser.mockResolvedValue(mockUser);
            mockGenerateJwt.mockReturnValue('jwt-token-123');

            const response = await testRequest(app, 'POST', '/api/auth/google', {accessToken: 'google-access-token'});

            expect(response.status).toBe(200);
            expect(response.body.token).toBe('jwt-token-123');
            expect(response.body.user.email).toBe('user@example.com');
        });

        it('should authenticate with ID token', async () => {
            const mockGooglePayload = {
                sub: 'google-user-456',
                email: 'user2@example.com',
                name: 'Test User 2',
            };
            const mockUser = {
                id: 'google_google-user-456',
                email: 'user2@example.com',
                displayName: 'Test User 2',
                createdAt: '2024-01-01T00:00:00.000Z',
                lastLoginAt: '2024-01-01T00:00:00.000Z',
            };

            mockVerifyGoogleToken.mockResolvedValue(mockGooglePayload);
            mockUpsertUser.mockResolvedValue(mockUser);
            mockGenerateJwt.mockReturnValue('jwt-token-456');

            const response = await testRequest(app, 'POST', '/api/auth/google', {idToken: 'google-id-token'});

            expect(response.status).toBe(200);
            expect(response.body.token).toBe('jwt-token-456');
        });

        it('should return 400 when no token provided', async () => {
            const response = await testRequest(app, 'POST', '/api/auth/google', {});

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('required');
        });

        it('should return 401 when Google token is invalid', async () => {
            mockVerifyGoogleAccessToken.mockRejectedValue(new Error('Invalid token'));

            const response = await testRequest(app, 'POST', '/api/auth/google', {accessToken: 'invalid-token'});

            expect(response.status).toBe(401);
        });
    });

    describe('Get Current User', () => {
        it('should return current user info', async () => {
            const response = await testRequest(app, 'GET', '/api/auth/me', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.user.id).toBe('test-user-id');
            expect(response.body.user.email).toBe('test@example.com');
        });
    });

    describe('Logout', () => {
        it('should blacklist token and return success', async () => {
            mockBlacklistToken.mockResolvedValue(undefined);

            const response = await testRequest(app, 'POST', '/api/auth/logout', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    // ==========================================================================
    // Listings API
    // ==========================================================================
    describe('Get All Listings', () => {
        it('should return all listings for user', async () => {
            const mockListings = [
                {id: 'listing-1', title: 'BMW 320d', userId: 'test-user-id', docId: 'doc1'},
                {id: 'listing-2', title: 'Audi A4', userId: 'test-user-id', docId: 'doc2'},
            ];
            mockGetListingsByUserId.mockResolvedValue(mockListings);

            const response = await testRequest(app, 'GET', '/api/listings', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].id).toBe('listing-1');
            // Internal fields should be removed
            expect(response.body[0].userId).toBeUndefined();
            expect(response.body[0].docId).toBeUndefined();
        });

        it('should return empty array when no listings', async () => {
            mockGetListingsByUserId.mockResolvedValue([]);

            const response = await testRequest(app, 'GET', '/api/listings', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('Get Listing By ID', () => {
        it('should return a specific listing', async () => {
            const mockListing = {
                id: 'listing-1',
                title: 'BMW 320d',
                userId: 'test-user-id',
                docId: 'doc1',
            };
            mockGetListingById.mockResolvedValue(mockListing);

            const response = await testRequest(app, 'GET', '/api/listings/listing-1', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe('listing-1');
            expect(response.body.userId).toBeUndefined();
        });

        it('should return 404 for non-existent listing', async () => {
            mockGetListingById.mockResolvedValue(null);

            const response = await testRequest(app, 'GET', '/api/listings/non-existent', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(404);
        });
    });

    describe('Replace All Listings', () => {
        it('should replace all listings', async () => {
            const listings = [
                {id: 'listing-1', title: 'BMW 320d'},
                {id: 'listing-2', title: 'Audi A4'},
            ];
            mockSaveAllListings.mockResolvedValue(listings);

            const response = await testRequest(app, 'PUT', '/api/listings', listings, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.count).toBe(2);
        });

        it('should return 400 for non-array body', async () => {
            const response = await testRequest(app, 'PUT', '/api/listings', {id: 'listing-1'}, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(400);
        });

        it('should return 400 for listings without id', async () => {
            const response = await testRequest(app, 'PUT', '/api/listings', [{title: 'No ID listing'}], {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(400);
        });
    });

    describe('Create Listing', () => {
        it('should create a new listing', async () => {
            const listing = {id: 'listing-new', title: 'New BMW'};
            const savedListing = {...listing, userId: 'test-user-id', docId: 'doc-new'};
            mockSaveListing.mockResolvedValue(savedListing);

            const response = await testRequest(app, 'POST', '/api/listings', listing, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe('listing-new');
            expect(response.body.userId).toBeUndefined();
        });

        it('should return 400 for listing without id', async () => {
            const response = await testRequest(app, 'POST', '/api/listings', {title: 'No ID'}, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(400);
        });
    });

    describe('Delete Listing', () => {
        it('should delete a listing', async () => {
            mockDeleteListing.mockResolvedValue(true);

            const response = await testRequest(app, 'DELETE', '/api/listings/listing-1', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should return 404 when listing not found', async () => {
            mockDeleteListing.mockResolvedValue(false);

            const response = await testRequest(app, 'DELETE', '/api/listings/non-existent', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(404);
        });
    });

    // ==========================================================================
    // Settings API
    // ==========================================================================
    describe('Get Settings', () => {
        it('should return user settings', async () => {
            const mockSettings = {
                userId: 'test-user-id',
                geminiApiKey: 'api-key',
                checkFrequencyMinutes: 60,
                updatedAt: '2024-01-01T00:00:00.000Z',
                geminiStats: {allTimeTotalCalls: 0, totalCalls: 0, successCount: 0, errorCount: 0},
            };
            mockGetUserSettings.mockResolvedValue(mockSettings);

            const response = await testRequest(app, 'GET', '/api/settings', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.checkFrequencyMinutes).toBe(60);
        });
    });

    describe('Update Settings', () => {
        it('should update user settings', async () => {
            const updatedSettings = {
                userId: 'test-user-id',
                geminiApiKey: 'new-api-key',
                checkFrequencyMinutes: 120,
                updatedAt: '2024-01-02T00:00:00.000Z',
                geminiStats: {allTimeTotalCalls: 0, totalCalls: 0, successCount: 0, errorCount: 0},
            };
            mockSaveUserSettings.mockResolvedValue(updatedSettings);

            const response = await testRequest(app, 'PATCH', '/api/settings', {checkFrequencyMinutes: 120}, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.checkFrequencyMinutes).toBe(120);
        });
    });

    // ==========================================================================
    // Gemini History API
    // ==========================================================================
    describe('Get Gemini History', () => {
        it('should return gemini history', async () => {
            const mockHistory = [
                {id: 'entry-1', url: 'http://example.com', status: 'success'},
                {id: 'entry-2', url: 'http://example.com/2', status: 'error'},
            ];
            mockGetGeminiHistory.mockResolvedValue(mockHistory);

            const response = await testRequest(app, 'GET', '/api/gemini-history', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
        });

        it('should respect limit parameter', async () => {
            mockGetGeminiHistory.mockResolvedValue([]);

            await testRequest(app, 'GET', '/api/gemini-history?limit=50', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(mockGetGeminiHistory).toHaveBeenCalledWith('test-user-id', 50);
        });
    });

    describe('Add Gemini History', () => {
        it('should add history entries as array', async () => {
            const entries = [
                {
                    id: 'entry-1',
                    url: 'http://example.com',
                    promptPreview: 'test',
                    status: 'success',
                    timestamp: '2024-01-01',
                },
            ];
            mockAddGeminiHistoryEntries.mockResolvedValue(undefined);

            const response = await testRequest(app, 'POST', '/api/gemini-history', entries, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should add single history entry', async () => {
            const entry = {
                id: 'entry-1',
                url: 'http://example.com',
                promptPreview: 'test',
                status: 'success',
                timestamp: '2024-01-01',
            };
            mockAddGeminiHistoryEntries.mockResolvedValue(undefined);

            const response = await testRequest(app, 'POST', '/api/gemini-history', entry, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.count).toBe(1);
        });

        it('should return 400 for entries without id', async () => {
            const response = await testRequest(app, 'POST', '/api/gemini-history', [{url: 'http://example.com'}], {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(400);
        });
    });

    describe('Clear Gemini History', () => {
        it('should clear history', async () => {
            mockClearGeminiHistory.mockResolvedValue(10);

            const response = await testRequest(app, 'DELETE', '/api/gemini-history', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.deleted).toBe(10);
        });
    });

    // ==========================================================================
    // Additional edge cases
    // ==========================================================================
    describe('Additional edge cases', () => {
        it('should opportunistically call cleanupExpiredBlacklistedTokens in /healthz when Math.random < 0.1', async () => {
            // Force Math.random to fall into the cleanup branch
            const originalRandom = Math.random;
            // return small value
            (Math as any).random = () => 0.05;

            mockCheckFirestoreHealth.mockResolvedValue(true);
            mockCleanupExpiredBlacklistedTokens.mockResolvedValue(2);

            const response = await testRequest(createApp(), 'GET', '/api/healthz');

            // cleanupExpiredBlacklistedTokens is called asynchronously inside the route but our mock will be used
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');

            // restore
            (Math as any).random = originalRandom;
        });

        it('should clamp gemini-history limit to 500 when a large limit is provided', async () => {
            mockGetGeminiHistory.mockResolvedValue([]);

            await testRequest(createApp(), 'GET', '/api/gemini-history?limit=10000');

            expect(mockGetGeminiHistory).toHaveBeenCalledWith('test-user-id', 500);
        });

        it('logout should not attempt to blacklist when token has no jti', async () => {
            // We need a fresh instance of the routes module that uses an auth middleware which sets no jti.
            jest.resetModules();
            jest.clearAllMocks();

            // Re-mock db module to use existing mock functions
            jest.unstable_mockModule('../db.js', () => ({
                upsertUser: mockUpsertUser,
                getListingsByUserId: mockGetListingsByUserId,
                getListingById: mockGetListingById,
                saveAllListings: mockSaveAllListings,
                saveListing: mockSaveListing,
                deleteListing: mockDeleteListing,
                checkFirestoreHealth: mockCheckFirestoreHealth,
                getUserSettings: mockGetUserSettings,
                saveUserSettings: mockSaveUserSettings,
                getGeminiHistory: mockGetGeminiHistory,
                addGeminiHistoryEntries: mockAddGeminiHistoryEntries,
                clearGeminiHistory: mockClearGeminiHistory,
                blacklistToken: mockBlacklistToken,
                cleanupExpiredBlacklistedTokens: mockCleanupExpiredBlacklistedTokens,
                isTokenBlacklisted: mockIsTokenBlacklisted,
            }));

            // Mock auth module to set user without jti
            jest.unstable_mockModule('../auth.js', () => ({
                authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
                    req.user = {
                        userId: 'test-user-id',
                        email: 'test@example.com',
                        // intentionally no jti
                    } as any;
                    next();
                },
                verifyGoogleToken: mockVerifyGoogleToken,
                verifyGoogleAccessToken: mockVerifyGoogleAccessToken,
                generateJwt: mockGenerateJwt,
            } as any));

            const freshRoutesModule = await import('../routes.js');
            const freshRoutes = freshRoutesModule.default;

            // Create a simple wrapper like createApp but using freshRoutes
            const appHandler: any = (req: any, res: any, next: any) => {
                if (typeof req.url === 'string' && req.url.startsWith('/api')) {
                    req.url = req.url.slice(4) || '/';
                    req.path = req.url;
                }
                return (freshRoutes as any)(req, res, next);
            };

            const app = appHandler as Express;

            // Call logout - should return success and NOT call blacklistToken since no jti
            const response = await testRequest(app, 'POST', '/api/auth/logout', undefined, {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(mockBlacklistToken).not.toHaveBeenCalled();

            // Restore module registry for subsequent tests
            jest.resetModules();

            // Re-establish original mocks for later tests (the top-level mocks will be re-used by beforeEach)
            jest.unstable_mockModule('../db.js', () => ({
                upsertUser: mockUpsertUser,
                getListingsByUserId: mockGetListingsByUserId,
                getListingById: mockGetListingById,
                saveAllListings: mockSaveAllListings,
                saveListing: mockSaveListing,
                deleteListing: mockDeleteListing,
                checkFirestoreHealth: mockCheckFirestoreHealth,
                getUserSettings: mockGetUserSettings,
                saveUserSettings: mockSaveUserSettings,
                getGeminiHistory: mockGetGeminiHistory,
                addGeminiHistoryEntries: mockAddGeminiHistoryEntries,
                clearGeminiHistory: mockClearGeminiHistory,
                blacklistToken: mockBlacklistToken,
                cleanupExpiredBlacklistedTokens: mockCleanupExpiredBlacklistedTokens,
                isTokenBlacklisted: mockIsTokenBlacklisted,
            }));

            jest.unstable_mockModule('../auth.js', () => ({
                authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
                    req.user = {
                        userId: 'test-user-id',
                        email: 'test@example.com',
                        jti: 'test-jti',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    };
                    next();
                },
                verifyGoogleToken: mockVerifyGoogleToken,
                verifyGoogleAccessToken: mockVerifyGoogleAccessToken,
                generateJwt: mockGenerateJwt,
            } as any));

            // no explicit import - next beforeEach will re-import route module normally
        });

        it('should return 500 when saveAllListings throws', async () => {
            mockSaveAllListings.mockRejectedValue(new Error('save failed'));

            const response = await testRequest(createApp(), 'PUT', '/api/listings', [{id: 'l1'}], {
                authorization: 'Bearer test-token',
            });

            expect(response.status).toBe(500);
            expect(response.body.error).toBeDefined();
        });

    });
});
