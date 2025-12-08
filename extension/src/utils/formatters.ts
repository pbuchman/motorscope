// filepath: /Users/p.buchman/personal/motorscope/extension/src/utils/formatters.ts

/**
 * Helper function to get common date parts
 */
const getDateParts = (date: string | number) => {
  const d = new Date(date);
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: (d.getMonth() + 1).toString().padStart(2, '0'),
    year: d.getFullYear(),
    hours: d.getHours().toString().padStart(2, '0'),
    minutes: d.getMinutes().toString().padStart(2, '0'),
    seconds: d.getSeconds().toString().padStart(2, '0'),
  };
};

/**
 * Format date in European format: DD/MM/YYYY HH:mm
 */
export const formatEuropeanDateTime = (date: string | number): string => {
  const { day, month, year, hours, minutes } = getDateParts(date);
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format date in European format with seconds: DD/MM/YYYY HH:mm:ss
 */
export const formatEuropeanDateTimeWithSeconds = (date: string | number): string => {
  const { day, month, year, hours, minutes, seconds } = getDateParts(date);
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format date in short European format: DD/MM
 */
export const formatEuropeanDateShort = (date: string | number): string => {
  const { day, month } = getDateParts(date);
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

