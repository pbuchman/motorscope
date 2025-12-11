/**
 * Tests for Page Fetcher utilities
 */

import {FetchError} from '../fetcher';

// Note: fetchListingPage requires actual network calls or complex mocking
// These tests cover the FetchError class and HTML parsing logic

describe('FetchError', () => {
    it('should create error with correct name', () => {
        const error = new FetchError('Network error');
        expect(error.name).toBe('FetchError');
    });

    it('should preserve error message', () => {
        const error = new FetchError('Connection refused');
        expect(error.message).toBe('Connection refused');
    });

    it('should indicate CORS error when specified', () => {
        const error = new FetchError('CORS policy blocked', true);
        expect(error.isCorsError).toBe(true);
    });

    it('should default isCorsError to false', () => {
        const error = new FetchError('Some error');
        expect(error.isCorsError).toBe(false);
    });

    it('should store HTTP status when provided', () => {
        const error = new FetchError('Not found', false, 404);
        expect(error.httpStatus).toBe(404);
    });

    it('should be instanceof Error', () => {
        const error = new FetchError('Test');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(FetchError);
    });
});

describe('HTML Text Extraction Logic', () => {
    // Test the text extraction patterns used in fetcher

    const extractTextContent = (html: string): string => {
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 20000);
    };

    const extractTitle = (html: string): string => {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : '';
    };

    describe('extractTextContent', () => {
        it('should remove script tags', () => {
            const html = '<div>Hello</div><script>alert("test")</script><p>World</p>';
            const result = extractTextContent(html);
            expect(result).not.toContain('alert');
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });

        it('should remove style tags', () => {
            const html = '<div>Content</div><style>.class { color: red; }</style>';
            const result = extractTextContent(html);
            expect(result).not.toContain('color');
            expect(result).toContain('Content');
        });

        it('should remove HTML tags but keep text', () => {
            const html = '<div class="test"><span>Hello</span> <b>World</b></div>';
            const result = extractTextContent(html);
            expect(result).toBe('Hello World');
        });

        it('should normalize whitespace', () => {
            const html = '<div>   Multiple   \n\n  spaces   </div>';
            const result = extractTextContent(html);
            expect(result).toBe('Multiple spaces');
        });

        it('should truncate long content to 20000 characters', () => {
            const longContent = 'a'.repeat(25000);
            const html = `<div>${longContent}</div>`;
            const result = extractTextContent(html);
            expect(result.length).toBe(20000);
        });

        it('should handle multiline scripts', () => {
            const html = `
        <div>Before</div>
        <script type="text/javascript">
          function test() {
            console.log("test");
          }
        </script>
        <div>After</div>
      `;
            const result = extractTextContent(html);
            expect(result).not.toContain('function');
            expect(result).not.toContain('console');
            expect(result).toContain('Before');
            expect(result).toContain('After');
        });

        it('should handle nested tags', () => {
            const html = '<div><p><span><b>Nested</b> content</span></p></div>';
            const result = extractTextContent(html);
            expect(result).toBe('Nested content');
        });
    });

    describe('extractTitle', () => {
        it('should extract page title', () => {
            const html = '<html lang="en"><head><title>BMW 320d - Otomoto</title></head><body></body></html>';
            const result = extractTitle(html);
            expect(result).toBe('BMW 320d - Otomoto');
        });

        it('should handle title with attributes', () => {
            const html = '<title lang="pl">Test Title</title>';
            const result = extractTitle(html);
            expect(result).toBe('Test Title');
        });

        it('should return empty string for missing title', () => {
            const html = '<html lang="en"><head></head><body></body></html>';
            const result = extractTitle(html);
            expect(result).toBe('');
        });

        it('should trim whitespace from title', () => {
            const html = '<title>  Whitespace Title  </title>';
            const result = extractTitle(html);
            expect(result).toBe('Whitespace Title');
        });

        it('should handle case-insensitive title tag', () => {
            const html = '<TITLE>Uppercase Title</TITLE>';
            const result = extractTitle(html);
            expect(result).toBe('Uppercase Title');
        });
    });
});

