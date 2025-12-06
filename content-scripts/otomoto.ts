// Content script for otomoto.pl
// Auto-reveals VIN number and phone number for logged-in users

const log = (...args: unknown[]) => {
    console.log('[MotoTracker:Otomoto]', ...args);
};

const SELECTORS = {
    // Login detection
    loginButton: '[data-testid="usermenu-link-login"]',
    loginButtonText: 'span.n-button-text-wrapper',
    // VIN related
    vinContainer: '[data-testid="vin"]',
    vinRevealButton: '[data-testid="advert-vin"] button',
    vinDisplay: '[data-testid="advert-vin"] p',
    // Phone number related
    sellerInfoContainer: '[data-testid="aside-seller-info"]',
    phoneButtonContainer: '.e1it56680', // Container with phone buttons
};

/**
 * Check if user is logged in by verifying login button is NOT present
 */
const isUserLoggedIn = (): boolean => {
    const loginButton = document.querySelector(SELECTORS.loginButton);

    if (!loginButton) {
        log('No login button - user appears to be logged in');
        return true;
    }

    const buttonText = loginButton.querySelector(SELECTORS.loginButtonText);
    return !buttonText?.textContent?.includes('Zaloguj się');
};

// ==================== VIN REVEAL ====================

/**
 * Check if VIN is already revealed
 */
const isVinRevealed = (): boolean => {
    const vinDisplay = document.querySelector(SELECTORS.vinDisplay);
    return vinDisplay !== null && !vinDisplay.closest('button');
};

/**
 * Find the "Wyświetl VIN" button
 */
const findVinRevealButton = (): HTMLButtonElement | null => {
    let button = document.querySelector<HTMLButtonElement>(SELECTORS.vinRevealButton);
    if (button?.textContent?.includes('Wyświetl VIN')) {
        return button;
    }

    const vinContainer = document.querySelector(SELECTORS.vinContainer);
    if (vinContainer) {
        const buttons = vinContainer.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent?.includes('Wyświetl VIN')) {
                return btn as HTMLButtonElement;
            }
        }
    }

    const allButtons = document.querySelectorAll('button');
    for (const btn of allButtons) {
        if (btn.textContent?.includes('Wyświetl VIN')) {
            return btn as HTMLButtonElement;
        }
    }

    return null;
};

/**
 * Click the "Wyświetl VIN" button to reveal VIN
 */
const revealVin = (): boolean => {
    const revealButton = findVinRevealButton();
    if (!revealButton) {
        log('VIN reveal button not found');
        return false;
    }
    log('Clicking VIN reveal button...');
    revealButton.click();
    return true;
};

/**
 * Check and reveal VIN
 */
const checkAndRevealVin = (): void => {
    const vinContainer = document.querySelector(SELECTORS.vinContainer);
    log('VIN container found:', !!vinContainer);

    if (!vinContainer) {
        log('No VIN container on this page');
        return;
    }

    if (isVinRevealed()) {
        const vinDisplay = document.querySelector(SELECTORS.vinDisplay);
        log('VIN already revealed:', vinDisplay?.textContent);
        return;
    }

    if (!isUserLoggedIn()) {
        log('User not logged in - cannot auto-reveal VIN');
        return;
    }

    log('Attempting to reveal VIN...');
    const clicked = revealVin();

    if (clicked) {
        setTimeout(() => {
            const vinDisplay = document.querySelector(SELECTORS.vinDisplay);
            if (vinDisplay && !vinDisplay.closest('button')) {
                log('SUCCESS! VIN revealed:', vinDisplay.textContent);
            } else {
                setTimeout(() => {
                    const vinDisplay2 = document.querySelector(SELECTORS.vinDisplay);
                    if (vinDisplay2 && !vinDisplay2.closest('button')) {
                        log('SUCCESS! VIN revealed (delayed):', vinDisplay2.textContent);
                    } else {
                        log('VIN reveal may have failed - button clicked but VIN not visible');
                    }
                }, 2000);
            }
        }, 1000);
    }
};

// ==================== PHONE NUMBER REVEAL ====================

/**
 * Check if phone number is already revealed by looking for tel: link
 */
const isPhoneRevealed = (): boolean => {
    const sellerInfo = document.querySelector(SELECTORS.sellerInfoContainer);
    if (!sellerInfo) return false;

    // Phone is revealed if there's a tel: link in the seller info
    const telLink = sellerInfo.querySelector('a[href^="tel:"]');
    if (telLink) {
        return true;
    }

    // Check if "Wyświetl numer" button exists
    const buttons = sellerInfo.querySelectorAll('button');
    for (const btn of buttons) {
        if (btn.textContent?.includes('Wyświetl numer')) {
            return false; // Button exists, so phone is NOT revealed yet
        }
    }

    return false;
};

/**
 * Get the revealed phone number if available
 * Checks: 1) tel: link in DOM, 2) extracted phone from React (data attribute)
 */
