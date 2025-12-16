/**
 * DOM utilities for content scripts
 */

/**
 * Wait for DOM to be ready and execute callback
 */
export const onDOMReady = (callback: () => void): void => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
};

/**
 * Find a button by text content within a container
 */
export const findButtonByText = (
    container: Element | Document,
    text: string,
): HTMLButtonElement | null => {
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
        if (btn.textContent?.includes(text)) {
            return btn as HTMLButtonElement;
        }
    }
    return null;
};

/**
 * Debounced callback executor
 */
export const createDebouncer = (delayMs: number) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return (callback: () => void): void => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(callback, delayMs);
    };
};

/**
 * Create a mutation observer that watches for elements matching a selector
 */
export interface MutationObserverConfig {
    /** CSS selector to match new elements */
    selector: string;
    /** Callback when matching elements are found */
    onMatch: () => void;
    /** Debounce delay in milliseconds */
    debounceMs?: number;
    /** Element to observe (defaults to document.body) */
    root?: Element;
}

export const createSelectorObserver = (config: MutationObserverConfig): MutationObserver => {
    const {selector, onMatch, debounceMs = 300, root = document.body} = config;
    const debounce = createDebouncer(debounceMs);

    const observer = new MutationObserver((mutations) => {
        const hasMatch = mutations.some(mutation => {
            return Array.from(mutation.addedNodes).some(node => {
                if (node instanceof Element) {
                    return node.matches(selector) || node.querySelector(selector) !== null;
                }
                return false;
            });
        });

        if (hasMatch) {
            debounce(onMatch);
        }
    });

    observer.observe(root, {
        childList: true,
        subtree: true,
    });

    return observer;
};

