# =============================================================================

# MotorScope Extension - Configuration Reference

# =============================================================================

#

# The extension does NOT use .env files. Configuration is handled through:

# 1. manifest.json - OAuth and permissions (build-time)

# 2. Settings UI - User preferences (runtime, stored in chrome.storage)

#

# =============================================================================

# -----------------------------------------------------------------------------

# manifest.json Configuration

# -----------------------------------------------------------------------------

#

# Location: extension/manifest.json

#

# OAuth2 Configuration:

# "oauth2": {

# "client_id": "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com",

# "scopes": ["openid", "email", "profile"]

# }

#

# The client_id must match a "Chrome extension" type OAuth client in GCP.

# Create one at: GCP Console → APIs & Services → Credentials

#

# Extension Key (for consistent extension ID during development):

# "key": "your-extension-public-key"

#

# Generate a key:

# 1. Go to chrome://extensions

# 2. Pack extension (any extension works)

# 3. Use the generated .pem file to extract the key

# Or use an online tool to generate a manifest key

#

# -----------------------------------------------------------------------------

# Runtime Settings (configured in extension Settings page)

# -----------------------------------------------------------------------------

#

# These are stored in chrome.storage.local (logged out) or remote backend (logged in):

#

# | Setting | Description |

# |--------------------|------------------------------------------------|

# | Backend URL | API server URL (Cloud or localhost:8080)       |

# | Gemini API Key | For AI-powered listing analysis |

# | Check Frequency | How often to auto-refresh listings |

#

# -----------------------------------------------------------------------------

# Backend URL Options

# -----------------------------------------------------------------------------

#

# Configured in the Settings page dropdown:

#

# Cloud (Development):

# https://motorscope-dev-663051224718.europe-west1.run.app/api

#

# Local Development:

# http://localhost:8080/api

#

# Note: Backend URL is always stored locally, even when logged in.

# This allows users to switch between servers without affecting their data.

#

# -----------------------------------------------------------------------------

# Build & Development

# -----------------------------------------------------------------------------

#

# # Install dependencies

# cd extension && npm install

#

# # Development build (with HMR)

# npm run dev

#

# # Production build

# npm run build

#

# # Load in Chrome

# 1. Go to chrome://extensions

# 2. Enable "Developer mode"

# 3. Click "Load unpacked"

# 4. Select extension/dist folder

#

# =============================================================================

