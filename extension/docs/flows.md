# User Flows

## Authentication Flow

### Sign In

```
┌─────────┐     ┌──────────────┐     ┌─────────────────┐     ┌─────────┐
│  User   │────▶│ Click Sign   │────▶│ Google OAuth    │────▶│ Backend │
│         │     │ In Button    │     │ Consent Screen  │     │ /auth   │
└─────────┘     └──────────────┘     └─────────────────┘     └─────────┘
                                              │                    │
                                              │ Google Token       │ JWT Token
                                              ▼                    ▼
                                     ┌─────────────────┐  ┌──────────────┐
                                     │ Token Exchange  │──│ Store in     │
                                     │ with Backend    │  │ Chrome Store │
                                     └─────────────────┘  └──────────────┘
```

**Key Files:**

- `src/auth/AuthContext.tsx` - State management
- `src/auth/oauthClient.ts` - OAuth flow implementation
- `src/auth/storage.ts` - Token persistence

### Sign Out

1. User clicks logout button
2. `AuthContext.logout()` clears tokens
3. Backend notified to blacklist JWT
4. User redirected to login view

## Analyze & Save Listing Flow

### Step 1: Page Detection

```
User navigates to car listing page
         │
         ▼
┌──────────────────────┐
│ isTrackableOfferPage │──No──▶ Show "Navigate to listing" message
│    (URL check)       │
└──────────────────────┘
         │ Yes
         ▼
┌──────────────────────┐
│ Check if already     │──Yes─▶ Show SavedItemView
│    tracked           │
└──────────────────────┘
         │ No
         ▼
Show AnalyzePrompt
```

### Step 2: Analyze Page

```
User clicks "Analyze & Add to Watchlist"
         │
         ▼
┌──────────────────────┐
│ Refresh page content │  Re-scrape to get dynamically loaded data
│  usePageContent()    │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Call Gemini API      │  Extract vehicle specs, price, seller info
│ parseCarDataWithGemini│
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Show PreviewCard     │  User reviews extracted data
│ with warnings        │  Warnings for missing VIN/date
└──────────────────────┘
```

**Key Files:**

- `src/hooks/usePageContent.ts` - Page scraping
- `src/services/gemini/parse.ts` - Gemini prompting
- `src/components/popup/PreviewCard.tsx` - Preview UI

### Step 3: Save Listing

```
User clicks "Save"
         │
         ▼
┌──────────────────────┐
│ AppContext.addListing│  Save to backend via API
└──────────────────────┘
         │
         ▼
┌──────────────────────��
│ Update local state   │  Add to listings array
└──────────────────────┘
         │
         ▼
Show SavedItemView (success)
```

## Dashboard Flow

### Loading

```
Dashboard opens
         │
         ▼
┌──────────────────────┐
│ Check auth status    │──Not logged in──▶ Show LoginView
└──────────────────────┘
         │ Logged in
         ▼
┌──────────────────────┐
│ Load listings from   │  GET /api/listings
│     backend          │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Load dashboard prefs │  Filters, sort, view mode from settings
└──────────────────────┘
         │
         ▼
Display listings with applied filters
```

### Filtering & Sorting

```
User changes filter/sort
         │
         ▼
┌──────────────────────┐
│ Update local state   │  Immediate UI update
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Debounced save to    │  PUT /api/settings (1s debounce)
│     backend          │
└──────────────────────┘
```

**Filter Options:**

- Status (Active, Sold, Expired)
- Archive status
- Make (multi-select)
- Model (multi-select)
- Source marketplace (multi-select)

### Refresh Listing

```
User clicks refresh on a card
         │
         ▼
┌──────────────────────┐
│ Fetch latest page    │  HTTP fetch of listing URL
│     content          │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Parse with Gemini    │  Extract current price, status
└──────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Update price history if changed  │
│ Update status if changed         │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Save to backend      │  PUT /api/listings/:id
└──────────────────────┘
```

**Key Files:**

- `src/services/refresh/refreshListing.ts` - Refresh logic
- `src/services/refresh/priceHistory.ts` - Price tracking
- `src/components/CarCard.tsx` - Refresh UI

## Background Refresh Flow

```
Chrome alarm triggers (every N minutes)
         │
         ▼
┌──────────────────────┐
│ Check authentication │──Not valid──▶ Try silent login
└──────────────────────┘
         │ Valid
         ▼
┌──────────────────────┐
│ Fetch listings from  │  Only non-archived listings
│     backend          │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Sort by priority     │  Older lastSeenAt = higher priority
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Refresh each listing │  With rate limiting
│   sequentially       │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Update refresh status│  Store in session storage
│ (progress tracking)  │
└──────────────────────┘
```

**Key Files:**

- `src/background.ts` - Service worker
- `src/services/refresh/sorter.ts` - Priority sorting

## Settings Flow

### Update Gemini API Key

```
User enters API key
         │
         ▼
┌──────────────────────┐
│ Validate key format  │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Save to backend      │  PUT /api/settings
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Update AppContext    │  settings.geminiApiKey
└──────────────────────┘
```

### Manual Refresh All

```
User clicks "Sync Now"
         │
         ▼
┌──────────────────────┐
│ Send message to      │  TRIGGER_MANUAL_REFRESH
│ background script    │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Background starts    │  Updates refresh status
│ refresh cycle        │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Settings page        │  Via storage listener
│ shows progress       │
└──────────────────────┘
```

