/**
 * Content script for otomoto.pl - runs in MAIN world (page context)
 * Handles: VIN reveal, phone extraction from React, DOM updates
 */

import {
    createLogger,
    findButtonByText,
    onDOMReady,
    isListingPage,
    cleanPhoneNumber,
    isValidPhone,
    getReactFiber,
    searchFiber,
    type ReactFiber,
    type SearchDirection,
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

// ==================== AUTH ====================

const isUserLoggedIn = (): boolean => {
    const loginButton = document.querySelector(SELECTORS.LOGIN_BUTTON);
    if (!loginButton) return true; // No login button = logged in

    const buttonText = loginButton.querySelector(SELECTORS.LOGIN_BUTTON_TEXT);
    return !buttonText?.textContent?.includes(TEXTS.LOGIN_PL);
};

// ==================== VIN MODULE ====================

const VinModule = {
    isRevealed(): boolean {
        const vinDisplay = document.querySelector(SELECTORS.VIN_DISPLAY);
        return vinDisplay !== null && !vinDisplay.closest('button');
    },

    findRevealButton(): HTMLButtonElement | null {
        const container = document.querySelector(SELECTORS.VIN_CONTAINER);
        return container ? findButtonByText(container, TEXTS.SHOW_VIN) : null;
    },

    getDisplayedVin(): string | null {
        const display = document.querySelector(SELECTORS.VIN_DISPLAY);
        return display?.textContent ?? null;
    },

    reveal(): void {
        const container = document.querySelector(SELECTORS.VIN_CONTAINER);
        if (!container) {
            log('VIN: No container found');
            return;
        }

        if (this.isRevealed()) {
            log('VIN: Already revealed:', this.getDisplayedVin());
            return;
        }

        if (!isUserLoggedIn()) {
            log('VIN: User not logged in');
            return;
        }

        const button = this.findRevealButton();
        if (!button) {
            log('VIN: No reveal button found');
            return;
        }

        log('VIN: Clicking reveal button...');
        button.click();

        setTimeout(() => {
            if (this.isRevealed()) {
                log('VIN: SUCCESS! Revealed:', this.getDisplayedVin());
            }
        }, 1000);
    },
};

// ==================== PHONE MODULE ====================

/**
 * Phone predicate for searching React fiber tree
 */
const findPhoneInProps = (props: Record<string, unknown>): string | null => {
    // Check single-value phone props
    const phoneProps = ['number', 'phoneNumber', 'phone'];
    for (const propName of phoneProps) {
        const value = props[propName];
        if (typeof value === 'string' && isValidPhone(value)) {
            return value;
        }
    }

    // Check phones array prop
    const phones = props.phones;
    if (Array.isArray(phones) && phones.length > 0) {
        const firstPhone = phones[0];
        if (typeof firstPhone === 'string' && isValidPhone(firstPhone)) {
            return firstPhone;
        }
    }

    // Check children as string
    const children = props.children;
    if (typeof children === 'string' && isValidPhone(children)) {
        return children;
    }

    return null;
};

const PhoneModule = {
    /**
     * Search React fiber tree for phone number
     */
    searchFiber(fiber: ReactFiber | null | undefined, depth: number, direction: SearchDirection): string | null {
        return searchFiber(fiber, {
            direction,
            maxDepth: CONFIG.MAX_FIBER_DEPTH,
            predicate: findPhoneInProps,
        }, depth) as string | null;
    },

    /**
     * Extract phone from a DOM element's React fiber
     */
    extractFromElement(element: HTMLElement): string | null {
        const fiber = getReactFiber(element);
        if (!fiber) return null;

        return this.searchFiber(fiber, 0, 'down') ?? this.searchFiber(fiber, 0, 'up');
    },

    /**
     * Find all phone-related buttons on the page
     */
    findAllButtons(): HTMLButtonElement[] {
        const buttons = new Set<HTMLButtonElement>();

        // By data-testid
        const dynamicBtn = document.querySelector(SELECTORS.PHONE_BUTTON);
        if (dynamicBtn) buttons.add(dynamicBtn as HTMLButtonElement);

        // By text content
        document.querySelectorAll('button').forEach(btn => {
            if (btn.textContent?.includes(TEXTS.SHOW_PHONE)) {
                buttons.add(btn as HTMLButtonElement);
            }
        });

        return Array.from(buttons);
    },

    /**
     * Get phone from tel: link if already visible
     */
    getVisiblePhone(): string | null {
        const sellerInfo = document.querySelector(SELECTORS.SELLER_INFO);
        const telLink = sellerInfo?.querySelector(SELECTORS.TEL_LINK);
        return telLink?.getAttribute('href')?.replace('tel:', '') ?? null;
    },

    /**
     * Get cached phone from data attribute
     */
    getCachedPhone(): string | null {
        return document.body.getAttribute(DATA_ATTRIBUTES.PHONE);
    },

    /**
     * Store phone in data attribute
     */
    cachePhone(phone: string): void {
        document.body.setAttribute(DATA_ATTRIBUTES.PHONE, phone);
    },

    /**
     * Update button text to show phone number
     */
    updateButtonText(button: Element, phone: string): boolean {
        const wrapper = button.querySelector(SELECTORS.BUTTON_TEXT_WRAPPER);
        if (wrapper) {
            wrapper.textContent = `📞 ${phone}`;
            return true;
        }

        // Fallback: find span with matching text
        const spans = button.querySelectorAll('span');
        for (const span of spans) {
            if (span.textContent?.includes(TEXTS.SHOW_PHONE)) {
                span.textContent = `📞 ${phone}`;
                return true;
            }
        }
        return false;
    },

    /**
     * Update all phone buttons on the page
     */
    updateAllButtons(phone: string): void {
        const cleanPhone = cleanPhoneNumber(phone);
        let updatedCount = 0;

        document.querySelectorAll('button').forEach(btn => {
            if (btn.textContent?.includes(TEXTS.SHOW_PHONE)) {
                if (this.updateButtonText(btn, cleanPhone)) {
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            log(`Phone: Updated ${updatedCount} button(s)`);
        }
    },

    /**
     * Main extraction and display logic
     */
    extractAndDisplay(): string | null {
        // Return cached if exists
        const cached = this.getCachedPhone();
        if (cached) return cached;

        // Check if already visible in DOM
        const visible = this.getVisiblePhone();
        if (visible) {
            const clean = cleanPhoneNumber(visible);
            this.cachePhone(clean);
            this.updateAllButtons(clean);
            log('Phone: Already visible in DOM:', clean);
            return clean;
        }

        // Try to extract from React fiber
        const buttons = this.findAllButtons();
        log('Phone: Found', buttons.length, 'phone button(s)');

        for (const btn of buttons) {
            const phone = this.extractFromElement(btn);
            if (phone) {
                const clean = cleanPhoneNumber(phone);
                this.cachePhone(clean);
                this.updateAllButtons(clean);
                log('Phone: Extracted from React:', clean);
                return clean;
            }
        }

        // Try phone container as fallback
        const container = document.querySelector(SELECTORS.PHONE_CONTAINER);
        if (container) {
            for (const btn of container.querySelectorAll('button')) {
                const phone = this.extractFromElement(btn as HTMLElement);
                if (phone) {
                    const clean = cleanPhoneNumber(phone);
                    this.cachePhone(clean);
                    this.updateAllButtons(clean);
                    log('Phone: Extracted from container:', clean);
                    return clean;
                }
            }
        }

        log('Phone: Could not extract from React');
        return null;
    },
};

// ==================== MAIN ====================

const runExtraction = (): void => {
    VinModule.reveal();

    const phone = PhoneModule.extractAndDisplay();
    if (phone) {
        log('Phone: SUCCESS!', phone);
    }
};

const init = (): void => {
    if (!isListingPage()) return;

    log('Content script initialized on listing page');

    // Run with delays to account for React hydration
    CONFIG.RETRY_DELAYS.forEach(delay => setTimeout(runExtraction, delay));
};

// Start
onDOMReady(init);
