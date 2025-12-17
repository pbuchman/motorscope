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
    createSelectorObserver,
    normalizeTrackedUrls,
    processArticles,
    resetArticleProcessingState,
    createMotorScopeIcon,
} from './shared';
import type {ListingDomConfig, ListingDependencies} from './shared';

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

const LISTING_DOM_CONFIG: ListingDomConfig = {
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
};

const listingDependencies: ListingDependencies = {
    log,
    buildIcon: (listingUrl: string) => createMotorScopeIcon(listingUrl, {
        getIconUrl: () => chrome.runtime.getURL('icon.png'),
        onClick: () => openDashboardWithListing(listingUrl),
    }),
};

// ==================== STATE ====================

let trackedUrls: Set<string> = new Set();
let isInitialized = false;

// ==================== UTILITIES ====================

const processAllArticles = (): void => {
    const added = processArticles(document, trackedUrls, LISTING_DOM_CONFIG, listingDependencies);
    log(`Processed articles - icons added: ${added}`);
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

// ==================== TRACKING DATA ====================

/**
 * Fetch tracked listings from the extension
 */
const fetchTrackedListings = async (): Promise<void> => {
    try {
        const response = await chrome.runtime.sendMessage({type: 'GET_TRACKED_URLS'}) as {urls?: string[]} | undefined;

        if (response?.urls && Array.isArray(response.urls)) {
            trackedUrls = normalizeTrackedUrls(response.urls);
            log(`Loaded ${trackedUrls.size} tracked URLs`);
        }
    } catch (error) {
        log('Error fetching tracked URLs:', error);
    }
};

const resetArticles = (): void => {
    resetArticleProcessingState(document, LISTING_DOM_CONFIG);
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
                resetArticles();
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
