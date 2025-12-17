/**
 * Tests for Extension Storage (session storage wrapper)
 *
 * Uses the global chromeMock set up in setupTests.ts
 */

import {extensionStorage} from '../extensionStorage';
import {getChromeMock} from '@/test-utils/chromeMock';

describe('Extension Storage', () => {
    let chrome: ReturnType<typeof getChromeMock>;

    beforeEach(() => {
        chrome = getChromeMock();
    });

    describe('get', () => {
        it('should return undefined for non-existent key', async () => {
            const result = await extensionStorage.get<string>('nonexistent');
            expect(result).toBeUndefined();
        });

        it('should return stored value', async () => {
            // First set a value using the storage
            await extensionStorage.set('testKey', 'testValue');
            const result = await extensionStorage.get<string>('testKey');
            expect(result).toBe('testValue');
        });

        it('should return typed values', async () => {
            await extensionStorage.set('numberKey', 42);
            await extensionStorage.set('objectKey', {foo: 'bar'});

            const numberResult = await extensionStorage.get<number>('numberKey');
            const objectResult = await extensionStorage.get<{ foo: string }>('objectKey');

            expect(numberResult).toBe(42);
            expect(objectResult).toEqual({foo: 'bar'});
        });

        it('should call chrome.storage.session.get', async () => {
            await extensionStorage.get('someKey');
            expect(chrome.storage.session.get).toHaveBeenCalled();
        });

        it('should reject when chrome.runtime.lastError is set', async () => {
            chrome.storage.session.get = jest.fn((keys: string[], callback: (result: Record<string, any>) => void) => {
                chrome.runtime.lastError = {message: 'Storage error'};
                callback({});
                chrome.runtime.lastError = null;
            }) as any;

            await expect(extensionStorage.get('errorKey')).rejects.toThrow('Storage error');
        });

        it('should fall back to sessionStorage when chrome is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            // Set value in sessionStorage
            sessionStorage.setItem('fallbackKey', JSON.stringify('fallbackValue'));

            const result = await extensionStorage.get<string>('fallbackKey');
            expect(result).toBe('fallbackValue');

            // Clean up
            sessionStorage.removeItem('fallbackKey');
            (globalThis as any).chrome = originalChrome;
        });

        it('should return undefined from sessionStorage fallback for non-existent key', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            const result = await extensionStorage.get<string>('nonExistent');
            expect(result).toBeUndefined();

            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('set', () => {
        it('should store value', async () => {
            await extensionStorage.set('newKey', 'newValue');
            const result = await extensionStorage.get('newKey');
            expect(result).toBe('newValue');
        });

        it('should overwrite existing value', async () => {
            await extensionStorage.set('existingKey', 'oldValue');
            await extensionStorage.set('existingKey', 'newValue');
            const result = await extensionStorage.get('existingKey');
            expect(result).toBe('newValue');
        });

        it('should store objects', async () => {
            const obj = {name: 'Test', value: 123};
            await extensionStorage.set('objectKey', obj);
            const result = await extensionStorage.get('objectKey');
            expect(result).toEqual(obj);
        });

        it('should store arrays', async () => {
            const arr = [1, 2, 3, 'four'];
            await extensionStorage.set('arrayKey', arr);
            const result = await extensionStorage.get('arrayKey');
            expect(result).toEqual(arr);
        });

        it('should call chrome.storage.session.set', async () => {
            await extensionStorage.set('key', 'value');
            expect(chrome.storage.session.set).toHaveBeenCalled();
        });

        it('should reject when chrome.runtime.lastError is set', async () => {
            chrome.storage.session.set = jest.fn((items: Record<string, any>, callback: () => void) => {
                chrome.runtime.lastError = {message: 'Set error'};
                callback();
                chrome.runtime.lastError = null;
            }) as any;

            await expect(extensionStorage.set('errorKey', 'value')).rejects.toThrow('Set error');
        });

        it('should fall back to sessionStorage when chrome is not available', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            await extensionStorage.set('fallbackSetKey', {test: 123});

            const stored = sessionStorage.getItem('fallbackSetKey');
            expect(stored).toBe(JSON.stringify({test: 123}));

            // Clean up
            sessionStorage.removeItem('fallbackSetKey');
            (globalThis as any).chrome = originalChrome;
        });
    });

    describe('round-trip', () => {
        it('should get what was set', async () => {
            const testData = {
                string: 'hello',
                number: 42,
                boolean: true,
                nested: {a: 1, b: [2, 3]},
            };

            await extensionStorage.set('roundTrip', testData);
            const result = await extensionStorage.get<typeof testData>('roundTrip');

            expect(result).toEqual(testData);
        });

        it('should handle null values', async () => {
            await extensionStorage.set('nullKey', null);
            const result = await extensionStorage.get('nullKey');
            expect(result).toBeNull();
        });
    });
});

describe('Extension Storage API', () => {
    it('should have get and set methods', () => {
        expect(extensionStorage.get).toBeDefined();
        expect(extensionStorage.set).toBeDefined();
    });
});
