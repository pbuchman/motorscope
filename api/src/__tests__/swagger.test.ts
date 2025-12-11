/**
 * Tests for Swagger/OpenAPI Module
 *
 * Minimal functional tests for swagger.ts configuration and setup.
 */

import {beforeEach, describe, expect, it, jest} from '@jest/globals';

describe('Swagger Configuration', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    describe('swaggerSpec', () => {
        it('should export a valid OpenAPI 3.0 specification', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            expect(spec).toBeDefined();
            expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/);
        });

        it('should have required info section', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            expect(spec.info).toBeDefined();
            expect(spec.info.title).toBe('MotorScope API');
            expect(spec.info.version).toBeDefined();
            expect(spec.info.description).toBeTruthy();
        });

        it('should have servers configured', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            expect(spec.servers).toBeDefined();
            expect(Array.isArray(spec.servers)).toBe(true);
            expect(spec.servers.length).toBeGreaterThan(0);
        });

        it('should have tags defined', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            expect(spec.tags).toBeDefined();
            expect(Array.isArray(spec.tags)).toBe(true);

            const tagNames = spec.tags.map((t: any) => t.name);
            expect(tagNames).toContain('Health');
            expect(tagNames).toContain('Authentication');
            expect(tagNames).toContain('Listings');
            expect(tagNames).toContain('Settings');
        });

        it('should have security schemes defined', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            expect(spec.components).toBeDefined();
            expect(spec.components.securitySchemes).toBeDefined();
            expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
            expect(spec.components.securitySchemes.BearerAuth.type).toBe('http');
            expect(spec.components.securitySchemes.BearerAuth.scheme).toBe('bearer');
        });

        it('should have all required schemas defined', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            const schemas = spec.components.schemas;
            expect(schemas).toBeDefined();

            // Core schemas
            const requiredSchemas = [
                'ErrorResponse',
                'SuccessResponse',
                'HealthResponse',
                'GoogleAuthRequest',
                'AuthResponse',
                'UserInfo',
                'CarListing',
                'UserSettings',
                'GeminiCallHistoryEntry',
            ];

            for (const schemaName of requiredSchemas) {
                expect(schemas[schemaName]).toBeDefined();
            }
        });

        it('should have CarListing schema with required properties', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            const carListingSchema = spec.components.schemas.CarListing;
            expect(carListingSchema).toBeDefined();
            expect(carListingSchema.type).toBe('object');
            expect(carListingSchema.properties).toBeDefined();
            expect(carListingSchema.properties.id).toBeDefined();
            expect(carListingSchema.properties.status).toBeDefined();
            expect(carListingSchema.required).toContain('id');
            expect(carListingSchema.required).toContain('status');
        });

        it('should have ErrorResponse schema with correct structure', async () => {
            const {swaggerSpec} = await import('../swagger.js');
            const spec = swaggerSpec as any;

            const errorSchema = spec.components.schemas.ErrorResponse;
            expect(errorSchema.type).toBe('object');
            expect(errorSchema.properties.error).toBeDefined();
            expect(errorSchema.properties.message).toBeDefined();
            expect(errorSchema.properties.statusCode).toBeDefined();
            expect(errorSchema.required).toContain('error');
            expect(errorSchema.required).toContain('message');
            expect(errorSchema.required).toContain('statusCode');
        });
    });

    describe('setupSwagger', () => {
        it('should register /docs and /openapi.json routes on the app', async () => {
            const {setupSwagger} = await import('../swagger.js');

            const registeredRoutes: string[] = [];

            // Mock Express app
            const mockApp = {
                use: jest.fn((path: string, ..._handlers: any[]) => {
                    registeredRoutes.push(path);
                }),
                get: jest.fn((path: string, _handler: any) => {
                    registeredRoutes.push(path);
                }),
            };

            setupSwagger(mockApp as any);

            expect(mockApp.use).toHaveBeenCalled();
            expect(mockApp.get).toHaveBeenCalled();
            expect(registeredRoutes).toContain('/docs');
            expect(registeredRoutes).toContain('/openapi.json');
        });

        it('should configure swagger-ui with custom options', async () => {
            const {setupSwagger} = await import('../swagger.js');

            let _swaggerUiOptions: any = null;

            // Mock Express app that captures swagger-ui setup call
            const mockApp = {
                use: jest.fn((path: string, ...handlers: any[]) => {
                    // swagger-ui-express.setup returns a middleware, we can inspect the call
                    if (path === '/docs' && handlers.length > 1) {
                        // The setup options are passed to swagger-ui
                        _swaggerUiOptions = handlers;
                    }
                }),
                get: jest.fn(),
            };

            setupSwagger(mockApp as any);

            // Verify /docs was registered
            expect(mockApp.use).toHaveBeenCalledWith('/docs', expect.anything(), expect.anything());
        });
    });

    describe('OpenAPI JSON endpoint', () => {
        it('should return JSON content type', async () => {
            const {setupSwagger, swaggerSpec} = await import('../swagger.js');

            let capturedHandler: Function | null = null;

            const mockApp = {
                use: jest.fn(),
                get: jest.fn((path: string, handler: Function) => {
                    if (path === '/openapi.json') {
                        capturedHandler = handler;
                    }
                }),
            };

            setupSwagger(mockApp as any);

            expect(capturedHandler).not.toBeNull();

            // Simulate request/response
            const mockRes = {
                setHeader: jest.fn(),
                send: jest.fn(),
            };

            capturedHandler!({}, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(mockRes.send).toHaveBeenCalledWith(swaggerSpec);
        });
    });
});

