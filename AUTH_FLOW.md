# MotorScope Authentication Flow

This document describes the authentication and data synchronization flow implemented in the MotorScope Chrome extension.

## Overview

The extension supports two storage modes:

1. **Logged-out mode**: Data is stored locally in `chrome.storage.local`
2. **Logged-in mode**: Data is stored remotely in the MotorScope backend API

## Storage Keys

### Authentication Keys

| Key | Description |
|-----|-------------|
| `authToken` | JWT token for backend API authentication |
| `userProfile` | User profile data (id, email, displayName) |

### Local App State Keys

| Key | Description |
|-----|-------------|
| `motorscope_listings` | Array of car listings (used in logged-out mode only) |
| `motorscope_settings` | Extension settings (always local) |
| `motorscope_gemini_key` | Gemini API key (always local) |
| `motorscope_refresh_status` | Background refresh status (always local) |

## Login Flow

```
┌─────────────────┐
│  User clicks    │
│  "Sign in"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Chrome Identity│
│  OAuth Flow     │
│  (Google)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Get ID Token   │
│  from Google    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send to Backend│
│  /api/auth/google│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend verifies│
│  and returns JWT│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store JWT &    │
│  user profile   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Check for      │ YES │  Show Merge     │
│  local data?    ├────►│  Dialog         │
└────────┬────────┘     └────────┬────────┘
         │ NO                    │
         │              ┌────────┴────────┐
         │              │                 │
         ▼              ▼                 ▼
┌─────────────────┐  ┌──────┐        ┌────────┐
│  Load remote    │  │Merge │        │Discard │
│  listings       │  │Data  │        │Local   │
└─────────────────┘  └──┬───┘        └───┬────┘
                        │                │
                        ▼                ▼
                   ┌──────────┐    ┌──────────┐
                   │Merge local│    │Clear     │
                   │& remote   │    │local data│
                   └────┬─────┘    └────┬─────┘
                        │               │
                        ▼               ▼
                   ┌──────────┐    ┌──────────┐
                   │Save merged│    │Load remote│
                   │to backend │    │listings   │
                   └────┬─────┘    └──────────┘
                        │
                        ▼
                   ┌──────────┐
                   │Clear local│
                   │listings   │
                   └──────────┘
```

## Merge Strategy

When the user chooses to merge local data into remote data, the following strategy is used:

### Deduplication

Listings are identified by their unique `id` field. The ID is either:
- VIN-based: `vin_<VIN>` for listings with a VIN
- URL-based: `url_<hash>` for listings without a VIN

### Conflict Resolution

When the same listing exists in both local and remote:

1. **Compare `lastSeenAt` timestamps** - the more recent listing is used as the base
2. **Merge price histories** - all price points from both sources are combined and deduplicated
3. **Preserve `firstSeenAt`** - the earliest timestamp is kept
4. **Keep all unique data** - VIN, seller phone, etc. are preserved from both sources

### Example

```typescript
// Local listing
{
  id: "vin_ABC123...",
  currentPrice: 50000,
  lastSeenAt: "2024-12-06T10:00:00Z",
  priceHistory: [
    { date: "2024-12-01", price: 52000 },
    { date: "2024-12-05", price: 50000 }
  ]
}

// Remote listing
{
  id: "vin_ABC123...",
  currentPrice: 51000,
  lastSeenAt: "2024-12-04T10:00:00Z",
  priceHistory: [
    { date: "2024-12-01", price: 52000 },
    { date: "2024-12-03", price: 51000 }
  ]
}

// Merged result (local is more recent)
{
  id: "vin_ABC123...",
  currentPrice: 50000,
  lastSeenAt: "2024-12-06T10:00:00Z",
  priceHistory: [
    { date: "2024-12-01", price: 52000 },
    { date: "2024-12-03", price: 51000 },
    { date: "2024-12-05", price: 50000 }
  ]
}
```

## Logout Flow

```
┌─────────────────┐
│  User clicks    │
│  "Log out"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Clear authToken│
│  & userProfile  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Clear Chrome   │
│  Identity cache │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Switch to      │
│  local storage  │
│  mode           │
└─────────────────┘
```

**Important**: Logout does NOT delete any data:
- Remote data remains in the backend
- Local settings and refresh status remain
- User starts fresh with an empty local listing set

## Error Handling

### Authentication Errors (401)

When the backend returns a 401 (Unauthorized):

1. The JWT is automatically cleared
2. User is switched to logged-out mode
3. An error message is shown: "Your session has expired. Please sign in again."

### Network Errors

Network errors show a user-friendly message in the UI without crashing the extension.

### OAuth Errors

OAuth errors (user cancels, network issues) are caught and displayed without affecting existing data.

## UI States

### Logged Out

```
┌─────────────────────────────────────┐
│  MotorScope          [Dashboard]    │
├─────────────────────────────────────┤
│  Not signed in        [Sign in]     │
├─────────────────────────────────────┤
│                                     │
│         (local content)             │
│                                     │
├─────────────────────────────────────┤
│  https://otomoto.pl/...             │
└─────────────────────────────────────┘
```

### Logged In

```
┌─────────────────────────────────────┐
│  MotorScope          [Dashboard]    │
├─────────────────────────────────────┤
│  Logged in as user@email   [Log out]│
├─────────────────────────────────────┤
│                                     │
│         (remote content)            │
│                                     │
├─────────────────────────────────────┤
│  https://otomoto.pl/...  ☁️ Cloud   │
└─────────────────────────────────────┘
```

### Merge Dialog

```
┌─────────────────────────────────────┐
│                                     │
│    ┌─────────────────────────┐      │
│    │   Local Data Found      │      │
│    │                         │      │
│    │   You have 5 listings   │      │
│    │   saved locally...      │      │
│    │                         │      │
│    │   [Merge Local Data]    │      │
│    │   [Discard Local Data]  │      │
│    │                         │      │
│    │   Discarding will       │      │
│    │   remove data forever   │      │
│    └─────────────────────────┘      │
│                                     │
└─────────────────────────────────────┘
```

## Security Considerations

1. **JWT Storage**: The backend JWT is stored in `chrome.storage.local`, which is only accessible to the extension itself.

2. **Token Expiration**: JWTs expire after 24 hours. Users must re-authenticate when the token expires.

3. **No Sensitive Data in Local Storage**: In logged-in mode, listing data is NOT stored locally - only in the backend.

4. **OAuth Token Caching**: Chrome caches OAuth tokens. On logout, we clear this cache to ensure a fresh authentication on next login.

## Files and Modules

### Auth Module (`extension/src/auth/`)

| File | Description |
|------|-------------|
| `config.ts` | Configuration constants for auth |
| `oauthClient.ts` | OAuth flow and token management |
| `AuthContext.tsx` | React context for auth state |

### API Client (`extension/src/api/`)

| File | Description |
|------|-------------|
| `client.ts` | Backend API client with auth |

### Updated Files

| File | Changes |
|------|---------|
| `manifest.json` | Added `identity` permission and `oauth2` config |
| `App.tsx` | Wrapped with `AuthProvider` |
| `context/AppContext.tsx` | Uses remote/local storage based on auth |
| `components/ExtensionPopup.tsx` | Login/logout UI and merge dialog |
| `services/storageService.ts` | Added `clearAllLocalListings` function |

