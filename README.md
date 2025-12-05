# MotoTracker - Chrome Extension

MotoTracker is a browser extension that uses Google Gemini AI to scrape, parse, and track car listings from marketplaces like Otomoto.pl.

## Features

- **One-click Tracking**: Open the extension popup on any car listing to extract data.
- **AI Extraction**: Uses Gemini Flash 2.5 to parse unstructured web content into structured data (VIN, Mileage, Engine, etc.).
- **Price History**: Visualizes price changes over time for tracked vehicles.
- **Dashboard**: A centralized view of all your tracked vehicles.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed.
2.  **Google Gemini API Key**: You must have a valid API Key.
    *   Get your API key from: https://ai.google.dev/
    *   Copy `.env.example` to `.env` and add your API key:
        ```bash
        cp .env.example .env
        # Edit .env and add your GEMINI_API_KEY
        ```
    *   **Security Note**: Never commit your `.env` file to version control. It's already in `.gitignore`.

## Build Instructions

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Build the Project**
    Run the build script to generate the static files (HTML, JS, CSS) into a `dist` or `build` folder.
    ```bash
    npm run build
    ```
    *Ensure your build process copies `manifest.json` and `background.js` to the output folder.*

## Installation in Chrome

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Toggle **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the `dist` (or `build`) folder generated in the previous step.
5.  The extension is now installed!

## Usage

1.  Go to a car listing (e.g., https://www.otomoto.pl/).
2.  Click the MotoTracker extension icon in your browser toolbar.
3.  Click **Add to Watchlist**. The AI will analyze the page and save the car.
4.  Click **Dashboard** in the popup (or right-click the extension icon -> Options) to view your collection.

## Security & Code Quality

This extension has been analyzed for security vulnerabilities and code quality issues. See [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) for the complete report.

### Key Security Features
- ✅ Uses `chrome.storage.local` for secure data storage
- ✅ Input validation on all user inputs
- ✅ API response validation
- ✅ Type-safe TypeScript implementation
- ✅ Environment variables for API key management

### Development Notes
- TypeScript compilation is strict and error-free
- All Chrome extension APIs are properly typed
- Console statements are development-only
- Storage operations are async with proper error handling
