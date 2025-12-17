/**
 * Content script for otomoto.pl - runs in MAIN world (page context)
 * Handles: VIN reveal, phone extraction from React, DOM updates
 */

import {
    createLogger,
    onDOMReady,
    isListingPage,
    createOtomotoMainController,
    findButtonByText,
    getReactFiber,
    searchFiber,
    cleanPhoneNumber,
    isValidPhone,
    type AuthConfig,
    type VinConfig,
    type PhoneConfig,
} from './shared';

// ==================== CONSTANTS ====================

const LOG_PREFIX = '[MotorScope]';
const log = createLogger(LOG_PREFIX);

const CONFIG = {
    MAX_FIBER_DEPTH: 30,
    RETRY_DELAYS: [2000, 4000, 7000],
} as const;

const SELECTORS = {
    // Auth
    LOGIN_BUTTON: '[data-testid="usermenu-link-login"]',
    LOGIN_BUTTON_TEXT: 'span.n-button-text-wrapper',

    // VIN
    VIN_CONTAINER: '[data-testid="vin"]',
    VIN_DISPLAY: '[data-testid="advert-vin"] p',

    // Phone
    SELLER_INFO: '[data-testid="aside-seller-info"]',
    PHONE_BUTTON: '[data-testid="dynamic-numbers-button"]',
    PHONE_CONTAINER: '.e1it56680',
    BUTTON_TEXT_WRAPPER: '.n-button-text-wrapper',
    TEL_LINK: 'a[href^="tel:"]',
} as const;

const TEXTS = {
    LOGIN_PL: 'Zaloguj się',
    SHOW_VIN: 'Wyświetl VIN',
    SHOW_PHONE: 'Wyświetl numer', // Matches both "numer" and "numery"
} as const;

const DATA_ATTRIBUTES = {
    PHONE: 'data-motorscope-phone',
} as const;

const AUTH_CONFIG: AuthConfig = {
    selectors: {
        loginButton: SELECTORS.LOGIN_BUTTON,
        loginButtonText: SELECTORS.LOGIN_BUTTON_TEXT,
    },
    texts: {
        login: TEXTS.LOGIN_PL,
    },
};

const VIN_CONFIG: VinConfig = {
    selectors: {
        container: SELECTORS.VIN_CONTAINER,
        display: SELECTORS.VIN_DISPLAY,
    },
    texts: {
        showVin: TEXTS.SHOW_VIN,
    },
};

const PHONE_CONFIG: PhoneConfig = {
    selectors: {
        sellerInfo: SELECTORS.SELLER_INFO,
        phoneButton: SELECTORS.PHONE_BUTTON,
        phoneContainer: SELECTORS.PHONE_CONTAINER,
        buttonTextWrapper: SELECTORS.BUTTON_TEXT_WRAPPER,
        telLink: SELECTORS.TEL_LINK,
    },
    texts: {
        showPhone: TEXTS.SHOW_PHONE,
    },
    dataAttributes: {
        phone: DATA_ATTRIBUTES.PHONE,
    },
};

// ==================== MAIN ====================

const controller = createOtomotoMainController({
    authConfig: AUTH_CONFIG,
    vinConfig: VIN_CONFIG,
    phoneConfig: PHONE_CONFIG,
}, {
    doc: document,
    log,
    findButtonByText,
    getReactFiber,
    searchFiber,
    cleanPhoneNumber,
    isValidPhone,
    setTimeout,
});

const runExtraction = (): void => {
    controller.runExtraction();
};

const init = (): void => {
    if (!isListingPage()) return;

    log('Content script initialized on listing page');

    // Run with delays to account for React hydration
    CONFIG.RETRY_DELAYS.forEach(delay => setTimeout(runExtraction, delay));
};

// Start
onDOMReady(init);
