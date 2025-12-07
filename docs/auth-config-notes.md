# Google Cloud Console OAuth Configuration Notes

## Overview

This document describes the required Google Cloud Console configuration for the MotorScope Chrome extension OAuth integration.

## Required Configuration

### 1. OAuth Client Type: Chrome Extension

The OAuth client must be configured as a **Chrome Extension** client type in Google Cloud Console.

**Location**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

### 2. Client ID

The client ID is configured in two places and must match:

1. **Extension manifest.json**:
```json
{
  "oauth2": {
    "client_id": "663051224718-nj03sld1761g1oicnngk1umj0ob717qe.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```

2. **Backend environment variable**:
```
OAUTH_CLIENT_ID=663051224718-nj03sld1761g1oicnngk1umj0ob717qe.apps.googleusercontent.com
```

### 3. Extension Key in Manifest

The manifest must include a stable `key` to ensure the extension ID remains constant across installs:

```json
{
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvjTpR0Us75uREbD+W90RIhFHnhBE1j0U2W+ry9YZYEs5ESQF++kOEpbq8KQxwUUkPVr/7Y7NjLEjnqCEkjunwgrnToYEAjZy3REhfn0hCB6Ia2fIaeEqLVaXKgK9A7m8pvdvLxxsJNZ5ylHmi92LN6XHsa44oNcx7EqBie6rxoqowaxttsAUUFLhLwyM5olh9g4k71Ykh0QwQ/wNHUQ7VZnROchbvvbtQpwhsxzpOXoUbs/SxIfUAXiaNQoFW7kXUI9gyQ9MDevE+Ge0oMz1IcjNT1Jw1vJpePaUVsUV880SxWuNqtG9cPK29xl1RkPXrkJY1ws66kHZDm9S6du93QIDAQAB"
}
```

This key generates a consistent extension ID that must be registered in Google Cloud Console.

### 4. Required Scopes

The extension requests these OAuth scopes:

| Scope | Purpose |
|-------|---------|
| `openid` | OpenID Connect authentication |
| `email` | Access user's email address |
| `profile` | Access user's basic profile (name, picture) |

These are non-sensitive scopes and do not require Google verification.

### 5. Consent Screen Configuration

**Location**: Google Cloud Console → APIs & Services → OAuth consent screen

**Required Settings**:

| Setting | Value |
|---------|-------|
| App name | MotorScope |
| User support email | [your email] |
| App logo | [optional] |
| Application home page | [your site URL] |
| Authorized domains | [your domain] |
| Developer contact email | [your email] |

### 6. Application Type Settings

In the OAuth client configuration:

| Setting | Value |
|---------|-------|
| Application type | Chrome Extension |
| Item ID | [Extension ID from chrome://extensions] |

## How Chrome Extension OAuth Works

### chrome.identity.getAuthToken()

The extension uses `chrome.identity.getAuthToken()` which:

1. Uses the `oauth2` configuration from manifest.json
2. Handles token caching automatically
3. Manages token refresh
4. Shows consent screen only when needed

### Flow

1. Extension calls `chrome.identity.getAuthToken({ interactive: true })`
2. Chrome checks if user has already granted consent
3. If no consent: Shows Google consent screen
4. If consent exists: Returns cached token or refreshes silently
5. Extension receives access token
6. Extension sends token to backend for verification

### Why Consent Screen Appears

The Google consent screen appears when:

1. **First time**: User has never granted consent to this app
2. **Consent revoked**: User revoked consent in Google Account settings
3. **App revoked consent**: Code called Google's revoke endpoint (the bug we fixed!)
4. **Scopes changed**: App requests new scopes not previously granted
5. **Client ID changed**: Different OAuth client used

## Troubleshooting

### Repeated Consent Screen

If users see the consent screen repeatedly:

1. **Check logout code**: Ensure `revokeGoogleToken()` is NOT called on normal logout
2. **Check scopes**: Ensure scopes match between manifest and any URL-based auth
3. **Check client ID**: Ensure the same client ID is used everywhere

### "This app isn't verified"

If users see this warning:

1. The app is in testing mode
2. Add test users in OAuth consent screen settings
3. Or submit for Google verification (for production)

### Token Errors

If `getAuthToken` returns errors:

1. Check manifest.json `oauth2` configuration
2. Verify extension ID matches Google Cloud Console
3. Ensure user's Google account has access (for testing mode)

## Testing OAuth Flow

### Development Testing

1. Load extension in Chrome (chrome://extensions → Developer mode → Load unpacked)
2. Note the extension ID
3. Ensure this ID is registered in Google Cloud Console
4. Test login flow

### Verify Consent Preservation

1. Log in (should see consent screen first time)
2. Log out
3. Log in again
4. **Expected**: Account picker, NOT consent screen
5. If consent screen appears again, check for token revocation in logout code

## Environment Variables Summary

### Backend (.env or Cloud Run secrets)

```env
# Google OAuth Client ID (must match manifest.json)
OAUTH_CLIENT_ID=663051224718-nj03sld1761g1oicnngk1umj0ob717qe.apps.googleusercontent.com

# JWT signing secret
JWT_SECRET=<secure-random-string>

# Extension origin for CORS (optional)
ALLOWED_ORIGIN_EXTENSION=chrome-extension://<extension-id>
```

## References

- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Google OAuth 2.0 for Chrome Extensions](https://developer.chrome.com/docs/extensions/mv3/tut_oauth/)
- [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)

