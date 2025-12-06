/**
 * Content script for otomoto.pl - runs in MAIN world (page context)
 * Handles: VIN reveal, phone extraction from React, DOM updates
 */

// ==================== TYPES ====================

interface ReactFiber {
    memoizedProps?: Record<string, unknown>;
    pendingProps?: Record<string, unknown>;
    child?: ReactFiber;
    sibling?: ReactFiber;
    return?: ReactFiber;
}

type SearchDirection = 'up' | 'down';

// ==================== CONSTANTS ====================

const CONFIG = {
    LOG_PREFIX: '[MotorScope]',
    LISTING_PATH: '/oferta/',
    POLAND_COUNTRY_CODE: '+48',
    MAX_FIBER_DEPTH: 30,
    PHONE_REGEX: /^\+?\d{6,}$/,
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

// ==================== UTILITIES ====================

const log = (...args: unknown[]): void => {
    console.log(CONFIG.LOG_PREFIX, ...args);
};

/**
 * Clean phone number - remove formatting and Polish country code
 */
const cleanPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return cleaned.startsWith(CONFIG.POLAND_COUNTRY_CODE)
        ? cleaned.slice(CONFIG.POLAND_COUNTRY_CODE.length)
        : cleaned;
};

/**
 * Check if a string is a valid phone number
 */
const isValidPhone = (value: string): boolean => {
    const cleaned = value.replace(/[\s\-()]/g, '');
    return CONFIG.PHONE_REGEX.test(cleaned);
};

/**
 * Find a button by text content within a container
 */
const findButtonByText = (container: Element | Document, text: string): HTMLButtonElement | null => {
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
        if (btn.textContent?.includes(text)) {
            return btn as HTMLButtonElement;
        }
    }
    return null;
};

/**
 * Get React fiber from DOM element
 */
const getReactFiber = (element: HTMLElement): ReactFiber | null => {
    const key = Object.keys(element).find(k =>
        k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    return key ? (element as unknown as Record<string, ReactFiber>)[key] : null;
};

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

const PhoneModule = {
    /**
     * Search React fiber tree for phone number
     */
    searchFiber(fiber: ReactFiber | null | undefined, depth: number, direction: SearchDirection): string | null {
        if (!fiber || depth > CONFIG.MAX_FIBER_DEPTH) return null;

        const props = (fiber.memoizedProps || fiber.pendingProps || {}) as Record<string, unknown>;

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

        // Traverse fiber tree
        if (direction === 'down') {
            const fromChild = this.searchFiber(fiber.child, depth + 1, 'down');
            if (fromChild) return fromChild;

            const fromSibling = this.searchFiber(fiber.sibling, depth + 1, 'down');
            if (fromSibling) return fromSibling;
        } else {
            const fromParent = this.searchFiber(fiber.return, depth + 1, 'up');
            if (fromParent) return fromParent;
        }

        return null;
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

const isListingPage = (): boolean => window.location.href.includes(CONFIG.LISTING_PATH);

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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

