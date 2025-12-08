# Investigation: First-Time Login Fails Silently

## Issue Description

When a user who has never connected MotorScope to their Google account clicks "Sign in with Google":
1. The Google authorization window appears
2. User grants permission
3. Nothing happens - user is still shown as not logged in (error: "Invalid or expired Google access token")
4. Clicking "Sign in with Google" again works immediately without showing any Google authorization window

## Root Cause Analysis

### The Actual Flow That Fails

1. User clicks "Sign in with Google"
2. `AuthContext.login()` is called
3. **First**: `trySilentLogin()` is attempted
4. Chrome has a cached token from a previous revoked session
5. `trySilentLogin()` gets this cached (invalid) token
6. Backend calls Google's userinfo API with this token
7. Google rejects the token → Backend returns 401
8. `trySilentLogin()` returns `null` **BUT DOESN'T CLEAR THE BAD TOKEN**
9. **Then**: `loginWithProvider()` is called
10. `getGoogleTokenInteractive()` is called
11. **Chrome returns the SAME cached invalid token** (it doesn't know it's invalid)
12. Backend rejects again → 401
13. Retry loops keep getting the same bad token
14. Login fails

### Why Second Click Works

On the second click:
1. `trySilentLogin()` is attempted with the same bad token
2. Backend rejects → returns `null`
3. `loginWithProvider()` is called
4. `getGoogleTokenInteractive()` is called
5. **This time Chrome actually triggers a new auth flow** (possibly due to timing/state)
6. Fresh token is returned
7. Backend accepts → login succeeds

### The Real Bug

**`trySilentLogin()` was not clearing the invalid token from Chrome's cache when the backend rejected it.**

This meant that:
- Even though silent login "failed", Chrome still had the bad token cached
- When interactive login was attempted, Chrome returned the same bad token
- The consent screen didn't appear because Chrome thought it had a valid token

## Solution

Two key fixes:

1. **`trySilentLogin()`**: Clear the token from Chrome's cache when backend rejects it
2. **`loginWithProvider()`**: Clear token cache between retry attempts

## Implementation

### Changes Made

**File: `extension/src/auth/oauthClient.ts`**

1. **Fixed `trySilentLogin()`**:
```typescript
export const trySilentLogin = async () => {
  const googleToken = await getGoogleTokenSilent();
  if (!googleToken) return null;

  try {
    const authResponse = await authenticateWithBackend(googleToken);
    // ... success
  } catch (error) {
    // CRITICAL FIX: Clear the bad token from Chrome's cache
    await removeCachedGoogleToken(googleToken);
    return null;
  }
};
```

2. **Simplified `loginWithProvider()`**:
```typescript
export const loginWithProvider = async () => {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const googleToken = await getGoogleTokenInteractive();
      await delay(1000); // Wait for propagation
      
      const authResponse = await authenticateWithBackend(googleToken);
      await storeAuthData(authResponse.token, authResponse.user);
      return { user: authResponse.user, token: authResponse.token };
    } catch (error) {
      // Clear token cache before retry
      const cachedToken = await getGoogleTokenSilent();
      if (cachedToken) {
        await removeCachedGoogleToken(cachedToken);
      }
      // Wait and retry
    }
  }
  throw new Error('Login failed');
};
```

## Testing

1. Revoke MotorScope from https://myaccount.google.com/connections
2. Reload the extension (chrome://extensions → reload)
3. Click "Sign in with Google"
4. Authorize the app when prompted
5. Verify login succeeds on first attempt

## Key Insight

The Chrome Identity API caches tokens aggressively. When a token is revoked (either by the user in Google account settings, or by the app calling the revoke endpoint), Chrome doesn't automatically know this. You must explicitly call `chrome.identity.removeCachedAuthToken()` to clear the bad token before Chrome will fetch a fresh one.

