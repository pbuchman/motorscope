// filepath: /Users/p.buchman/personal/motorscope/extension/src/utils/formatters.ts

/**
 * Helper function to get common date parts
 */
const getDateParts = (date: string | number) => {
    const d = new Date(date);
    return {
        day: d.getDate().toString().padStart(2, '0'),
        month: (d.getMonth() + 1).toString().padStart(2, '0'),
        year: d.getFullYear(),
        hours: d.getHours().toString().padStart(2, '0'),
        minutes: d.getMinutes().toString().padStart(2, '0'),
        seconds: d.getSeconds().toString().padStart(2, '0'),
    };
};

/**
 * Format date in European format: DD/MM/YYYY HH:mm
 */
export const formatEuropeanDateTime = (date: string | number): string => {
    const {day, month, year, hours, minutes} = getDateParts(date);
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format date in European format with seconds: DD/MM/YYYY HH:mm:ss
 */
export const formatEuropeanDateTimeWithSeconds = (date: string | number): string => {
    const {day, month, year, hours, minutes, seconds} = getDateParts(date);
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format date in short European format: DD/MM
 */
export const formatEuropeanDateShort = (date: string | number): string => {
    const {day, month} = getDateParts(date);
    return `${day}/${month}`;
};

/**
 * Normalize URL by removing query parameters.
 * Handles marketplace-specific URL cleaning:
 * - Facebook Marketplace: extracts clean marketplace/item or commerce/listing URL
 * - Facebook Groups: extracts clean group/permalink URL
 * - Others: strips query params and hash
 */
export const normalizeUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);

        // Facebook-specific URL cleaning
        if (urlObj.hostname.includes('facebook.com')) {
            // Marketplace item or commerce listing
            const marketplaceMatch = urlObj.pathname.match(/\/(marketplace\/item|commerce\/listing)\/(\d+)/);
            if (marketplaceMatch) {
                return `${urlObj.origin}/${marketplaceMatch[1]}/${marketplaceMatch[2]}`;
            }

            // Group posts (permalink or posts format) - groupId can be numeric or slug
            const groupMatch = urlObj.pathname.match(/\/groups\/([\w.-]+)\/(permalink|posts)\/(\d+)/);
            if (groupMatch) {
                return `${urlObj.origin}/groups/${groupMatch[1]}/permalink/${groupMatch[3]}`;
            }
        }

        return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
        return url;
    }
};

/**
 * Validate VIN number - must be exactly 17 alphanumeric characters (excluding I, O, Q)
 */
export const isValidVin = (vin: string | undefined | null): boolean => {
    if (!vin || typeof vin !== 'string') return false;
    const cleaned = vin.trim().toUpperCase();
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(cleaned);
};

/**
 * Clean and validate VIN - returns valid VIN or undefined
 */
export const cleanVin = (vin: string | undefined | null): string | undefined => {
    if (!vin || typeof vin !== 'string') return undefined;
    const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    return isValidVin(cleaned) ? cleaned : undefined;
};


/**
 * Extract Facebook listing ID from URL (marketplace item, commerce listing, or group post)
 */
export const extractFacebookListingId = (url: string): string | null => {
    try {
        const urlObj = new URL(url);

        // Marketplace item or commerce listing
        const marketplaceMatch = urlObj.pathname.match(/\/(marketplace\/item|commerce\/listing)\/(\d+)/);
        if (marketplaceMatch) {
            return marketplaceMatch[2];
        }

        // Group post (extract post ID, not group ID) - groupId can be numeric or slug
        const groupMatch = urlObj.pathname.match(/\/groups\/[\w.-]+\/(permalink|posts)\/(\d+)/);
        if (groupMatch) {
            return groupMatch[2];
        }

        return null;
    } catch {
        return null;
    }
};

/**
 * Check if URL is a Facebook Marketplace listing (including group posts)
 */
export const isFacebookMarketplaceUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        if (!urlObj.hostname.includes('facebook.com')) {
            return false;
        }

        return urlObj.pathname.includes('/marketplace/item/') ||
            urlObj.pathname.includes('/commerce/listing/') ||
            /\/groups\/[\w.-]+\/(permalink|posts)\/\d+/.test(urlObj.pathname);
    } catch {
        return false;
    }
};

/**
 * Check if URL is specifically a Facebook Group post (not marketplace item)
 */
export const isFacebookGroupPost = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('facebook.com') &&
            /\/groups\/[\w.-]+\/(permalink|posts)\/\d+/.test(urlObj.pathname);
    } catch {
        return false;
    }
};

