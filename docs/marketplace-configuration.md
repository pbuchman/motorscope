# Marketplace Configuration

This document describes how to configure supported car marketplaces in MotorScope.

## Overview

MotorScope supports multiple car marketplaces for tracking listings. The list of supported marketplaces is centralized in a configuration file, making it easy to:

- Add new marketplace support
- Enable/disable specific marketplaces
- Configure domain patterns for URL detection
- Define patterns to detect specific offer pages (vs search/main pages)
- Customize display names and URLs

## Key Concept: Offer Page Detection

MotorScope only activates on **specific offer/listing pages**, not on:
- Main/home pages
- Search results pages
- Category listings

This is controlled by `offerPagePatterns` and `excludePatterns` in the configuration.

## Configuration File

The marketplace configuration is located at:

```
extension/src/config/marketplaces.ts
```

## Adding a New Marketplace

To add support for a new car marketplace:

1. Open `extension/src/config/marketplaces.ts`
2. Add a new entry to the `SUPPORTED_MARKETPLACES` array:

```typescript
{
  id: 'new_marketplace',           // Unique identifier (snake_case)
  name: 'New Marketplace',         // Display name shown in UI
  domains: [                       // All domain variations to match
    'newmarketplace.com',
    'www.newmarketplace.com',
  ],
  countries: ['US', 'CA'],         // Country codes where it operates
  url: 'https://newmarketplace.com', // Base URL for links
  enabled: true,                   // Set to true to enable
  offerPagePatterns: [             // Patterns that identify a specific listing
    '/offer/',
    '/listing/',
    /\/vehicle\/\d+/,              // Regex patterns supported
  ],
  excludePatterns: [               // Patterns that identify NON-listing pages
    '/search',
    '/category/',
    '?page=',
  ],
}
```

3. Build the extension: `npm run build`

## Configuration Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the marketplace |
| `name` | string | Display name shown in the UI |
| `domains` | string[] | Domain patterns for URL detection (include www variants) |
| `countries` | string[] | Country codes where this marketplace operates |
| `url` | string | Base URL for the marketplace (used in UI links) |
| `enabled` | boolean | Whether this marketplace is currently enabled |
| `offerPagePatterns` | (string \| RegExp)[] | URL patterns that identify specific listings |
| `excludePatterns` | (string \| RegExp)[] | URL patterns that identify non-listing pages |

## Currently Supported Marketplaces

| Marketplace | Countries | Domains | Offer Pattern Example |
|-------------|-----------|---------|----------------------|
| OTOMOTO | Poland | otomoto.pl | `/oferta/` |
| Autoplac | Poland | autoplac.pl | `/ogloszenie/` |

## Offer Page Pattern Examples

### String Patterns

Simple string matching (case-insensitive):

```typescript
offerPagePatterns: [
  '/oferta/',      // Matches URLs containing "/oferta/"
  '/listing/',     // Matches URLs containing "/listing/"
]
```

### Regex Patterns

For complex matching:

```typescript
offerPagePatterns: [
  /\/osobowe\/oferta\//,  // Car offers on OTOMOTO
  /\/vehicle\/\d+/,       // URLs like /vehicle/12345
  /\/ad-\d+\.html$/,      // URLs ending in ad-12345.html
]
```

### Exclude Patterns

Prevent false positives:

```typescript
excludePatterns: [
  '/szukaj',       // Search pages
  '/kategoria/',   // Category pages
  '?page=',        // Paginated listings
  '/lista/',       // List views
]
```

## Disabling a Marketplace

To temporarily disable a marketplace without removing it:

```typescript
{
  id: 'marketplace_id',
  // ... other properties
  enabled: false,  // Set to false to disable
}
```

## Using Configuration in Code

The configuration can be accessed through these utility functions:

```typescript
import { 
  isSupportedMarketplace,    // Check if URL is from a supported domain
  isOfferPage,               // Check if URL is a specific listing page
  isTrackableOfferPage,      // Combined check (both above must be true)
  getEnabledMarketplaces,    // Get all enabled marketplaces
  getMarketplaceForUrl,      // Get marketplace config for a URL
} from '../config/marketplaces';

// Main function - use this to determine if extension should activate
const shouldActivate = isTrackableOfferPage(url);

// Individual checks
const isOnSupportedSite = isSupportedMarketplace(url);
const isOnListingPage = isOfferPage(url);

// Get marketplace info
const marketplace = getMarketplaceForUrl(url);
```

## UI Behavior

The extension shows different messages based on page type:

1. **On a trackable offer page**: Shows "Track this listing" with analysis UI
2. **On marketplace but not offer page**: "Navigate to a listing - Open a specific car listing to track it"
3. **Not on marketplace**: "No listing detected" with links to supported sites

## Best Practices

1. **Test offer patterns thoroughly**: Try actual listing URLs and search URLs
2. **Include all URL variations**: Some sites use different paths for different vehicle types
3. **Use regex for complex patterns**: When simple string matching isn't enough
4. **Define exclude patterns**: Prevent false positives on search/category pages
5. **Check URL structure**: Look at actual URLs on the marketplace to understand patterns

## Troubleshooting

### Extension not activating on listing page

1. Check URL contains a domain from `domains` array
2. Check URL matches at least one `offerPagePattern`
3. Check URL doesn't match any `excludePattern`
4. Use browser console to debug: `isTrackableOfferPage(window.location.href)`

### Extension activating on search results

1. Add the search URL pattern to `excludePatterns`
2. Make `offerPagePatterns` more specific

### Testing patterns

Use browser console on the marketplace:
```javascript
// Check if current page should activate extension
console.log('Is trackable:', isTrackableOfferPage(window.location.href));
console.log('Is offer page:', isOfferPage(window.location.href));
console.log('Marketplace:', getMarketplaceForUrl(window.location.href));
```

