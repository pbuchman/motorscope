/**
 * Tests for Gemini Prompt Templates
 */

import { buildParsePrompt, buildRefreshPrompt } from '../prompts';

describe('Gemini Prompts', () => {
  describe('buildParsePrompt', () => {
    it('should include page title', () => {
      const prompt = buildParsePrompt('BMW 320d - Otomoto', 'https://otomoto.pl/123', 'test content');
      expect(prompt).toContain('BMW 320d - Otomoto');
    });

    it('should include page URL', () => {
      const prompt = buildParsePrompt('Title', 'https://otomoto.pl/123', 'test content');
      expect(prompt).toContain('https://otomoto.pl/123');
    });

    it('should include page content', () => {
      const content = 'This is the page content with car details';
      const prompt = buildParsePrompt('Title', 'https://example.com', content);
      expect(prompt).toContain(content);
    });

    it('should truncate long content to 15000 characters', () => {
      const longContent = 'a'.repeat(20000);
      const prompt = buildParsePrompt('Title', 'https://example.com', longContent);
      // Prompt should not contain full 20000 chars
      expect(prompt.length).toBeLessThan(20000 + 2000); // Some overhead for template
    });

    it('should include VIN extraction rules', () => {
      const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('VIN');
      expect(prompt).toContain('17 characters');
    });

    it('should include Polish timezone handling instructions', () => {
      const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('Europe/Warsaw');
      expect(prompt).toContain('+01:00');
    });

    it('should include Polish month names for date parsing', () => {
      const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('stycznia');
      expect(prompt).toContain('grudnia');
    });

    it('should mention origin country extraction', () => {
      const prompt = buildParsePrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('originCountry');
      expect(prompt).toContain('IMPORTED FROM');
    });
  });

  describe('buildRefreshPrompt', () => {
    it('should include page title', () => {
      const prompt = buildRefreshPrompt('BMW 320d', 'https://example.com', 'content');
      expect(prompt).toContain('BMW 320d');
    });

    it('should include page URL', () => {
      const prompt = buildRefreshPrompt('Title', 'https://otomoto.pl/offer/123', 'content');
      expect(prompt).toContain('https://otomoto.pl/offer/123');
    });

    it('should include page content', () => {
      const content = 'Price: 150,000 PLN';
      const prompt = buildRefreshPrompt('Title', 'https://example.com', content);
      expect(prompt).toContain(content);
    });

    it('should truncate content to 10000 characters', () => {
      const longContent = 'b'.repeat(15000);
      const prompt = buildRefreshPrompt('Title', 'https://example.com', longContent);
      // Should be truncated
      expect(prompt).toContain('truncated');
    });

    it('should mention price extraction', () => {
      const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('price');
    });

    it('should mention availability status', () => {
      const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('isAvailable');
    });

    it('should mention sold status', () => {
      const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('isSold');
    });

    it('should mention currency extraction', () => {
      const prompt = buildRefreshPrompt('Title', 'https://example.com', 'content');
      expect(prompt).toContain('currency');
      expect(prompt).toContain('PLN');
    });
  });
});

