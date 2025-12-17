/**
 * Tests for Chrome Messaging Hook and Utilities
 *
 * Tests the utility functions and message constants.
 * React hooks are tested via integration tests in components.
 */

import {
    MessageTypes,
    isChromeExtension,
    hasChromeStorage,
    sendMessage,
} from '../useChromeMessaging';
import {getChromeMock} from '@/test-utils/chromeMock';

describe('useChromeMessaging', () => {
    let chrome: ReturnType<typeof getChromeMock>;
    let consoleDebugSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        chrome = getChromeMock();
        consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        consoleDebugSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('MessageTypes', () => {
        it('should have LISTING_UPDATED type', () => {
            expect(MessageTypes.LISTING_UPDATED).toBe('LISTING_UPDATED');
        });

        it('should have TRIGGER_MANUAL_REFRESH type', () => {
            expect(MessageTypes.TRIGGER_MANUAL_REFRESH).toBe('TRIGGER_MANUAL_REFRESH');
        });

        it('should have RESCHEDULE_ALARM type', () => {
            expect(MessageTypes.RESCHEDULE_ALARM).toBe('RESCHEDULE_ALARM');
        });

        it('should have REFRESH_STATUS_CHANGED type', () => {
            expect(MessageTypes.REFRESH_STATUS_CHANGED).toBe('REFRESH_STATUS_CHANGED');
        });

        it('should have INITIALIZE_ALARM type', () => {
            expect(MessageTypes.INITIALIZE_ALARM).toBe('INITIALIZE_ALARM');
        });
    });

    describe('isChromeExtension', () => {
        it('should return true when chrome.runtime.getURL is available', () => {
            expect(isChromeExtension()).toBe(true);
        });

        it('should return false when chrome is undefined', () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            expect(isChromeExtension()).toBe(false);

            (globalThis as any).chrome = originalChrome;
        });

        it('should return false when chrome.runtime is undefined', () => {
            const originalRuntime = chrome.runtime;
            (chrome as any).runtime = undefined;

            expect(isChromeExtension()).toBe(false);

            (chrome as any).runtime = originalRuntime;
        });

        it('should return false when chrome.runtime.getURL is undefined', () => {
            const originalGetURL = chrome.runtime.getURL;
            (chrome.runtime as any).getURL = undefined;

            expect(isChromeExtension()).toBe(false);

            chrome.runtime.getURL = originalGetURL;
        });
    });

    describe('hasChromeStorage', () => {
        it('should return true when chrome.storage is available', () => {
            expect(hasChromeStorage()).toBe(true);
        });

        it('should return false when chrome is undefined', () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            expect(hasChromeStorage()).toBe(false);

            (globalThis as any).chrome = originalChrome;
        });

        it('should return false when chrome.storage is undefined', () => {
            const originalStorage = chrome.storage;
            (chrome as any).storage = undefined;

            expect(hasChromeStorage()).toBe(false);

            (chrome as any).storage = originalStorage;
        });
    });

    describe('sendMessage', () => {
        it('should send message via chrome.runtime.sendMessage', async () => {
            chrome.runtime.sendMessage = jest.fn().mockResolvedValue({success: true});

            const response = await sendMessage({type: MessageTypes.LISTING_UPDATED});

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: MessageTypes.LISTING_UPDATED,
            });
            expect(response).toEqual({success: true});
        });

        it('should return null when not in extension context', async () => {
            const originalChrome = (globalThis as any).chrome;
            delete (globalThis as any).chrome;

            const response = await sendMessage({type: MessageTypes.LISTING_UPDATED});

            expect(response).toBeNull();
            expect(consoleDebugSpy).toHaveBeenCalledWith(
                '[MotorScope] Not in extension context, skipping message:',
                'LISTING_UPDATED',
            );

            (globalThis as any).chrome = originalChrome;
        });

        it('should return null when receiving end does not exist', async () => {
            chrome.runtime.sendMessage = jest.fn().mockRejectedValue(
                new Error('Receiving end does not exist'),
            );

            const response = await sendMessage({type: MessageTypes.LISTING_UPDATED});

            expect(response).toBeNull();
            expect(consoleDebugSpy).toHaveBeenCalledWith(
                '[MotorScope] No listener for message:',
                'LISTING_UPDATED',
            );
        });

        it('should rethrow other errors', async () => {
            chrome.runtime.sendMessage = jest.fn().mockRejectedValue(
                new Error('Unknown error'),
            );

            await expect(sendMessage({type: MessageTypes.LISTING_UPDATED})).rejects.toThrow('Unknown error');
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[MotorScope] Message send failed:',
                expect.any(Error),
            );
        });

        it('should send message with additional properties', async () => {
            chrome.runtime.sendMessage = jest.fn().mockResolvedValue({});

            await sendMessage({
                type: MessageTypes.RESCHEDULE_ALARM,
                minutes: 30,
            });

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: MessageTypes.RESCHEDULE_ALARM,
                minutes: 30,
            });
        });
    });
});
