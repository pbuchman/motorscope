/**
 * Tests for Gemini History (recording success/error)
 */

// Mock the settings module
jest.mock('../../settings', () => ({
  recordGeminiCall: jest.fn().mockResolvedValue(undefined),
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => mockUUID),
  },
});

import { recordSuccess, recordError, formatJsonResponse } from '../history';
import { recordGeminiCall } from '../../settings';

describe('Gemini History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatJsonResponse', () => {
    it('should format object as JSON string', () => {
      const data = { price: 100000, currency: 'PLN' };
      const result = formatJsonResponse(data);
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const result = formatJsonResponse(data);
      expect(result).toBe(JSON.stringify(data, null, 2));
    });

    it('should handle primitive values', () => {
      expect(formatJsonResponse('string')).toBe('"string"');
      expect(formatJsonResponse(123)).toBe('123');
      expect(formatJsonResponse(true)).toBe('true');
      expect(formatJsonResponse(null)).toBe('null');
    });

    it('should return string representation for circular objects', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      const result = formatJsonResponse(circular);
      expect(typeof result).toBe('string');
    });
  });

  describe('recordSuccess', () => {
    it('should record successful API call', async () => {
      const url = 'https://otomoto.pl/test';
      const prompt = 'Extract car data...';
      const response = { text: '{"price": 100000}' };

      await recordSuccess(url, prompt, response);

      expect(recordGeminiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUUID,
          url,
          promptPreview: prompt,
          status: 'success',
        })
      );
    });

    it('should include formatted response', async () => {
      const url = 'https://example.com/listing';
      const prompt = 'Test prompt';
      const response = { price: 50000 };

      await recordSuccess(url, prompt, response);

      expect(recordGeminiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          rawResponse: JSON.stringify(response, null, 2),
        })
      );
    });

    it('should include timestamp', async () => {
      await recordSuccess('url', 'prompt', {});

      expect(recordGeminiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('recordError', () => {
    it('should record failed API call', async () => {
      const url = 'https://otomoto.pl/test';
      const prompt = 'Extract car data...';
      const error = 'Rate limit exceeded';

      await recordError(url, prompt, error);

      expect(recordGeminiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUUID,
          url,
          promptPreview: prompt,
          status: 'error',
          error,
        })
      );
    });
  });
});

