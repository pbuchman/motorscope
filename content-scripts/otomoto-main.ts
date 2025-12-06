// Content script for otomoto.pl - runs in MAIN world (page context)
// This script extracts phone number from React fiber and exposes it via data attribute
// DO NOT modify DOM - it will crash React

const log = (...args: unknown[]) => {
    console.log('[MotoTracker:Main]', ...args);
};

/**
 * Find React fiber on element
 */
const getReactFiber = (element: HTMLElement): any => {
    const key = Object.keys(element).find(k =>
        k.startsWith('__reactFiber$') ||
        k.startsWith('__reactInternalInstance$')
    );
    return key ? (element as any)[key] : null;
};

/**
 * Search fiber tree for phone number
 * The component has props: { number: "603604569", visible: false, onClick: () => {} }
 */
const findPhoneInFiber = (startElement: HTMLElement): string | null => {
    const fiber = getReactFiber(startElement);
    if (!fiber) return null;

    const searchFiber = (fiber: any, depth: number, direction: string): string | null => {
        if (!fiber || depth > 30) return null;

        const props = fiber.memoizedProps || fiber.pendingProps || {};

        // Check for phone number prop - it's a string of digits
        if (props.number && typeof props.number === 'string' && /^\d{6,}$/.test(props.number)) {
            log(`Found phone number in ${direction} fiber at depth ${depth}:`, props.number);
            return props.number;
        }

        // Check child fibers
        if (fiber.child && direction === 'down') {
            const found = searchFiber(fiber.child, depth + 1, 'down');
            if (found) return found;
        }

        // Check sibling fibers
        if (fiber.sibling && direction === 'down') {
            const found = searchFiber(fiber.sibling, depth + 1, 'down');
            if (found) return found;
        }

        // Check parent fibers
        if (fiber.return && direction === 'up') {
            const found = searchFiber(fiber.return, depth + 1, 'up');
            if (found) return found;
        }

        return null;
    };

    // Search down first, then up
    let phone = searchFiber(fiber, 0, 'down');
    if (!phone) {
        phone = searchFiber(fiber, 0, 'up');
    }

    return phone;
};

/**
 * Extract phone number from React components
 */
const extractPhoneNumber = (): string | null => {
    // Check if already extracted
    const existing = document.body.getAttribute('data-mototracker-phone');
    if (existing) {
        log('Phone already extracted:', existing);
        return existing;
    }

    // Find the phone button container
    const phoneContainer = document.querySelector('.e1it56680');
    if (!phoneContainer) {
        log('Phone container .e1it56680 not found');
        return null;
    }

    log('Found phone container, searching React fiber...');

    // Try buttons first
    const buttons = phoneContainer.querySelectorAll('button');
    for (const btn of buttons) {
        const phone = findPhoneInFiber(btn as HTMLElement);
        if (phone) {
            // Store on body as data attribute (doesn't affect React)
            document.body.setAttribute('data-mototracker-phone', phone);

            // Dispatch custom event for other scripts
            window.dispatchEvent(new CustomEvent('mototracker:phone-extracted', {
                detail: { phone }
            }));

            log('Phone extracted and stored:', phone);
            return phone;
        }
    }

    // Try container and all children
    const allElements = [phoneContainer, ...phoneContainer.querySelectorAll('*')];
    for (const el of allElements) {
        const phone = findPhoneInFiber(el as HTMLElement);
        if (phone) {
            document.body.setAttribute('data-mototracker-phone', phone);
            window.dispatchEvent(new CustomEvent('mototracker:phone-extracted', {
                detail: { phone }
            }));
            log('Phone extracted and stored:', phone);
            return phone;
        }
    }

    log('Could not find phone in React fiber');
    return null;
};

/**
 * Initialize
 */
const init = (): void => {
    if (!window.location.href.includes('/oferta/')) {
        return;
    }

    log('Main world script initialized - will extract phone from React');

    const tryExtract = (attempt: number) => {
        log(`Attempt ${attempt}: Extracting phone...`);
        const phone = extractPhoneNumber();
        if (phone) {
            log('SUCCESS! Phone number available:', phone);
        }
    };

    // Try multiple times as React may still be hydrating
    setTimeout(() => tryExtract(1), 2000);
    setTimeout(() => tryExtract(2), 4000);
    setTimeout(() => tryExtract(3), 7000);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

