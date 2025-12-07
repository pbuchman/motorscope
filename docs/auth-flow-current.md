# Current Authentication Flow

## Overview

The MotorScope extension uses a **two-token architecture**:

1. **Google Access Token**: Short-lived token obtained via `chrome.identity.getAuthToken()`
2. **Backend JWT**: Session token issued by the MotorScope API after verifying the Google token

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

## Current Login Flow

### 1. First-time Login (Interactive)

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
│ Google OAuth consent screen         │
│ (if no prior consent exists)        │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Return Google access token          │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ POST /api/auth/google               │
│ Body: { accessToken: "..." }        │
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
└────────────────┬────────────────────┘
                 │
                 ▼
         USER LOGGED IN
```

### 2. Subsequent Session (JWT Valid)

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
│ Validate JWT expiration client-side │
│ (with 60s leeway)                   │
└────────────────┬────────────────────┘
                 │
         JWT valid?
        /         \
      YES          NO
       │            │
       ▼            ▼
  LOGGED IN    Try silent login
```

### 3. Silent Re-authentication (JWT Expired)

```
JWT expired
         │
         ▼
┌─────────────────────────────────────┐
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
 POST to backend    │
       │            │
       ▼            │
 Store new JWT      │
       │            │
       ▼            ▼
  LOGGED IN    LOGGED OUT
               (need interactive)
```

### 4. Logout Flow

```
User clicks "Log out"
         │
         ▼
┌─────────────────────────────────────┐
│ Get current Google token            │
│ (interactive: false)                │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ chrome.identity.removeCachedAuthToken()  │
│ (removes from Chrome's cache)       │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ ⚠️ PROBLEM: Revoke token with Google │
│ accounts.google.com/o/oauth2/revoke │
│ This REVOKES USER CONSENT!          │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│ Clear JWT + user from               │
│ chrome.storage.session              │
└────────────────┬────────────────────┘
                 │
                 ▼
         LOGGED OUT
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

Authenticates user with Google token and returns JWT.

**Request:**
```json
{
  "accessToken": "<google-access-token>"
}
```

**Response:**
```json
{
  "token": "<backend-jwt>",
  "user": {
    "id": "google_<sub>",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

## Token Lifetimes

| Token | Lifetime | Storage |
|-------|----------|---------|
| Google Access Token | ~1 hour | Chrome's identity cache |
| Backend JWT | 24 hours | `chrome.storage.session` |

## Configuration

### Manifest (MV3)

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "663051224718-nj03sld1761g1oicnngk1umj0ob717qe.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```

### Backend Environment Variables

- `OAUTH_CLIENT_ID`: Same client ID as manifest
- `JWT_SECRET`: Secret for signing JWTs
- `JWT_EXPIRATION`: "24h"

