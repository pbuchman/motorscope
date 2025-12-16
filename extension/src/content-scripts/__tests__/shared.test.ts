/**
 * Tests for shared content script modules
 */

import {
    createLogger,
    normalizeUrl,
    isListingUrl,
    isSearchUrl,
    onDOMReady,
    findButtonByText,
    createDebouncer,
    createSelectorObserver,
    cleanPhoneNumber,
    isValidPhone,
    getReactFiber,
    searchFiber,
    type ReactFiber,
} from '../shared';

describe('logger module', () => {
    it('should create a logger that logs with prefix', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const log = createLogger('[TEST]');

        log('message', 123);

        expect(consoleSpy).toHaveBeenCalledWith('[TEST]', 'message', 123);
        consoleSpy.mockRestore();
    });
});

describe('url module', () => {
    describe('normalizeUrl', () => {
        it('should remove query parameters', () => {
            expect(normalizeUrl('https://example.com/path?query=1')).toBe('https://example.com/path');
        });

        it('should remove trailing slashes', () => {
            expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
        });

        it('should handle malformed URLs gracefully', () => {
            expect(normalizeUrl('not-a-url/')).toBe('not-a-url');
        });

        it('should preserve path without modifications', () => {
            expect(normalizeUrl('https://example.com/path/to/resource')).toBe('https://example.com/path/to/resource');
        });
    });

    describe('isListingUrl', () => {
        it('should return true for listing URLs (osobowe)', () => {
            expect(isListingUrl('https://www.otomoto.pl/osobowe/oferta/ford-ID123.html')).toBe(true);
        });

        it('should return true for listing URLs (dostawcze)', () => {
            expect(isListingUrl('https://www.otomoto.pl/dostawcze/oferta/mercedes-sprinter-ID456.html')).toBe(true);
        });

        it('should return false for search URLs', () => {
            expect(isListingUrl('https://www.otomoto.pl/osobowe/ford')).toBe(false);
        });

        it('should return false for homepage', () => {
            expect(isListingUrl('https://www.otomoto.pl/')).toBe(false);
        });
    });

    describe('isSearchUrl', () => {
        it('should return false for listing URLs', () => {
            expect(isSearchUrl('https://www.otomoto.pl/osobowe/oferta/ford-ID123.html')).toBe(false);
        });

        it('should return true for search URLs (osobowe)', () => {
            expect(isSearchUrl('https://www.otomoto.pl/osobowe/ford')).toBe(true);
        });

        it('should return true for search URLs (dostawcze)', () => {
            expect(isSearchUrl('https://www.otomoto.pl/dostawcze/mercedes')).toBe(true);
        });

        it('should return true for search URLs (motocykle)', () => {
            expect(isSearchUrl('https://www.otomoto.pl/motocykle-i-quady/honda')).toBe(true);
        });

        it('should return true for homepage', () => {
            expect(isSearchUrl('https://www.otomoto.pl/')).toBe(true);
        });
    });
});

