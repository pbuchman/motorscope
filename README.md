# MotorScope - Car Listing Tracker

[![CI](https://github.com/pbuchman/motorscope/actions/workflows/ci.yml/badge.svg)](https://github.com/pbuchman/motorscope/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-green.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5%20Flash-purple.svg)](https://ai.google.dev/)

MotorScope is a Chrome extension that helps you collect and track data from car listing platforms. It uses Google Gemini AI to extract vehicle information and monitor price changes over time.

## 🌐 Supported Marketplaces

| Marketplace | Country | Status |
|-------------|---------|--------|
| [OTOMOTO](https://otomoto.pl) | Poland 🇵🇱 | ✅ Fully tested |
| [Autoplac](https://autoplac.pl) | Poland 🇵🇱 | ✅ Supported |

> 📝 **Note**: Some features may require you to be logged in to the marketplace platform.

## 🎯 Why MotorScope?

Tracking car prices manually is tedious. MotorScope automates the process:
- **Collect historical price data** automatically - no more manual spreadsheets
- **Track multiple listings** from a single dashboard
- **Get notified** when prices change
- **Archive listings** to keep a record of expired or sold vehicles

## ✨ Features

### Core Features
- **🖱️ One-click Tracking**: Open the extension popup on any car listing to start tracking
- **🤖 AI-Powered Extraction**: Uses Gemini 2.5 Flash to parse page content into structured data (VIN, mileage, engine specs, seller info)
- **📈 Automated Price History**: Builds historical price data over time with interactive charts - track price drops and increases
- **🔄 Background Refresh**: Periodically checks for price updates on tracked listings

### Dashboard Features
- **📊 Grid & Compact Views**: Switch between detailed grid cards and compact list view
- **🔍 Advanced Filtering**: Filter by status (Active/Sold/Expired), archive status, make, model, and marketplace source
- **📋 Listing Details**: Click on any listing to view comprehensive details in an overlay modal
- **🏷️ Source Tags**: See which marketplace each listing comes from at a glance
- **📉 Price Comparison**: Compact view shows total price change since first tracked
- **🗄️ Archive System**: Archive listings to exclude them from auto-refresh while keeping the data

### Data Management
- **💾 Cloud Sync**: Data synchronized with backend (when logged in with Google)
- **🔐 Google Authentication**: Secure sign-in to sync data across devices

## 🗃️ Data Schema

Car listings are stored using a normalized JSON structure. See the full schema documentation:

📄 **[Car Listing JSON Schema](./extension/docs/car-listing-schema.json)**

### Key data fields extracted:

| Category | Fields |
|----------|--------|
| **Vehicle** | VIN, make, model, generation, trim, body type, year, mileage, engine specs, drivetrain |
| **Pricing** | Current price, original price, price history with dates, currency, negotiable flag |
| **Origin** | Import country, registration country, seller location (city, region, postal code) |
| **Condition** | New/used status, accident-free declaration, service history |
| **Seller** | Type (private/dealer), name, phone number, company status |
| **Tracking** | Posted date, first seen, last checked, status (active/sold/expired) |

## 📋 Prerequisites

1. **Node.js**: v18 or higher
2. **Google Gemini API Key**: Required for AI-powered data extraction
   - Get your free API key from: [https://ai.google.dev/](https://ai.google.dev/)
   - Add it in the extension settings after installation

## 🚀 Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/pbuchman/motorscope.git
   cd motorscope
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run extension in development mode with hot reload
npm run dev:extension

# Run API in development mode
npm run dev:api

# Build everything for production
npm run build

# Build extension only
npm run build:extension

# Build API only
npm run build:api

# Run all tests
npm test

# Run linting
npm run lint

# Type check
npm run typecheck

# Clean build artifacts
npm run clean
```

## 🏗️ Tech Stack

- **Frontend**: React 19.2, TypeScript 5.9, Tailwind CSS 4.1
- **Build Tool**: Vite 5.1
- **AI**: Google Gemini API (@google/genai 1.31)
- **Charts**: Recharts 3.5
- **Icons**: Lucide React
- **i18n**: i18next (English & Polish)
- **Testing**: Jest 29, React Testing Library
- **Extension**: Chrome Manifest V3
- **Backend**: Node.js 20, Express, Firestore

## ⚙️ Configuration

After installing the extension:

1. Click the MotorScope icon in Chrome toolbar
2. Go to **Settings**
3. Enter your **Gemini API key**
4. Set the **refresh frequency** (how often to check for price updates)

## 📁 Project Structure

```
motorscope/
├── extension/               # Chrome extension source
│   ├── src/
│   │   ├── components/      # React UI components
│   │   │   ├── ui/              # Reusable UI primitives
│   │   │   ├── popup/           # Extension popup components
│   │   │   ├── CarCard.tsx      # Grid view car card
│   │   │   ├── CarCardCompact.tsx # Compact list view card
│   │   │   ├── Dashboard.tsx    # Main dashboard view
│   │   │   └── SettingsPage.tsx # Extension settings
│   │   ├── config/
│   │   │   └── marketplaces.ts  # Supported marketplace configs
│   │   ├── services/        # Business logic
│   │   │   ├── gemini/          # AI data extraction
│   │   │   ├── refresh/         # Background refresh logic
│   │   │   └── settings/        # Settings management
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── useCurrentTab.ts     # Tab information
│   │   │   ├── usePageContent.ts    # Page scraping
│   │   │   └── useChromeMessaging.ts # Extension messaging
│   │   ├── i18n/            # Internationalization (EN/PL)
│   │   │   └── locales/         # Translation files
│   │   ├── context/         # React context providers
│   │   ├── auth/            # Authentication
│   │   ├── api/             # API client
│   │   ├── utils/           # Helper functions
│   │   ├── background.ts    # Service worker
│   │   └── App.tsx          # Main React app
│   ├── manifest.json        # Chrome extension manifest
│   └── docs/                # Extension documentation
├── api/                     # Backend API server
│   └── src/
│       ├── index.ts         # Express server entry
│       ├── routes.ts        # API routes
│       ├── auth.ts          # Authentication handlers
│       ├── db.ts            # Firestore database layer
│       └── migrations/      # Database migrations
├── docs/                    # Project documentation
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD pipeline
└── scripts/                 # Utility scripts
```

## 🔒 Privacy & Security

- ✅ API calls to Gemini are made directly from your browser
- ✅ No third-party tracking or analytics
- ✅ Google Sign-in uses secure OAuth 2.0 flow
- ✅ Backend only stores listing data you choose to track
- ✅ All communication with backend is over HTTPS
- ✅ Listing images are stored in Google Cloud Storage with automatic expiration

## ☁️ Backend Setup (Cloud Infrastructure)

The MotorScope backend runs on Google Cloud Platform and requires the following services:

### Prerequisites

- Google Cloud Platform account
- gcloud CLI installed and configured
- Project with billing enabled

### 1. Create GCP Project

```bash
# Create new project
gcloud projects create motorscope --name="MotorScope"

# Set as active project
gcloud config set project motorscope

# Enable billing (replace BILLING_ACCOUNT_ID with your billing account)
gcloud beta billing projects link motorscope --billing-account=BILLING_ACCOUNT_ID
```

### 2. Enable Required APIs

```bash
# Enable required Google Cloud services
gcloud services enable firestore.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Create Firestore Database

**Using GCP Console (Recommended):**

1. Go to [Firestore Console](https://console.cloud.google.com/firestore)
2. Click **Create Database**
3. Choose **Native mode**
4. Select location: **europe-west1** (or your preferred region)
5. Database ID: **motorscopedb**
6. Click **Create**

**Using gcloud CLI:**

```bash
gcloud firestore databases create --location=europe-west1 --type=firestore-native --database=motorscopedb
```

### 4. Create Cloud Storage Bucket

**Using GCP Console:**

1. Go to [Cloud Storage Console](https://console.cloud.google.com/storage)
2. Click **Create Bucket**
3. Name: **motorscope-images** (must be globally unique)
4. Location type: **Region**
5. Location: **europe-west1** (same as Firestore)
6. Storage class: **Standard**
7. Access control: **Uniform**
8. Click **Create**

**Configure Lifecycle Rules (Important):**

1. Open your bucket **motorscope-images**
2. Go to **Lifecycle** tab
3. Click **Add a rule**
4. Configure deletion rule:
   - **Action**: Delete object
   - **Condition**: Custom metadata - Key: `deletedAt`, Value exists
   - **Age**: 30 days
5. Click **Create**

**Using gcloud CLI:**

```bash
# Create bucket
gsutil mb -l europe-west1 -c STANDARD gs://motorscope-images

# Set uniform access control
gsutil uniformbucketlevelaccess set on gs://motorscope-images

# Create lifecycle configuration file
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["images/"],
          "customTimeBefore": "$(date -u -d '+30 days' +%Y-%m-%d)"
        }
      }
    ]
  }
}
EOF

# Apply lifecycle rules
gsutil lifecycle set lifecycle.json gs://motorscope-images
```

### 5. Set Up Authentication

```bash
# Create OAuth 2.0 credentials for Chrome extension
# Go to: https://console.cloud.google.com/apis/credentials
# 1. Click "Create Credentials" → "OAuth client ID"
# 2. Application type: Chrome extension
# 3. Name: MotorScope Extension
# 4. Extension ID: (get from chrome://extensions after loading extension)
# 5. Save the Client ID

# Create JWT secret for API
openssl rand -base64 32 > jwt_secret.txt
```

### 6. Deploy API to Cloud Run

```bash
# Navigate to API directory
cd api

# Build and deploy
gcloud run deploy motorscope-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=motorscope,GCS_BUCKET_NAME=motorscope-images" \
  --set-secrets "JWT_SECRET=jwt-secret:latest,OAUTH_CLIENT_ID=oauth-client-id:latest"
```

### 7. Configure CORS

Update Cloud Run service to allow extension origin:

```bash
# Get your extension ID from chrome://extensions
EXTENSION_ID="your-extension-id-here"

# Update service with CORS settings
gcloud run services update motorscope-api \
  --region europe-west1 \
  --set-env-vars "ALLOWED_ORIGIN_EXTENSION=chrome-extension://${EXTENSION_ID}"
```

### Summary of Required Configuration

| Service | Resource | Configuration |
|---------|----------|---------------|
| **Firestore** | Database | Name: `motorscopedb`, Location: `europe-west1`, Mode: Native |
| **Cloud Storage** | Bucket | Name: `motorscope-images`, Location: `europe-west1`, Lifecycle: 30-day deletion |
| **Cloud Run** | Service | Name: `motorscope-api`, Region: `europe-west1` |
| **Secret Manager** | Secrets | `JWT_SECRET`, `OAUTH_CLIENT_ID` |

### Environment Variables

The API requires the following environment variables in Cloud Run:

```
NODE_ENV=production
GCP_PROJECT_ID=motorscope
GCS_BUCKET_NAME=motorscope-images
ALLOWED_ORIGIN_EXTENSION=chrome-extension://YOUR_EXTENSION_ID
BACKEND_BASE_URL=https://motorscope-api-xxxxx-ew.a.run.app
```

Secrets (stored in Secret Manager):
- `JWT_SECRET` - Secret key for JWT token signing
- `OAUTH_CLIENT_ID` - Google OAuth 2.0 client ID

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">Made with ❤️ for car enthusiasts</div>

