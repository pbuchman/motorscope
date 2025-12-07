# Target Authentication Flow

## Design Goals

1. **First-time user**: See consent screen once, get logged in
2. **Returning user with valid session**: Instant login, no OAuth window
3. **Returning user with expired session**: Silent refresh or account picker (NOT consent)
4. **After logout**: Account picker on next login (NOT consent screen)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXTENSION LAYER                                │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │ AuthContext  │────▶│ oauthClient  │────▶│ googleAuth               │ │
│  │ (React)      │     │ (orchestrator)│     │ (chrome.identity API)    │ │
│  └──────────────┘     └──────────────┘     └──────────────────────────┘ │
│         │                    │                                           │
│         │                    ▼                                           │
│         │             ┌──────────────┐                                   │
│         │             │   storage    │                                   │
│         │             │ (session)    │                                   │
│         │             └──────────────┘                                   │
│         │                                                                │
└─────────┼────────────────────────────────────────────────────────────────┘
          │
          ▼ HTTP
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         API Routes                                │   │
│  │  POST /api/auth/google  - Exchange Google token for JWT          │   │
│  │  GET  /api/auth/me      - Validate session, return user (NEW)    │   │
│  │  POST /api/auth/logout  - Invalidate session (optional, NEW)     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│                                  ▼                                       │
│                          ┌──────────────┐                                │
│                          │   auth.ts    │                                │
│                          │ (JWT + verify)│                               │
│                          └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Flows

### 1. First-Time User Login

```
User clicks "Sign in with Google"
         │
         ▼
┌─────────────────────────────────────┐
│ Check stored auth data              │
│ (chrome.storage.session)            │
└────────────────┬────────────────────┘
                 │
         Data exists?
        /         \
      NO           YES (skip to session check)
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
│ Store JWT + user in session storage │
└────────────────┬────────────────────┘
                 │
                 ▼
         USER LOGGED IN
```

### 2. Returning User (Valid Session)

```
Extension opens / popup opens
         │
         ▼
┌─────────────────────────────────────┐
│ Read stored JWT from session        │
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

### 4. Logout Flow (FIXED)

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
│ (preserve user's consent grant)     │
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
│ (may fail if token was cached)      │
└────────────────┬────────────────────┘
                 │
         Silent success?
        /         \
      YES          NO
       │            │
       ▼            ▼
  LOGGED IN    Interactive login
               (chrome.identity.getAuthToken)
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

## Backend Endpoints

### Existing Endpoint

#### `POST /api/auth/google`

Exchange Google access token for backend JWT.

**Request:**
```json
{
  "accessToken": "<google-access-token>"
}
```

**Response (200 OK):**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "google_xxx",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired Google access token"
}
```

### New Endpoint (Optional Enhancement)

#### `GET /api/auth/me`

Validate current session and return user info.

**Headers:**
```
Authorization: Bearer <jwt>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "google_xxx",
    "email": "user@example.com",
    "displayName": "User Name"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Token has expired"
}
```

## Decision: When to Clear Cached Google Token

| Scenario | Clear Cache? | Revoke with Google? |
|----------|--------------|---------------------|
| User clicks "Log out" | Yes | **NO** |
| User revokes access in Google settings | N/A (Google handles) | N/A |
| Backend returns 401 (invalid user) | Yes | No |
| Token error from Google | Yes | No |
| User explicitly "Disconnect" (future feature) | Yes | **Yes** |

## Security Considerations

1. **JWT in session storage**: Cleared on browser close - good for security
2. **No refresh tokens**: We don't request offline access, so no refresh tokens to manage
3. **Token revocation**: Only revoke on explicit "disconnect" or security incidents
4. **HTTPS only**: All API calls over HTTPS
5. **Client ID validation**: Backend verifies tokens match the configured client ID

## Token Lifetimes

| Token | Lifetime | Refresh Strategy |
|-------|----------|------------------|
| Google Access Token | ~1 hour | Chrome handles automatically |
| Backend JWT | 24 hours | Silent re-auth with Google token |

## Error Handling

### Extension Side

| Error | Action |
|-------|--------|
| `chrome.identity` not available | Show error, suggest reinstall |
| Google token acquisition fails | Show login button |
| Backend returns 401 | Clear stored JWT, show login |
| Backend returns 5xx | Show retry button |
| Network error | Show offline message |

### Backend Side

| Error | Response | HTTP Status |
|-------|----------|-------------|
| Missing token in request | `{ error: "Bad Request" }` | 400 |
| Invalid Google token | `{ error: "Unauthorized" }` | 401 |
| Expired JWT | `{ error: "Unauthorized" }` | 401 |
| Server error | `{ error: "Internal Server Error" }` | 500 |

