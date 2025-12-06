// filepath: /Users/p.buchman/personal/car-listings-watcher/utils/formatters.ts

/**
 * Format date in European format: DD/MM/YYYY HH:mm
 */
export const formatEuropeanDateTime = (date: string | number): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format date in European format with seconds: DD/MM/YYYY HH:mm:ss
 */
export const formatEuropeanDateTimeWithSeconds = (date: string | number): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format date in short European format: DD/MM
 */
export const formatEuropeanDateShort = (date: string | number): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
};

/**
 * Normalize URL by removing query parameters
 */
export const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
};

/**
 * Validate VIN number - must be exactly 17 alphanumeric characters (excluding I, O, Q)
 */
export const isValidVin = (vin: string | undefined | null): boolean => {
  if (!vin || typeof vin !== 'string') return false;
  const cleaned = vin.trim().toUpperCase();
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(cleaned);
};

/**
 * Clean and validate VIN - returns valid VIN or undefined
 */
export const cleanVin = (vin: string | undefined | null): string | undefined => {
  if (!vin || typeof vin !== 'string') return undefined;
  const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  return isValidVin(cleaned) ? cleaned : undefined;
};

