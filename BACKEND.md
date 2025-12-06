# MotorScope Backend API

This document describes the backend API for the MotorScope Chrome extension. The API is built with Node.js + TypeScript and uses Firestore for data storage. It's designed to run on Google Cloud Run.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [GCP Configuration Checklist](#gcp-configuration-checklist)
- [Local Development](#local-development)
- [Deployment to Cloud Run](#deployment-to-cloud-run)

---

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Chrome Extension   │────▶│   Cloud Run API     │────▶│    Firestore        │
│  (Frontend)         │     │   (Node.js)         │     │    (Database)       │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │
         │ Google OAuth              │ IAM (ADC)
         ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Google Identity    │     │  Service Account    │
│  Platform           │     │  (Cloud Run)        │
└─────────────────────┘     └─────────────────────┘
```

### Key Components

1. **Chrome Extension**: Frontend that collects car listings and syncs with the backend
2. **Cloud Run API**: Stateless Node.js server handling authentication and data operations
3. **Firestore**: NoSQL document database storing users and listings
4. **Google OAuth**: Authentication via Chrome Identity API
5. **IAM**: Backend accesses Firestore using service account credentials (ADC)

---

## Data Model

### Firestore Collections

#### `users` Collection

Stores user accounts created during authentication.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Internal user ID (format: `google_<sub>`) |
| `email` | string | User's email address |
| `displayName` | string? | User's display name |
| `createdAt` | string | ISO timestamp of account creation |
| `lastLoginAt` | string | ISO timestamp of last login |

**Document ID**: Same as `id` field

#### `listings` Collection

Stores car listings tracked by users.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Listing ID (VIN-based or URL-based) |
| `userId` | string | Owner's user ID (links to `users` collection) |
| `schemaVersion` | string | Data schema version |
| `source` | object | Platform, URL, listing ID, country code |
| `title` | string | Listing title |
| `thumbnailUrl` | string | Main image URL |
| `currentPrice` | number | Current asking price |
| `currency` | string | Currency code (PLN, EUR, USD) |
| `priceHistory` | array | Historical price data points |
| `vehicle` | object | Vehicle details (VIN, make, model, etc.) |
| `location` | object | Seller location |
| `seller` | object | Seller information |
| `status` | enum | ACTIVE, SOLD, or EXPIRED |
| `postedDate` | string? | When listing was posted |
| `firstSeenAt` | string | When we first tracked it |
| `lastSeenAt` | string | When we last checked it |

**Document ID**: Same as `id` field

### Indexing

The API uses a simple query pattern:
```typescript
collection('listings').where('userId', '==', userId)
```

This requires a **single-field index** on `userId` in the `listings` collection. Firestore typically auto-creates this index, but you can verify in the Firebase Console:

1. Go to Firestore > Indexes
2. Check for: `listings` → `userId` → Ascending

No composite indexes are required for basic operations.

---

## API Endpoints

All endpoints are prefixed with `/api`.

### Health Check

```
GET /api/healthz
```

Returns server and Firestore health status.

**Response:**
```json
{
  "status": "ok",
  "firestore": "ok",
  "timestamp": "2024-12-06T10:30:00.000Z"
}
```

### Authentication

```
POST /api/auth/google
```

Authenticate using a Google ID token from the Chrome extension.

**Request Body:**
```json
{
  "idToken": "<google-id-token>"
}
```

**Response:**
```json
{
  "token": "<jwt-token>",
  "user": {
    "id": "google_123456789",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

### Listings (Protected - Requires JWT)

All listing endpoints require the `Authorization: Bearer <jwt-token>` header.

#### Get All Listings

```
GET /api/listings
```

Returns all listings for the authenticated user.

#### Sync All Listings (Replace)

```
PUT /api/listings
```

Replaces all listings for the user. Listings not in the payload are deleted.

**Request Body:** `CarListing[]`

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

#### Add/Update Single Listing

```
POST /api/listings
```

Add or update a single listing.

**Request Body:** `CarListing`

#### Delete Listing

```
DELETE /api/listings/:id
```

Delete a specific listing.

---

## Environment Variables

### Required in Production

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `GCP_PROJECT_ID` | GCP project ID | `motorscope` |
| `JWT_SECRET` | Secret for signing JWTs | `<random-32-byte-base64>` |
| `OAUTH_CLIENT_ID` | Google OAuth client ID | `663051224718-xxx.apps.googleusercontent.com` |
| `ALLOWED_ORIGIN_EXTENSION` | Chrome extension origin | `chrome-extension://abcdef123456` |
| `BACKEND_BASE_URL` | Public API URL | `https://motorscope-api-xxx-ew.a.run.app` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` (provided by Cloud Run) |

---

## GCP Configuration Checklist

### 1. Create GCP Project

- [ ] Create project `motorscope` in GCP Console
- [ ] Enable billing

### 2. Enable Required APIs

```bash
gcloud services enable \
  firestore.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  iap.googleapis.com
```

### 3. Create Firestore Database

- [ ] Go to Firestore in GCP Console
- [ ] Create database in **Native mode**
- [ ] Database ID: `motorscopedb`
- [ ] Location: `europe-west1` (or your preferred region)

### 4. Configure OAuth

- [ ] Go to APIs & Services > Credentials
- [ ] Create OAuth 2.0 Client ID (Web application)
- [ ] Add authorized origins for the extension
- [ ] Note the Client ID for `OAUTH_CLIENT_ID`

### 5. IAM Configuration

The Cloud Run service account needs Firestore access:

```bash
# Using default compute service account
gcloud projects add-iam-policy-binding motorscope \
  --member="serviceAccount:663051224718-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

Or create a dedicated service account:

```bash
# Create service account
gcloud iam service-accounts create motorscope-api \
  --display-name="MotorScope API Service Account"

# Grant Firestore access
gcloud projects add-iam-policy-binding motorscope \
  --member="serviceAccount:motorscope-api@motorscope.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### 6. Deploy to Cloud Run

See [Deployment to Cloud Run](#deployment-to-cloud-run) section.

---

## Local Development

### Prerequisites

- Node.js 24+
- GCP CLI (`gcloud`) configured
- Application Default Credentials set up

### Setup

```bash
# Install all dependencies
npm run install:all

# Or install API dependencies only
cd api && npm install
```

### Configure Local Environment

```bash
# Copy example env file
cp api/.env.example api/.env

# Edit api/.env with your values
# - Set JWT_SECRET (generate with: openssl rand -base64 32)
# - Set OAUTH_CLIENT_ID
```

### Authenticate for Firestore Access

```bash
# Login and set up ADC
gcloud auth application-default login
gcloud config set project motorscope
```

### Run Development Server

```bash
# From repo root
npm run dev:api

# Or from api directory
cd api && npm run dev
```

The API will be available at `http://localhost:8080`.

### Test Endpoints

```bash
# Health check
curl http://localhost:8080/api/healthz

# Note: Authentication requires a valid Google ID token
```

---

## Deployment to Cloud Run

### Option 1: Continuous Deployment from Repository (Recommended)

1. **Go to Cloud Run in GCP Console**

2. **Create Service**
   - Click "Create Service"
   - Choose "Continuously deploy from a repository (source)"

3. **Connect Repository**
   - Connect your GitHub repository
   - Select branch (e.g., `main`)

4. **Configure Build**
   - Build type: Dockerfile (or Buildpack)
   - Source location: `/api`
   - Build command: `npm run build`
   - Run command: `node dist/index.js`

5. **Configure Service**
   - Service name: `motorscope-api`
   - Region: `europe-west1`
   - CPU allocation: Request-based
   - Minimum instances: 0
   - Maximum instances: 10
   - Memory: 256 MiB
   - CPU: 1

6. **Set Environment Variables**
   
   In the "Container" section, add:
   
   | Name | Value |
   |------|-------|
   | `NODE_ENV` | `production` |
   | `GCP_PROJECT_ID` | `motorscope` |
   | `JWT_SECRET` | `<your-secret>` |
   | `OAUTH_CLIENT_ID` | `663051224718-nj03sld1761g1oicnngk1umj0ob717qe.apps.googleusercontent.com` |
   | `ALLOWED_ORIGIN_EXTENSION` | `chrome-extension://<your-extension-id>` |
   | `BACKEND_BASE_URL` | `https://motorscope-api-xxxxx-ew.a.run.app` |

7. **Configure Authentication**
   - Allow unauthenticated invocations (API handles its own auth)

8. **Deploy**
   - Click "Create"
   - Note the service URL for `BACKEND_BASE_URL`

### Option 2: Manual Deployment with gcloud

```bash
# Build and deploy from api directory
cd api

gcloud run deploy motorscope-api \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=motorscope,OAUTH_CLIENT_ID=xxx,ALLOWED_ORIGIN_EXTENSION=chrome-extension://xxx" \
  --set-secrets "JWT_SECRET=jwt-secret:latest"
```

### Using Cloud Build (Alternative)

Create `cloudbuild.yaml` in repo root:

```yaml
steps:
  - name: 'node:24'
    dir: 'api'
    entrypoint: npm
    args: ['install']
  
  - name: 'node:24'
    dir: 'api'
    entrypoint: npm
    args: ['run', 'build']
  
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'motorscope-api'
      - '--source=api'
      - '--region=europe-west1'
      - '--platform=managed'
```

---

## Security Considerations

1. **JWT Secret**: Use a strong, random secret (32+ bytes). Store in Secret Manager for production.

2. **CORS**: Only the Chrome extension origin is allowed in production.

3. **Token Expiration**: JWTs expire after 24 hours. Users must re-authenticate periodically.

4. **Firestore Rules**: Consider adding Firestore security rules as an additional layer.

5. **Rate Limiting**: Consider adding rate limiting for production use.

---

## Troubleshooting

### "Firestore health check failed"

- Verify the service account has `roles/datastore.user` role
- Check that Firestore database exists with ID `motorscopedb`
- Ensure the GCP project ID is correct

### "Invalid or expired Google token"

- Verify `OAUTH_CLIENT_ID` matches the one in Chrome extension
- Check that the token hasn't expired

### CORS Errors

- Verify `ALLOWED_ORIGIN_EXTENSION` matches exactly (including `chrome-extension://` prefix)
- Check browser developer tools for the actual origin being sent

### Build Failures on Cloud Run

- Ensure `api/package.json` has correct Node.js engine version
- Verify TypeScript compilation works locally first
- Check Cloud Build logs for detailed errors

