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

# Development (Cloud) - Default:

# https://motorscope-api-608235183788.europe-west1.run.app

#

# Production (Cloud):

# https://motorscope-api-83225257608.europe-west1.run.app

#

# Local Development:

# http://localhost:8080

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

# # Development server (with HMR)

# npm run dev

#

# # Build for development environment (default)

# npm run build

# # or explicitly:

# npm run build:dev

#

# # Build for production environment

# npm run build:prod

#

# The build environment affects:

# - OAuth client ID in manifest.json

# - VITE_ENV variable available at runtime

#

# OAuth Client IDs per environment:

# - dev: 608235183788-siuni6ukq90iou35afhukfc02b7sa8la.apps.googleusercontent.com

# - prod: 83225257608-86kc32r143q96ghn1gmq8c5rhoqcu4jc.apps.googleusercontent.com

#

# # Load in Chrome

# 1. Go to chrome://extensions

# 2. Enable "Developer mode"

# 3. Click "Load unpacked"

# 4. Select extension/dist folder

#

# =============================================================================

