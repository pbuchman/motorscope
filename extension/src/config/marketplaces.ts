/**
 * Marketplace Configuration
 *
 * Centralized configuration for supported car marketplaces.
 * Add new marketplaces here to extend support.
 */

export interface MarketplaceConfig {
    /** Unique identifier for the marketplace */
    id: string;
    /** Display name */
    name: string;
    /** Domain pattern(s) to match - used for URL detection */
    domains: string[];
    /** Country code(s) where this marketplace operates */
    countries: string[];
    /** Base URL for the marketplace (used in UI links) */
    url: string;
    /** Whether this marketplace is currently enabled */
    enabled: boolean;
    /**
     * URL patterns that indicate this is a specific offer/listing page (not search/main page)
     * Can be:
     * - String patterns to match in URL path (e.g., '/oferta/', '/ogloszenie/')
     * - Regex patterns for more complex matching
     */
    offerPagePatterns: (string | RegExp)[];
    /**
     * URL patterns that indicate this is NOT an offer page (search, category, main page)
     * These take precedence - if matched, page is not considered an offer
     */
    excludePatterns?: (string | RegExp)[];
    /**
     * If true, never use fetch() for this marketplace - always open in background tab.
     * Required for sites that block fetch requests or require authentication cookies.
     */
    neverFetch?: boolean;
}

/**
 * List of supported car marketplaces
 *
 * To add a new marketplace:
 * 1. Add a new entry to this array
 * 2. Include all domain variations (with/without www, regional subdomains, etc.)
 * 3. Define offerPagePatterns to identify specific listing pages
 * 4. Set enabled: true to activate
 */
export const SUPPORTED_MARKETPLACES: MarketplaceConfig[] = [
    {
        id: 'otomoto',
        name: 'OTOMOTO',
        domains: ['otomoto.pl', 'www.otomoto.pl'],
        countries: ['PL'],
        url: 'https://otomoto.pl',
        enabled: true,
        // OTOMOTO offer URLs look like: https://www.otomoto.pl/osobowe/oferta/ford-ranger-ID6HEcgy.html
        offerPagePatterns: [
            '/oferta/',           // Main pattern for offers
            /\/osobowe\/oferta\//, // Car offers specifically
            /\/dostawcze\/oferta\//, // Commercial vehicles
            /\/motocykle-i-quady\/oferta\//, // Motorcycles
        ],
        excludePatterns: [
            '/szukaj',            // Search results
            '/osobowe?',          // Category listing with query params
            '/osobowe/',          // Category listing (but not /oferta/)
            '?search',            // Search queries
        ],
    },
    {
        id: 'autoplac',
        name: 'Autoplac',
        domains: ['autoplac.pl', 'www.autoplac.pl'],
        countries: ['PL'],
        url: 'https://autoplac.pl',
        enabled: true,
        // Autoplac offer URLs typically contain /ogloszenie/ or similar
        offerPagePatterns: [
            '/ogloszenie/',       // Individual listing pattern
            '/oferta/',           // Alternative offer pattern
            /\/samochod\/\d+/,    // Pattern like /samochod/12345
            /\/auto\/\d+/,        // Pattern like /auto/12345
        ],
        excludePatterns: [
            '/szukaj',
            '/kategoria/',
            '/lista/',
            '?page=',
        ],
    },
    {
        id: 'facebook-marketplace',
        name: 'Facebook Marketplace',
        domains: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
        countries: ['PL', 'DE', 'US', 'GB', 'FR'], // Available globally
        url: 'https://www.facebook.com/marketplace',
        enabled: true,
        // Facebook Marketplace listing URLs:
        // - /marketplace/item/{id} - standard listing
        // - /commerce/listing/{id} - commerce listing variant
        // - /groups/{groupId}/permalink/{postId} - group posts (car sales)
        // - /groups/{groupId}/posts/{postId} - alternative group post format
        // Note: groupId can be numeric (123456789) or a slug (fordedgepl)
        offerPagePatterns: [
            /\/marketplace\/item\/\d+/,    // Standard marketplace item
            /\/commerce\/listing\/\d+/,    // Commerce listing variant
            /\/groups\/[\w.-]+\/permalink\/\d+/, // Group post (permalink format, alphanumeric group ID)
            /\/groups\/[\w.-]+\/posts\/\d+/,     // Group post (posts format, alphanumeric group ID)
        ],
        excludePatterns: [
            '/marketplace/search',
            '/marketplace/category/',
            '/marketplace/you/',
            '/marketplace/create/',
            '/marketplace?',
        ],
        // Facebook requires authentication and blocks fetch requests
        neverFetch: true,
    },
];

