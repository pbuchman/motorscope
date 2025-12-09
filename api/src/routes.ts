/**
 * API Route Handlers
 *
 * REST API endpoints for the MotorScope backend.
 * All routes are mounted under /api prefix.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, verifyGoogleToken, verifyGoogleAccessToken, generateJwt } from './auth.js';
import {
  upsertUser,
  getListingsByUserId,
  getListingById,
  saveAllListings,
  saveListing,
  deleteListing,
  checkFirestoreHealth,
  getUserSettings,
  saveUserSettings,
  getGeminiHistory,
  addGeminiHistoryEntries,
  clearGeminiHistory,
  blacklistToken,
  cleanupExpiredBlacklistedTokens,
} from './db.js';
import { sendError, sendSuccess, sendOperationSuccess, handleError } from './utils/response.js';
import type { User, CarListing, AuthResponse, HealthResponse, UserSettings, GeminiCallHistoryEntry } from './types.js';

const router = Router();

// =============================================================================
// Health Check
// =============================================================================

/**
 * @openapi
 * /api/healthz:
 *   get:
 *     summary: Health check
 *     description: |
 *       Health check endpoint for Cloud Run and monitoring.
 *       Verifies Firestore connectivity.
 *       Also triggers opportunistic cleanup of expired blacklisted tokens.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Service is unhealthy (Firestore connectivity issue)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/healthz', async (_req: Request, res: Response) => {
  const firestoreOk = await checkFirestoreHealth();

  // Opportunistic cleanup of expired tokens (~10% of requests)
  if (Math.random() < 0.1) {
    cleanupExpiredBlacklistedTokens()
      .then(count => {
        if (count > 0) {
          console.log(`[Healthz] Cleaned up ${count} expired blacklisted tokens`);
        }
      })
      .catch(err => console.error('[Healthz] Token cleanup error:', err));
  }

  const response: HealthResponse = {
    status: firestoreOk ? 'ok' : 'error',
    firestore: firestoreOk ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
  };

  sendSuccess(res, response, firestoreOk ? 200 : 503);
});

// =============================================================================
// Authentication
// =============================================================================

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     summary: Authenticate with Google
 *     description: |
 *       Authenticate with a Google token from the Chrome extension.
 *
 *       Supports two token types:
 *       - **accessToken**: From chrome.identity.getAuthToken() (Chrome extension OAuth) - Preferred
 *       - **idToken**: From launchWebAuthFlow (Web application OAuth) - Legacy support
 *
 *       Returns a JWT token for subsequent API calls.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleAuthRequest'
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed - invalid Google token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { accessToken, idToken } = req.body;

    if (!accessToken && !idToken) {
      sendError(res, 400, 'accessToken or idToken is required in request body');
      return;
    }

    // Verify the Google token (prefer accessToken, fall back to idToken)
    let googlePayload;
    if (accessToken && typeof accessToken === 'string') {
      googlePayload = await verifyGoogleAccessToken(accessToken);
    } else if (idToken && typeof idToken === 'string') {
      googlePayload = await verifyGoogleToken(idToken);
    } else {
      sendError(res, 400, 'Token must be a string');
      return;
    }


    // Create internal user ID from Google sub (prefixed for future auth provider support)
    const userId = `google_${googlePayload.sub}`;

    // Upsert user in Firestore
    const now = new Date().toISOString();
    const user: User = {
      id: userId,
      email: googlePayload.email,
      displayName: googlePayload.name,
      createdAt: now,
      lastLoginAt: now,
    };

    const savedUser = await upsertUser(user);
    const token = generateJwt(savedUser.id, savedUser.email);

    const response: AuthResponse = {
      token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        displayName: savedUser.displayName,
      },
    };

    sendSuccess(res, response);
  } catch (error) {
    console.error('Authentication error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    sendError(res, 401, message);
  }
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: |
 *       Get current authenticated user information.
 *       Used to validate that a session is still valid.
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserInfo'
 *       401:
 *         description: Unauthorized - invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/auth/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, email } = req.user!;
    sendSuccess(res, { user: { id: userId, email } });
  } catch (error) {
    handleError(res, error, 'getting user info');
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     description: |
 *       Logout and invalidate the current JWT token.
 *       The token will be blacklisted and can no longer be used for authentication.
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       401:
 *         description: Unauthorized - invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/auth/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, jti, exp } = req.user!;

    if (!jti) {
      // Token doesn't have a jti (old format) - client will clear it anyway
      console.log(`[Auth] Logout for user ${userId} - token has no jti (old format)`);
      sendOperationSuccess(res, 'Logged out successfully');
      return;
    }

    // Calculate token expiration (default to 24h if not set)
    const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    await blacklistToken(jti, userId, expiresAt);

    console.log(`[Auth] User ${userId} logged out, token blacklisted`);
    sendOperationSuccess(res, 'Logged out successfully');
  } catch (error) {
    handleError(res, error, 'logging out');
  }
});

// =============================================================================
// Listings API (Protected Routes)
// =============================================================================

/**
 * @openapi
 * /api/listings:
 *   get:
 *     summary: Get all listings
 *     description: Get all car listings for the authenticated user.
 *     tags:
 *       - Listings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of car listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CarListing'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/listings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listings = await getListingsByUserId(userId);

    // Remove internal fields before sending to client
    const clientListings = listings.map(({ userId: _uid, docId: _docId, ...listing }) => listing);
    sendSuccess(res, clientListings);
  } catch (error) {
    handleError(res, error, 'fetching listings');
  }
});

/**
 * @openapi
 * /api/listings/{id}:
 *   get:
 *     summary: Get a listing by ID
 *     description: Get a specific car listing for the authenticated user.
 *     tags:
 *       - Listings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *         example: "vin_WBAPH5C55BA123456"
 *     responses:
 *       200:
 *         description: Listing found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarListing'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Listing not found or not owned by user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/listings/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listingId = req.params.id;

    const listing = await getListingById(listingId, userId);

    if (!listing) {
      sendError(res, 404, 'Listing not found or not owned by user');
      return;
    }

    // Remove internal fields before sending to client
    const { userId: _uid, docId: _docId, ...clientListing } = listing;
    sendSuccess(res, clientListing);
  } catch (error) {
    handleError(res, error, 'fetching listing');
  }
});

/**
 * @openapi
 * /api/listings:
 *   put:
 *     summary: Replace all listings
 *     description: |
 *       Replace all listings for the authenticated user.
 *       This performs a full sync - existing listings not in the payload are deleted.
 *     tags:
 *       - Listings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/CarListing'
 *     responses:
 *       200:
 *         description: Listings replaced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of listings saved
 *                   example: 5
 *       400:
 *         description: Bad request - invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/listings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listings = req.body as unknown[];

    if (!Array.isArray(listings)) {
      sendError(res, 400, 'Request body must be an array of listings');
      return;
    }

    // Validate each listing has required id field
    for (const listing of listings) {
      const item = listing as Record<string, unknown>;
      if (!item.id || typeof item.id !== 'string') {
        sendError(res, 400, 'Each listing must have a valid id field');
        return;
      }
    }

    const savedListings = await saveAllListings(listings as CarListing[], userId);
    sendOperationSuccess(res, undefined, { count: savedListings.length });
  } catch (error) {
    handleError(res, error, 'saving listings');
  }
});

/**
 * @openapi
 * /api/listings:
 *   post:
 *     summary: Create or update a listing
 *     description: |
 *       Create a new listing or update an existing one (upsert).
 *       If a listing with the same ID exists, it will be updated.
 *     tags:
 *       - Listings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CarListing'
 *     responses:
 *       200:
 *         description: Listing saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CarListing'
 *       400:
 *         description: Bad request - invalid listing data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/listings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listing = req.body as unknown as Record<string, unknown>;

    if (!listing.id || typeof listing.id !== 'string') {
      sendError(res, 400, 'Listing must have a valid id field');
      return;
    }

    const savedListing = await saveListing(req.body as CarListing, userId);

    // Remove internal fields before sending to client
    const { userId: _uid, docId: _docId, ...clientListing } = savedListing;
    sendSuccess(res, clientListing);
  } catch (error) {
    handleError(res, error, 'saving listing');
  }
});

/**
 * @openapi
 * /api/listings/{id}:
 *   delete:
 *     summary: Delete a listing
 *     description: Delete a specific car listing for the authenticated user.
 *     tags:
 *       - Listings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID to delete
 *         example: "vin_WBAPH5C55BA123456"
 *     responses:
 *       200:
 *         description: Listing deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Listing not found or not owned by user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/listings/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listingId = req.params.id;

    const deleted = await deleteListing(listingId, userId);

    if (!deleted) {
      sendError(res, 404, 'Listing not found or not owned by user');
      return;
    }

    sendOperationSuccess(res);
  } catch (error) {
    handleError(res, error, 'deleting listing');
  }
});

// =============================================================================
// Settings API (Protected Routes)
// =============================================================================

/**
 * @openapi
 * /api/settings:
 *   get:
 *     summary: Get user settings
 *     description: Get settings for the authenticated user including Gemini configuration and dashboard preferences.
 *     tags:
 *       - Settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * Settings response type for API (differs from stored UserSettings by using null instead of undefined)
 */
