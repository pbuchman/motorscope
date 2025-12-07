/**
 * Page Fetcher
 *
 * Utilities for fetching and parsing webpage content.
 */

/**
 * Fetch and sanitize page content for AI analysis
 */
export async function fetchPageContent(url: string): Promise<{
  html: string;
  textContent: string;
  pageTitle: string;
  status: number;
}> {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  // Extract page title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : '';

  // Strip HTML for text content (scripts, styles, tags)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 20000);

  return { html, textContent, pageTitle, status: response.status };
}

/**
 * Check if a listing URL is expired (404/410)
 */
export async function checkListingExpired(url: string): Promise<{
  expired: boolean;
  status: number;
}> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
    });

    return {
      expired: response.status === 404 || response.status === 410,
      status: response.status,
    };
  } catch {
    return { expired: false, status: 0 };
  }
}

