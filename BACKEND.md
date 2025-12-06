# MotorScope Backend API

This document describes the backend API for the MotorScope Chrome extension. The API is built with Node.js + TypeScript and uses Firestore for data storage. It's designed to run on Google Cloud Run.

## Table of Contents

- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Docker](#docker)
- [GCP Cloud Run Deployment](#gcp-cloud-run-deployment)

---

## Project Structure

This is a monorepo containing both the Chrome extension and the backend API:

```
motorscope/
├── api/                          # Backend API (Node.js + TypeScript)
│   ├── src/
│   │   ├── index.ts             # Express server entry point
│   │   ├── config.ts            # Configuration and environment variables
│   │   ├── auth.ts              # Authentication (Google OAuth, JWT)
│   │   ├── db.ts                # Firestore database operations
│   │   ├── routes.ts            # API route handlers
│   │   └── types.ts             # TypeScript type definitions
│   ├── dist/                    # Compiled JavaScript output
│   ├── Dockerfile               # Docker configuration for Cloud Run
│   ├── .dockerignore           
│   ├── package.json
│   └── tsconfig.json
├── extension/                    # Chrome Extension (React + TypeScript)
│   └── ...
├── package.json                  # Root package.json with workspace scripts
├── BACKEND.md                    # This file
└── README.md                     # Project overview
```

### NPM Scripts (Root)

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `npm run build:extension && npm run build:api` | Build everything |
| `build:api` | `cd api && npm run build` | Build API (TypeScript) |
| `dev:api` | `cd api && npm run dev` | API dev server with hot reload |
| `start:api` | `cd api && npm start` | Start compiled API |

---

## Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Chrome Extension   │────▶│   Cloud Run API     │────▶│    Firestore        │
│  (./extension)      │     │   (./api)           │     │    (Database)       │
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
3. **Firestore**: NoSQL document database storing users, listings, and settings
4. **Google OAuth**: Authentication via Chrome Identity API
5. **IAM**: Backend accesses Firestore using service account credentials (ADC)

---

## Data Model

### Firestore Collections

#### `users` Collection

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Internal user ID (format: `google_<sub>`) |
| `email` | string | User's email address |
| `displayName` | string? | User's display name |
| `createdAt` | string | ISO timestamp of account creation |
| `lastLoginAt` | string | ISO timestamp of last login |

#### `listings` Collection

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Listing ID (VIN-based or URL-based) |
| `userId` | string | Owner's user ID |
| `title` | string | Listing title |
| `currentPrice` | number | Current asking price |
| `currency` | string | Currency code (PLN, EUR, USD) |
| `priceHistory` | array | Historical price data points |
| `vehicle` | object | Vehicle details (VIN, make, model, etc.) |
| `status` | enum | ACTIVE, SOLD, or EXPIRED |
| ... | | See `types.ts` for full schema |

#### `settings` Collection

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Owner's user ID |
| `geminiApiKey` | string | User's Gemini API key |
| `checkFrequencyMinutes` | number | Auto-refresh interval |
| `geminiStats` | object | API usage statistics |
| `updatedAt` | string | ISO timestamp of last update |

---

## API Endpoints

All endpoints are prefixed with `/api`.

### Health Check

```
GET /api/healthz
```

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

### Listings (Protected)

All listing endpoints require `Authorization: Bearer <jwt-token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/listings` | Get all listings for user |
| PUT | `/api/listings` | Replace all listings (sync) |
| POST | `/api/listings` | Add/update single listing |
| DELETE | `/api/listings/:id` | Delete a listing |

### Settings (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update user settings |

**GET /api/settings Response:**
```json
{
  "geminiApiKey": "AIza...",
  "checkFrequencyMinutes": 60,
  "geminiStats": {
    "allTimeTotalCalls": 150,
    "totalCalls": 25,
    "successCount": 24,
    "errorCount": 1,
    "history": [...]
  }
}
```

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

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `BACKEND_BASE_URL` | Public API URL | (for self-reference) |

---

## Local Development

### Prerequisites

- **Node.js 20+** (24 recommended for parity with Cloud Run)
- **GCP CLI** (`gcloud`) installed and configured
- **Docker** (optional, for local container testing)

### 1. Install Dependencies

```bash
# From repo root
cd api
npm install
```

### 2. Configure Environment

```bash
# Create .env file from example
cp .env.example .env

# Edit .env and set required values:
# - JWT_SECRET: generate with `openssl rand -base64 32`
# - OAUTH_CLIENT_ID: from GCP Console
```

**.env file contents:**
```env
NODE_ENV=development
GCP_PROJECT_ID=motorscope
JWT_SECRET=your-secret-here
OAUTH_CLIENT_ID=663051224718-xxx.apps.googleusercontent.com
ALLOWED_ORIGIN_EXTENSION=chrome-extension://your-extension-id
```

### 3. Authenticate with GCP (for Firestore access)

```bash
# Login to GCP
gcloud auth login

# Set up Application Default Credentials
gcloud auth application-default login

# Set the project
gcloud config set project motorscope
```

### 4. Run the API

```bash
# Development mode with hot reload
npm run dev

# OR build and run production
npm run build
npm start
```

The API will be available at `http://localhost:8080`.

### 5. Test Endpoints

```bash
# Health check
curl http://localhost:8080/api/healthz

# Should return:
# {"status":"ok","firestore":"ok","timestamp":"..."}
```

---

## Docker

The API includes a Dockerfile for containerized deployment.

### Build Docker Image Locally

```bash
cd api

# Build the image
docker build -t motorscope-api .

# Run the container
docker run -p 8080:8080 \
  -e NODE_ENV=development \
  -e GCP_PROJECT_ID=motorscope \
  -e JWT_SECRET=your-secret \
  -e OAUTH_CLIENT_ID=your-client-id \
  -v ~/.config/gcloud:/root/.config/gcloud:ro \
  motorscope-api
```

> **Note:** The volume mount (`-v`) shares your local GCP credentials with the container for Firestore access during local development.

### Dockerfile Features

- **Multi-stage build** for smaller image size
- **Node.js 24 Alpine** base image
- **Non-root user** for security
- **Health check** endpoint configured
- **Production dependencies only** in final image

---

## GCP Cloud Run Deployment

### Prerequisites

1. **GCP Project** with billing enabled
2. **APIs enabled**:
   ```bash
   gcloud services enable \
     firestore.googleapis.com \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     artifactregistry.googleapis.com
   ```

### Step 1: Create Firestore Database

1. Go to [Firestore Console](https://console.cloud.google.com/firestore)
2. Click **Create Database**
3. Select **Native mode**
4. Database ID: `motorscopedb`
5. Location: `europe-west1` (or your preferred region)

### Step 2: Configure OAuth

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create **OAuth 2.0 Client ID** (Web application type)
3. Note the Client ID for `OAUTH_CLIENT_ID`

### Step 3: Set Up IAM

Grant the Cloud Run service account access to Firestore:

```bash
# Using default compute service account
gcloud projects add-iam-policy-binding motorscope \
  --member="serviceAccount:663051224718-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Step 4: Deploy to Cloud Run

#### Option A: Deploy from Source (Recommended)

```bash
cd api

gcloud run deploy motorscope-api \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=motorscope" \
  --set-env-vars "OAUTH_CLIENT_ID=663051224718-xxx.apps.googleusercontent.com" \
  --set-env-vars "ALLOWED_ORIGIN_EXTENSION=chrome-extension://your-extension-id" \
  --set-secrets "JWT_SECRET=jwt-secret:latest"
```

> **Note:** Create the secret first: `echo -n "your-secret" | gcloud secrets create jwt-secret --data-file=-`

#### Option B: Continuous Deployment via Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click **Create Service**
3. Select **Continuously deploy from a repository (source)**
4. Connect your GitHub repository
5. Configure:
   - **Branch**: `main`
   - **Source location**: `/api`
   - **Dockerfile**: `api/Dockerfile`
6. Set environment variables (see table below)
7. Allow unauthenticated invocations
8. Deploy

### Environment Variables for Cloud Run

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `GCP_PROJECT_ID` | `motorscope` |
| `JWT_SECRET` | (use Secret Manager) |
| `OAUTH_CLIENT_ID` | `663051224718-xxx.apps.googleusercontent.com` |
| `ALLOWED_ORIGIN_EXTENSION` | `chrome-extension://your-extension-id` |

### Step 5: Get Service URL

After deployment, note the service URL (e.g., `https://motorscope-api-xxx-ew.a.run.app`).

Update the extension's backend URL configuration if needed.

---

## Troubleshooting

### "Firestore health check failed"

- Verify IAM roles are correctly assigned
- Check that Firestore database `motorscopedb` exists
- Ensure `GCP_PROJECT_ID` environment variable is set

### "Invalid or expired Google token"

- Verify `OAUTH_CLIENT_ID` matches the Chrome extension's OAuth configuration
- Check token hasn't expired (tokens are short-lived)

### CORS Errors

- Ensure `ALLOWED_ORIGIN_EXTENSION` exactly matches your extension origin
- Format: `chrome-extension://your-extension-id`

### Local Development Auth Issues

- Run `gcloud auth application-default login` to refresh credentials
- Verify correct project: `gcloud config get-value project`

---

## Security Considerations

1. **JWT Secret**: Use strong, random secret (32+ bytes). Store in Secret Manager for production.
2. **CORS**: Only extension origin is allowed in production.
3. **Token Expiration**: JWTs expire after 24 hours.
4. **Firestore Rules**: Consider adding security rules as additional protection.
5. **Non-root Container**: Docker runs as non-root user for security.