describe('dom module', () => {
    describe('onDOMReady', () => {
        it('should call callback immediately if DOM is ready', () => {
            const callback = jest.fn();
            // In jsdom, document.readyState is 'complete'
            onDOMReady(callback);
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should add event listener when document is loading', () => {
            const callback = jest.fn();
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

            // Mock readyState to 'loading'
            Object.defineProperty(document, 'readyState', {
                value: 'loading',
                configurable: true,
            });

            onDOMReady(callback);

            expect(callback).not.toHaveBeenCalled();
            expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', callback);

            // Restore
            Object.defineProperty(document, 'readyState', {
                value: 'complete',
                configurable: true,
            });
            addEventListenerSpy.mockRestore();
        });
    });

    describe('findButtonByText', () => {
        it('should find button by text content', () => {
            document.body.innerHTML = `
                <div>
                    <button>Click me</button>
                    <button>Other button</button>
                </div>
            `;

            const button = findButtonByText(document, 'Click me');
            expect(button).not.toBeNull();
            expect(button?.textContent).toBe('Click me');
        });

        it('should return null if button not found', () => {
            document.body.innerHTML = '<div><button>Other</button></div>';

            const button = findButtonByText(document, 'Not found');
            expect(button).toBeNull();
        });

        it('should find button with partial text match', () => {
            document.body.innerHTML = '<button>Show VIN number</button>';

            const button = findButtonByText(document, 'VIN');
            expect(button).not.toBeNull();
        });

        it('should search within a specific container', () => {
            document.body.innerHTML = `
                <div id="container1"><button>Button 1</button></div>
                <div id="container2"><button>Button 2</button></div>
            `;

            const container = document.getElementById('container2')!;
            const button = findButtonByText(container, 'Button 2');
            expect(button).not.toBeNull();

            const notFound = findButtonByText(container, 'Button 1');
            expect(notFound).toBeNull();
        });
    });

    describe('createDebouncer', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should debounce callback', () => {
            const callback = jest.fn();
            const debounce = createDebouncer(100);

            debounce(callback);
            debounce(callback);
            debounce(callback);

            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should reset timer on each call', () => {
            const callback = jest.fn();
            const debounce = createDebouncer(100);

            debounce(callback);
            jest.advanceTimersByTime(50);
            debounce(callback);
            jest.advanceTimersByTime(50);
            debounce(callback);
            jest.advanceTimersByTime(50);

            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(50);
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('createSelectorObserver', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="root"></div>';
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        it('should return a MutationObserver instance', () => {
            const observer = createSelectorObserver({
                selector: '.target',
                onMatch: jest.fn(),
            });

            expect(observer).toBeInstanceOf(MutationObserver);
            observer.disconnect();
        });

        it('should observe with correct options', () => {
            const observeSpy = jest.spyOn(MutationObserver.prototype, 'observe');
            const root = document.getElementById('root')!;

            const observer = createSelectorObserver({
                selector: '.target',
                onMatch: jest.fn(),
                root,
            });

            expect(observeSpy).toHaveBeenCalledWith(root, {
                childList: true,
                subtree: true,
            });

            observer.disconnect();
            observeSpy.mockRestore();
        });

        it('should use document.body as default root', () => {
            const observeSpy = jest.spyOn(MutationObserver.prototype, 'observe');

            const observer = createSelectorObserver({
                selector: '.target',
                onMatch: jest.fn(),
            });

            expect(observeSpy).toHaveBeenCalledWith(document.body, expect.any(Object));

            observer.disconnect();
            observeSpy.mockRestore();
        });
    });
});

describe('phone module', () => {
    describe('cleanPhoneNumber', () => {
        it('should remove spaces and formatting', () => {
            expect(cleanPhoneNumber('123 456 789')).toBe('123456789');
            expect(cleanPhoneNumber('123-456-789')).toBe('123456789');
            expect(cleanPhoneNumber('(123) 456-789')).toBe('123456789');
        });

        it('should remove Polish country code', () => {
            expect(cleanPhoneNumber('+48123456789')).toBe('123456789');
            expect(cleanPhoneNumber('+48 123 456 789')).toBe('123456789');
        });

        it('should preserve non-Polish numbers', () => {
            expect(cleanPhoneNumber('+49123456789')).toBe('+49123456789');
        });
    });

    describe('isValidPhone', () => {
        it('should validate phone numbers', () => {
            expect(isValidPhone('123456789')).toBe(true);
            expect(isValidPhone('+48123456789')).toBe(true);
            expect(isValidPhone('123 456 789')).toBe(true);
        });

        it('should reject invalid phone numbers', () => {
            expect(isValidPhone('12345')).toBe(false);
            expect(isValidPhone('abc')).toBe(false);
            expect(isValidPhone('')).toBe(false);
        });
    });
});

