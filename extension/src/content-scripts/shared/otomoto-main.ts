import type {ReactFiber, SearchDirection} from './react';
import {cleanPhoneNumber, isValidPhone} from './phone';
import {getReactFiber, searchFiber} from './react';
import {findButtonByText} from './dom';

export interface AuthConfig {
    selectors: {
        loginButton: string;
        loginButtonText: string;
    };
    texts: {
        login: string;
    };
}

export const isUserLoggedIn = (doc: Document, config: AuthConfig): boolean => {
    const loginButton = doc.querySelector(config.selectors.loginButton);
    if (!loginButton) {
        return true;
    }

    const buttonText = loginButton.querySelector(config.selectors.loginButtonText);
    return !buttonText?.textContent?.includes(config.texts.login);
};

export interface VinConfig {
    selectors: {
        container: string;
        display: string;
    };
    texts: {
        showVin: string;
    };
}

export interface VinDependencies {
    doc: Document;
    log: (...args: unknown[]) => void;
    findButtonByText: typeof findButtonByText;
    isUserLoggedIn: () => boolean;
    setTimeout: typeof window.setTimeout;
}

export interface VinModule {
    isRevealed(): boolean;
    findRevealButton(): HTMLButtonElement | null;
    getDisplayedVin(): string | null;
    reveal(): void;
}

export const createVinModule = (config: VinConfig, deps: VinDependencies): VinModule => {
    const {doc, log, findButtonByText: findButton, isUserLoggedIn: loggedIn, setTimeout} = deps;

    const isRevealed = (): boolean => {
        const vinDisplay = doc.querySelector(config.selectors.display);
        return vinDisplay !== null && !vinDisplay.closest('button');
    };

    const findRevealButton = (): HTMLButtonElement | null => {
        const container = doc.querySelector(config.selectors.container);
        if (!container) return null;
        return findButton(container, config.texts.showVin);
    };

    const getDisplayedVin = (): string | null => {
        const display = doc.querySelector(config.selectors.display);
        return display?.textContent ?? null;
    };

    const reveal = (): void => {
        const container = doc.querySelector(config.selectors.container);
        if (!container) {
            log('VIN: No container found');
            return;
        }

        if (isRevealed()) {
            log('VIN: Already revealed:', getDisplayedVin());
            return;
        }

        if (!loggedIn()) {
            log('VIN: User not logged in');
            return;
        }

        const button = findRevealButton();
        if (!button) {
            log('VIN: No reveal button found');
            return;
        }

        log('VIN: Clicking reveal button...');
        button.click();

        setTimeout(() => {
            if (isRevealed()) {
                log('VIN: SUCCESS! Revealed:', getDisplayedVin());
            }
        }, 1000);
    };

    return {
        isRevealed,
        findRevealButton,
        getDisplayedVin,
        reveal,
    };
};

export interface PhoneConfig {
    selectors: {
        sellerInfo: string;
        phoneButton: string;
        phoneContainer: string;
        buttonTextWrapper: string;
        telLink: string;
    };
    texts: {
        showPhone: string;
    };
    dataAttributes: {
        phone: string;
    };
}

export interface PhoneDependencies {
    doc: Document;
    log: (...args: unknown[]) => void;
    cleanPhoneNumber: typeof cleanPhoneNumber;
    isValidPhone: typeof isValidPhone;
    getReactFiber: (element: HTMLElement) => ReactFiber | null;
    searchFiber: typeof searchFiber;
}

export interface PhoneModule {
    findAllButtons(): HTMLButtonElement[];
    updateButtonText(button: Element, phone: string): boolean;
    updateAllButtons(phone: string): void;
    getVisiblePhone(): string | null;
    getCachedPhone(): string | null;
    cachePhone(phone: string): void;
    extractFromElement(element: HTMLElement): string | null;
    extractAndDisplay(): string | null;
}

export const PHONE_SEARCH_CONFIG = {
    singleValueProps: ['number', 'phoneNumber', 'phone'],
    arrayProp: 'phones',
} as const;

export const findPhoneInProps = (
    props: Record<string, unknown>,
    validator: (value: string) => boolean,
): string | null => {
    const singleValueProps = ['number', 'phoneNumber', 'phone'];
    for (const prop of singleValueProps) {
        const value = props[prop];
        if (typeof value === 'string' && validator(value)) {
            return value;
        }
    }

    const phones = props.phones;
    if (Array.isArray(phones) && phones.length > 0) {
        const firstPhone = phones[0];
        if (typeof firstPhone === 'string' && validator(firstPhone)) {
            return firstPhone;
        }
    }

    const children = props.children;
    if (typeof children === 'string' && validator(children)) {
        return children;
    }

    return null;
};

const searchFiberForPhone = (
    fiber: ReactFiber | null | undefined,
    direction: SearchDirection,
    deps: PhoneDependencies,
): string | null => {
    return deps.searchFiber(fiber, {
        direction,
        maxDepth: 30,
        predicate: (props) => findPhoneInProps(props, deps.isValidPhone),
    }, 0) as string | null;
};

const updateButtonTextContent = (
    button: Element,
    phone: string,
    config: PhoneConfig,
): boolean => {
    const wrapper = button.querySelector(config.selectors.buttonTextWrapper);
    if (wrapper) {
        wrapper.textContent = `📞 ${phone}`;
        return true;
    }

    const spans = button.querySelectorAll('span');
    for (const span of spans) {
        if (span.textContent?.includes(config.texts.showPhone)) {
            span.textContent = `📞 ${phone}`;
            return true;
        }
    }

    return false;
};

