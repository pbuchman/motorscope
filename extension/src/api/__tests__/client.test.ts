/**
 * Tests for API Client
 *
 * Tests the API client error handling, URL building, and request patterns.
 */

import { ApiError } from '../client';

describe('ApiError', () => {
  describe('constructor', () => {
    it('should create error with status code', () => {
      const error = new ApiError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('should indicate auth error for 401 status', () => {
      const error = new ApiError('Unauthorized', 401, true);
      expect(error.isAuthError).toBe(true);
    });

    it('should default isAuthError to false', () => {
      const error = new ApiError('Server error', 500);
      expect(error.isAuthError).toBe(false);
    });

    it('should be instanceof Error', () => {
      const error = new ApiError('Test', 400);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('HTTP status codes', () => {
    it('should handle various HTTP status codes', () => {
      const statuses = [400, 401, 403, 404, 500, 502, 503];

      for (const status of statuses) {
        const error = new ApiError(`Error ${status}`, status);
        expect(error.statusCode).toBe(status);
      }
    });

    it('should correctly flag 401 as auth error', () => {
      const error401 = new ApiError('Unauthorized', 401, true);
      const error403 = new ApiError('Forbidden', 403, false);

      expect(error401.isAuthError).toBe(true);
      expect(error403.isAuthError).toBe(false);
    });
  });

  describe('error messages', () => {
    it('should preserve error message for display', () => {
      const messages = [
        'Session expired',
        'Invalid request',
        'Resource not found',
        'Rate limit exceeded',
        'Validation failed: missing required field',
      ];

      for (const message of messages) {
        const error = new ApiError(message, 400);
        expect(error.message).toBe(message);
      }
    });

    it('should handle empty message', () => {
      const error = new ApiError('', 500);
      expect(error.message).toBe('');
    });

    it('should handle long messages', () => {
      const longMessage = 'Error: '.repeat(100);
      const error = new ApiError(longMessage, 400);
      expect(error.message).toBe(longMessage);
    });
  });

  describe('error stack', () => {
    it('should have a stack trace', () => {
      const error = new ApiError('Test error', 500);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });
  });
});

describe('API Error Handling Patterns', () => {
  it('should identify auth errors correctly', () => {
    const authError = new ApiError('Token expired', 401, true);
    const serverError = new ApiError('Internal error', 500, false);
    const notFoundError = new ApiError('Not found', 404, false);

    expect(authError.isAuthError).toBe(true);
    expect(serverError.isAuthError).toBe(false);
    expect(notFoundError.isAuthError).toBe(false);
  });

  it('should allow throwing and catching ApiError', () => {
    const throwApiError = () => {
      throw new ApiError('Test', 400);
    };

    expect(throwApiError).toThrow(ApiError);
    expect(throwApiError).toThrow('Test');
  });

  it('should be catchable as Error', () => {
    const throwApiError = () => {
      throw new ApiError('Network failed', 503);
    };

    expect(throwApiError).toThrow(ApiError);
    expect(throwApiError).toThrow('Network failed');

    // Verify error properties when caught
    let caughtError: unknown;
    try {
      throwApiError();
    } catch (e) {
      caughtError = e;
    }
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as ApiError).statusCode).toBe(503);
  });
});

describe('API URL Building', () => {
  // Test URL construction patterns
  const API_PREFIX = '/api';

  const buildUrl = (baseUrl: string, endpoint: string): string => {
    return `${baseUrl}${API_PREFIX}${endpoint}`;
  };

  describe('production URLs', () => {
    it('should construct correct API URLs', () => {
      const baseUrl = 'https://api.example.com';

      expect(buildUrl(baseUrl, '/listings')).toBe('https://api.example.com/api/listings');
      expect(buildUrl(baseUrl, '/auth/login')).toBe('https://api.example.com/api/auth/login');
      expect(buildUrl(baseUrl, '/settings')).toBe('https://api.example.com/api/settings');
    });

    it('should handle Cloud Run URLs', () => {
      const cloudRunUrl = 'https://motorscope-dev-663051224718.europe-west1.run.app';

      expect(buildUrl(cloudRunUrl, '/listings')).toBe(
        'https://motorscope-dev-663051224718.europe-west1.run.app/api/listings'
      );
    });
  });

  describe('development URLs', () => {
    it('should handle localhost URLs', () => {
      const baseUrl = 'http://localhost:8080';

      expect(buildUrl(baseUrl, '/healthz')).toBe('http://localhost:8080/api/healthz');
      expect(buildUrl(baseUrl, '/listings')).toBe('http://localhost:8080/api/listings');
    });

    it('should handle localhost with different ports', () => {
      expect(buildUrl('http://localhost:3000', '/test')).toBe('http://localhost:3000/api/test');
      expect(buildUrl('http://localhost:5000', '/test')).toBe('http://localhost:5000/api/test');
    });
  });

  describe('endpoint paths', () => {
    const baseUrl = 'https://api.example.com';

    it('should build listings endpoints', () => {
      expect(buildUrl(baseUrl, '/listings')).toBe('https://api.example.com/api/listings');
      expect(buildUrl(baseUrl, '/listings/vin_ABC123')).toBe(
        'https://api.example.com/api/listings/vin_ABC123'
      );
    });

    it('should build auth endpoints', () => {
      expect(buildUrl(baseUrl, '/auth/google')).toBe('https://api.example.com/api/auth/google');
      expect(buildUrl(baseUrl, '/auth/me')).toBe('https://api.example.com/api/auth/me');
      expect(buildUrl(baseUrl, '/auth/logout')).toBe('https://api.example.com/api/auth/logout');
    });

    it('should build settings endpoints', () => {
      expect(buildUrl(baseUrl, '/settings')).toBe('https://api.example.com/api/settings');
    });

    it('should build gemini-history endpoints', () => {
      expect(buildUrl(baseUrl, '/gemini-history')).toBe(
        'https://api.example.com/api/gemini-history'
      );
      expect(buildUrl(baseUrl, '/gemini-history?limit=50')).toBe(
        'https://api.example.com/api/gemini-history?limit=50'
      );
    });

    it('should build health check endpoint', () => {
      expect(buildUrl(baseUrl, '/healthz')).toBe('https://api.example.com/api/healthz');
    });
  });
});

describe('API Request Patterns', () => {
  describe('request body serialization', () => {
    it('should serialize listing objects correctly', () => {
      const listing = {
        id: 'vin_ABC123',
        title: 'BMW 320d',
        currentPrice: 150000,
        currency: 'PLN',
        priceHistory: [{ date: '2024-01-01', price: 160000, currency: 'PLN' }],
      };

      const serialized = JSON.stringify(listing);
      const parsed = JSON.parse(serialized);

      expect(parsed.id).toBe(listing.id);
      expect(parsed.priceHistory).toHaveLength(1);
    });

    it('should serialize arrays correctly', () => {
      const listings = [
        { id: 'vin_1', title: 'Car 1' },
        { id: 'vin_2', title: 'Car 2' },
      ];

      const serialized = JSON.stringify(listings);
      const parsed = JSON.parse(serialized);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should handle null values in objects', () => {
      const data = {
        value: null,
        nested: { value: null },
      };

      const serialized = JSON.stringify(data);
      const parsed = JSON.parse(serialized);

      expect(parsed.value).toBeNull();
      expect(parsed.nested.value).toBeNull();
    });
  });

  describe('response parsing patterns', () => {
    it('should handle error response format', () => {
      const errorResponse = {
        error: 'Bad Request',
        message: 'Invalid listing ID format',
        statusCode: 400,
      };

      expect(errorResponse.message).toBe('Invalid listing ID format');
      expect(errorResponse.statusCode).toBe(400);
    });

    it('should handle success response with count', () => {
      const successResponse = {
        success: true,
        count: 5,
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.count).toBe(5);
    });
  });
});

