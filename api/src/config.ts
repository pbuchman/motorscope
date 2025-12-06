/**
 * MotorScope API Configuration
 *
 * This file contains all configuration values for the backend API.
 * Environment variables are used for secrets and deployment-specific values.
 *
 * Required environment variables in Cloud Run:
 * - NODE_ENV: "production" for Cloud Run
 * - GCP_PROJECT_ID: GCP project ID (motorscope)
 * - JWT_SECRET: Secret key for signing JWTs
 * - OAUTH_CLIENT_ID: Google OAuth client ID for token verification
 * - ALLOWED_ORIGIN_EXTENSION: Chrome extension origin for CORS
 * - BACKEND_BASE_URL: Public URL of this API
 */

// =============================================================================
// GCP Configuration
// =============================================================================

/** GCP Project ID */
export const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'motorscope';

/** Firestore database ID (use "(default)" for the default database) */
export const FIRESTORE_DATABASE_ID = 'motorscopedb';

// =============================================================================
// Firestore Collections
// =============================================================================

/** Collection name for user documents */
export const FIRESTORE_USERS_COLLECTION = 'users';

/** Collection name for listing documents */
export const FIRESTORE_LISTINGS_COLLECTION = 'listings';

/** Field name in listings that stores the user ID for ownership */
export const FIRESTORE_LISTINGS_USER_FIELD = 'userId';

// =============================================================================
// Cloud Run Configuration
// =============================================================================

/** Cloud Run service name */
export const CLOUD_RUN_SERVICE_NAME = 'motorscope-api';

/** Cloud Run deployment region */
export const CLOUD_RUN_REGION = 'europe-west1';

/** Port to listen on (Cloud Run provides PORT env var) */
export const PORT = parseInt(process.env.PORT || '8080', 10);

// =============================================================================
// Authentication Configuration
// =============================================================================

/** JWT secret for signing tokens - MUST be set in production */
export const JWT_SECRET = process.env.JWT_SECRET || '';

/** JWT token expiration time */
export const JWT_EXPIRATION = '24h';

/** Google OAuth Client ID for the Chrome extension */
export const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || '';

// =============================================================================
// CORS Configuration
// =============================================================================

/**
 * Allowed origin for the Chrome extension
 * Format: chrome-extension://<extension-id>
 */
export const ALLOWED_ORIGIN_EXTENSION = process.env.ALLOWED_ORIGIN_EXTENSION || '';

/** Backend base URL (for self-reference) */
export const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || '';

// =============================================================================
// Environment
// =============================================================================

/** Current environment */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/** Is production environment */
export const IS_PRODUCTION = NODE_ENV === 'production';

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that all required configuration is present
 * Call this at startup to fail fast if misconfigured
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (IS_PRODUCTION) {
    if (!JWT_SECRET) {
      errors.push('JWT_SECRET environment variable is required in production');
    }
    if (!OAUTH_CLIENT_ID) {
      errors.push('OAUTH_CLIENT_ID environment variable is required in production');
    }
    if (!ALLOWED_ORIGIN_EXTENSION) {
      errors.push('ALLOWED_ORIGIN_EXTENSION environment variable is required in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

