// Content script for otomoto.pl - runs in MAIN world (page context)
// Handles: VIN reveal, phone extraction from React, DOM updates

const log = (...args: unknown[]) => {
    console.log('[MotoTracker]', ...args);
};

// ==================== HELPERS ====================

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

const findPhoneInFiber = (element: HTMLElement): string | null => {
    const fiber = getReactFiber(element);
    if (!fiber) return null;

    const searchFiber = (fiber: any, depth: number, direction: string): string | null => {
        if (!fiber || depth > 30) return null;

        const props = fiber.memoizedProps || fiber.pendingProps || {};

        // Phone number is stored as 'number' prop with 6+ digits
        if (props.number && typeof props.number === 'string' && /^\d{6,}$/.test(props.number)) {
            return props.number;
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
                return phone;
            }
        }
    }

    // Find phone container and extract from React
    const phoneContainer = document.querySelector('.e1it56680');
    if (!phoneContainer) {
        log('Phone: Container .e1it56680 not found');
        return null;
    }

    // Search buttons for phone number in React fiber
    const buttons = phoneContainer.querySelectorAll('button');
    for (const btn of buttons) {
        const phone = findPhoneInFiber(btn as HTMLElement);
        if (phone) {
            log('Phone: Extracted from React:', phone);

            // Store on body
            document.body.setAttribute('data-mototracker-phone', phone);

            // Update ALL buttons on page that show "Wyświetl numer"
            updateAllPhoneButtons(phone);

            return phone;
        }
    }

    log('Phone: Could not extract from React');
    return null;
};

/**
 * Update ALL buttons on the page that show "Wyświetl numer"
 * This is safe because we're only changing text content, not structure
 */
const updateAllPhoneButtons = (phone: string): void => {
    // Find ALL buttons on the page with "Wyświetl numer" text
    const allButtons = document.querySelectorAll('button');
    let updatedCount = 0;

    allButtons.forEach(btn => {
        const wrapper = btn.querySelector('.n-button-text-wrapper');
        if (wrapper && wrapper.textContent?.includes('Wyświetl numer')) {
            wrapper.textContent = `Numer sprzedawcy: ${phone}`;
            updatedCount++;
        }

        // Also check direct text content
        if (btn.textContent?.includes('Wyświetl numer') && !btn.querySelector('.n-button-text-wrapper')) {
            // Find the text node and update it
            const spanElements = btn.querySelectorAll('span');
            spanElements.forEach(span => {
                if (span.textContent?.includes('Wyświetl numer')) {
                    span.textContent = `Numer sprzedawcy: ${phone}`;
                    updatedCount++;
                }
            });
        }
    });

    if (updatedCount > 0) {
        log(`Phone: Updated ${updatedCount} button(s) with phone number`);
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

