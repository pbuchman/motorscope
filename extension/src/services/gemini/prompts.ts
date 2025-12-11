/**
 * Gemini Prompt Templates
 *
 * Prompt templates for different Gemini operations.
 */

/**
 * Build prompt for full car listing extraction
 */
export function buildParsePrompt(
    pageTitle: string,
    url: string,
    pageText: string,
): string {
    return `
Extract car listing data from this webpage into the JSON schema.

Page Title: ${pageTitle}
Page URL: ${url}
Page Content:
${pageText.substring(0, 15000)}

Key extraction rules:
1. VIN: Must be EXACTLY 17 characters (A-Z, 0-9, excluding I, O, Q). If invalid or not found, set to null.
2. POSTED DATE (CRITICAL): Find when the listing was posted. On otomoto.pl, the date is usually just BEFORE the "ID:" line.
   Examples of posted date patterns:
   - "3 grudnia 2025 6:23" followed by "ID: 6143969486"
   - "3 grudnia 2025 15:52" followed by "ID: 6144015463"
   Polish month names: stycznia, lutego, marca, kwietnia, maja, czerwca, lipca, sierpnia, września, października, listopada, grudnia
   IMPORTANT: Dates on Polish websites are in Europe/Warsaw timezone (CET/CEST).
   Convert to ISO 8601 format WITH timezone offset +01:00 for winter (Nov-Mar) or +02:00 for summer (Apr-Oct).
   Example: "3 grudnia 2025 15:52" -> "2025-12-03T15:52:00+01:00"
3. Mileage: Extract numeric value and unit (km/mi).
4. Engine capacity: Convert to cubic centimeters (e.g., 2.0L = 1998cc).
5. Price: Extract as number without formatting. Currency as code (PLN/EUR/USD).
6. Origin country (registration.originCountry): The country the vehicle was IMPORTED FROM or originally came from - NOT the current location.
7. Condition fields: Only set true/false if EXPLICITLY stated in listing, otherwise null.
8. Infer make/model from URL or title if not explicitly stated.
  `;
}

/**
 * Build prompt for listing refresh (price/status only)
 */
export function buildRefreshPrompt(
    pageTitle: string,
    url: string,
    pageText: string,
): string {
    return `
    Analyze the following car listing page and extract the current price and availability status.

    Page Title: ${pageTitle}
    Page URL: ${url}
    Page Content: ${pageText.substring(0, 10000)}... (truncated)

    Instructions:
    - Extract the current listing price as a number (no formatting, just the number)
    - Extract the currency (PLN, EUR, USD, etc.)
    - Set isAvailable to false if the page shows the listing is no longer available, removed, expired, or redirects to a "not found" type page
    - Set isSold to true if the page explicitly indicates the vehicle was sold
    - If the page looks like a normal active listing, set isAvailable to true and isSold to false
  `;
}

