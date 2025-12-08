# MotorScope Chrome Extension

A Chrome extension for tracking car listings across supported marketplaces. Monitor price changes, save vehicle specs, and sync across devices.

## Project Structure

```
extension/
├── src/
│   ├── api/                    # API client for backend communication
│   │   └── client.ts           # Authenticated API requests
│   │
│   ├── auth/                   # Authentication module
│   │   ├── AuthContext.tsx     # React context for auth state
│   │   ├── config.ts           # OAuth configuration
│   │   ├── googleAuth.ts       # Google OAuth helpers
│   │   ├── jwt.ts              # JWT token handling
│   │   ├── oauthClient.ts      # OAuth client implementation
│   │   ├── storage.ts          # Token storage utilities
│   │   └── types.ts            # Auth-related types
│   │
│   ├── components/             # React components
│   │   ├── ui/                 # Shared UI components
│   │   │   ├── GoogleLogo.tsx  # Google sign-in button logo
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── StatusBadge.tsx
│   │   │
│   │   ├── popup/              # Popup-specific components
│   │   │   ├── LoginView.tsx
│   │   │   ├── NoListingView.tsx
│   │   │   ├── PreviewCard.tsx
│   │   │   ├── SavedItemView.tsx
│   │   │   ├── AnalyzePrompt.tsx
│   │   │   └── PopupHeader.tsx
│   │   │
│   │   ├── dashboard/          # Dashboard components (future)
│   │   │
│   │   ├── CarCard.tsx         # Full car listing card
│   │   ├── CarCardCompact.tsx  # Compact list view card
│   │   ├── Dashboard.tsx       # Main dashboard view
│   │   ├── DashboardFilters.tsx # Filter/sort controls
│   │   ├── ErrorBoundary.tsx   # Error handling wrapper
│   │   ├── ExtensionPopup.tsx  # Main popup component
│   │   ├── PriceChart.tsx      # Price history chart
│   │   └── SettingsPage.tsx    # Settings/configuration page
│   │
│   ├── config/                 # Application configuration
│   │   ├── index.ts            # Config exports
│   │   └── marketplaces.ts     # Supported marketplace definitions
│   │
│   ├── context/                # React contexts
│   │   └── AppContext.tsx      # Main app state management
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── index.ts            # Hook exports
│   │   ├── useChromeMessaging.ts  # Chrome extension messaging
│   │   ├── useCurrentTab.ts    # Current tab info hook
│   │   ├── useExtensionNavigation.ts  # Extension page navigation
│   │   └── usePageContent.ts   # Page content scraping hook
│   │
│   ├── services/               # Business logic services
│   │   ├── gemini/             # Gemini AI integration
│   │   ├── refresh/            # Listing refresh logic
│   │   ├── settings/           # Settings management
│   │   ├── extensionStorage.ts # Chrome storage wrapper
│   │   ├── geminiService.ts    # Gemini service exports
│   │   ├── refreshService.ts   # Refresh service exports
│   │   └── settingsService.ts  # Settings service exports
│   │
│   ├── styles/                 # CSS styles
│   │   └── tailwind.css        # Tailwind CSS imports
│   │
│   ├── utils/                  # Utility functions
│   │   └── formatters.ts       # Date/URL/VIN formatting
│   │
│   ├── content-scripts/        # Content scripts for page injection
│   │   └── otomoto-main.ts     # OTOMOTO page integration
│   │
│   ├── App.tsx                 # Main app component with routing
│   ├── background.ts           # Service worker (background script)
│   ├── global.d.ts             # Global type declarations
│   ├── index.tsx               # React entry point
│   └── types.ts                # Shared TypeScript types
│
├── docs/                       # Documentation
│   ├── architecture.md         # Architecture overview
│   ├── flows.md                # User flow documentation
│   ├── conventions.md          # Coding conventions
│   └── car-listing-schema.json # Listing data schema
│
├── dist/                       # Build output
├── coverage/                   # Test coverage reports
├── index.html                  # HTML template
├── manifest.json               # Chrome extension manifest
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
└── vite.config.ts              # Vite build config
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
cd extension
npm install
```

### Development Build

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Running Tests

```bash
npm test
```

### Loading in Chrome

1. Build the extension (`npm run build`)
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` folder

## Entry Points

### Popup (`?view=popup`)
- Opens when clicking the extension icon
- Allows analyzing and saving car listings
- Shows tracked item details if on a saved listing

### Dashboard (`?view=dashboard`)
- Full-page view of all tracked listings
- Filter, sort, and search functionality
- Grid and compact view modes

### Settings (`?view=settings`)
- Configure Gemini API key
- Set refresh frequency
- View API usage statistics

### Background Script
- Handles periodic listing refreshes
- Manages Chrome alarms
- Syncs data with backend API

## Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Chrome Extension APIs** - Browser integration
- **Google Gemini AI** - Car data extraction

