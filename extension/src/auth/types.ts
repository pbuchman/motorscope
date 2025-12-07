/**
 * Authentication Types
 *
 * TypeScript types for the authentication system.
 */

// =============================================================================
// User Types
// =============================================================================

/**
 * User profile stored after successful authentication
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  picture?: string;
}

// =============================================================================
// JWT Types
// =============================================================================

/**
 * JWT payload structure (decoded from backend JWT)
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;  // Issued at (Unix timestamp)
  exp: number;  // Expiration (Unix timestamp)
}

/**
 * Result of JWT validation
 */
export interface JwtValidationResult {
  valid: boolean;
  expired: boolean;
  payload: JwtPayload | null;
}

// =============================================================================
// Auth State Types
// =============================================================================

/**
 * Authentication status enum
 */
export type AuthStatus = 'loading' | 'logged_out' | 'logged_in';

/**
 * Full authentication state
 */
export interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
}

/**
 * Stored auth data in chrome.storage.session
 * Session storage is cleared when browser closes or user logs out.
 */
export interface StoredAuthData {
  token: string;
  user: User;
  storedAt: number; // Unix timestamp when stored
}

// =============================================================================
// Storage Schema Types
// =============================================================================

/**
 * Complete storage schema for auth-related data
 */
export interface AuthStorageSchema {
  authToken: string | null;
  userProfile: User | null;
  authStoredAt: number | null;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response from backend /auth/google endpoint
 */
export interface BackendAuthResponse {
  token: string;
  user: User;
}

/**
 * Error response from backend
 */
export interface BackendErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