export const createPhoneModule = (config: PhoneConfig, deps: PhoneDependencies): PhoneModule => {
    const {doc, log, cleanPhoneNumber: cleanPhone, getReactFiber: getFiber} = deps;

    const findAllButtons = (): HTMLButtonElement[] => {
        const buttons = new Set<HTMLButtonElement>();
        const dataTestButton = doc.querySelector(config.selectors.phoneButton);
        if (dataTestButton) {
            buttons.add(dataTestButton as HTMLButtonElement);
        }

        doc.querySelectorAll('button').forEach(btn => {
            if (btn.textContent?.includes(config.texts.showPhone)) {
                buttons.add(btn as HTMLButtonElement);
            }
        });

        return Array.from(buttons);
    };

    const updateButtonText = (button: Element, phone: string): boolean => {
        return updateButtonTextContent(button, phone, config);
    };

    const updateAllButtons = (phone: string): void => {
        const clean = cleanPhone(phone);
        let updated = 0;
        doc.querySelectorAll('button').forEach(btn => {
            if (btn.textContent?.includes(config.texts.showPhone)) {
                if (updateButtonText(btn, clean)) {
                    updated += 1;
                }
            }
        });

        if (updated > 0) {
            log(`Phone: Updated ${updated} button(s)`);
        }
    };

    const getVisiblePhone = (): string | null => {
        const sellerInfo = doc.querySelector(config.selectors.sellerInfo);
        const telLink = sellerInfo?.querySelector(config.selectors.telLink);
        return telLink?.getAttribute('href')?.replace('tel:', '') ?? null;
    };

    const getCachedPhone = (): string | null => {
        return doc.body.getAttribute(config.dataAttributes.phone);
    };

    const cachePhone = (phone: string): void => {
        doc.body.setAttribute(config.dataAttributes.phone, phone);
    };

    const extractFromElement = (element: HTMLElement): string | null => {
        const fiber = getFiber(element);
        if (!fiber) return null;

        return (
            searchFiberForPhone(fiber, 'down', deps) ??
            searchFiberForPhone(fiber, 'up', deps)
        );
    };

    const extractFromButtons = (buttons: Iterable<HTMLElement>): string | null => {
        for (const btn of buttons) {
            const phone = extractFromElement(btn);
            if (phone) {
                return phone;
            }
        }
        return null;
    };

    const extractAndDisplay = (): string | null => {
        const cached = getCachedPhone();
        if (cached) {
            return cached;
        }

        const visible = getVisiblePhone();
        if (visible) {
            const clean = cleanPhone(visible);
            cachePhone(clean);
            updateAllButtons(clean);
            log('Phone: Already visible in DOM:', clean);
            return clean;
        }

        const buttons = findAllButtons();
        log('Phone: Found', buttons.length, 'phone button(s)');

        const fromButtons = extractFromButtons(buttons);
        if (fromButtons) {
            const clean = cleanPhone(fromButtons);
            cachePhone(clean);
            updateAllButtons(clean);
            log('Phone: Extracted from React:', clean);
            return clean;
        }

        const container = doc.querySelector(config.selectors.phoneContainer);
        if (container) {
            const fallbackButtons = Array.from(container.querySelectorAll('button')) as HTMLElement[];
            const fromContainer = extractFromButtons(fallbackButtons);
            if (fromContainer) {
                const clean = cleanPhone(fromContainer);
                cachePhone(clean);
                updateAllButtons(clean);
                log('Phone: Extracted from container:', clean);
                return clean;
            }
        }

        log('Phone: Could not extract from React');
        return null;
    };

    return {
        findAllButtons,
        updateButtonText,
        updateAllButtons,
        getVisiblePhone,
        getCachedPhone,
        cachePhone,
        extractFromElement,
        extractAndDisplay,
    };
};

export interface OtomotoMainOptions {
    authConfig: AuthConfig;
    vinConfig: VinConfig;
    phoneConfig: PhoneConfig;
}

export interface OtomotoMainDependencies {
    doc: Document;
    log: (...args: unknown[]) => void;
    findButtonByText: typeof findButtonByText;
    getReactFiber: typeof getReactFiber;
    searchFiber: typeof searchFiber;
    cleanPhoneNumber: typeof cleanPhoneNumber;
    isValidPhone: typeof isValidPhone;
    setTimeout: typeof window.setTimeout;
    createVinModule?: (config: VinConfig, deps: VinDependencies) => VinModule;
    createPhoneModule?: (config: PhoneConfig, deps: PhoneDependencies) => PhoneModule;
}

export interface OtomotoMainController {
    runExtraction: () => string | null;
}

export const createOtomotoMainController = (
    options: OtomotoMainOptions,
    deps: OtomotoMainDependencies,
): OtomotoMainController => {
    const createVin = deps.createVinModule ?? createVinModule;
    const createPhone = deps.createPhoneModule ?? createPhoneModule;

    const vinModule = createVin(options.vinConfig, {
        doc: deps.doc,
        log: deps.log,
        findButtonByText: deps.findButtonByText,
        isUserLoggedIn: () => isUserLoggedIn(deps.doc, options.authConfig),
        setTimeout: deps.setTimeout,
    });

    const phoneModule = createPhone(options.phoneConfig, {
        doc: deps.doc,
        log: deps.log,
        cleanPhoneNumber: deps.cleanPhoneNumber,
        isValidPhone: deps.isValidPhone,
        getReactFiber: deps.getReactFiber,
        searchFiber: deps.searchFiber,
    });

    const runExtraction = (): string | null => {
        vinModule.reveal();
        const phone = phoneModule.extractAndDisplay();
        if (phone) {
            deps.log('Phone: SUCCESS!', phone);
        }
        return phone;
    };

    return {runExtraction};
};
