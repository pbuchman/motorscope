/**
 * Content script for OTOMOTO listing pages (search results, category pages)
 * Adds MotorScope icon to listings that are already tracked
 *
 * Runs in ISOLATED world to have access to chrome.runtime for messaging
 */

import {
    createLogger,
    onDOMReady,
    isSearchPage,
    normalizeUrl,
    createSelectorObserver,
} from './shared';

// ==================== CONSTANTS ====================

const LOG_PREFIX = '[MotorScope Listing]';
const log = createLogger(LOG_PREFIX);

const CONFIG = {
    MUTATION_DEBOUNCE_MS: 500,
} as const;

const SELECTORS = {
    // Search result article elements
    ARTICLE: 'article[data-id]',
    // Link within article that contains the listing URL
    LISTING_LINK: 'h2 a[href*="/oferta/"]',
    // Favorites button container
    FAVORITES_BUTTON: 'button[aria-label="Dodaj do obserwowanych"]',
    // Container for our icon (parent of favorites button)
    ICON_CONTAINER: '.ooa-1m6nx9w',
} as const;

const DATA_ATTRIBUTES = {
    PROCESSED: 'data-motorscope-processed',
    TRACKED: 'data-motorscope-tracked',
} as const;

const CSS_CLASSES = {
    TRACKED_ICON: 'motorscope-tracked-icon',
} as const;

// ==================== STATE ====================

let trackedUrls: Set<string> = new Set();
let isInitialized = false;

// ==================== UTILITIES ====================

/**
 * Check if a URL is tracked
 */
const isUrlTracked = (url: string): boolean => {
    const normalized = normalizeUrl(url);
    return trackedUrls.has(normalized);
};

// ==================== ICON CREATION ====================

/**
 * Create the MotorScope icon button matching OTOMOTO's button structure
 */
const createMotorScopeIcon = (listingUrl: string): HTMLButtonElement => {
    // Create button matching OTOMOTO's button structure
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Otwórz w MotorScope');
    button.setAttribute('tabindex', '0');
    button.className = `${CSS_CLASSES.TRACKED_ICON} ooa-xaeen7`;
    button.setAttribute('data-button-variant', 'flat');

    // Create SVG wrapper div matching .n-button-svg-wrapper
    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'n-button-svg-wrapper n-button-svg-wrapper-pre';
    svgWrapper.setAttribute('aria-hidden', 'true');

    // Create icon image
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icon.png');
    img.width = 30;
    img.height = 30;
    img.alt = 'MotorScope';
    img.style.cssText = 'display: block;';

    svgWrapper.appendChild(img);

    // Create empty span matching .n-button-text-wrapper
    const textWrapper = document.createElement('span');
    textWrapper.className = 'n-button-text-wrapper';

    button.appendChild(svgWrapper);
    button.appendChild(textWrapper);

    // Click handler - open dashboard with this listing
    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openDashboardWithListing(listingUrl);
    });

    return button;
};

// ==================== DASHBOARD NAVIGATION ====================

/**
 * Open the dashboard with a specific listing selected
 */
const openDashboardWithListing = async (listingUrl: string): Promise<void> => {
    log('Opening dashboard for listing:', listingUrl);

    try {
        // Send message to background to open dashboard
        const response = await chrome.runtime.sendMessage({
            type: 'OPEN_DASHBOARD_WITH_LISTING',
            url: listingUrl,
        }) as {success?: boolean} | undefined;

        if (response?.success) {
            log('Dashboard opened successfully');
        }
    } catch (error) {
        log('Error opening dashboard:', error);
        // Fallback: open dashboard directly
        const dashboardUrl = chrome.runtime.getURL('index.html?view=dashboard&openListing=' + encodeURIComponent(listingUrl));
        window.open(dashboardUrl, '_blank');
    }
};

// ==================== ARTICLE PROCESSING ====================

/**
 * Process a single article element
 */