const getRevealedPhoneNumber = (): string | null => {
    // First check for tel: link (native reveal)
    const sellerInfo = document.querySelector(SELECTORS.sellerInfoContainer);
    if (sellerInfo) {
        const telLink = sellerInfo.querySelector('a[href^="tel:"]');
        if (telLink) {
            const href = telLink.getAttribute('href');
            if (href) {
                return href.replace('tel:', '');
            }
        }
    }

    // Check for phone extracted from React by main world script
    const extractedPhone = document.body.getAttribute('data-mototracker-phone');
    if (extractedPhone) {
        log('Phone: Got phone from React extraction:', extractedPhone);
        return extractedPhone;
    }

    return null;
};

/**
 * Find the "Wyświetl numer" button - try the button container first
 */
const findPhoneRevealButton = (): HTMLButtonElement | null => {
    // First try the specific container class from the DOM
    const phoneContainer = document.querySelector('.e1it56680');
    if (phoneContainer) {
        log('Phone: Found phone button container .e1it56680');
        const buttons = phoneContainer.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent?.includes('Wyświetl numer')) {
                log('Phone: Found button in container with text:', btn.textContent?.trim());
                return btn as HTMLButtonElement;
            }
        }
    }

    // Fallback to seller info container
    const sellerInfo = document.querySelector(SELECTORS.sellerInfoContainer);
    if (!sellerInfo) {
        log('Phone: Seller info container not found');
        return null;
    }

    const buttons = sellerInfo.querySelectorAll('button');
    for (const btn of buttons) {
        if (btn.textContent?.includes('Wyświetl numer')) {
            log('Phone: Found button with text:', btn.textContent?.trim());
            return btn as HTMLButtonElement;
        }
    }

    log('Phone: No "Wyświetl numer" button found');
    return null;
};

/**
 * Click the "Wyświetl numer" button to reveal phone number
 * Using simple .click() like the working VIN reveal
 */
const revealPhone = (): boolean => {
    const revealButton = findPhoneRevealButton();
    if (!revealButton) {
        log('Phone: Reveal button not found');
        return false;
    }
    log('Phone: Clicking reveal button...');
    revealButton.click();
    return true;
};

/**
 * Check and reveal phone number
 */
const checkAndRevealPhone = (): void => {
    const sellerInfo = document.querySelector(SELECTORS.sellerInfoContainer);
    log('Phone: Seller info container found:', !!sellerInfo);

    if (!sellerInfo) {
        log('Phone: No seller info container on this page');
        return;
    }

    // Check if already revealed (from DOM or React extraction)
    const existingPhone = getRevealedPhoneNumber();
    if (existingPhone) {
        log('Phone: Phone number available:', existingPhone);
        return;
    }

    if (isPhoneRevealed()) {
        log('Phone: Phone appears to be revealed');
        return;
    }

    if (!isUserLoggedIn()) {
        log('Phone: User not logged in - cannot auto-reveal phone');
        return;
    }

    // Don't click the button - the main world script will extract from React
    // Just wait and check periodically for the extracted phone
    log('Phone: Waiting for phone extraction from React...');

    const checkExtracted = (attempt: number) => {
        const phone = getRevealedPhoneNumber();
        if (phone) {
            log('Phone: SUCCESS! Phone number extracted:', phone);
            return;
        }
        if (attempt < 10) {
            setTimeout(() => checkExtracted(attempt + 1), 1000);
        } else {
            log('Phone: Could not get phone number after 10 attempts');
        }
    };

    // Start checking after a delay to let main world script run
    setTimeout(() => checkExtracted(1), 3000);
};

// ==================== MAIN ====================

/**
 * Main function to check and reveal both VIN and phone number
 */
const checkAndRevealAll = (): void => {
    if (!window.location.href.includes('/oferta/')) {
        log('Not on a listing page, skipping');
        return;
    }

    log('Checking listing page for VIN and phone number...');

    // Check and reveal VIN
    checkAndRevealVin();

    // Check and reveal phone number (with slight delay to avoid conflicts)
    setTimeout(() => {
        checkAndRevealPhone();
    }, 500);
};

/**
 * Initialize the content script
 */
const init = (): void => {
    log('Content script initialized');

    const runCheck = () => setTimeout(checkAndRevealAll, 2000);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runCheck);
    } else {
        runCheck();
    }

    let checkTimeout: number | null = null;

    const observer = new MutationObserver(() => {
        if (checkTimeout) clearTimeout(checkTimeout);
        checkTimeout = window.setTimeout(() => {
            // Check if VIN needs revealing
            const vinContainer = document.querySelector(SELECTORS.vinContainer);
            if (vinContainer && !isVinRevealed()) {
                checkAndRevealVin();
            }

            // Check if phone needs revealing
            const sellerInfo = document.querySelector(SELECTORS.sellerInfoContainer);
            if (sellerInfo && !isPhoneRevealed()) {
                checkAndRevealPhone();
            }
        }, 1000);
    });

    if (document.body) {
        observer.observe(document.body, {childList: true, subtree: true});
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {childList: true, subtree: true});
        });
    }
};

init();

