#!/bin/bash
# Auth Flow Verification Script
# This script helps verify the API endpoints work correctly.
# Run it against a running backend instance.

set -e

# Configuration - adjust these for your environment
API_BASE="${API_BASE:-http://localhost:8080}"
API_PREFIX="/api"

echo "==============================================="
echo "MotorScope Auth Flow Verification"
echo "==============================================="
echo ""
echo "API Base: $API_BASE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health check
echo "1. Health Check"
echo "   GET $API_BASE$API_PREFIX/healthz"
HEALTH_CODE=$(curl -s -o /tmp/health_response.txt -w "%{http_code}" "$API_BASE$API_PREFIX/healthz")
HEALTH_BODY=$(cat /tmp/health_response.txt)

if [ "$HEALTH_CODE" == "200" ]; then
    echo -e "   ${GREEN}✓ Health check passed${NC}"
    echo "   Response: $HEALTH_BODY"
else
    echo -e "   ${RED}✗ Health check failed (HTTP $HEALTH_CODE)${NC}"
    echo "   Response: $HEALTH_BODY"
    exit 1
fi
echo ""

# Test 2: Auth endpoint exists (should fail with 400 without token)
echo "2. Auth Endpoint (POST /api/auth/google)"
echo "   Testing endpoint exists (expect 400 - missing token)"
AUTH_CODE=$(curl -s -o /tmp/auth_response.txt -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{}' \
    "$API_BASE$API_PREFIX/auth/google")
AUTH_BODY=$(cat /tmp/auth_response.txt)

if [ "$AUTH_CODE" == "400" ]; then
    echo -e "   ${GREEN}✓ Endpoint exists and returns expected error${NC}"
    echo "   Response: $AUTH_BODY"
else
    echo -e "   ${YELLOW}⚠ Unexpected response (HTTP $AUTH_CODE)${NC}"
    echo "   Response: $AUTH_BODY"
fi
echo ""

# Test 3: Auth/me endpoint (should fail with 401 without token)
echo "3. Session Validation (GET /api/auth/me)"
echo "   Testing endpoint exists (expect 401 - no auth header)"
ME_CODE=$(curl -s -o /tmp/me_response.txt -w "%{http_code}" "$API_BASE$API_PREFIX/auth/me")
ME_BODY=$(cat /tmp/me_response.txt)

if [ "$ME_CODE" == "401" ]; then
    echo -e "   ${GREEN}✓ Endpoint exists and requires authentication${NC}"
    echo "   Response: $ME_BODY"
else
    echo -e "   ${YELLOW}⚠ Unexpected response (HTTP $ME_CODE)${NC}"
    echo "   Response: $ME_BODY"
fi
echo ""

# Test 4: Auth/me with invalid token
echo "4. Session Validation with Invalid Token"
echo "   GET /api/auth/me with invalid Bearer token"
ME_INVALID_CODE=$(curl -s -o /tmp/me_invalid_response.txt -w "%{http_code}" \
    -H "Authorization: Bearer invalid-token" \
    "$API_BASE$API_PREFIX/auth/me")
ME_INVALID_BODY=$(cat /tmp/me_invalid_response.txt)

if [ "$ME_INVALID_CODE" == "401" ]; then
    echo -e "   ${GREEN}✓ Invalid token correctly rejected${NC}"
    echo "   Response: $ME_INVALID_BODY"
else
    echo -e "   ${YELLOW}⚠ Unexpected response (HTTP $ME_INVALID_CODE)${NC}"
    echo "   Response: $ME_INVALID_BODY"
fi
echo ""

echo "==============================================="
echo "API Verification Complete"
echo "==============================================="
echo ""
echo "To fully test the auth flow with a real Google token:"
echo "1. Load the extension in Chrome"
echo "2. Sign in with Google"
echo "3. Check browser console for auth flow logs"
echo "4. Verify consent screen only appears on first login"
echo "5. Log out and log in again"
echo "6. Verify you see account picker, NOT consent screen"
echo ""
echo "To clear Chrome's identity cache (for fresh testing):"
echo "  Option 1: Remove extension and reinstall"
echo "  Option 2: Go to https://myaccount.google.com/permissions"
echo "            and revoke access to MotorScope"
echo "  Option 3: Clear Chrome browsing data (cookies & site data)"
echo ""
echo "Manual Test Checklist:"
echo "[ ] First login shows consent screen"
echo "[ ] Login completes successfully"
echo "[ ] Logout clears session"
echo "[ ] Re-login shows account picker (NOT consent)"
echo "[ ] Session persists across popup reopens"
echo ""