/**
 * Get all enabled marketplaces
 */
export const getEnabledMarketplaces = (): MarketplaceConfig[] => {
    return SUPPORTED_MARKETPLACES.filter(m => m.enabled);
};

/**
 * Get all domains from enabled marketplaces
 */
export const getSupportedDomains = (): string[] => {
    return getEnabledMarketplaces().flatMap(m => m.domains);
};

/**
 * Get marketplace display name from platform string
 * Converts platform identifiers like "www.otomoto.pl" or "otomoto.pl" to friendly names like "OTOMOTO"
 */
export const getMarketplaceDisplayName = (platform: string): string => {
    const normalizedPlatform = platform.toLowerCase().replace('www.', '');

    const marketplace = SUPPORTED_MARKETPLACES.find(m =>
        m.domains.some(d => d.toLowerCase().replace('www.', '') === normalizedPlatform) ||
        m.id.toLowerCase() === normalizedPlatform.replace('.pl', '').replace('.de', ''),
    );

    return marketplace?.name || platform;
};

/**
 * Check if a URL belongs to a supported marketplace domain
 * (Does not check if it's an offer page - use isOfferPage for that)
 *
 * @param url - The URL to check
 * @returns true if the URL is from a supported marketplace domain
 */
export const isSupportedMarketplace = (url: string): boolean => {
    if (!url) return false;

    try {
        const urlLower = url.toLowerCase();
        return getSupportedDomains().some(domain => urlLower.includes(domain.toLowerCase()));
    } catch {
        return false;
    }
};

/**
 * Check if a URL matches any of the given patterns
 */
const matchesPatterns = (url: string, patterns: (string | RegExp)[]): boolean => {
    const urlLower = url.toLowerCase();
    return patterns.some(pattern => {
        if (typeof pattern === 'string') {
            return urlLower.includes(pattern.toLowerCase());
        }
        return pattern.test(url);
    });
};

/**
 * Check if a URL is a specific offer/listing page (not a search or main page)
 *
 * @param url - The URL to check
 * @returns true if the URL appears to be a specific listing page
 */
export const isOfferPage = (url: string): boolean => {
    if (!url) return false;

    const marketplace = getMarketplaceForUrl(url);
    if (!marketplace) return false;

    // First check exclude patterns - if matched, it's definitely not an offer page
    if (marketplace.excludePatterns && matchesPatterns(url, marketplace.excludePatterns)) {
        // But make sure it doesn't also match an offer pattern (offer pattern takes precedence)
        if (!matchesPatterns(url, marketplace.offerPagePatterns)) {
            return false;
        }
    }

    // Check if URL matches any offer page patterns
    return matchesPatterns(url, marketplace.offerPagePatterns);
};

/**
 * Check if a URL is from a supported marketplace AND is a specific offer page
 * This is the main function to use for determining if the extension should activate
 *
 * @param url - The URL to check
 * @returns true if the URL is a trackable offer page
 */
export const isTrackableOfferPage = (url: string): boolean => {
    return isSupportedMarketplace(url) && isOfferPage(url);
};

/**
 * Get the marketplace config for a given URL
 *
 * @param url - The URL to check
 * @returns The marketplace config if found, null otherwise
 */
export const getMarketplaceForUrl = (url: string): MarketplaceConfig | null => {
    if (!url) return null;

    try {
        const urlLower = url.toLowerCase();
        return getEnabledMarketplaces().find(m =>
            m.domains.some(domain => urlLower.includes(domain.toLowerCase())),
        ) || null;
    } catch {
        return null;
    }
};


