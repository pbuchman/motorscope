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
    // Pass current timestamp so LLM can calculate relative dates
    const currentTimestamp = new Date().toISOString();

    // Check Facebook URL type
    const isFacebookMarketplace = url.includes('facebook.com/marketplace/item/') ||
        url.includes('facebook.com/commerce/listing/');
    const isFacebookGroup = /facebook\.com\/groups\/\d+\/(permalink|posts)\/\d+/.test(url);
    const isFacebook = isFacebookMarketplace || isFacebookGroup;

    const facebookMarketplaceSection = isFacebookMarketplace ? `
FACEBOOK MARKETPLACE SPECIFIC RULES (apply when URL contains facebook.com/marketplace/item/ or facebook.com/commerce/listing/):
1. DATA STRUCTURE: Facebook pages contain two data sources - USE BOTH:
   a) "Informacje o pojeździe" section - structured data (mileage, transmission, colors, fuel type, power)
   b) "Opis sprzedawcy" section - seller's description (often has trim level, engine size, more details)
   When values conflict, prefer the structured "Informacje o pojeździe" section, but extract trim/variant from seller description.

2. ENGINE CAPACITY: Facebook often shows incorrect values like "-1.0 L".
   If structured data shows invalid capacity (negative or clearly wrong), extract from seller description instead.
   Look for patterns like "2.7 benzyna", "Pojemność 2.7", "silnik 2.0" in description.
   Convert liters to cc (2.7L = 2700cc, 2.0L = 2000cc).

3. POWER: May be shown as "340 hp" in structured data or "335km" in description (km = KM = hp in Polish).
   Prefer structured data value.

4. TRIM/VARIANT: Often only in seller description. Look for patterns like "ST", "Titanium", "Sport", etc.

5. DRIVE TYPE: Look for "4x4", "AWD", "4WD" in title or description -> driveType: "AWD"

6. OWNERSHIP: "1 właściciel" = 1 owner (can infer isFirstOwner for condition)

7. LOCATION: Extract from "Opublikowano X temu w: [City], [Region/Country]" pattern.
` : '';

    const facebookGroupSection = isFacebookGroup ? `
FACEBOOK GROUP POST SPECIFIC RULES (apply when URL contains facebook.com/groups/{groupId}/permalink/ or /posts/):
This is a car listing posted in a Facebook Group (buy/sell group). The format is UNSTRUCTURED text.

1. POST STRUCTURE: Group posts are free-form text written by sellers. Look for:
   - First line often contains: Make, Model, Trim, Engine, Key features (e.g., "FORD EDGE SEL AWD 4x4 - 3.5 V6 284KM • Automat • Skóra • Kamera • LPG")
   - Following lines contain details in various formats

2. COMMON PATTERNS TO EXTRACT:
   - "VIN:" or "Nr VIN:" followed by 17-character code
   - "Cena:" or "cena" followed by price (e.g., "66 900zł", "66900 zł", "66 900 PLN")
   - "Rok produkcji:" or "Rok:" followed by year
   - "Przebieg:" followed by mileage (e.g., "152000 km", "152 000km")
   - "Rodzaj paliwa:" or "Paliwo:" (Benzyna, Diesel, LPG, Hybryda)
   - "Skrzynia biegów:" or "Skrzynia:" (Automatyczna, Manualna) + "łopatki zmiany biegów"
   - "Napęd:" (4x4, AWD, FWD, RWD, Przedni, Tylny)
   - "Rozrząd:" or "Łańcuch" or "Pasek" (timing chain vs belt)
   - "Kolor:" followed by color
   - "Wersja wyposażenia:" or "Wersja:" for trim level (SEL, Titanium, ST, Limited, etc.)
   - "tel." or "Tel:" or phone number pattern (e.g., "698-296-440")

3. SELLER:
   - Name is the post author (shown at top of post, e.g., "Post Jakub Parda" or "Jakub Parda")
   - isCompany: false (group sellers are typically private individuals)
   - type: "private"
   - Extract phone if present

4. FEATURES LIST: Often bulleted or preceded by "•" or "-":
   - "Wnętrze skórzane" / "Skóra" = leather interior
   - "Elektrycznie sterowane fotele" = electric seats
   - "Podgrzewane fotele" = heated seats
   - "Kamera cofania" = backup camera
   - "Czujniki parkowania" = parking sensors
   - "Klimatyzacja automatyczna" = automatic AC
   - "el. bagażnik" = electric tailgate
   - "LPG" = has LPG system (also affects fuelType)

5. ENGINE: Look for patterns like:
   - "3.5 V6" or "2.0 T" or "1.6 TDI" = engine spec (convert to cc: 3.5L = 3500cc)
   - "284KM" or "284 KM" or "284km" = power in HP (KM = Polish HP)

6. CONDITION INDICATORS:
   - "Auto jest w pełni sprawne" = working condition
   - "zadbane" / "zadbany" = well-maintained
   - "bezwypadkowy" / "bezwypadkowe" = accident-free
   - "serwisowane" / "serwisowany" = serviced
   - "przegląd techniczny" = has technical inspection

7. LOCATION: Usually mentioned in post or group name. Look for city names.
` : '';

    const facebookCommonSection = isFacebook ? `
FACEBOOK COMMON RULES (apply to all Facebook URLs):
1. RELATIVE DATES: Facebook shows posting time as relative text. Current timestamp is: ${currentTimestamp}
   Calculate the actual posting date by subtracting from current time:
   - "X min temu" = X minutes ago
   - "X godz. temu" / "X godziny temu" = X hours ago
   - "X dni temu" / "dzień temu" = X days ago
   - "tydzień temu" = 1 week ago
   - "X tygodnie/tygodni temu" = X weeks ago
   - "miesiąc temu" = 1 month ago
   - "X miesiące/miesięcy temu" = X months ago
   - Exact date format: "15 grudnia o 12:16" = December 15 at 12:16
   - If no time reference found, set postedAt to null
   Output as ISO 8601 with Europe/Warsaw timezone offset (+01:00 for winter, +02:00 for summer).

2. PRICE: Format variations: "66 900zł", "110 000 zł", "66900 PLN" - extract as number, currency as PLN.

3. COUNTRY: Set countryCode to "PL" for Polish listings (Polish language/currency).
` : '';

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
${facebookCommonSection}${facebookMarketplaceSection}${facebookGroupSection}
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

