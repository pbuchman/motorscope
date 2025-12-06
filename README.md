# MotorScope - Car Listing Tracker

MotorScope is a browser extension that uses Google Gemini AI to track car listings, monitor price changes, and extract vehicle data from online marketplaces.

## Features

- **One-click Tracking**: Open the extension popup on any car listing to extract data
- **AI-Powered Extraction**: Uses Gemini 2.5 Flash to parse unstructured web content into structured data (VIN, mileage, engine specs, seller info)
- **Price History**: Visualizes price changes over time with interactive charts
- **Auto Phone/VIN Reveal**: Automatically extracts hidden phone numbers and VINs from React-based marketplaces
- **Dashboard**: Centralized view of all tracked vehicles with search and filtering
- **Background Refresh**: Periodically checks for price updates on tracked listings

## Supported Marketplaces

- **Otomoto.pl** (primary support with auto-reveal features)
- Other marketplaces with basic support (mobile.de, autoscout24, olx)

## Data Schema

Car listings are stored using a normalized JSON structure. See the full schema documentation:

📄 **[Car Listing JSON Schema](./docs/car-listing-schema.json)**

### Key data fields extracted:
- **Vehicle**: VIN, make, model, year, mileage, engine specs, drivetrain, condition
- **Pricing**: Current price, original price, price history with dates, currency
- **Origin**: Import country, registration country, seller location
- **Condition**: Accident-free declaration, service history, new/used status
- **Seller**: Type (private/dealer), name, phone number, company status
- **Dates**: Posted date, first seen, last checked

## Prerequisites

1. **Node.js**: Ensure you have Node.js (v18+) installed
2. **Google Gemini API Key**: Required for AI-powered data extraction
   - Get your API key from: https://ai.google.dev/
   - Add it in the extension settings after installation

## Installation

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

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit
```

## Configuration

After installing the extension:

1. Click the MotorScope icon in Chrome toolbar
2. Go to Settings
3. Enter your Gemini API key
4. Set the refresh frequency (how often to check for price updates)

## Privacy

- All data is stored locally in your browser
- API calls are made directly to Google Gemini (no proxy server)
- No tracking or analytics

## License

MIT

