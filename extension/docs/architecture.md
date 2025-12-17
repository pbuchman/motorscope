# Extension Architecture

## Overview

MotorScope is a Chrome extension built with React and TypeScript. It follows a layered architecture separating UI
components, business logic services, and data access.

```
┌──────────────────────────────────────────────────────────────┐
│                     Chrome Extension                          │
├──────────────────────────────────────────────────────────────┤
│  Views (React Components)                                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ Popup   │  │Dashboard │  │ Settings │                     │
│  └────┬────┘  └────┬─────┘  └────┬─────┘                     │
│       │            │              │                           │
├───────┴────────────┴──────────────┴──────────────────────────┤
│  State Management (React Context)                             │
│  ┌───────────────┐  ┌───────────────┐                        │
│  │ AuthContext   │  │  AppContext   │                        │
│  └───────────────┘  └───────────────┘                        │
├──────────────────────────────────────────────────────────────┤
│  Custom Hooks                                                 │
│  ┌────────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  │useChromeMessaging│usePageContent │ │useExtensionNavigation│
│  └────────────────┘ └───────────────┘ └───────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  Services (Business Logic)                                    │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐              │
│  │  Gemini   │  │  Refresh   │  │  Settings  │              │
│  │  Service  │  │  Service   │  │  Service   │              │
│  └───────────┘  └────────────┘  └────────────┘              │
├──────────────────────────────────────────────────────────────┤
│  Data Layer                                                   │
│  ┌───────────────┐  ┌────────────────────┐                   │
│  │ API Client    │  │ Chrome Storage     │                   │
│  │ (Backend)     │  │ (Session/Local)    │                   │
│  └───────────────┘  └────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

## Layers

### 1. Views (React Components)

Located in `src/components/`, these are pure presentational components.

**Organization:**

- `ui/` - Shared atomic UI components (buttons, spinners, badges)
- `popup/` - Components specific to the popup view
- `dashboard/` - Components specific to the dashboard view
- Root level - Page-level and complex components

**Key Components:**

- `ExtensionPopup` - Main popup UI, handles analyze flow
- `Dashboard` - Full listing management view
- `SettingsPage` - Configuration and API key management
- `CarCard` / `CarCardCompact` - Listing display cards

### 2. State Management

**AuthContext (`src/auth/AuthContext.tsx`)**

- Manages authentication state (logged_in, logged_out, loading)
- Provides login/logout functions
- Stores user info and JWT token

**AppContext (`src/context/AppContext.tsx`)**

- Manages application data (listings, settings, refresh status)
- Handles API calls for CRUD operations
- Provides loading and error states

### 3. Custom Hooks

Located in `src/hooks/`:

| Hook                     | Purpose                              |
|--------------------------|--------------------------------------|
| `useChromeMessaging`     | Send/receive Chrome runtime messages |
| `useMessageListener`     | Subscribe to runtime messages        |
| `useStorageListener`     | Subscribe to storage changes         |
| `useCurrentTab`          | Get current browser tab info         |
| `usePageContent`         | Scrape page content from current tab |
| `useExtensionNavigation` | Navigate to extension pages          |

### 4. Services

Located in `src/services/`:

**Gemini Service (`gemini/`)**

- AI-powered car data extraction
- Handles Gemini API calls
- Manages prompts and response parsing

**Refresh Service (`refresh/`)**

- Listing data refresh logic
- Price history updates
- Status change detection

**Settings Service (`settings/`)**

- Extension configuration management
- Refresh status tracking
- Gemini API statistics

### 5. Data Layer

**API Client (`src/api/client.ts`)**

- Authenticated requests to backend
- Handles JWT token injection
- Error handling for auth failures

**Chrome Storage (`src/services/extensionStorage.ts`)**

- Wrapper around `chrome.storage` API
- Session storage for runtime state
- Local storage for persistent data

## Data Flow

### Reading Data

```
Component → Context Hook → API Client → Backend
              ↓
         State Update
              ↓
Component Re-render
```

### Writing Data

```
User Action → Component Handler → Context Action → API Client → Backend
                                       ↓
                              Local State Update
                                       ↓
                              Component Re-render
```

### Chrome Messaging

```
Popup/Dashboard → sendMessage() → Background Script
                       ↓
              Process & Respond
                       ↓
              Update Storage
                       ↓
useStorageListener → State Update → Re-render
```

## Authentication Flow

1. User clicks "Sign in with Google"
2. `AuthContext.login()` called
3. OAuth flow via `chrome.identity.launchWebAuthFlow`
4. Google token exchanged with backend for JWT
5. JWT stored in Chrome storage
6. Auth state updated to `logged_in`
7. Components re-render with user data

## Configuration

**Marketplace Config (`src/config/marketplaces.ts`)**

- Defines supported car marketplaces
- URL patterns for offer detection
- Domain matching rules
- Background tab configuration for marketplaces with restrictions (e.g., Cloudflare, Facebook)

Supported marketplaces:
- **OTOMOTO**: Polish car marketplace (otomoto.pl)
- **Autoplac**: Polish car marketplace (autoplac.pl)
- **Facebook Marketplace**: Marketplace items and commerce listings
- **Facebook Groups**: Buy/sell group posts

**Facebook-specific handling:**
- Group post URLs (`/groups/{id}/permalink/{postId}`, `/groups/{id}/posts/{postId}`) are supported
- `neverFetch: true` - Facebook blocks server-side requests, requires background tab
- URL normalization strips tracking parameters

**Prompt Templates (`src/services/gemini/prompts.ts`)**

The Gemini prompt builder includes marketplace-specific extraction rules:

- **OTOMOTO/Autoplac**: Standard extraction with Polish date parsing
- **Facebook Marketplace**: 
  - Uses "Informacje o pojeździe" structured data + "Opis sprzedawcy" description
  - Handles invalid data (e.g., "-1.0 L" engine capacity)
  - Relative date conversion ("2 tygodnie temu" → ISO timestamp)
- **Facebook Groups**: 
  - Parses unstructured post text
  - Extracts VIN, price, mileage from Polish patterns
  - Supports common Polish car listing patterns (e.g., "Cena:", "Przebieg:", "VIN:")

**Auth Config (`src/auth/config.ts`)**

- OAuth client ID
- Backend API URLs
- Endpoint paths

## Background Script

The background script (`src/background.ts`) runs as a service worker:

- **Periodic Refresh**: Uses Chrome alarms to refresh listings
- **Auth Monitoring**: Checks token validity
- **Message Handling**: Responds to popup/dashboard messages
- **API Communication**: Direct backend calls for background tasks

