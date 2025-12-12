# Authentication Flow

## Overview

MotorScope uses a **two-token architecture**:

1. **Google Access Token**: Short-lived token obtained via `chrome.identity.getAuthToken()`
2. **Backend JWT**: Session token (24h expiry) issued by the MotorScope API after verifying the Google token

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Chrome         │     │   MotorScope    │     │     Google      │
│  Extension      │────▶│   Backend API   │────▶│    OAuth API    │
│  (React + SW)   │     │   (Express)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Key Files

### Extension (`./extension/src/auth/`)

| File | Purpose |
|------|---------|
| `googleAuth.ts` | Google OAuth via `chrome.identity.getAuthToken()` |
| `oauthClient.ts` | Main auth orchestrator combining Google + backend JWT |
| `AuthContext.tsx` | React context for auth state management |
| `storage.ts` | Chrome session storage wrapper for auth data |
| `jwt.ts` | JWT validation/parsing utilities |
| `config.ts` | Auth configuration constants |
| `types.ts` | TypeScript types for auth |

### Backend API (`./api/src/`)

| File | Purpose |
|------|---------|
| `auth.ts` | Google token verification + JWT generation |
| `routes.ts` | Auth endpoints (`POST /api/auth/google`) |
| `config.ts` | Configuration including OAuth client ID |

## Flows

### 1. First-Time User Login

```
User clicks "Sign in with Google"
         │
         ▼
┌─────────────────────────────────────┐
│ chrome.identity.getAuthToken({      │
│   interactive: true                 │
│ })                                  │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Google shows consent screen         │
│ (ONLY if no prior consent)          │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ POST /api/auth/google               │
│ { accessToken: "..." }              │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Backend verifies token via          │
│ googleapis.com/oauth2/v3/userinfo   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Backend issues JWT (24h expiry)     │
│ Returns { token, user }             │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Store JWT + user in                 │
│ chrome.storage.session              │
└─────────────────────────────────────┘
                 │
                 ▼
         USER LOGGED IN
```

### 2. Returning User (Valid Session)

```
Extension opens
         │
         ▼
┌─────────────────────────────────────┐
│ Read stored JWT from                │
│ chrome.storage.session              │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Validate JWT expiration locally     │
│ (with 60s leeway)                   │
└────────────────┬────────────────────┘
                 │
         JWT valid?
        /         \
      YES          NO
       │            │
       ▼            ▼
  LOGGED IN    (go to expired flow)
```

### 3. Returning User (Expired Session)

```
JWT expired locally
         │
         ▼
┌─────────────────────────────────────┐
│ Try silent Google token             │
│ chrome.identity.getAuthToken({      │
│   interactive: false                │
│ })                                  │
└────────────────┬────────────────────┘
                 │
         Token returned?
        /         \
      YES          NO
       │            │
       ▼            │
 POST /api/auth/google
       │            │
       ▼            │
 Store new JWT      │
       │            │
       ▼            ▼
  LOGGED IN    LOGGED OUT
               (user must click login)
```

### 4. Logout Flow

```
User clicks "Log out"
         │
         ▼
┌─────────────────────────────────────┐
│ Clear stored JWT + user from        │
│ chrome.storage.session              │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Get current Google token            │
│ (if exists in cache)                │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ chrome.identity.removeCachedAuthToken()  │
│ (Remove from Chrome cache ONLY)     │
│                                     │
│ ✅ DO NOT revoke with Google!       │
│ (preserves user's consent grant)    │
└────────────────┬────────────────────┘
                 │
                 ▼
         LOGGED OUT
```

### 5. Re-login After Logout

```
User clicks "Sign in" after logout
         │
         ▼
┌─────────────────────────────────────┐
│ Try silent login first              │
└────────────────┬────────────────────┘
                 │
         Silent success?
        /         \
      YES          NO
       │            │
       ▼            ▼
  LOGGED IN    Interactive login
                    │
                    ▼
              ┌──────────────────┐
              │ Google shows:    │
              │ - Account picker │
              │   (NOT consent!) │
              └────────┬─────────┘
                       │
                       ▼
                  LOGGED IN
```

## Storage Schema

Authentication data is stored in `chrome.storage.session`:

```typescript
{
  motorscope_auth_token: string;     // Backend JWT
  motorscope_auth_user: {            // User profile
    id: string;
    email: string;
    displayName?: string;
  };
  motorscope_auth_stored_at: number; // Unix timestamp
}
```

**Important**: Session storage is cleared when browser closes.

## Backend API Endpoints

### `POST /api/auth/google`

Exchange Google access token for backend JWT.

**Request:**
```json
{
  "accessToken": "ya29.xxx..."
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "google-sub-id",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

## Background Service Worker

The background worker (`background.ts`) handles:

- **Auth check alarm**: Runs every 5 minutes to refresh expired tokens silently
- **Token refresh on startup**: Checks and refreshes auth on `chrome.runtime.onStartup`

See `checkAndRefreshAuth()` and `scheduleAuthCheck()` in `background.ts`.

