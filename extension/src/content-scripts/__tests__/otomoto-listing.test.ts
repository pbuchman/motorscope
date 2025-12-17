/**
 * Tests for OTOMOTO listing page content script utility functions
 * Tests the shared modules used by content scripts
 */

import {
    normalizeUrl,
    isSearchUrl,
    isListingUrl,
    normalizeTrackedUrls,
    isUrlTracked,
    createMotorScopeIcon,
    processArticleElement,
    processArticles,
    resetArticleProcessingState,
} from '../shared';
import type {ListingDependencies} from '../shared';

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
        it('should detect tracked URLs using helper', () => {
            const tracked = normalizeTrackedUrls([
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html',
            ]);
            expect(isUrlTracked('https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html', tracked)).toBe(true);
        });

        it('should ignore untracked URLs using helper', () => {
            const tracked = normalizeTrackedUrls([
                'https://www.otomoto.pl/osobowe/oferta/ford-edge-ID6HMJxa.html',
            ]);
            expect(isUrlTracked('https://www.otomoto.pl/osobowe/oferta/bmw-x5-ID123.html', tracked)).toBe(false);
        });
    });
});

describe('otomoto-listing DOM utilities', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('MotorScope icon structure', () => {
        const buildIcon = (listingUrl: string) => createMotorScopeIcon(listingUrl, {
            getIconUrl: () => mockChrome.runtime.getURL('icon.png'),
            onClick: jest.fn(),
        });

        it('should create a button element', () => {
            const icon = buildIcon('https://otomoto.pl/oferta/test');
            expect(icon.tagName).toBe('BUTTON');
            expect(icon.type).toBe('button');
        });

        it('should have correct accessibility attributes', () => {
            const icon = buildIcon('https://otomoto.pl/oferta/test');
            expect(icon.getAttribute('aria-label')).toBe('Otwórz w MotorScope');
            expect(icon.getAttribute('tabindex')).toBe('0');
        });

        it('should have correct CSS classes', () => {
            const icon = buildIcon('https://otomoto.pl/oferta/test');
            expect(icon.classList.contains('motorscope-tracked-icon')).toBe(true);
            expect(icon.classList.contains('ooa-xaeen7')).toBe(true);
        });

        it('should have correct data attributes', () => {
            const icon = buildIcon('https://otomoto.pl/oferta/test');
            expect(icon.getAttribute('data-button-variant')).toBe('flat');
        });

        it('should contain SVG wrapper with correct structure', () => {
            const icon = buildIcon('https://otomoto.pl/oferta/test');
            const svgWrapper = icon.querySelector('.n-button-svg-wrapper');

            expect(svgWrapper).not.toBeNull();
            expect(svgWrapper?.classList.contains('n-button-svg-wrapper-pre')).toBe(true);
            expect(svgWrapper?.getAttribute('aria-hidden')).toBe('true');
        });

        it('should contain image with correct attributes', () => {
            const icon = buildIcon('https://otomoto.pl/oferta/test');
            const img = icon.querySelector('img');

            expect(img).not.toBeNull();
            expect(img?.src).toBe('chrome-extension://mock-id/icon.png');
            expect(img?.width).toBe(30);
            expect(img?.height).toBe(30);
            expect(img?.alt).toBe('MotorScope');
        });

        it('should contain text wrapper span', () => {
            const icon = buildIcon('https://otomoto.pl/oferta/test');
            const textWrapper = icon.querySelector('.n-button-text-wrapper');

            expect(textWrapper).not.toBeNull();
            expect(textWrapper?.tagName).toBe('SPAN');
        });

        it('should use chrome.runtime.getURL for icon path', () => {
            buildIcon('https://otomoto.pl/oferta/test');
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

        const CSS_CLASSES = {
            TRACKED_ICON: 'motorscope-tracked-icon',
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

        const config = {
            selectors: {
                article: SELECTORS.ARTICLE,
                listingLink: SELECTORS.LISTING_LINK,
                favoritesButton: SELECTORS.FAVORITES_BUTTON,
                iconContainer: SELECTORS.ICON_CONTAINER,
            },
            dataAttributes: {
                processed: DATA_ATTRIBUTES.PROCESSED,
                tracked: DATA_ATTRIBUTES.TRACKED,
            },
            cssClasses: {
                trackedIcon: CSS_CLASSES.TRACKED_ICON,
            },
        } as const;

        const deps = {
            log: jest.fn(),
            buildIcon: jest.fn((url: string) => buildTestIcon(url)),
        } satisfies ListingDependencies;

        const buildTestIcon = (listingUrl: string) => createMotorScopeIcon(listingUrl, {
            getIconUrl: () => mockChrome.runtime.getURL('icon.png'),
            onClick: jest.fn(),
        });

        it('should append icon for tracked listings', () => {
            const article = createMockArticle('1', 'https://otomoto.pl/oferta/test');
            document.body.appendChild(article);

            const tracked = normalizeTrackedUrls(['https://otomoto.pl/oferta/test']);
            const added = processArticleElement(article, tracked, config, deps);

            expect(added).toBe(true);
            expect(article.querySelector(`.${CSS_CLASSES.TRACKED_ICON}`)).not.toBeNull();
        });

        it('should skip already processed articles', () => {
            const article = createMockArticle('1', 'https://otomoto.pl/oferta/test');
            article.setAttribute(DATA_ATTRIBUTES.PROCESSED, 'true');
            document.body.appendChild(article);

            const tracked = normalizeTrackedUrls(['https://otomoto.pl/oferta/test']);
            const added = processArticleElement(article, tracked, config, deps);

            expect(added).toBe(false);
        });

        it('should process multiple articles via helper', () => {
            const first = createMockArticle('1', 'https://otomoto.pl/oferta/test1');
            const second = createMockArticle('2', 'https://otomoto.pl/oferta/test2');
            document.body.appendChild(first);
            document.body.appendChild(second);

            const tracked = normalizeTrackedUrls(['https://otomoto.pl/oferta/test1']);
            const count = processArticles(document, tracked, config, deps);

            expect(count).toBe(1);
        });
    });

    describe('reset processing state', () => {
        const SELECTORS = {
            ARTICLE: 'article[data-id]',
            LISTING_LINK: 'h2 a[href*="/oferta/"]',
            FAVORITES_BUTTON: 'button[aria-label="Dodaj do obserwowanych"]',
            ICON_CONTAINER: '.ooa-1m6nx9w',
        } as const;

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

        it('should reset via helper', () => {
            const container = document.createElement('div');
            container.setAttribute(DATA_ATTRIBUTES.PROCESSED, 'true');
            container.setAttribute(DATA_ATTRIBUTES.TRACKED, 'true');

            const icon = document.createElement('button');
            icon.className = CSS_CLASSES.TRACKED_ICON;
            container.appendChild(icon);
            document.body.appendChild(container);

            resetArticleProcessingState(document, {
                selectors: {
                    article: SELECTORS.ARTICLE,
                    listingLink: SELECTORS.LISTING_LINK,
                    favoritesButton: SELECTORS.FAVORITES_BUTTON,
                    iconContainer: SELECTORS.ICON_CONTAINER,
                },
                dataAttributes: {
                    processed: DATA_ATTRIBUTES.PROCESSED,
                    tracked: DATA_ATTRIBUTES.TRACKED,
                },
                cssClasses: {
                    trackedIcon: CSS_CLASSES.TRACKED_ICON,
                },
            });

            expect(container.hasAttribute(DATA_ATTRIBUTES.PROCESSED)).toBe(false);
            expect(container.hasAttribute(DATA_ATTRIBUTES.TRACKED)).toBe(false);
            expect(container.querySelector(`.${CSS_CLASSES.TRACKED_ICON}`)).toBeNull();
        });
    });
});

