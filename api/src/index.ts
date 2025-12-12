/**
 * MotorScope Backend API - Entry Point
 *
 * Express server configured for Cloud Run deployment.
 *
 * Cloud Run provides:
 * - PORT environment variable (must be respected)
 * - Automatic HTTPS termination
 * - Service account credentials via ADC
 */

// Load environment variables from .env file (for local development)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import {
    ALLOWED_ORIGIN_EXTENSION,
    FIRESTORE_DATABASE_ID,
    GCP_PROJECT_ID,
    IS_PRODUCTION,
    NODE_ENV,
    PORT,
    validateConfig,
} from './config.js';
import routes from './routes.js';
import {setupSwagger} from './swagger.js';
import {runMigrations} from './migrations.js';

// Validate configuration on startup
try {
    validateConfig();
} catch (error) {
    console.error('Configuration validation failed:', error);
    if (IS_PRODUCTION) {
        process.exit(1);
    }
}

// Create Express app
const app = express();

// =============================================================================
// Middleware
// =============================================================================

// Parse JSON bodies
app.use(express.json({limit: '10mb'}));

// CORS configuration
// In production, only allow the Chrome extension origin
// In development, allow all origins for testing
const corsOptions: cors.CorsOptions = {
    origin: IS_PRODUCTION
        ? (origin, callback) => {
            // Allow requests with no origin (like curl) in development only
            if (!origin) {
                callback(null, false);
                return;
            }

            // Check if origin matches the allowed extension origin
            if (origin === ALLOWED_ORIGIN_EXTENSION) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        }
        : true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// Request logging
app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// =============================================================================
// Routes
// =============================================================================

// Mount API routes under /api prefix
app.use('/api', routes);

// =============================================================================
// Swagger/OpenAPI Documentation
// =============================================================================

// Setup Swagger UI at /docs and OpenAPI spec at /openapi.json
setupSwagger(app);

// Root endpoint - basic info with link to docs
app.get('/', (_req, res) => {
    res.json({
        service: 'motorscope-api',
        version: '1.0.0',
        status: 'running',
        docs: '/docs',
        openapi: '/openapi.json',
        health: '/api/healthz',
    });
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        statusCode: 404,
    });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: IS_PRODUCTION ? 'An unexpected error occurred' : err.message,
        statusCode: 500,
    });
});

// =============================================================================
// Server Startup
// =============================================================================

// Run migrations and start server
(async () => {
    try {
        // Run database migrations before accepting traffic
        await runMigrations();
    } catch (error) {
        console.error('Migration error (non-fatal):', error);
        // Don't block startup on migration errors
        // Migrations are designed to be retried on next startup
    }

    app.listen(PORT, () => {
        console.log('='.repeat(60));
        console.log('MotorScope API Server Started');
        console.log('='.repeat(60));
        console.log(`Environment: ${NODE_ENV}`);
        console.log(`Port: ${PORT}`);
        console.log(`GCP Project: ${GCP_PROJECT_ID}`);
        console.log(`Firestore Database: ${FIRESTORE_DATABASE_ID}`);
        console.log(`CORS Origin: ${IS_PRODUCTION ? ALLOWED_ORIGIN_EXTENSION : 'all (development)'}`);
        console.log('='.repeat(60));
        console.log(`Server listening on http://localhost:${PORT}`);
        console.log(`API Docs: http://localhost:${PORT}/docs`);
        console.log(`OpenAPI Spec: http://localhost:${PORT}/openapi.json`);
        console.log('Health check: GET /api/healthz');
        console.log('='.repeat(60));
    });
})();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

