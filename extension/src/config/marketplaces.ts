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
        m.id.toLowerCase() === normalizedPlatform.replace('.pl', '').replace('.de', '')
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
            m.domains.some(domain => urlLower.includes(domain.toLowerCase()))
        ) || null;
    } catch {
        return null;
    }
};

/**
 * Get a formatted list of example marketplaces for display
 *
 * @param maxExamples - Maximum number of examples to show
 * @returns Formatted string like "otomoto.pl, mobile.de"
 */
export const getMarketplaceExamples = (maxExamples: number = 2): string => {
    const enabled = getEnabledMarketplaces();
    const examples = enabled.slice(0, maxExamples);

    // Use the base domain (first in the domains array, without www)
    return examples
        .map(m => m.domains[0].replace('www.', ''))
        .join(', ');
};

/**
 * Get marketplace names for display
 *
 * @param maxNames - Maximum number of names to show
 * @returns Formatted string like "OTOMOTO, mobile.de, and more"
 */
export const getMarketplaceNames = (maxNames: number = 3): string => {
    const enabled = getEnabledMarketplaces();

    if (enabled.length <= maxNames) {
        return enabled.map(m => m.name).join(', ');
    }

    const shown = enabled.slice(0, maxNames).map(m => m.name).join(', ');
    const remaining = enabled.length - maxNames;
    return `${shown}, and ${remaining} more`;
};

/**
 * Get the primary URL for a marketplace (for linking)
 *
 * @param marketplaceId - The marketplace ID
 * @returns The URL or null if not found
 */
export const getMarketplaceUrl = (marketplaceId: string): string | null => {
    const marketplace = SUPPORTED_MARKETPLACES.find(m => m.id === marketplaceId);
    return marketplace?.url || null;
};

