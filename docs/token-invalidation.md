# Token Invalidation on Logout

This document describes the JWT token invalidation system implemented for secure logout.

## Problem

Previously, JWT tokens remained valid until their natural expiration time (24 hours), even after a user logged out. This meant:

1. User logs in and gets a JWT token
2. User logs out (extension clears local token storage)
3. If the token was intercepted or saved, it could still be used for API calls

## Solution

Implemented a **token blacklist** system:

1. Each JWT now includes a unique identifier (`jti` - JWT ID)
2. On logout, the token's `jti` is added to a Firestore blacklist collection
3. The auth middleware checks the blacklist before allowing access
4. Expired tokens are automatically cleaned up from the blacklist

## Automatic Cleanup

There are three mechanisms for cleaning up expired tokens:

### 1. Firestore TTL (Recommended - Automatic)

Firestore Time-to-Live (TTL) automatically deletes documents after their expiration timestamp.

**Setup Required:**
1. Go to Firebase Console > Firestore Database
2. Click "Time-to-live" in the left sidebar  
3. Click "Create policy"
4. Configure:
   - **Collection group:** `token_blacklist`
   - **Timestamp field:** `expireAt`
5. Click "Create"

Once configured:
- Firestore automatically deletes expired tokens
- Deletion happens within 24-72 hours of expiration
- No code changes or scheduled jobs needed
- Zero maintenance overhead

### 2. Opportunistic Cleanup (Automatic, Built-in)

The health check endpoint (`GET /api/healthz`) triggers cleanup randomly:
- Runs ~10% of the time on health checks
- Non-blocking (runs in background)
- Cleans up to 500 expired tokens per run
- Good backup if TTL is not configured

### 3. Manual Cleanup (On-demand)

The `cleanupExpiredBlacklistedTokens()` function can be called:
- From an admin endpoint
- From a Cloud Scheduler triggered Cloud Function
- During deployment/maintenance

## Implementation Details

### Backend Changes

#### Firestore Collection: `token_blacklist`

```typescript
interface BlacklistedToken {
  tokenId: string;      // JWT ID (jti claim)
  userId: string;       // User who owned the token
  blacklistedAt: string; // When it was invalidated (ISO string)
  expireAt: Timestamp;  // Firestore Timestamp for TTL auto-deletion
}
```

**Important:** The `expireAt` field uses Firestore `Timestamp` type for TTL compatibility.

#### Updated JWT Generation (`api/src/auth.ts`)

```typescript
import crypto from 'crypto';

function generateJti(): string {
  return crypto.randomUUID();
}

export function generateJwt(userId: string, email: string): string {
  const payload = {
    userId,
    email,
    jti: generateJti(), // Unique ID for each token
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
```

#### Auth Middleware with Blacklist Check

```typescript
export async function verifyJwtWithBlacklistCheck(token: string): Promise<JwtPayload> {
  const payload = verifyJwt(token);
  
  if (payload.jti) {
    const blacklisted = await isTokenBlacklisted(payload.jti);
    if (blacklisted) {
      throw new Error('Token has been revoked');
    }
  }
  
  return payload;
}
```

#### Endpoint: `POST /api/auth/logout`

```typescript
router.post('/auth/logout', authMiddleware, async (req, res) => {
  const { userId, jti, exp } = req.user!;
  
  if (jti) {
    const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    await blacklistToken(jti, userId, expiresAt);
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
});
```

### Extension Changes

#### Updated Logout Function (`extension/src/auth/oauthClient.ts`)

```typescript
export const logout = async (): Promise<void> => {
  // 1. Call backend to blacklist the token
  const token = await getStoredToken();
  if (token) {
    await invalidateTokenOnBackend(token);
  }

  // 2. Clear Chrome's cached Google token
  await clearGoogleAuth();

  // 3. Clear local auth storage
  await clearAuthData();
};
```

## API Endpoints

### POST /api/auth/logout

**Request:**
- Headers: `Authorization: Bearer <jwt-token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Effect:**
- Token is blacklisted in Firestore
- Subsequent requests with this token will return 401 Unauthorized

## Setting Up Firestore TTL (Required for Production)

### Via Firebase Console (Recommended)

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** > **Time-to-live**
4. Click **Create policy**
5. Enter:
   - Collection group: `token_blacklist`
   - Timestamp field path: `expireAt`
6. Click **Create**

### Via gcloud CLI

```bash
gcloud firestore fields ttls update expireAt \
  --collection-group=token_blacklist \
  --enable-ttl \
  --project=motorscope
```

### Via Terraform

```hcl
resource "google_firestore_field" "token_blacklist_ttl" {
  project    = "motorscope"
  database   = "motorscopedb"
  collection = "token_blacklist"
  field      = "expireAt"

  ttl_config {}
}
```

## Backward Compatibility

Tokens issued before this change (without `jti` claim) will:
- Continue to work normally
- Cannot be individually invalidated (no `jti` to blacklist)
- Will expire naturally after 24 hours

## Testing

1. Login and note the JWT token
2. Make an authenticated API call (should succeed)
3. Logout via the extension
4. Try to use the saved token:
   ```bash
   curl -H "Authorization: Bearer <saved-token>" \
     https://motorscope-dev-xxx.run.app/api/settings
   ```
5. Should receive: `401 Unauthorized: Token has been revoked`

## Performance Considerations

- **Blacklist check**: Adds one Firestore read per authenticated request
- **Write on logout**: One Firestore write per logout
- **Storage**: Documents are small (~200 bytes each)
- **TTL cleanup**: Runs automatically by Firestore, no impact on API
- **Opportunistic cleanup**: Runs 10% of health checks, non-blocking

## Security Considerations

- **Token storage**: Blacklist is stored in Firestore, protected by IAM
- **Cleanup**: Expired tokens are cleaned up automatically via TTL
- **Fallback**: If blacklist check fails (network issue), request is denied (fail secure)

## Files Changed

### API
- `api/src/config.ts` - Added `FIRESTORE_TOKEN_BLACKLIST_COLLECTION`
- `api/src/types.ts` - Added `jti` to `JwtPayload`
- `api/src/auth.ts` - Added blacklist check, token generation with jti
- `api/src/db.ts` - Added blacklist CRUD functions with Firestore Timestamp
- `api/src/routes.ts` - Added logout endpoint, opportunistic cleanup in healthz

### Extension
- `extension/src/auth/config.ts` - Added `AUTH_LOGOUT_ENDPOINT_PATH`
- `extension/src/auth/oauthClient.ts` - Updated logout to call backend