const processArticle = (article: Element): void => {
    // Skip if already processed
    if (article.hasAttribute(DATA_ATTRIBUTES.PROCESSED)) {
        return;
    }

    // Find the listing link
    const link = article.querySelector(SELECTORS.LISTING_LINK) as HTMLAnchorElement | null;
    if (!link?.href) {
        return;
    }

    // Mark as processed
    article.setAttribute(DATA_ATTRIBUTES.PROCESSED, 'true');

    // Check if this URL is tracked
    if (!isUrlTracked(link.href)) {
        return;
    }

    // Mark as tracked
    article.setAttribute(DATA_ATTRIBUTES.TRACKED, 'true');

    // Find the favorites button container
    const favoritesButton = article.querySelector(SELECTORS.FAVORITES_BUTTON);
    if (!favoritesButton) {
        log('Favorites button not found for tracked listing');
        return;
    }

    // Find the wrapper div (parent with class ooa-1m6nx9w)
    const favoritesWrapper = favoritesButton.closest(SELECTORS.ICON_CONTAINER);
    if (!favoritesWrapper) {
        log('Favorites wrapper not found for tracked listing');
        return;
    }

    // Check if icon already exists
    if (favoritesWrapper.querySelector(`.${CSS_CLASSES.TRACKED_ICON}`)) {
        return;
    }

    // Create icon button and append inside the same wrapper div
    const icon = createMotorScopeIcon(link.href);
    favoritesWrapper.appendChild(icon);
    log('Added icon for tracked listing:', link.href);
};

/**
 * Process all articles on the page
 */
const processAllArticles = (): void => {
    const articles = document.querySelectorAll(SELECTORS.ARTICLE);
    log(`Processing ${articles.length} articles`);

    articles.forEach(processArticle);
};

// ==================== TRACKING DATA ====================

/**
 * Fetch tracked listings from the extension
 */
const fetchTrackedListings = async (): Promise<void> => {
    try {
        const response = await chrome.runtime.sendMessage({type: 'GET_TRACKED_URLS'}) as {urls?: string[]} | undefined;

        if (response?.urls && Array.isArray(response.urls)) {
            trackedUrls = new Set(response.urls.map(normalizeUrl));
            log(`Loaded ${trackedUrls.size} tracked URLs`);
        }
    } catch (error) {
        log('Error fetching tracked URLs:', error);
    }
};

/**
 * Reset processing state for all articles (for re-processing after data update)
 */
const resetArticleProcessingState = (): void => {
    document.querySelectorAll(`[${DATA_ATTRIBUTES.PROCESSED}]`).forEach(el => {
        el.removeAttribute(DATA_ATTRIBUTES.PROCESSED);
        el.removeAttribute(DATA_ATTRIBUTES.TRACKED);
        // Remove existing icons
        el.querySelector(`.${CSS_CLASSES.TRACKED_ICON}`)?.remove();
    });
};

// ==================== MESSAGE HANDLING ====================

/**
 * Set up listener for tracked listings updates from the extension
 */
const setupMessageListener = (): void => {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === 'TRACKED_LISTINGS_UPDATED') {
            log('Tracked listings updated, refreshing...');
            fetchTrackedListings().then(() => {
                resetArticleProcessingState();
                processAllArticles();
            });
            sendResponse({success: true});
        }
        return false;
    });
};

// ==================== INITIALIZATION ====================

/**
 * Initialize the content script
 */
const initialize = async (): Promise<void> => {
    if (isInitialized) {
        return;
    }

    // Only run on search pages, not on individual listing pages
    if (!isSearchPage()) {
        log('Not a search page, skipping');
        return;
    }

    log('Initializing on search page');
    isInitialized = true;

    // Fetch tracked listings
    await fetchTrackedListings();

    // Process existing articles
    processAllArticles();

    // Set up observer for dynamic content (infinite scroll)
    createSelectorObserver({
        selector: SELECTORS.ARTICLE,
        onMatch: processAllArticles,
        debounceMs: CONFIG.MUTATION_DEBOUNCE_MS,
    });
    log('Mutation observer started');

    // Listen for updates from the extension
    setupMessageListener();

    log('Initialization complete');
};

// ==================== ENTRY POINT ====================

onDOMReady(() => initialize());
