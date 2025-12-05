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
    *   *Note for development*: In this build, you must ensure `process.env.GEMINI_API_KEY` is replaced during the build process, or manually hardcoded in `services/geminiService.ts` if running locally without a bundler that supports env vars.

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

## Forcing a Fresh dist Build

If you touch production files such as `manifest.json`, `background.js`, assets, or anything under `components/` and `services/`, regenerate the unpacked bundle before loading it into Chrome.

1. Remove the previous output and rebuild with the helper script:
   ```bash
   npm run rebuild:dist
   ```
   This cleans the `dist` folder and runs the regular build in one go.
2. Re-load the unpacked extension from the refreshed `dist` directory in `chrome://extensions/`.

Use this same command in CI/CD or release steps whenever you need to guarantee Chrome receives the latest production bundle.

## Continuous Rebuild Options

Keep `dist` in sync while iterating on production code with one of these watchers:

**Option 1 – Vite watch mode**

```bash
npx vite build --watch
```

- Rebuilds whenever Vite detects a change in your source graph.
- Leave the process running in a terminal; stop it with `Ctrl+C`.
- Reload the unpacked extension in Chrome after each rebuild to pull the refreshed assets.

**Option 2 – chokidar-triggered rebuild**

```bash
npm install --save-dev chokidar-cli
npx chokidar "components/**/*" "services/**/*" "manifest.json" "background.js" "metadata.json" -c "npm run rebuild:dist"
```

- Watches the listed production paths and runs the full clean build when anything changes.
- Adjust the glob list to cover any other production assets.
- Useful when you need the cleaned `dist` produced by `rebuild:dist` without rerunning the command manually.

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