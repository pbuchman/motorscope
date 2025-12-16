/**
 * Tests for OTOMOTO listing page content script utility functions
 * Tests the shared modules used by content scripts
 */

import {normalizeUrl, isSearchUrl, isListingUrl} from '../shared';

// Mock Chrome APIs
const mockChrome = {
    runtime: {
        getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`),
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
        },
    },
};

// Assign to global
(global as unknown as {chrome: typeof mockChrome}).chrome = mockChrome;

describe('otomoto-listing content script utilities', () => {
    describe('URL normalization', () => {
        it('should normalize URLs by removing query params', () => {
            const url = 'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html?foo=bar';
            expect(normalizeUrl(url)).toBe('https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html');
        });

        it('should remove trailing slashes', () => {
            const url = 'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html/';
            expect(normalizeUrl(url)).toBe('https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html');
        });

        it('should handle URLs without trailing slash', () => {
            const url = 'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html';
            expect(normalizeUrl(url)).toBe('https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html');
        });

        it('should preserve the protocol and host', () => {
            const url = 'https://otomoto.pl/osobowe/oferta/bmw-x5-ID123.html';
            expect(normalizeUrl(url)).toBe('https://otomoto.pl/osobowe/oferta/bmw-x5-ID123.html');
        });

        it('should handle invalid URLs gracefully', () => {
            const url = 'not-a-valid-url/';
            expect(normalizeUrl(url)).toBe('not-a-valid-url');
        });
    });

    describe('page type detection', () => {
        describe('isListingUrl', () => {
            it('should detect listing URL (osobowe)', () => {
                expect(isListingUrl('https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html')).toBe(true);
            });

            it('should detect listing URL (dostawcze)', () => {
                expect(isListingUrl('https://www.otomoto.pl/dostawcze/oferta/mercedes-sprinter-ID456.html')).toBe(true);
            });

            it('should not detect search URL as listing', () => {
                expect(isListingUrl('https://www.otomoto.pl/osobowe/ford/edge')).toBe(false);
            });
        });

        describe('isSearchUrl', () => {
            it('should detect search URLs (osobowe)', () => {
                expect(isSearchUrl('https://www.otomoto.pl/osobowe/ford/edge')).toBe(true);
            });

            it('should detect search URLs (dostawcze)', () => {
                expect(isSearchUrl('https://www.otomoto.pl/dostawcze/mercedes')).toBe(true);
            });

            it('should detect search URLs (motocykle)', () => {
                expect(isSearchUrl('https://www.otomoto.pl/motocykle-i-quady/honda')).toBe(true);
            });

            it('should not detect offer URLs as search URLs', () => {
                expect(isSearchUrl('https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html')).toBe(false);
            });

            it('should not detect nested offer URLs as search URLs', () => {
                expect(isSearchUrl('https://www.otomoto.pl/dostawcze/oferta/mercedes-sprinter-ID456.html')).toBe(false);
            });
        });
    });

    describe('URL tracking detection', () => {
        const isUrlTracked = (url: string, trackedUrls: Set<string>): boolean => {
            const normalized = normalizeUrl(url);
            return trackedUrls.has(normalized);
        };

        it('should detect tracked URLs', () => {
            const trackedUrls = new Set([
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html',
            ]);

            expect(isUrlTracked(
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html',
                trackedUrls,
            )).toBe(true);
        });

        it('should detect tracked URLs with query params', () => {
            const trackedUrls = new Set([
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html',
            ]);

            expect(isUrlTracked(
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html?from=search',
                trackedUrls,
            )).toBe(true);
        });

        it('should not detect untracked URLs', () => {
            const trackedUrls = new Set([
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html',
            ]);

            expect(isUrlTracked(
                'https://www.otomoto.pl/osobowe/oferta/bmw-x5-ID123.html',
                trackedUrls,
            )).toBe(false);
        });

        it('should handle empty tracked set', () => {
            const trackedUrls = new Set<string>();

            expect(isUrlTracked(
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html',
                trackedUrls,
            )).toBe(false);
        });
    });
});

describe('otomoto-listing DOM utilities', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('MotorScope icon structure', () => {
        /**
         * Creates a MotorScope icon button matching OTOMOTO's button structure
         * This is a copy of the production function for testing
         */
        const createMotorScopeIcon = (_listingUrl: string): HTMLButtonElement => {
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('aria-label', 'Otwórz w MotorScope');
            button.setAttribute('tabindex', '0');
            button.className = 'motorscope-tracked-icon ooa-xaeen7';
            button.setAttribute('data-button-variant', 'flat');

            const svgWrapper = document.createElement('div');
            svgWrapper.className = 'n-button-svg-wrapper n-button-svg-wrapper-pre';
            svgWrapper.setAttribute('aria-hidden', 'true');

            const img = document.createElement('img');
            img.src = mockChrome.runtime.getURL('icon.png');
            img.width = 30;
            img.height = 30;
            img.alt = 'MotorScope';
            img.style.cssText = 'display: block;';

            svgWrapper.appendChild(img);

            const textWrapper = document.createElement('span');
            textWrapper.className = 'n-button-text-wrapper';

            button.appendChild(svgWrapper);
            button.appendChild(textWrapper);

            return button;
        };

        it('should create a button element', () => {
            const icon = createMotorScopeIcon('https://otomoto.pl/oferta/test');
            expect(icon.tagName).toBe('BUTTON');
            expect(icon.type).toBe('button');
        });

        it('should have correct accessibility attributes', () => {
            const icon = createMotorScopeIcon('https://otomoto.pl/oferta/test');
            expect(icon.getAttribute('aria-label')).toBe('Otwórz w MotorScope');
            expect(icon.getAttribute('tabindex')).toBe('0');
        });

        it('should have correct CSS classes', () => {
            const icon = createMotorScopeIcon('https://otomoto.pl/oferta/test');
            expect(icon.classList.contains('motorscope-tracked-icon')).toBe(true);
            expect(icon.classList.contains('ooa-xaeen7')).toBe(true);
        });

        it('should have correct data attributes', () => {
            const icon = createMotorScopeIcon('https://otomoto.pl/oferta/test');
            expect(icon.getAttribute('data-button-variant')).toBe('flat');
        });

        it('should contain SVG wrapper with correct structure', () => {
            const icon = createMotorScopeIcon('https://otomoto.pl/oferta/test');
            const svgWrapper = icon.querySelector('.n-button-svg-wrapper');

            expect(svgWrapper).not.toBeNull();
            expect(svgWrapper?.classList.contains('n-button-svg-wrapper-pre')).toBe(true);
            expect(svgWrapper?.getAttribute('aria-hidden')).toBe('true');
        });

        it('should contain image with correct attributes', () => {
            const icon = createMotorScopeIcon('https://otomoto.pl/oferta/test');
            const img = icon.querySelector('img');

            expect(img).not.toBeNull();
            expect(img?.src).toBe('chrome-extension://mock-id/icon.png');
            expect(img?.width).toBe(30);
            expect(img?.height).toBe(30);
            expect(img?.alt).toBe('MotorScope');
        });

        it('should contain text wrapper span', () => {
            const icon = createMotorScopeIcon('https://otomoto.pl/oferta/test');
            const textWrapper = icon.querySelector('.n-button-text-wrapper');

            expect(textWrapper).not.toBeNull();
            expect(textWrapper?.tagName).toBe('SPAN');
        });

        it('should use chrome.runtime.getURL for icon path', () => {
            createMotorScopeIcon('https://otomoto.pl/oferta/test');
            expect(mockChrome.runtime.getURL).toHaveBeenCalledWith('icon.png');
        });
    });

    describe('article processing logic', () => {
        const SELECTORS = {
            ARTICLE: 'article[data-id]',
            LISTING_LINK: 'h2 a[href*="/oferta/"]',
            FAVORITES_BUTTON: 'button[aria-label="Dodaj do obserwowanych"]',
            ICON_CONTAINER: '.ooa-1m6nx9w',
        };

        const DATA_ATTRIBUTES = {
            PROCESSED: 'data-motorscope-processed',
            TRACKED: 'data-motorscope-tracked',
        };

        /**
         * Create a mock article element matching OTOMOTO's structure
         */
        const createMockArticle = (id: string, url: string): HTMLElement => {
            const article = document.createElement('article');
            article.setAttribute('data-id', id);

            const h2 = document.createElement('h2');
            const link = document.createElement('a');
            link.href = url;
            h2.appendChild(link);
            article.appendChild(h2);

            const iconContainer = document.createElement('div');
            iconContainer.className = 'ooa-1m6nx9w';

            const favButton = document.createElement('button');
            favButton.setAttribute('aria-label', 'Dodaj do obserwowanych');
            iconContainer.appendChild(favButton);
            article.appendChild(iconContainer);

            return article;
        };

        it('should find listing link in article', () => {
            const article = createMockArticle('123', 'https://otomoto.pl/oferta/test');
            document.body.appendChild(article);

            const link = article.querySelector(SELECTORS.LISTING_LINK);
            expect(link).not.toBeNull();
            expect((link as HTMLAnchorElement).href).toContain('/oferta/');
        });

        it('should find favorites button in article', () => {
            const article = createMockArticle('123', 'https://otomoto.pl/oferta/test');
            document.body.appendChild(article);

            const button = article.querySelector(SELECTORS.FAVORITES_BUTTON);
            expect(button).not.toBeNull();
        });

        it('should find icon container in article', () => {
            const article = createMockArticle('123', 'https://otomoto.pl/oferta/test');
            document.body.appendChild(article);

            const container = article.querySelector(SELECTORS.ICON_CONTAINER);
            expect(container).not.toBeNull();
        });

        it('should be able to mark article as processed', () => {
            const article = createMockArticle('123', 'https://otomoto.pl/oferta/test');
            document.body.appendChild(article);

            expect(article.hasAttribute(DATA_ATTRIBUTES.PROCESSED)).toBe(false);
            article.setAttribute(DATA_ATTRIBUTES.PROCESSED, 'true');
            expect(article.hasAttribute(DATA_ATTRIBUTES.PROCESSED)).toBe(true);
        });

        it('should be able to mark article as tracked', () => {
            const article = createMockArticle('123', 'https://otomoto.pl/oferta/test');
            document.body.appendChild(article);

            article.setAttribute(DATA_ATTRIBUTES.TRACKED, 'true');
            expect(article.getAttribute(DATA_ATTRIBUTES.TRACKED)).toBe('true');
        });

        it('should query all articles with selector', () => {
            const article1 = createMockArticle('1', 'https://otomoto.pl/oferta/test1');
            const article2 = createMockArticle('2', 'https://otomoto.pl/oferta/test2');
            document.body.appendChild(article1);
            document.body.appendChild(article2);

            const articles = document.querySelectorAll(SELECTORS.ARTICLE);
            expect(articles.length).toBe(2);
        });
    });

    describe('reset processing state', () => {
        const DATA_ATTRIBUTES = {
            PROCESSED: 'data-motorscope-processed',
            TRACKED: 'data-motorscope-tracked',
        };

        const CSS_CLASSES = {
            TRACKED_ICON: 'motorscope-tracked-icon',
        };

        it('should remove processed attribute from elements', () => {
            const div = document.createElement('div');
            div.setAttribute(DATA_ATTRIBUTES.PROCESSED, 'true');
            document.body.appendChild(div);

            document.querySelectorAll(`[${DATA_ATTRIBUTES.PROCESSED}]`).forEach(el => {
                el.removeAttribute(DATA_ATTRIBUTES.PROCESSED);
            });

            expect(div.hasAttribute(DATA_ATTRIBUTES.PROCESSED)).toBe(false);
        });

        it('should remove tracked attribute from elements', () => {
            const div = document.createElement('div');
            div.setAttribute(DATA_ATTRIBUTES.TRACKED, 'true');
            div.setAttribute(DATA_ATTRIBUTES.PROCESSED, 'true');
            document.body.appendChild(div);

            document.querySelectorAll(`[${DATA_ATTRIBUTES.PROCESSED}]`).forEach(el => {
                el.removeAttribute(DATA_ATTRIBUTES.PROCESSED);
                el.removeAttribute(DATA_ATTRIBUTES.TRACKED);
            });

            expect(div.hasAttribute(DATA_ATTRIBUTES.TRACKED)).toBe(false);
        });

        it('should remove tracked icons from elements', () => {
            const container = document.createElement('div');
            container.setAttribute(DATA_ATTRIBUTES.PROCESSED, 'true');

            const icon = document.createElement('button');
            icon.className = CSS_CLASSES.TRACKED_ICON;
            container.appendChild(icon);
            document.body.appendChild(container);

            document.querySelectorAll(`[${DATA_ATTRIBUTES.PROCESSED}]`).forEach(el => {
                el.querySelector(`.${CSS_CLASSES.TRACKED_ICON}`)?.remove();
            });

            expect(container.querySelector(`.${CSS_CLASSES.TRACKED_ICON}`)).toBeNull();
        });
    });
});

