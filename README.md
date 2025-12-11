# MotorScope - Car Listing Tracker

[![Build Status](https://github.com/pbuchman/motorscope/actions/workflows/pack-extension.yml/badge.svg)](https://github.com/pbuchman/motorscope/actions/workflows/pack-extension.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
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

📄 **[Car Listing JSON Schema](./docs/car-listing-schema.json)**

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

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Clean and rebuild
npm run rebuild:dist

# Type check
npx tsc --noEmit
```

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript 5.2, Tailwind CSS 4
- **Build Tool**: Vite 5
- **AI**: Google Gemini API (@google/genai)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Extension**: Chrome Manifest V3

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
│   │   │   ├── CarCard.tsx          # Grid view car card
│   │   │   ├── CarCardCompact.tsx   # Compact list view card
│   │   │   ├── Dashboard.tsx        # Main dashboard view
│   │   │   ├── DashboardFilters.tsx # Filter controls
│   │   │   ├── ListingDetailModal.tsx # Detailed listing overlay
│   │   │   ├── PriceChart.tsx       # Price history chart
│   │   │   └── SettingsPage.tsx     # Extension settings
│   │   ├── config/
│   │   │   └── marketplaces.ts      # Supported marketplace configs
│   │   ├── services/        # Business logic
│   │   │   ├── geminiService.ts     # AI data extraction
│   │   │   └── storageService.ts    # Data persistence
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
│       └── auth.ts          # Authentication handlers
├── docs/                    # Project documentation
└── scripts/                 # Utility scripts
```

## 🔒 Privacy & Security

- ✅ API calls to Gemini are made directly from your browser
- ✅ No third-party tracking or analytics
- ✅ Google Sign-in uses secure OAuth 2.0 flow
- ✅ Backend only stores listing data you choose to track
- ✅ All communication with backend is over HTTPS

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

<p align="center">Made with ❤️ for car enthusiasts</p>

