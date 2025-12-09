/**
 * Tests for Gemini Error Utilities
 */

import { RateLimitError, isRateLimitError } from '../errors';

describe('Gemini Errors', () => {
  describe('RateLimitError', () => {
    it('should create error with correct name', () => {
      const error = new RateLimitError('Rate limit exceeded');
      expect(error.name).toBe('RateLimitError');
    });

    it('should preserve error message', () => {
      const error = new RateLimitError('Quota exceeded for today');
      expect(error.message).toBe('Quota exceeded for today');
    });

    it('should be instanceof Error', () => {
      const error = new RateLimitError('Rate limit');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RateLimitError);
    });
  });

  describe('isRateLimitError', () => {
    it('should detect 429 status code', () => {
      expect(isRateLimitError('Error 429: Too Many Requests')).toBe(true);
      expect(isRateLimitError('HTTP 429')).toBe(true);
      expect(isRateLimitError('Status: 429')).toBe(true);
    });

    it('should detect "rate limit" text (case insensitive)', () => {
      expect(isRateLimitError('Rate limit exceeded')).toBe(true);
      expect(isRateLimitError('RATE LIMIT reached')).toBe(true);
      expect(isRateLimitError('rate limit')).toBe(true);
    });

    it('should detect "quota exceeded" text (case insensitive)', () => {
      expect(isRateLimitError('Quota exceeded for today')).toBe(true);
      expect(isRateLimitError('QUOTA EXCEEDED')).toBe(true);
      expect(isRateLimitError('Daily quota exceeded')).toBe(true);
    });

    it('should detect "resource exhausted" text (case insensitive)', () => {
      expect(isRateLimitError('Resource exhausted')).toBe(true);
      expect(isRateLimitError('resource exhausted: retry later')).toBe(true);
    });

    it('should return false for non-rate-limit errors', () => {
      expect(isRateLimitError('Network error')).toBe(false);
      expect(isRateLimitError('Invalid API key')).toBe(false);
      expect(isRateLimitError('Internal server error')).toBe(false);
      expect(isRateLimitError('400 Bad Request')).toBe(false);
      expect(isRateLimitError('500 Internal Server Error')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isRateLimitError('')).toBe(false);
    });

    it('should handle Google API error formats', () => {
      expect(isRateLimitError('Error: [429 Too Many Requests] Rate limit exceeded')).toBe(true);
      expect(isRateLimitError('models.generateContent: quota exceeded')).toBe(true);
    });
  });
});

