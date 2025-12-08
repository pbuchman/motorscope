/**
 * API Route Handlers
 *
 * Defines all API endpoints for the MotorScope backend.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, verifyGoogleToken, verifyGoogleAccessToken, generateJwt, getTokenExpiration } from './auth.js';
import {
  upsertUser,
  getListingsByUserId,
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
import type { User, CarListing, AuthResponse, HealthResponse, UserSettings, GeminiCallHistoryEntry } from './types.js';

const router = Router();

// =============================================================================
// Health Check
// =============================================================================

/**
 * GET /api/healthz
 *
 * Health check endpoint for Cloud Run and monitoring.
 * Verifies Firestore connectivity.
 *
 * Also triggers opportunistic cleanup of expired blacklisted tokens
 * (non-blocking, runs in background).
 */
router.get('/healthz', async (_req: Request, res: Response) => {
  const firestoreOk = await checkFirestoreHealth();

  // Opportunistic cleanup of expired tokens (non-blocking)
  // This runs ~10% of the time to avoid overhead on every health check
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

  const statusCode = firestoreOk ? 200 : 503;
  res.status(statusCode).json(response);
});

// =============================================================================
// Authentication
// =============================================================================

/**
 * POST /api/auth/google
 *
 * Authenticate with a Google token from the Chrome extension.
 *
 * Supports two token types:
 * - accessToken: From chrome.identity.getAuthToken() (Chrome extension OAuth)
 * - idToken: From launchWebAuthFlow (Web application OAuth) - legacy support
 *
 * Request body:
 * {
 *   "accessToken": "<google-access-token>"  // Preferred
 *   // OR
 *   "idToken": "<google-id-token>"  // Legacy support
 * }
 *
 * Response:
 * {
 *   "token": "<jwt-token>",
 *   "user": { "id": "...", "email": "...", "displayName": "..." }
 * }
 */
router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { accessToken, idToken } = req.body;

    if (!accessToken && !idToken) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'accessToken or idToken is required in request body',
        statusCode: 400,
      });
      return;
    }

    // Verify the Google token (prefer accessToken, fall back to idToken)
    let googlePayload;
    if (accessToken && typeof accessToken === 'string') {
      googlePayload = await verifyGoogleAccessToken(accessToken);
    } else if (idToken && typeof idToken === 'string') {
      googlePayload = await verifyGoogleToken(idToken);
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Token must be a string',
        statusCode: 400,
      });
      return;
    }


    // Create internal user ID from Google sub
    // Prefix with 'google_' to support potential future auth providers
    const userId = `google_${googlePayload.sub}`;

    // Upsert user in Firestore
    const now = new Date().toISOString();
    const user: User = {
      id: userId,
      email: googlePayload.email,
      displayName: googlePayload.name,
      createdAt: now, // Will be preserved if user exists
      lastLoginAt: now,
    };

    const savedUser = await upsertUser(user);

    // Generate JWT
    const token = generateJwt(savedUser.id, savedUser.email);

    const response: AuthResponse = {
      token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        displayName: savedUser.displayName,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Authentication error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({
      error: 'Unauthorized',
      message,
      statusCode: 401,
    });
  }
});

/**
 * GET /api/auth/me
 *
 * Get current authenticated user information.
 * Used to validate that a session is still valid.
 * Requires JWT authentication.
 *
 * Response:
 * {
 *   "user": { "id": "...", "email": "...", "displayName": "..." }
 * }
 */
router.get('/auth/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    // User info is already attached by authMiddleware
    const { userId, email } = req.user!;

    res.status(200).json({
      user: {
        id: userId,
        email: email,
      },
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info',
      statusCode: 500,
    });
  }
});

/**
 * POST /api/auth/logout
 *
 * Logout and invalidate the current JWT token.
 * The token will be blacklisted and can no longer be used for authentication.
 * Requires JWT authentication.
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 */
router.post('/auth/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, jti, exp } = req.user!;

    if (!jti) {
      // Token doesn't have a jti - it's an old token format
      // Just return success (client will clear it anyway)
      console.log(`[Auth] Logout for user ${userId} - token has no jti (old format)`);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
      return;
    }

    // Calculate token expiration
    const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Add token to blacklist
    await blacklistToken(jti, userId, expiresAt);

    console.log(`[Auth] User ${userId} logged out, token blacklisted`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout',
      statusCode: 500,
    });
  }
});

// =============================================================================
// Listings API (Protected Routes)
// =============================================================================

/**
 * GET /api/listings
 *
 * Get all listings for the authenticated user.
 * Requires JWT authentication.
 *
 * Response: CarListing[]
 */
router.get('/listings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listings = await getListingsByUserId(userId);

    // Remove internal fields before sending to client
    const clientListings = listings.map(({ userId: _uid, docId: _docId, ...listing }) => listing);

    res.status(200).json(clientListings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch listings',
      statusCode: 500,
    });
  }
});

/**
 * PUT /api/listings
 *
 * Replace all listings for the authenticated user.
 * This performs a full sync - existing listings not in the payload are deleted.
 * Requires JWT authentication.
 *
 * Request body: CarListing[]
 * Response: { success: true, count: number }
 */
router.put('/listings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listings: CarListing[] = req.body;

    // Validate input
    if (!Array.isArray(listings)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request body must be an array of listings',
        statusCode: 400,
      });
      return;
    }

    // Validate each listing has required fields
    for (const listing of listings) {
      if (!listing.id || typeof listing.id !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Each listing must have a valid id field',
          statusCode: 400,
        });
        return;
      }
    }

    // Save all listings (this replaces existing ones)
    const savedListings = await saveAllListings(listings, userId);

    res.status(200).json({
      success: true,
      count: savedListings.length,
    });
  } catch (error) {
    console.error('Error saving listings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save listings',
      statusCode: 500,
    });
  }
});

