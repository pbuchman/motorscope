// Content script for otomoto.pl - runs in MAIN world (page context)
// Handles: VIN reveal, phone extraction from React, DOM updates

const log = (...args: unknown[]) => {
    console.log('[MotoTracker]', ...args);
};

// ==================== HELPERS ====================

/**
 * Clean phone number - remove spaces, dashes, parentheses, and +48 prefix
 */
const cleanPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Remove +48 prefix (Poland country code)
    if (cleaned.startsWith('+48')) {
        cleaned = cleaned.substring(3);
    }
    return cleaned;
};

const isUserLoggedIn = (): boolean => {
    const loginButton = document.querySelector('[data-testid="usermenu-link-login"]');
    if (!loginButton) {
        return true; // No login button = logged in
    }
    const buttonText = loginButton.querySelector('span.n-button-text-wrapper');
    return !buttonText?.textContent?.includes('Zaloguj się');
};

const getReactFiber = (element: HTMLElement): any => {
    const key = Object.keys(element).find(k =>
        k.startsWith('__reactFiber$') ||
        k.startsWith('__reactInternalInstance$')
    );
    return key ? (element as any)[key] : null;
};

// ==================== VIN REVEAL ====================

const isVinRevealed = (): boolean => {
    const vinDisplay = document.querySelector('[data-testid="advert-vin"] p');
    return vinDisplay !== null && !vinDisplay.closest('button');
};

const findVinRevealButton = (): HTMLButtonElement | null => {
    const vinContainer = document.querySelector('[data-testid="vin"]');
    if (!vinContainer) return null;

    const buttons = vinContainer.querySelectorAll('button');
    for (const btn of buttons) {
        if (btn.textContent?.includes('Wyświetl VIN')) {
            return btn as HTMLButtonElement;
        }
    }
    return null;
};

const revealVin = (): void => {
    const vinContainer = document.querySelector('[data-testid="vin"]');
    if (!vinContainer) {
        log('VIN: No VIN container');
        return;
    }

    if (isVinRevealed()) {
        const vinDisplay = document.querySelector('[data-testid="advert-vin"] p');
        log('VIN: Already revealed:', vinDisplay?.textContent);
        return;
    }

    if (!isUserLoggedIn()) {
        log('VIN: User not logged in');
        return;
    }

    const button = findVinRevealButton();
    if (button) {
        log('VIN: Clicking reveal button...');
        button.click();

        setTimeout(() => {
            const vinDisplay = document.querySelector('[data-testid="advert-vin"] p');
            if (vinDisplay && !vinDisplay.closest('button')) {
                log('VIN: SUCCESS! Revealed:', vinDisplay.textContent);
            }
        }, 1000);
    }
};

// ==================== PHONE EXTRACTION ====================

/**
 * Search React fiber tree for phone number
 * Phone can be in props as: number, phoneNumber, phone, or phones (array)
 */
const findPhoneInFiber = (element: HTMLElement): string | null => {
    const fiber = getReactFiber(element);
    if (!fiber) return null;

    const searchFiber = (fiber: any, depth: number, direction: string): string | null => {
        if (!fiber || depth > 30) return null;

        const props = fiber.memoizedProps || fiber.pendingProps || {};

        // Check for phone number in various prop names
        // Can be: number, phoneNumber, phone
        // Format can be: "123456789", "+48123456789", etc.
        const phoneProps = ['number', 'phoneNumber', 'phone'];
        for (const propName of phoneProps) {
            const value = props[propName];
            if (value && typeof value === 'string') {
                // Match phone numbers: optional + prefix, then 6+ digits (may have spaces/dashes)
                const cleaned = value.replace(/[\s\-\(\)]/g, '');
                if (/^\+?\d{6,}$/.test(cleaned)) {
                    return value;
                }
            }
        }

        // Check for phones array prop (e.g., phones: ["123 456 789"])
        if (props.phones && Array.isArray(props.phones) && props.phones.length > 0) {
            const firstPhone = props.phones[0];
            if (typeof firstPhone === 'string') {
                const cleaned = firstPhone.replace(/[\s\-\(\)]/g, '');
                if (/^\+?\d{6,}$/.test(cleaned)) {
                    return firstPhone;
                }
            }
        }

        // Check children for phone numbers (some components pass it as children)
        if (props.children && typeof props.children === 'string') {
            const cleaned = props.children.replace(/[\s\-\(\)]/g, '');
            if (/^\+?\d{6,}$/.test(cleaned)) {
                return props.children;
            }
        }

        if (fiber.child && direction === 'down') {
            const found = searchFiber(fiber.child, depth + 1, 'down');
            if (found) return found;
        }

        if (fiber.sibling && direction === 'down') {
            const found = searchFiber(fiber.sibling, depth + 1, 'down');
            if (found) return found;
        }

        if (fiber.return && direction === 'up') {
            const found = searchFiber(fiber.return, depth + 1, 'up');
            if (found) return found;
        }

        return null;
    };

    let phone = searchFiber(fiber, 0, 'down');
    if (!phone) {
        phone = searchFiber(fiber, 0, 'up');
    }

    return phone;
};

