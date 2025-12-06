/**
 * JWT Utilities
 *
 * Functions for validating and parsing JWT tokens.
 */

import { JwtPayload, JwtValidationResult } from './types';

// Leeway in seconds for JWT expiration check (default: 60 seconds)
// This prevents edge cases where token expires between check and use
const JWT_EXP_LEEWAY_SECONDS = 60;

/**
 * Decode a JWT token without verifying signature
 * (Signature verification happens on the backend)
 */
export const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format');
      return null;
    }

    const payload = parts[1];
    // Handle URL-safe base64 encoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    const decoded = JSON.parse(jsonPayload) as JwtPayload;

    // Validate required fields
    if (!decoded.userId || !decoded.email || !decoded.exp || !decoded.iat) {
      console.warn('[JWT] Missing required fields in payload');
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('[JWT] Failed to decode token:', error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 *
 * @param token - JWT token string or decoded payload
 * @param leewaySeconds - Extra seconds to consider token as expired (prevents edge cases)
 */
export const isJwtExpired = (
  token: string | JwtPayload,
  leewaySeconds: number = JWT_EXP_LEEWAY_SECONDS
): boolean => {
  const payload = typeof token === 'string' ? decodeJwt(token) : token;

  if (!payload) {
    return true; // Invalid token is considered expired
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = payload.exp - leewaySeconds;

  return now >= expiresAt;
};

/**
 * Get remaining time until JWT expires (in seconds)
 */
export const getJwtTimeRemaining = (token: string | JwtPayload): number => {
  const payload = typeof token === 'string' ? decodeJwt(token) : token;

  if (!payload) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
};

/**
 * Validate a JWT token and return detailed result
 */
export const validateJwt = (token: string): JwtValidationResult => {
  const payload = decodeJwt(token);

  if (!payload) {
    return {
      valid: false,
      expired: true,
      payload: null,
    };
  }

  const expired = isJwtExpired(payload);

  return {
    valid: !expired,
    expired,
    payload,
  };
};

/**
 * Format expiration time for display
 */
export const formatJwtExpiration = (token: string | JwtPayload): string => {
  const remaining = getJwtTimeRemaining(token);

  if (remaining <= 0) {
    return 'Expired';
  }

  if (remaining < 60) {
    return `${remaining}s`;
  }

  if (remaining < 3600) {
    const minutes = Math.floor(remaining / 60);
    return `${minutes}m`;
  }

  if (remaining < 86400) {
    const hours = Math.floor(remaining / 3600);
    return `${hours}h`;
  }

  const days = Math.floor(remaining / 86400);
  return `${days}d`;
};