interface SettingsResponse {
  geminiApiKey: string;
  checkFrequencyMinutes: number;
  geminiStats: UserSettings['geminiStats'];
  language: 'en' | 'pl';
  lastRefreshTime: string | null;
  nextRefreshTime: string | null;
  lastRefreshCount: number;
  dashboardFilters: UserSettings['dashboardFilters'] | null;
  dashboardSort: string | null;
  dashboardViewMode: string | null;
}

/**
 * Format settings for client response (removes internal fields, converts undefined to null)
 */
function formatSettingsResponse(settings: UserSettings): SettingsResponse {
  return {
    geminiApiKey: settings.geminiApiKey,
    checkFrequencyMinutes: settings.checkFrequencyMinutes,
    geminiStats: settings.geminiStats,
    language: settings.language ?? 'en',
    lastRefreshTime: settings.lastRefreshTime ?? null,
    nextRefreshTime: settings.nextRefreshTime ?? null,
    lastRefreshCount: settings.lastRefreshCount ?? 0,
    dashboardFilters: settings.dashboardFilters ?? null,
    dashboardSort: settings.dashboardSort ?? null,
    dashboardViewMode: settings.dashboardViewMode ?? null,
  };
}

/**
 * Extract update fields from request body
 */
function extractSettingsUpdate(body: Record<string, unknown>): Partial<UserSettings> {
  const fields = [
    'geminiApiKey',
    'checkFrequencyMinutes',
    'geminiStats',
    'language',
    'lastRefreshTime',
    'nextRefreshTime',
    'lastRefreshCount',
    'dashboardFilters',
    'dashboardSort',
    'dashboardViewMode',
  ] as const;

  const updateData: Partial<UserSettings> = {};
  for (const field of fields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }
  return updateData;
}