/**
 * Find all phone-related buttons on the page
 * Looks for: .e1it56680 container, data-testid="dynamic-numbers-button", buttons with "Wyświetl numer/numery"
 */
const findAllPhoneButtons = (): HTMLButtonElement[] => {
    const buttons: HTMLButtonElement[] = [];

    // Find by data-testid
    const dynamicBtn = document.querySelector('[data-testid="dynamic-numbers-button"]');
    if (dynamicBtn) {
        buttons.push(dynamicBtn as HTMLButtonElement);
    }

    // Find all buttons containing "Wyświetl numer" or "Wyświetl numery"
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        if (text.includes('Wyświetl numer')) { // Catches both "numer" and "numery"
            if (!buttons.includes(btn as HTMLButtonElement)) {
                buttons.push(btn as HTMLButtonElement);
            }
        }
    });

    return buttons;
};

const extractAndDisplayPhone = (): string | null => {
    // Check if already processed
    const existing = document.body.getAttribute('data-mototracker-phone');
    if (existing) {
        return existing;
    }

    // Check if phone is already visible (tel: link exists)
    const sellerInfo = document.querySelector('[data-testid="aside-seller-info"]');
    if (sellerInfo) {
        const telLink = sellerInfo.querySelector('a[href^="tel:"]');
        if (telLink) {
            const phone = telLink.getAttribute('href')?.replace('tel:', '');
            if (phone) {
                document.body.setAttribute('data-mototracker-phone', phone);
                log('Phone: Already visible in DOM:', phone);
                updateAllPhoneButtons(phone);
                return phone;
            }
        }
    }

    // Find all phone buttons and try to extract from React fiber
    const phoneButtons = findAllPhoneButtons();
    log('Phone: Found', phoneButtons.length, 'phone button(s)');

    for (const btn of phoneButtons) {
        const phone = findPhoneInFiber(btn);
        if (phone) {
            const cleanPhone = cleanPhoneNumber(phone);
            log('Phone: Extracted from React:', cleanPhone);
            document.body.setAttribute('data-mototracker-phone', cleanPhone);
            updateAllPhoneButtons(cleanPhone);
            return cleanPhone;
        }
    }

    // Also try the phone container if exists
    const phoneContainer = document.querySelector('.e1it56680');
    if (phoneContainer) {
        const containerButtons = phoneContainer.querySelectorAll('button');
        for (const btn of containerButtons) {
            const phone = findPhoneInFiber(btn as HTMLElement);
            if (phone) {
                const cleanPhone = cleanPhoneNumber(phone);
                log('Phone: Extracted from container:', cleanPhone);
                document.body.setAttribute('data-mototracker-phone', cleanPhone);
                updateAllPhoneButtons(cleanPhone);
                return cleanPhone;
            }
        }
    }

    log('Phone: Could not extract from React');
    return null;
};

/**
 * Update ALL buttons on the page that show "Wyświetl numer" or "Wyświetl numery"
 */
const updateAllPhoneButtons = (phone: string): void => {
    // Clean phone number using the helper function
    const cleanPhone = cleanPhoneNumber(phone);

    const allButtons = document.querySelectorAll('button');
    let updatedCount = 0;

    allButtons.forEach(btn => {
        const text = btn.textContent?.trim() || '';

        // Check for both singular and plural forms
        if (text.includes('Wyświetl numer')) { // Matches "Wyświetl numer" and "Wyświetl numery"
            // Find the text wrapper span
            const wrapper = btn.querySelector('.n-button-text-wrapper');
            if (wrapper) {
                wrapper.textContent = `📞 ${cleanPhone}`;
                updatedCount++;
            } else {
                // Try to find any span with the text
                const spans = btn.querySelectorAll('span');
                spans.forEach(span => {
                    if (span.textContent?.includes('Wyświetl numer')) {
                        span.textContent = `📞 ${cleanPhone}`;
                        updatedCount++;
                    }
                });
            }
        }
    });

    if (updatedCount > 0) {
        log(`Phone: Updated ${updatedCount} button(s)`);
    }
};

// ==================== MAIN ====================

const init = (): void => {
    if (!window.location.href.includes('/oferta/')) {
        return;
    }

    log('Content script initialized on listing page');

    const runAll = () => {
        // Reveal VIN
        revealVin();

        // Extract and display phone
        const phone = extractAndDisplayPhone();
        if (phone) {
            log('Phone: SUCCESS!', phone);
        }
    };

    // Run with delays to account for React hydration
    setTimeout(runAll, 2000);
    setTimeout(runAll, 4000);
    setTimeout(runAll, 7000);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

