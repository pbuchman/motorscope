/**
 * Phone number utilities for content scripts
 */

const POLAND_COUNTRY_CODE = '+48';
const PHONE_REGEX = /^\+?\d{6,}$/;

/**
 * Clean phone number - remove formatting and Polish country code
 */
export const cleanPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return cleaned.startsWith(POLAND_COUNTRY_CODE)
        ? cleaned.slice(POLAND_COUNTRY_CODE.length)
        : cleaned;
};

/**
 * Check if a string is a valid phone number
 */
export const isValidPhone = (value: string): boolean => {
    const cleaned = value.replace(/[\s\-()]/g, '');
    return PHONE_REGEX.test(cleaned);
};