router.get('/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const settings = await getUserSettings(userId);
    sendSuccess(res, formatSettingsResponse(settings));
  } catch (error) {
    handleError(res, error, 'fetching settings');
  }
});

/**
 * @openapi
 * /api/settings:
 *   patch:
 *     summary: Update settings (partial)
 *     description: |
 *       Partially update settings for the authenticated user.
 *       Only updates the fields that are provided in the request body.
 *       This is the preferred method for updating settings.
 *     tags:
 *       - Settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSettingsUpdate'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const updateData = extractSettingsUpdate(req.body);
    const savedSettings = await saveUserSettings(userId, updateData);
    sendSuccess(res, formatSettingsResponse(savedSettings));
  } catch (error) {
    handleError(res, error, 'updating settings');
  }
});

/**
 * @openapi
 * /api/settings:
 *   put:
 *     summary: Update settings (full)
 *     description: |
 *       Full update of settings for the authenticated user.
 *       Note: For partial updates, prefer PATCH /api/settings.
 *     tags:
 *       - Settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSettingsUpdate'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const updateData = extractSettingsUpdate(req.body);
    const savedSettings = await saveUserSettings(userId, updateData);
    sendSuccess(res, formatSettingsResponse(savedSettings));
  } catch (error) {
    handleError(res, error, 'saving settings');
  }
});

// =============================================================================
// Gemini History API (Protected Routes)
// =============================================================================

/**
 * @openapi
 * /api/gemini-history:
 *   get:
 *     summary: Get Gemini call history
 *     description: Get Gemini API call history for the authenticated user.
 *     tags:
 *       - Gemini History
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 500
 *         description: Maximum number of entries to return
 *     responses:
 *       200:
 *         description: List of Gemini call history entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GeminiCallHistoryEntry'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/gemini-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const history = await getGeminiHistory(userId, limit);
    sendSuccess(res, history);
  } catch (error) {
    handleError(res, error, 'fetching Gemini history');
  }
});

/**
 * @openapi
 * /api/gemini-history:
 *   post:
 *     summary: Add Gemini history entries
 *     description: Add Gemini history entries for the authenticated user. Accepts single entry or array.
 *     tags:
 *       - Gemini History
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/GeminiCallHistoryEntry'
 *               - type: array
 *                 items:
 *                   $ref: '#/components/schemas/GeminiCallHistoryEntry'
 *     responses:
 *       200:
 *         description: History entries added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: Number of entries added
 *                   example: 1
 *       400:
 *         description: Bad request - invalid entry data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/gemini-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const body = req.body as unknown;

    // Accept single entry or array
    const rawEntries = Array.isArray(body) ? body : [body];

    for (const entry of rawEntries) {
      const item = entry as Record<string, unknown>;
      if (!item.id || typeof item.id !== 'string') {
        sendError(res, 400, 'Each history entry must have a valid id field');
        return;
      }
    }

    const entries = rawEntries as GeminiCallHistoryEntry[];
    await addGeminiHistoryEntries(entries, userId);
    sendOperationSuccess(res, undefined, { count: entries.length });
  } catch (error) {
    handleError(res, error, 'saving Gemini history');
  }
});

/**
 * @openapi
 * /api/gemini-history:
 *   delete:
 *     summary: Clear Gemini history
 *     description: Clear all Gemini history for the authenticated user.
 *     tags:
 *       - Gemini History
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: History cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deleted:
 *                   type: integer
 *                   description: Number of entries deleted
 *                   example: 25
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/gemini-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const deletedCount = await clearGeminiHistory(userId);
    sendOperationSuccess(res, undefined, { deleted: deletedCount });
  } catch (error) {
    handleError(res, error, 'clearing Gemini history');
  }
});

export default router;