describe('react module', () => {
    describe('getReactFiber', () => {
        it('should return null for elements without React fiber', () => {
            const element = document.createElement('div');
            expect(getReactFiber(element)).toBeNull();
        });

        it('should return fiber for elements with React fiber', () => {
            const element = document.createElement('div');
            const mockFiber = {memoizedProps: {test: 'value'}};
            (element as unknown as Record<string, unknown>)['__reactFiber$abc123'] = mockFiber;

            expect(getReactFiber(element)).toBe(mockFiber);
        });

        it('should find fiber with __reactInternalInstance$ key', () => {
            const element = document.createElement('div');
            const mockFiber = {memoizedProps: {test: 'value'}};
            (element as unknown as Record<string, unknown>)['__reactInternalInstance$xyz'] = mockFiber;

            expect(getReactFiber(element)).toBe(mockFiber);
        });
    });

    describe('searchFiber', () => {
        const findPhonePredicate = (props: Record<string, unknown>): string | null => {
            if (typeof props.phone === 'string') return props.phone;
            return null;
        };

        it('should return null for null fiber', () => {
            const result = searchFiber(null, {
                direction: 'down',
                predicate: findPhonePredicate,
            });
            expect(result).toBeNull();
        });

        it('should return null for undefined fiber', () => {
            const result = searchFiber(undefined, {
                direction: 'down',
                predicate: findPhonePredicate,
            });
            expect(result).toBeNull();
        });

        it('should find value in memoizedProps', () => {
            const fiber: ReactFiber = {
                memoizedProps: {phone: '123456789'},
            };

            const result = searchFiber(fiber, {
                direction: 'down',
                predicate: findPhonePredicate,
            });

            expect(result).toBe('123456789');
        });

        it('should find value in pendingProps when memoizedProps is empty', () => {
            const fiber: ReactFiber = {
                pendingProps: {phone: '987654321'},
            };

            const result = searchFiber(fiber, {
                direction: 'down',
                predicate: findPhonePredicate,
            });

            expect(result).toBe('987654321');
        });

        it('should search child fiber in down direction', () => {
            const childFiber: ReactFiber = {
                memoizedProps: {phone: '111222333'},
            };
            const parentFiber: ReactFiber = {
                memoizedProps: {},
                child: childFiber,
            };

            const result = searchFiber(parentFiber, {
                direction: 'down',
                predicate: findPhonePredicate,
            });

            expect(result).toBe('111222333');
        });

        it('should search sibling fiber in down direction', () => {
            const siblingFiber: ReactFiber = {
                memoizedProps: {phone: '444555666'},
            };
            const childFiber: ReactFiber = {
                memoizedProps: {},
                sibling: siblingFiber,
            };
            const parentFiber: ReactFiber = {
                memoizedProps: {},
                child: childFiber,
            };

            const result = searchFiber(parentFiber, {
                direction: 'down',
                predicate: findPhonePredicate,
            });

            expect(result).toBe('444555666');
        });

        it('should search parent fiber in up direction', () => {
            const parentFiber: ReactFiber = {
                memoizedProps: {phone: '777888999'},
            };
            const childFiber: ReactFiber = {
                memoizedProps: {},
                return: parentFiber,
            };

            const result = searchFiber(childFiber, {
                direction: 'up',
                predicate: findPhonePredicate,
            });

            expect(result).toBe('777888999');
        });

        it('should respect maxDepth limit', () => {
            // Create a deep fiber tree
            const deepChild: ReactFiber = {
                memoizedProps: {phone: 'deep-phone'},
            };
            let current: ReactFiber = deepChild;
            for (let i = 0; i < 10; i++) {
                current = {
                    memoizedProps: {},
                    child: current,
                };
            }

            // With maxDepth 5, should not find the deep phone
            const resultLimited = searchFiber(current, {
                direction: 'down',
                predicate: findPhonePredicate,
                maxDepth: 5,
            });
            expect(resultLimited).toBeNull();

            // With default maxDepth (30), should find it
            const resultUnlimited = searchFiber(current, {
                direction: 'down',
                predicate: findPhonePredicate,
            });
            expect(resultUnlimited).toBe('deep-phone');
        });

        it('should return first match when multiple exist', () => {
            const childFiber: ReactFiber = {
                memoizedProps: {phone: 'first'},
                sibling: {
                    memoizedProps: {phone: 'second'},
                },
            };
            const parentFiber: ReactFiber = {
                memoizedProps: {},
                child: childFiber,
            };

            const result = searchFiber(parentFiber, {
                direction: 'down',
                predicate: findPhonePredicate,
            });

            expect(result).toBe('first');
        });

        it('should handle empty props object', () => {
            const fiber: ReactFiber = {};

            const result = searchFiber(fiber, {
                direction: 'down',
                predicate: findPhonePredicate,
            });

            expect(result).toBeNull();
        });
    });
});
