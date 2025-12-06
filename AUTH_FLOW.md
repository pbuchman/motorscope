# MotorScope Authentication Flow

This document describes the authentication system implemented in the MotorScope Chrome extension.

## Overview

The authentication system uses a two-token approach:
1. **Google OAuth Token**: Short-lived access token from `chrome.identity.getAuthToken()`
2. **Backend JWT**: Session token issued by the MotorScope backend after verifying Google token

### Key Behaviors

- **First Login**: Google OAuth consent screen appears, user authenticates
- **Subsequent Sessions**: JWT is validated locally; if valid, no Google call needed
- **JWT Expired**: Silent re-authentication using cached Google token
- **Silent Auth Fails**: User must re-login interactively

## Storage Schema

### Authentication Keys

| Key | Type | Description |
|-----|------|-------------|
| `motorscope_auth_token` | `string` | Backend JWT for API authentication |
| `motorscope_auth_user` | `User` | User profile (id, email, displayName) |
| `motorscope_auth_stored_at` | `number` | Unix timestamp when auth was stored |

### User Type

```typescript
interface User {
  id: string;
  email: string;
  displayName?: string;
  picture?: string;
}
```

### JWT Payload

```typescript
interface JwtPayload {
  userId: string;
  email: string;
  iat: number;  // Issued at (Unix timestamp)
  exp: number;  // Expiration (Unix timestamp)
}
```

## Authentication Flows

### Startup Flow

```
┌─────────────────────┐
│  Extension Starts   │
│  (popup/background) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Read stored JWT    │
│  from storage       │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │ JWT       │
     │ exists?   │
     └─────┬─────┘
       NO  │  YES
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌─────────────────┐
│LOGGED   │  │  Validate JWT   │
│OUT      │  │  (check exp)    │
└─────────┘  └────────┬────────┘
                      │
              ┌───────┴───────┐
              │ JWT valid?    │
              └───────┬───────┘
                YES   │   NO
              ┌───────┴───────┐
              │               │
              ▼               ▼
        ┌─────────┐    ┌─────────────────┐
        │LOGGED   │    │  Try Silent     │
        │IN       │    │  Login          │
        └─────────┘    └────────┬────────┘
                                │
                       ┌────────┴────────┐
                       │ Silent success? │
                       └────────┬────────┘
                           YES  │  NO
                       ┌────────┴────────┐
                       │                 │
                       ▼                 ▼
                 ┌─────────┐       ┌─────────┐
                 │LOGGED   │       │LOGGED   │
                 │IN       │       │OUT      │
                 └─────────┘       └─────────┘
```

### Interactive Login Flow

```
┌─────────────────┐
│  User clicks    │
│  "Sign in"      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  chrome.identity.getAuthToken│
│  { interactive: true }       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Google OAuth consent       │
│  (first time only)          │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  POST /api/auth/google      │
│  { accessToken: ... }       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Backend verifies token,    │
│  returns { jwt, user }      │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Store JWT + user in        │
│  chrome.storage.local       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Check for local listings   │
│  to potentially merge       │
└────────────┬────────────────┘
             │
       (merge flow)
             │
             ▼
┌─────────────────────────────┐
│  LOGGED IN                  │
└─────────────────────────────┘
```

### Silent Login Flow

Used when JWT is expired but Google token might still be valid in Chrome's cache.

```
┌─────────────────────────────┐
│  JWT expired, try silent    │
│  re-authentication          │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  chrome.identity.getAuthToken│
│  { interactive: false }      │
└────────────┬────────────────┘
             │
       ┌─────┴─────┐
       │  Token    │
       │  returned?│
       └─────┬─────┘
         YES │  NO
       ┌─────┴─────┐
       │           │
       ▼           ▼
┌─────────────┐  ┌─────────────┐
│ POST to     │  │ Return null │
│ backend     │  │ (need       │
│ /auth/google│  │ interactive)│
└──────┬──────┘  └─────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Store new JWT + user       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Return { user, token }     │
└─────────────────────────────┘
```

### Logout Flow

```
┌─────────────────┐
│  User clicks    │
│  "Log out"      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Clear JWT + user from      │
│  chrome.storage.local       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  chrome.identity            │
│  .removeCachedAuthToken()   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Revoke token with Google   │
│  (optional, best-effort)    │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Clear local listings       │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  LOGGED OUT                 │
└─────────────────────────────┘
```

## Background Service Worker

The background service worker handles:

1. **Periodic Auth Check**: Every 5 minutes, checks if JWT is expired and attempts silent refresh
2. **API Request Auth**: Attaches JWT to all backend API requests
3. **Auth State Change Events**: Notifies UI components when auth state changes

### Auth Check Alarm

```javascript
// Runs every 5 minutes
chrome.alarms.create('motorscope_auth_check', {
  delayInMinutes: 5,
  periodInMinutes: 5,
});
```

## JWT Validation

JWT validation is done client-side by decoding and checking expiration:

```typescript
const isJwtExpired = (token: string, leewaySeconds = 60): boolean => {
  const payload = decodeJwt(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = payload.exp - leewaySeconds;
  
  return now >= expiresAt;
};
```

The `leewaySeconds` (default: 60) prevents edge cases where the token expires between check and use.

## Merge Strategy

When logging in with existing local data:

### User Choices

1. **Merge**: Combines local and remote listings, saves to backend, clears local
2. **Discard**: Clears local listings, uses remote data only

### Merge Algorithm

- Listings are identified by their unique `id` field
- When same listing exists in both:
  - Use more recent `lastSeenAt` as base
  - Merge price histories (deduplicated by date+price)
  - Preserve earliest `firstSeenAt`

## Error Handling

### 401 Unauthorized

When backend returns 401:
1. Clear stored JWT
2. Attempt silent re-login
3. If silent fails, show login button

### Network Errors

- Retry with exponential backoff
- Show user-friendly error message
- Allow offline mode for read operations

## Manual Testing Checklist

### First Login

1. Clear extension data
2. Click "Sign in"
3. Verify Google consent screen appears
4. Complete Google auth
5. Verify JWT + user stored in chrome.storage.local
6. Verify "Logged in as {email}" appears in UI

### Subsequent Login (JWT Valid)

1. Close and reopen extension popup
2. Verify no Google consent screen
3. Verify immediately shows "Logged in as {email}"

### JWT Expired, Silent Refresh Works

1. Manually set JWT exp to past (in dev tools)
2. Close and reopen popup
3. Verify silent refresh happens (no consent screen)
4. Verify new JWT stored

### JWT Expired, Silent Refresh Fails

1. Log in to extension
2. Revoke app access at https://myaccount.google.com/permissions
3. Manually expire JWT
4. Reopen popup
5. Verify shows "Sign in" button

### Logout

1. Click logout
2. Verify JWT + user cleared from storage
3. Verify shows "Sign in" button
4. Click "Sign in" again
5. May need to consent again (depending on Google's token cache)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BACKEND_BASE_URL` | Backend API URL | `https://motorscope-dev.run.app` |
| `JWT_EXP_LEEWAY_SECONDS` | Seconds before exp to consider token expired | `60` |

## File Structure

```
extension/src/auth/
├── types.ts         # TypeScript types for auth
├── config.ts        # Auth configuration constants
├── storage.ts       # Chrome storage utilities
├── jwt.ts           # JWT decode/validate utilities
├── googleAuth.ts    # Google OAuth via chrome.identity
├── oauthClient.ts   # Main auth orchestrator
├── AuthContext.tsx  # React context provider
└── __tests__/
    └── auth.test.ts # Jest tests
```