/**
 * POST /api/listings
 *
 * Add or update a single listing for the authenticated user.
 * Requires JWT authentication.
 *
 * Request body: CarListing
 * Response: CarListing
 */
router.post('/listings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listing: CarListing = req.body;

    // Validate input
    if (!listing.id || typeof listing.id !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Listing must have a valid id field',
        statusCode: 400,
      });
      return;
    }

    const savedListing = await saveListing(listing, userId);

    // Remove internal fields before sending to client
    const { userId: _uid, docId: _docId, ...clientListing } = savedListing;

    res.status(200).json(clientListing);
  } catch (error) {
    console.error('Error saving listing:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save listing',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /api/listings/:id
 *
 * Delete a specific listing for the authenticated user.
 * Requires JWT authentication.
 *
 * Response: { success: true }
 */
router.delete('/listings/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const listingId = req.params.id;

    const deleted = await deleteListing(listingId, userId);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Listing not found or not owned by user',
        statusCode: 404,
      });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete listing',
      statusCode: 500,
    });
  }
});

// =============================================================================
// Settings API (Protected Routes)
// =============================================================================

/**
 * GET /api/settings
 *
 * Get settings for the authenticated user.
 * Requires JWT authentication.
 *
 * Response: { geminiApiKey, checkFrequencyMinutes, geminiStats }
 */
router.get('/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const settings = await getUserSettings(userId);

    // Return settings without internal fields
    res.status(200).json({
      geminiApiKey: settings.geminiApiKey,
      checkFrequencyMinutes: settings.checkFrequencyMinutes,
      geminiStats: settings.geminiStats,
      lastRefreshTime: settings.lastRefreshTime || null,
      nextRefreshTime: settings.nextRefreshTime || null,
      lastRefreshCount: settings.lastRefreshCount || 0,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch settings',
      statusCode: 500,
    });
  }
});

/**
 * PUT /api/settings
 *
 * Update settings for the authenticated user.
 * Requires JWT authentication.
 *
 * Request body: { geminiApiKey?, checkFrequencyMinutes?, geminiStats? }
 * Response: { geminiApiKey, checkFrequencyMinutes, geminiStats }
 */
router.put('/settings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { geminiApiKey, checkFrequencyMinutes, geminiStats, lastRefreshTime, nextRefreshTime, lastRefreshCount } = req.body;

    // Build update object with only provided fields
    const updateData: Partial<UserSettings> = {};
    if (geminiApiKey !== undefined) updateData.geminiApiKey = geminiApiKey;
    if (checkFrequencyMinutes !== undefined) updateData.checkFrequencyMinutes = checkFrequencyMinutes;
    if (geminiStats !== undefined) updateData.geminiStats = geminiStats;
    if (lastRefreshTime !== undefined) updateData.lastRefreshTime = lastRefreshTime;
    if (nextRefreshTime !== undefined) updateData.nextRefreshTime = nextRefreshTime;
    if (lastRefreshCount !== undefined) updateData.lastRefreshCount = lastRefreshCount;

    const savedSettings = await saveUserSettings(userId, updateData);

    // Return settings without internal fields
    res.status(200).json({
      geminiApiKey: savedSettings.geminiApiKey,
      checkFrequencyMinutes: savedSettings.checkFrequencyMinutes,
      geminiStats: savedSettings.geminiStats,
      lastRefreshTime: savedSettings.lastRefreshTime || null,
      nextRefreshTime: savedSettings.nextRefreshTime || null,
      lastRefreshCount: savedSettings.lastRefreshCount || 0,
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save settings',
      statusCode: 500,
    });
  }
});

// =============================================================================
// Gemini History API (Protected Routes)
// =============================================================================

/**
 * GET /api/gemini-history
 *
 * Get Gemini API call history for the authenticated user.
 * Requires JWT authentication.
 *
 * Query params:
 *   limit?: number (default 100, max 500)
 *
 * Response: GeminiCallHistoryEntry[]
 */
router.get('/gemini-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const history = await getGeminiHistory(userId, limit);

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching Gemini history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch Gemini history',
      statusCode: 500,
    });
  }
});

/**
 * POST /api/gemini-history
 *
 * Add Gemini history entries for the authenticated user.
 * Requires JWT authentication.
 *
 * Request body: GeminiCallHistoryEntry[] or GeminiCallHistoryEntry
 * Response: { success: true, count: number }
 */
router.post('/gemini-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const body = req.body;

    // Accept single entry or array
    const entries: GeminiCallHistoryEntry[] = Array.isArray(body) ? body : [body];

    // Validate entries
    for (const entry of entries) {
      if (!entry.id || typeof entry.id !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Each history entry must have a valid id field',
          statusCode: 400,
        });
        return;
      }
    }

    await addGeminiHistoryEntries(entries, userId);

    res.status(200).json({
      success: true,
      count: entries.length,
    });
  } catch (error) {
    console.error('Error saving Gemini history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save Gemini history',
      statusCode: 500,
    });
  }
});

/**
 * DELETE /api/gemini-history
 *
 * Clear all Gemini history for the authenticated user.
 * Requires JWT authentication.
 *
 * Response: { success: true, deleted: number }
 */
router.delete('/gemini-history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const deletedCount = await clearGeminiHistory(userId);

    res.status(200).json({
      success: true,
      deleted: deletedCount,
    });
  } catch (error) {
    console.error('Error clearing Gemini history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear Gemini history',
      statusCode: 500,
    });
  }
});

export default router;

