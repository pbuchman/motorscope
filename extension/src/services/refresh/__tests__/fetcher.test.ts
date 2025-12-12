/**
 * Tests for Page Fetcher utilities
 */

import {FetchError, fetchListingPage} from '../fetcher';

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

describe('fetchListingPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetch-first strategy', () => {
        it('should try standard fetch first for all URLs', async () => {
            // Mock fetch to return a successful response
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => '<html><title>Test</title><body>Content</body></html>',
            });

            const result = await fetchListingPage('https://www.otomoto.pl/test');

            expect(global.fetch).toHaveBeenCalledWith(
                'https://www.otomoto.pl/test',
                expect.objectContaining({
                    method: 'GET',
                    mode: 'cors',
                }),
            );
            expect(result.status).toBe(200);
            expect(result.expired).toBe(false);
            expect(result.usedBackgroundTab).toBe(false);
        });

        it('should fallback to background tab on CORS error', async () => {
            // Mock fetch to fail with TypeError (CORS error)
            global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            // Mock chrome.tabs.create
            const mockTabId = 123;
            (chrome.tabs.create as jest.Mock).mockImplementation((options, callback) => {
                callback({id: mockTabId, url: options.url});
                return Promise.resolve({id: mockTabId, url: options.url});
            });

            // Mock chrome.scripting.executeScript
            (chrome.scripting.executeScript as jest.Mock).mockResolvedValue([
                {
                    result: {
                        title: 'Test Page',
                        html: '<html lang="en"><title>Test Page</title><body>Content</body></html>',
                        is404: false,
                        is410: false,
                    },
                },
            ]);

            // Mock chrome.tabs.onUpdated.addListener to simulate tab load complete
            (chrome.tabs.onUpdated.addListener as jest.Mock).mockImplementation((listener) => {
                setTimeout(() => {
                    listener(mockTabId, {status: 'complete'}, {id: mockTabId});
                }, 10);
            });

            const result = await fetchListingPage('https://autoplac.pl/test');

            expect(global.fetch).toHaveBeenCalled();
            expect(chrome.tabs.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://autoplac.pl/test',
                    active: false,
                }),
                expect.any(Function),
            );
            expect(result.status).toBe(200);
            expect(result.usedBackgroundTab).toBe(true);
        });

        it('should fallback to background tab on Cloudflare status code (520)', async () => {
            // Mock fetch to return Cloudflare error status
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 520,
            });

            // Mock background tab
            const mockTabId = 123;
            (chrome.tabs.create as jest.Mock).mockImplementation((options, callback) => {
                callback({id: mockTabId, url: options.url});
                return Promise.resolve({id: mockTabId, url: options.url});
            });

            (chrome.scripting.executeScript as jest.Mock).mockResolvedValue([
                {
                    result: {
                        title: 'Test Page',
                        html: '<html lang="en"><title>Test Page</title><body>Content</body></html>',
                        is404: false,
                        is410: false,
                    },
                },
            ]);

            (chrome.tabs.onUpdated.addListener as jest.Mock).mockImplementation((listener) => {
                setTimeout(() => {
                    listener(mockTabId, {status: 'complete'}, {id: mockTabId});
                }, 10);
            });

            const result = await fetchListingPage('https://autoplac.pl/test');

            expect(result.usedBackgroundTab).toBe(true);
            expect(result.status).toBe(200);
        });

        it('should use forceBackgroundTab to skip fetch attempt', async () => {
            // Mock chrome.tabs.create
            const mockTabId = 123;
            (chrome.tabs.create as jest.Mock).mockImplementation((options, callback) => {
                callback({id: mockTabId, url: options.url});
                return Promise.resolve({id: mockTabId, url: options.url});
            });

            (chrome.scripting.executeScript as jest.Mock).mockResolvedValue([
                {
                    result: {
                        title: 'Test Page',
                        html: '<html lang="en"><title>Test Page</title><body>Content</body></html>',
                        is404: false,
                        is410: false,
                    },
                },
            ]);

            (chrome.tabs.onUpdated.addListener as jest.Mock).mockImplementation((listener) => {
                setTimeout(() => {
                    listener(mockTabId, {status: 'complete'}, {id: mockTabId});
                }, 10);
            });

            // Should NOT call fetch when forceBackgroundTab is true
            global.fetch = jest.fn();

            const result = await fetchListingPage('https://autoplac.pl/test', true);

            expect(global.fetch).not.toHaveBeenCalled();
            expect(chrome.tabs.create).toHaveBeenCalled();
            expect(result.usedBackgroundTab).toBe(true);
        });
    });

    describe('standard fetch behavior', () => {
        it('should detect 404 expired listings', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 404,
            });

            const result = await fetchListingPage('https://www.otomoto.pl/test');

            expect(result.expired).toBe(true);
            expect(result.status).toBe(404);
            expect(result.usedBackgroundTab).toBe(false);
        });

        it('should detect 410 expired listings', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 410,
            });

            const result = await fetchListingPage('https://www.otomoto.pl/test');

            expect(result.expired).toBe(true);
            expect(result.status).toBe(410);
            expect(result.usedBackgroundTab).toBe(false);
        });

        it('should handle non-OK, non-Cloudflare responses without fallback', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 500,
            });

            const result = await fetchListingPage('https://www.otomoto.pl/test');

            expect(result.expired).toBe(false);
            expect(result.status).toBe(500);
            expect(result.usedBackgroundTab).toBe(false);
            expect(chrome.tabs.create).not.toHaveBeenCalled();
        });

        it('should throw error if both fetch and background tab fail', async () => {
            global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            (chrome.tabs.create as jest.Mock).mockImplementation((options, callback) => {
                callback(undefined); // Simulate tab creation failure
            });

            await expect(fetchListingPage('https://www.otomoto.pl/test'))
                .rejects.toThrow();
        });
    });

    describe('background tab behavior', () => {
        it('should detect 404 from page content in background tab', async () => {
            global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            const mockTabId = 123;
            (chrome.tabs.create as jest.Mock).mockImplementation((options, callback) => {
                callback({id: mockTabId});
                return Promise.resolve({id: mockTabId});
            });

            (chrome.scripting.executeScript as jest.Mock).mockResolvedValue([
                {
                    result: {
                        title: '404 Not Found',
                        html: '<html lang="en"><title>404 Not Found</title></html>',
                        is404: true,
                        is410: false,
                    },
                },
            ]);

            (chrome.tabs.onUpdated.addListener as jest.Mock).mockImplementation((listener) => {
                setTimeout(() => {
                    listener(mockTabId, {status: 'complete'}, {id: mockTabId});
                }, 10);
            });

            const result = await fetchListingPage('https://autoplac.pl/test');

            expect(result.expired).toBe(true);
            expect(result.status).toBe(404);
            expect(result.usedBackgroundTab).toBe(true);
        });

        it('should handle tab creation failure after fetch fails', async () => {
            global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            (chrome.tabs.create as jest.Mock).mockImplementation((options, callback) => {
                callback(undefined); // Simulate tab creation failure
            });

            await expect(fetchListingPage('https://autoplac.pl/test'))
                .rejects.toThrow();
        });

        it('should timeout if tab does not load', async () => {
            jest.useFakeTimers();

            global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

            const mockTabId = 123;
            (chrome.tabs.create as jest.Mock).mockImplementation((options, callback) => {
                callback({id: mockTabId});
                return Promise.resolve({id: mockTabId});
            });

            // Don't trigger the complete event - let it timeout
            (chrome.tabs.onUpdated.addListener as jest.Mock).mockImplementation(() => {
                // Do nothing - simulate tab never completing
            });

            const promise = fetchListingPage('https://autoplac.pl/test');

            jest.advanceTimersByTime(30000);

            await expect(promise).rejects.toThrow();

            jest.useRealTimers();
        });
    });
});

