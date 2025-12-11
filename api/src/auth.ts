/**
 * Authentication Middleware and Utilities
 *
 * Handles:
 * - Google OAuth token verification
 * - JWT token generation and verification
 * - Request authentication middleware
 */

import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {OAuth2Client} from 'google-auth-library';
import {JWT_EXPIRATION, JWT_SECRET, OAUTH_CLIENT_ID} from './config.js';
import type {JwtPayload} from './types.js';
import crypto from 'crypto';
import {isTokenBlacklisted} from './db.js';

// Extend Express Request type to include user info
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// Google OAuth client for token verification
const oauthClient = new OAuth2Client(OAUTH_CLIENT_ID);

// =============================================================================
// Google Token Verification
// =============================================================================

export interface GoogleTokenPayload {
    sub: string; // Unique Google user ID
    email: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
}

/**
 * Verify a Google ID token and extract user information
 *
 * @param idToken - The Google ID token from the Chrome extension
 * @returns Decoded token payload with user info
 * @throws Error if token is invalid or expired
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
    let ticket;
    try {
        ticket = await oauthClient.verifyIdToken({
            idToken,
            audience: OAUTH_CLIENT_ID,
        });
    } catch (error) {
        console.error('Google token verification failed:', error);
        throw new Error('Invalid or expired Google token');
    }

    const payload = ticket.getPayload();

    if (!payload) {
        throw new Error('Token payload is empty');
    }

    if (!payload.sub || !payload.email) {
        throw new Error('Token missing required fields (sub, email)');
    }

    return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
    };
}

/**
 * Verify a Google access token by calling the userinfo endpoint
 *
 * This is used when the Chrome extension uses chrome.identity.getAuthToken()
 * which returns an access token (not an ID token).
 *
 * @param accessToken - The Google access token from Chrome extension
 * @returns User info from Google
 * @throws Error if token is invalid or expired
 */
export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleTokenPayload> {
    let response;
    try {
        response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
    } catch (error) {
        console.error('Google access token verification failed:', error);
        throw new Error('Invalid or expired Google access token');
    }

    if (!response.ok) {
        throw new Error(`Google userinfo request failed: ${response.status}`);
    }

    const userInfo = await response.json() as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
    };

    if (!userInfo.sub || !userInfo.email) {
        throw new Error('User info missing required fields (sub, email)');
    }

    return {
        sub: userInfo.sub,
        email: userInfo.email,
        email_verified: userInfo.email_verified,
        name: userInfo.name,
        picture: userInfo.picture,
    };
}

// =============================================================================
// JWT Token Operations
// =============================================================================

/**
 * Generate a unique JWT ID (jti)
 */
function generateJti(): string {
    return crypto.randomUUID();
}

/**
 * Generate a JWT token for a user
 *
 * @param userId - Internal user ID
 * @param email - User's email
 * @returns Signed JWT token
 */
export function generateJwt(userId: string, email: string): string {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    const jti = generateJti();

    const payload: JwtPayload = {
        userId,
        email,
        jti,
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
    });
}

/**
 * Verify a JWT token and extract the payload
 *
 * @param token - JWT token string
 * @returns Decoded payload
 * @throws Error if token is invalid or expired
 */
export function verifyJwt(token: string): JwtPayload {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        throw error;
    }
}

/**
 * Verify a JWT token and check if it's blacklisted
 *
 * @param token - JWT token string
 * @returns Decoded payload
 * @throws Error if token is invalid, expired, or blacklisted
 */
export async function verifyJwtWithBlacklistCheck(token: string): Promise<JwtPayload> {
    const payload = verifyJwt(token);

    // Check if token is blacklisted (only if it has a jti)
    if (payload.jti) {
        const blacklisted = await isTokenBlacklisted(payload.jti);
        if (blacklisted) {
            throw new Error('Token has been revoked');
        }
    }

    return payload;
}

/**
 * Extract expiration date from a JWT payload
 */
export function getTokenExpiration(payload: JwtPayload): Date {
    if (payload.exp) {
        return new Date(payload.exp * 1000);
    }
    // Default to 24 hours from now if no exp
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

// =============================================================================
// Express Middleware
// =============================================================================

/**
 * Authentication middleware for protected routes
 *
 * Expects: Authorization: Bearer <jwt-token>
 *
 * On success: Attaches user info to req.user and calls next()
 * On failure: Returns 401 Unauthorized
 */
export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Authorization header is required',
            statusCode: 401,
        });
        return;
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Authorization header must be: Bearer <token>',
            statusCode: 401,
        });
        return;
    }

    const token = parts[1];

    // Use async verification with blacklist check
    verifyJwtWithBlacklistCheck(token)
        .then((payload) => {
            req.user = payload;
            next();
        })
        .catch((error) => {
            const message = error instanceof Error ? error.message : 'Authentication failed';
            res.status(401).json({
                error: 'Unauthorized',
                message,
                statusCode: 401,
            });
        });
}

