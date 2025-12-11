/**
 * i18n Configuration
 *
 * Internationalization setup for the Motorscope extension.
 * Supports English and Polish languages.
 */

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

// Import English translation resources
import commonEn from './locales/en/common.json';
import dashboardEn from './locales/en/dashboard.json';
import popupEn from './locales/en/popup.json';
import settingsEn from './locales/en/settings.json';
import listingEn from './locales/en/listing.json';
import authEn from './locales/en/auth.json';
import errorsEn from './locales/en/errors.json';

// Import Polish translation resources
import commonPl from './locales/pl/common.json';
import dashboardPl from './locales/pl/dashboard.json';
import popupPl from './locales/pl/popup.json';
import settingsPl from './locales/pl/settings.json';
import listingPl from './locales/pl/listing.json';
import authPl from './locales/pl/auth.json';
import errorsPl from './locales/pl/errors.json';

// Resource configuration
const resources = {
    en: {
        common: commonEn,
        dashboard: dashboardEn,
        popup: popupEn,
        settings: settingsEn,
        listing: listingEn,
        auth: authEn,
        errors: errorsEn,
    },
    pl: {
        common: commonPl,
        dashboard: dashboardPl,
        popup: popupPl,
        settings: settingsPl,
        listing: listingPl,
        auth: authPl,
        errors: errorsPl,
    },
};

// Available namespaces
export const namespaces = [
    'common',
    'dashboard',
    'popup',
    'settings',
    'listing',
    'auth',
    'errors',
] as const;

export type Namespace = (typeof namespaces)[number];

// Initialize i18next
i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Default language
        fallbackLng: 'en', // Fallback language
        defaultNS: 'common', // Default namespace
        ns: namespaces,

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        // Debug mode (disable in production)
        debug: false,
    });

export default i18n;

