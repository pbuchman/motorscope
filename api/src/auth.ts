/**
 * Authentication Middleware and Utilities
 *
 * Handles:
 * - Google OAuth token verification
 * - JWT token generation and verification
 * - Request authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { JWT_SECRET, JWT_EXPIRATION, OAUTH_CLIENT_ID } from './config.js';
import type { JwtPayload } from './types.js';

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
  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: OAUTH_CLIENT_ID,
    });

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
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw new Error('Invalid or expired Google token');
  }
}

// =============================================================================
// JWT Token Operations
// =============================================================================

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

  const payload: JwtPayload = {
    userId,
    email,
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
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
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

  try {
    const payload = verifyJwt(token);
    req.user = payload;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({
      error: 'Unauthorized',
      message,
      statusCode: 401,
    });
  }
}

