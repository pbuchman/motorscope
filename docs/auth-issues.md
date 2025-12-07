# Authentication Issues - Root Cause Analysis

## Summary

The repeated Google consent screen is caused by **token revocation during logout**, which invalidates the user's OAuth consent grant entirely.

## Issue #1: Token Revocation on Logout (CRITICAL)

**File:** `extension/src/auth/googleAuth.ts`  
**Function:** `clearGoogleAuth()` (lines 113-128)  
**Called by:** `logout()` in `oauthClient.ts`

### Problem

```typescript
// In clearGoogleAuth():
await revokeGoogleToken(token);  // This is the problem!
```

The `revokeGoogleToken()` function calls Google's revocation endpoint:
```typescript
await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
```

**This revokes the user's OAuth consent grant entirely**, not just the current session. When the user logs in again, Google must show the consent screen because the app no longer has permission.

### Why This Happens

There's a difference between:
- `chrome.identity.removeCachedAuthToken()` - Removes token from Chrome's local cache only
- Google's `/o/oauth2/revoke` endpoint - **Revokes the user's consent grant completely**

### Expected Behavior

On logout, we should:
1. Remove the cached token from Chrome ✅
2. Clear stored JWT and user data ✅
3. **NOT** revoke the Google consent ❌ (currently doing this)

### Impact

Every logout forces a full consent screen on next login, instead of just an account picker.

---

## Issue #2: No Backend Session Validation on Startup

**File:** `extension/src/auth/oauthClient.ts`  
**Function:** `initializeAuth()`

### Problem

The extension validates JWT expiration client-side only. It doesn't call the backend to verify the session is still valid (user hasn't been deleted, token hasn't been invalidated server-side, etc.).

### Current Flow

```typescript
// initializeAuth()
const validation = validateJwt(token);  // Client-side only
if (validation.valid) {
  return { status: 'logged_in', ... };  // No backend check
}
```

### Impact

- If backend invalidates a user, extension still thinks they're logged in
- No way to force re-authentication from server side
- Minor issue compared to #1, but worth fixing for robustness

---

## Issue #3: Logout Also Clears Google's Token Cache

**File:** `extension/src/auth/googleAuth.ts`  
**Function:** `clearGoogleAuth()`

### Problem

On logout, we call `chrome.identity.removeCachedAuthToken()`. This clears Chrome's internal OAuth token cache, meaning the next silent login attempt will fail even if the user still has valid consent.

### Why This Matters

After logout:
1. User has valid consent with Google ✅
2. But Chrome has no cached token ❌
3. Silent login (`interactive: false`) fails
4. User must do interactive login

### Recommendation

Only clear the cached token on **explicit sign-out** or when there's a token error. For a normal "log out of this session" flow, we might want to keep the cached token so silent re-login works.

However, this is a **design decision** - some apps want full logout to require re-interaction.

---

## Issue #4: Session Storage Clears on Browser Close

**File:** `extension/src/auth/storage.ts`

### Observation

The extension uses `chrome.storage.session` which is cleared when the browser closes. This is intentional for security, but means users must re-authenticate after every browser restart.

### Impact

- First browser launch of the day → logged out
- Must do silent or interactive login

### Recommendation

This is acceptable behavior, but should be documented. The silent login flow handles this well when Google consent is preserved.

---

## Issues Checklist

| # | Issue | Severity | File | Fix Required |
|---|-------|----------|------|--------------|
| 1 | Token revocation on logout | **CRITICAL** | `googleAuth.ts` | Remove `revokeGoogleToken()` call |
| 2 | No backend session validation | Low | `oauthClient.ts` | Add optional `/auth/me` check |
| 3 | Cached token cleared on logout | Medium | `googleAuth.ts` | Consider keeping cache |
| 4 | Session storage clears on browser close | Info | `storage.ts` | Document behavior |

---

## Root Cause Verification

To verify Issue #1 is the root cause:

1. Log in to MotorScope
2. Note the consent screen appears (first time)
3. Log out
4. Log in again
5. **Observe**: Full consent screen appears again (wrong!)
6. **Expected**: Account picker or direct sign-in (no consent)

After the fix:
1. Log in (consent screen if first time)
2. Log out
3. Log in again
4. **Expected**: Account picker or direct sign-in, NOT full consent

