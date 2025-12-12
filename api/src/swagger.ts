/**
 * Swagger/OpenAPI Configuration
 *
 * Centralizes OpenAPI 3.0 documentation setup using swagger-jsdoc
 * and serves Swagger UI via swagger-ui-express.
 *
 * Schemas are defined programmatically here, derived from TypeScript types.
 * Route documentation uses @openapi JSDoc comments in routes.ts.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type {Express} from 'express';

// =============================================================================
// OpenAPI Schemas (derived from TypeScript types in types.ts)
// =============================================================================

const schemas = {
    // Common Response Schemas
    ErrorResponse: {
        type: 'object',
        properties: {
            error: {type: 'string', example: 'Bad Request'},
            message: {type: 'string', example: 'Invalid request body'},
            statusCode: {type: 'integer', example: 400},
        },
        required: ['error', 'message', 'statusCode'],
    },
    SuccessResponse: {
        type: 'object',
        properties: {
            success: {type: 'boolean', example: true},
            message: {type: 'string'},
        },
    },
    HealthResponse: {
        type: 'object',
        properties: {
            status: {type: 'string', enum: ['ok', 'error']},
            firestore: {type: 'string', enum: ['ok', 'error']},
            timestamp: {type: 'string', format: 'date-time'},
        },
        required: ['status', 'firestore', 'timestamp'],
    },

    // Authentication
    GoogleAuthRequest: {
        type: 'object',
        properties: {
            accessToken: {type: 'string', description: 'Google OAuth access token from chrome.identity.getAuthToken()'},
            idToken: {type: 'string', description: 'Google OAuth ID token (legacy support)'},
        },
    },
    AuthResponse: {
        type: 'object',
        properties: {
            token: {type: 'string', description: 'JWT token for subsequent API calls'},
            user: {$ref: '#/components/schemas/UserInfo'},
        },
        required: ['token', 'user'],
    },
    UserInfo: {
        type: 'object',
        properties: {
            id: {type: 'string', example: 'google_123456789'},
            email: {type: 'string', format: 'email', example: 'user@example.com'},
            displayName: {type: 'string', example: 'John Doe'},
        },
        required: ['id', 'email'],
    },

    // Vehicle & Listing Types
    PricePoint: {
        type: 'object',
        properties: {
            date: {type: 'string', format: 'date-time'},
            price: {type: 'number', example: 45000},
            currency: {type: 'string', example: 'PLN'},
        },
        required: ['date', 'price', 'currency'],
    },
    Mileage: {
        type: 'object',
        properties: {
            value: {type: 'integer', nullable: true, example: 85000},
            unit: {type: 'string', nullable: true, enum: ['km', 'mi']},
        },
    },
    Engine: {
        type: 'object',
        properties: {
            capacityCc: {type: 'integer', nullable: true, example: 1998},
            fuelType: {type: 'string', nullable: true, example: 'Diesel'},
            powerKw: {type: 'number', nullable: true, example: 110},
            powerHp: {type: 'number', nullable: true, example: 150},
            engineCode: {type: 'string', nullable: true, example: 'N47D20'},
            euroStandard: {type: 'string', nullable: true, example: 'Euro 6'},
            hybridType: {type: 'string', nullable: true},
        },
    },
    Drivetrain: {
        type: 'object',
        properties: {
            transmissionType: {type: 'string', nullable: true, example: 'Automatic'},
            transmissionSubtype: {type: 'string', nullable: true},
            gearsCount: {type: 'integer', nullable: true, example: 8},
            driveType: {type: 'string', nullable: true, example: '4WD'},
        },
    },
    VehicleCondition: {
        type: 'object',
        properties: {
            isNew: {type: 'boolean', nullable: true},
            isImported: {type: 'boolean', nullable: true},
            accidentFreeDeclared: {type: 'boolean', nullable: true},
            serviceHistoryDeclared: {type: 'boolean', nullable: true},
        },
    },
    ColorAndInterior: {
        type: 'object',
        properties: {
            exteriorColor: {type: 'string', nullable: true, example: 'Black'},
            interiorColor: {type: 'string', nullable: true, example: 'Beige'},
            upholsteryType: {type: 'string', nullable: true, example: 'Leather'},
        },
    },
    Registration: {
        type: 'object',
        properties: {
            plateNumber: {type: 'string', nullable: true},
            originCountry: {type: 'string', nullable: true},
            registeredInCountryCode: {type: 'string', nullable: true, example: 'PL'},
        },
    },
    Location: {
        type: 'object',
        properties: {
            city: {type: 'string', nullable: true, example: 'Warsaw'},
            region: {type: 'string', nullable: true, example: 'Mazowieckie'},
            postalCode: {type: 'string', nullable: true, example: '00-001'},
            countryCode: {type: 'string', nullable: true, example: 'PL'},
        },
    },
    Seller: {
        type: 'object',
        properties: {
            type: {type: 'string', nullable: true, example: 'Dealer'},
            name: {type: 'string', nullable: true},
            phone: {type: 'string', nullable: true},
            isCompany: {type: 'boolean', nullable: true},
        },
    },
    Vehicle: {
        type: 'object',
        properties: {
            vin: {type: 'string', nullable: true, example: 'WBAPH5C55BA123456'},
            make: {type: 'string', nullable: true, example: 'BMW'},
            model: {type: 'string', nullable: true, example: '3 Series'},
            generation: {type: 'string', nullable: true, example: 'F30'},
            trim: {type: 'string', nullable: true, example: '320d xDrive'},
            bodyType: {type: 'string', nullable: true, example: 'Sedan'},
            productionYear: {type: 'integer', nullable: true, example: 2018},
            firstRegistrationYear: {type: 'integer', nullable: true, example: 2018},
            mileage: {$ref: '#/components/schemas/Mileage'},
            engine: {$ref: '#/components/schemas/Engine'},
            drivetrain: {$ref: '#/components/schemas/Drivetrain'},
            registration: {$ref: '#/components/schemas/Registration'},
            condition: {$ref: '#/components/schemas/VehicleCondition'},
            colorAndInterior: {$ref: '#/components/schemas/ColorAndInterior'},
        },
    },
    ListingSource: {
        type: 'object',
        properties: {
            platform: {type: 'string', example: 'otomoto.pl'},
            url: {type: 'string', format: 'uri'},
            listingId: {type: 'string', nullable: true},
            countryCode: {type: 'string', nullable: true, example: 'PL'},
        },
        required: ['platform', 'url'],
    },
    CarListing: {
        type: 'object',
        properties: {
            id: {type: 'string', example: 'vin_WBAPH5C55BA123456'},
            schemaVersion: {type: 'string', example: '1.0'},
            source: {$ref: '#/components/schemas/ListingSource'},
            title: {type: 'string', example: 'BMW 320d xDrive M Sport'},
            thumbnailUrl: {type: 'string', format: 'uri'},
            currentPrice: {type: 'number', example: 89900},
            currency: {type: 'string', example: 'PLN'},
            priceHistory: {type: 'array', items: {$ref: '#/components/schemas/PricePoint'}},
            originalPrice: {type: 'number', nullable: true},
            negotiable: {type: 'boolean', nullable: true},
            vehicle: {$ref: '#/components/schemas/Vehicle'},
            location: {$ref: '#/components/schemas/Location'},
            seller: {$ref: '#/components/schemas/Seller'},
            status: {type: 'string', enum: ['ACTIVE', 'ENDED']},
            postedDate: {type: 'string', format: 'date-time', nullable: true},
            firstSeenAt: {type: 'string', format: 'date-time'},
            lastSeenAt: {type: 'string', format: 'date-time'},
            lastRefreshStatus: {type: 'string', enum: ['success', 'error', 'pending']},
            lastRefreshError: {type: 'string'},
        },
        required: ['id', 'schemaVersion', 'source', 'title', 'currentPrice', 'currency', 'vehicle', 'status', 'firstSeenAt', 'lastSeenAt'],
    },

    // Settings
    GeminiStats: {
        type: 'object',
        properties: {
            allTimeTotalCalls: {type: 'integer', example: 150},
            totalCalls: {type: 'integer', example: 25},
            successCount: {type: 'integer', example: 23},
            errorCount: {type: 'integer', example: 2},
        },
        required: ['allTimeTotalCalls', 'totalCalls', 'successCount', 'errorCount'],
    },
    DashboardFilters: {
        type: 'object',
        properties: {
            status: {type: 'string', example: 'all'},
            archived: {type: 'string', example: 'active'},
            makes: {type: 'array', items: {type: 'string'}},
            models: {type: 'array', items: {type: 'string'}},
            sources: {type: 'array', items: {type: 'string'}},
        },
    },
    UserSettings: {
        type: 'object',
        properties: {
            geminiApiKey: {type: 'string'},
            checkFrequencyMinutes: {type: 'integer', example: 60},
            geminiStats: {$ref: '#/components/schemas/GeminiStats'},
            language: {type: 'string', enum: ['en', 'pl'], example: 'en'},
            lastRefreshTime: {type: 'string', format: 'date-time', nullable: true},
            nextRefreshTime: {type: 'string', format: 'date-time', nullable: true},
            lastRefreshCount: {type: 'integer', nullable: true},
            dashboardFilters: {$ref: '#/components/schemas/DashboardFilters'},
            dashboardSort: {type: 'string', nullable: true},
            dashboardViewMode: {type: 'string', nullable: true},
        },
    },
    UserSettingsUpdate: {
        type: 'object',
        properties: {
            geminiApiKey: {type: 'string'},
            checkFrequencyMinutes: {type: 'integer'},
            geminiStats: {$ref: '#/components/schemas/GeminiStats'},
            language: {type: 'string', enum: ['en', 'pl']},
            lastRefreshTime: {type: 'string', format: 'date-time', nullable: true},
            nextRefreshTime: {type: 'string', format: 'date-time', nullable: true},
            lastRefreshCount: {type: 'integer'},
            dashboardFilters: {$ref: '#/components/schemas/DashboardFilters'},
            dashboardSort: {type: 'string'},
            dashboardViewMode: {type: 'string'},
        },
    },

    // Gemini History
    GeminiCallHistoryEntry: {
        type: 'object',
        properties: {
            id: {type: 'string'},
            url: {type: 'string', format: 'uri'},
            promptPreview: {type: 'string'},
            rawResponse: {type: 'string'},
            error: {type: 'string'},
            status: {type: 'string', enum: ['success', 'error']},
            timestamp: {type: 'string', format: 'date-time'},
        },
        required: ['id', 'url', 'promptPreview', 'status', 'timestamp'],
    },
} as const;

// =============================================================================
// OpenAPI Base Configuration
// =============================================================================

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
    openapi: '3.0.3',
    info: {
        title: 'MotorScope API',
        version: '1.0.0',
        description: `
REST API for MotorScope Chrome extension.

This API provides endpoints for:
- **Authentication**: Google OAuth integration with JWT tokens
- **Listings**: CRUD operations for tracked car listings
- **Settings**: User preferences and configuration
- **Gemini History**: AI call tracking and statistics

All endpoints except \`/api/healthz\` and \`/api/auth/google\` require JWT authentication via the \`Authorization: Bearer <token>\` header.
    `.trim(),
        contact: {name: 'MotorScope'},
        license: {name: 'MIT'},
    },
    servers: [
        {
            url: 'https://motorscope-api-663051224718.europe-central2.run.app/',
            description: 'Production',
        },
        {
            url: 'http://localhost:8080',
            description: 'Local development'
        },
    ],
    tags: [
        {name: 'Health', description: 'Health check endpoints'},
        {name: 'Authentication', description: 'Google OAuth authentication and session management'},
        {name: 'Listings', description: 'Car listing CRUD operations'},
        {name: 'Settings', description: 'User settings and preferences'},
        {name: 'Gemini History', description: 'Gemini AI call history and statistics'},
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token obtained from /api/auth/google',
            },
        },
        schemas,
    },
};

// =============================================================================
// Swagger JSDoc Options
// =============================================================================

function getApiGlobs(): string[] {
    const isCompiled = import.meta.url.includes('/dist/');
    return isCompiled ? ['./dist/routes.js'] : ['./src/routes.ts'];
}

const options: swaggerJsdoc.Options = {
    definition: swaggerDefinition,
    apis: getApiGlobs(),
};

const swaggerSpec = swaggerJsdoc(options);

// =============================================================================
// Setup Function
// =============================================================================

/**
 * Sets up Swagger UI and OpenAPI JSON endpoints on the Express app.
 *
 * Endpoints created:
 * - GET /docs - Interactive Swagger UI
 * - GET /openapi.json - Raw OpenAPI 3.0 JSON specification
 *
 * @param app - Express application instance
 */
export function setupSwagger(app: Express): void {
    // Serve Swagger UI at /docs
    app.use(
        '/docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'MotorScope API Documentation',
        }),
    );

    // Serve raw OpenAPI JSON at /openapi.json
    app.get('/openapi.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
}

export {swaggerSpec};
