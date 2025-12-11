/**
 * Tests for Storage Helpers
 */

// Mock the extensionStorage module
jest.mock('../../extensionStorage', () => ({
    extensionStorage: {
        get: jest.fn(),
        set: jest.fn(),
    },
}));

import {getWithDefault, setStorage} from '../storageHelpers';
import {extensionStorage} from '../../extensionStorage';

const mockGet = extensionStorage.get as jest.MockedFunction<typeof extensionStorage.get>;
const mockSet = extensionStorage.set as jest.MockedFunction<typeof extensionStorage.set>;

describe('Storage Helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getWithDefault', () => {
        it('should return stored value when it exists', async () => {
            const storedValue = {foo: 'bar', count: 42};
            mockGet.mockResolvedValue(storedValue);

            const result = await getWithDefault('testKey', {foo: 'default', count: 0});

            expect(mockGet).toHaveBeenCalledWith('testKey');
            expect(result).toEqual(storedValue);
        });

        it('should return default value when storage returns null', async () => {
            mockGet.mockResolvedValue(null);
            const defaultValue = {status: 'idle', items: []};

            const result = await getWithDefault('missingKey', defaultValue);

            expect(result).toEqual(defaultValue);
        });

        it('should return default value when storage returns undefined', async () => {
            mockGet.mockResolvedValue(undefined);
            const defaultValue = 'fallback';

            const result = await getWithDefault('emptyKey', defaultValue);

            expect(result).toBe(defaultValue);
        });

        it('should handle primitive default values', async () => {
            mockGet.mockResolvedValue(null);

            expect(await getWithDefault('key1', 0)).toBe(0);
            expect(await getWithDefault('key2', '')).toBe('');
            expect(await getWithDefault('key3', false)).toBe(false);
        });

        it('should handle array default values', async () => {
            mockGet.mockResolvedValue(null);
            const defaultArray = ['item1', 'item2'];

            const result = await getWithDefault('arrayKey', defaultArray);

            expect(result).toEqual(defaultArray);
        });

        it('should preserve falsy stored values (0, false, empty string)', async () => {
            // Test that actual stored falsy values are returned, not the default
            mockGet.mockResolvedValue(0);
            expect(await getWithDefault('numKey', 100)).toBe(0);

            mockGet.mockResolvedValue(false);
            expect(await getWithDefault('boolKey', true)).toBe(false);

            mockGet.mockResolvedValue('');
            expect(await getWithDefault('strKey', 'default')).toBe('');
        });
    });

    describe('setStorage', () => {
        it('should call extensionStorage.set with correct key and value', async () => {
            mockSet.mockResolvedValue(undefined);
            const testValue = {name: 'test', value: 123};

            await setStorage('myKey', testValue);

            expect(mockSet).toHaveBeenCalledWith('myKey', testValue);
            expect(mockSet).toHaveBeenCalledTimes(1);
        });

        it('should handle primitive values', async () => {
            mockSet.mockResolvedValue(undefined);

            await setStorage('strKey', 'hello');
            expect(mockSet).toHaveBeenCalledWith('strKey', 'hello');

            await setStorage('numKey', 42);
            expect(mockSet).toHaveBeenCalledWith('numKey', 42);

            await setStorage('boolKey', true);
            expect(mockSet).toHaveBeenCalledWith('boolKey', true);
        });

        it('should handle complex nested objects', async () => {
            mockSet.mockResolvedValue(undefined);
            const complexValue = {
                nested: {
                    deep: {
                        value: [1, 2, 3],
                    },
                },
            };

            await setStorage('complexKey', complexValue);

            expect(mockSet).toHaveBeenCalledWith('complexKey', complexValue);
        });

        it('should handle null values', async () => {
            mockSet.mockResolvedValue(undefined);

            await setStorage('nullKey', null);

            expect(mockSet).toHaveBeenCalledWith('nullKey', null);
        });

        it('should propagate errors from storage', async () => {
            const storageError = new Error('Storage quota exceeded');
            mockSet.mockRejectedValue(storageError);

            await expect(setStorage('key', 'value')).rejects.toThrow('Storage quota exceeded');
        });
    });
});

