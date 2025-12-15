/**
 * MotorScope API Configuration
 *
 * This file contains all configuration values for the backend API.
 * Environment variables are used for secrets and deployment-specific values.
 *
 * Required environment variables in Cloud Run (dev or prod):
 * - NODE_ENV: "dev" or "prod" for Cloud Run deployments
 * - GCP_PROJECT_ID: GCP project ID
 * - GCS_BUCKET_NAME: GCS bucket name for images
 * - JWT_SECRET: Secret key for signing JWTs
 * - OAUTH_CLIENT_ID: Google OAuth client ID for token verification
 * - ALLOWED_ORIGIN_EXTENSION: Chrome extension origin for CORS
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

/** Collection name for Gemini API call history */
export const FIRESTORE_GEMINI_HISTORY_COLLECTION = 'gemini_history';

/** Collection name for invalidated/blacklisted tokens */
export const FIRESTORE_TOKEN_BLACKLIST_COLLECTION = 'token_blacklist';

/** Field name in listings that stores the user ID for ownership */
export const FIRESTORE_LISTINGS_USER_FIELD = 'userId';

// =============================================================================
// Google Cloud Storage Configuration
// =============================================================================

/** GCS Bucket name for storing listing images */
export const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'motorscope-images';

/** Default expiration time for deleted images (30 days) */
export const IMAGE_DELETION_EXPIRATION_DAYS = 30;

/** Maximum allowed image size in bytes (10MB) */
export const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

// =============================================================================
// Cloud Run Configuration
// =============================================================================

/** Cloud Run service name (default for development environment) */
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

/** Current environment (dev, prod, or development for local) */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/** Is production environment */
export const IS_PRODUCTION = NODE_ENV === 'prod';

/** Is running in Cloud Run (dev or prod) vs local development */
export const IS_CLOUD_RUN = NODE_ENV === 'dev' || NODE_ENV === 'prod';

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that all required configuration is present
 * Call this at startup to fail fast if misconfigured
 */
export function validateConfig(): void {
    const errors: string[] = [];

    // Required for any Cloud Run deployment (dev or prod)
    if (IS_CLOUD_RUN) {
        if (!JWT_SECRET) {
            errors.push('JWT_SECRET environment variable is required');
        }
        if (!OAUTH_CLIENT_ID) {
            errors.push('OAUTH_CLIENT_ID environment variable is required');
        }
        if (!ALLOWED_ORIGIN_EXTENSION) {
            errors.push('ALLOWED_ORIGIN_EXTENSION environment variable is required');
        }
        if (!process.env.GCP_PROJECT_ID) {
            errors.push('GCP_PROJECT_ID environment variable is required');
        }
        if (!process.env.GCS_BUCKET_NAME) {
            errors.push('GCS_BUCKET_NAME environment variable is required');
        }
    }

    if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
}

