/**
 * Chrome Extension API Mock
 *
 * Provides mock implementations of Chrome extension APIs for testing.
 * Usage:
 *   1. Import and call setupChromeMock() before importing modules that use chrome APIs
 *   2. Use trigger* helpers to simulate Chrome events
 *   3. Call resetChromeMock() in beforeEach to reset state
 */

// Inline type definitions to avoid dependency on chrome types at test time
interface MessageSender {
    id?: string;
    url?: string;
    tab?: { id?: number };
}

interface InstalledDetails {
    reason: string;
    previousVersion?: string;
}

interface Alarm {
    name: string;
    scheduledTime: number;
    periodInMinutes?: number;
}

interface AlarmCreateInfo {
    delayInMinutes?: number;
    periodInMinutes?: number;
    when?: number;
}

interface NotificationOptions {
    type: string;
    title: string;
    message: string;
    iconUrl?: string;
    priority?: number;
}

// Storage data type
export interface MockStorageData {
    [key: string]: any;
}

// Storage for registered listeners and mock state
let messageListeners: ((
    request: any,
    sender: MessageSender,
    sendResponse: (response?: any) => void
) => boolean | void)[] = [];

let installedListeners: ((details: InstalledDetails) => void)[] = [];
let startupListeners: (() => void)[] = [];
let alarmListeners: ((alarm: Alarm) => void)[] = [];

// Mock storage state
let sessionStorage: MockStorageData = {};
let localStorage: MockStorageData = {};
let syncStorage: MockStorageData = {};

// Mock alarms state
let alarms: Map<string, Alarm> = new Map();

// Create the mock chrome object
function createChromeMock() {
    return {
        runtime: {
            onMessage: {
                addListener: jest.fn((callback: any) => {
                    messageListeners.push(callback);
                }),
                removeListener: jest.fn((callback: any) => {
                    const index = messageListeners.indexOf(callback);
                    if (index !== -1) messageListeners.splice(index, 1);
                }),
                hasListener: jest.fn((callback: any) => messageListeners.includes(callback)),
            },
            onInstalled: {
                addListener: jest.fn((callback: any) => {
                    installedListeners.push(callback);
                }),
                removeListener: jest.fn((callback: any) => {
                    const index = installedListeners.indexOf(callback);
                    if (index !== -1) installedListeners.splice(index, 1);
                }),
            },
            onStartup: {
                addListener: jest.fn((callback: any) => {
                    startupListeners.push(callback);
                }),
                removeListener: jest.fn((callback: any) => {
                    const index = startupListeners.indexOf(callback);
                    if (index !== -1) startupListeners.splice(index, 1);
                }),
            },
            sendMessage: jest.fn().mockResolvedValue(undefined),
            lastError: null as { message: string } | null,
            getURL: jest.fn((path: string) => `chrome-extension://mock-id/${path}`),
            id: 'mock-extension-id',
        },

        alarms: {
            onAlarm: {
                addListener: jest.fn((callback: any) => {
                    alarmListeners.push(callback);
                }),
                removeListener: jest.fn((callback: any) => {
                    const index = alarmListeners.indexOf(callback);
                    if (index !== -1) alarmListeners.splice(index, 1);
                }),
            },
            create: jest.fn((name: string, alarmInfo: AlarmCreateInfo) => {
                alarms.set(name, {
                    name,
                    scheduledTime: Date.now() + (alarmInfo.delayInMinutes || 0) * 60 * 1000,
                    periodInMinutes: alarmInfo.periodInMinutes,
                });
            }),
            clear: jest.fn(async (name: string) => {
                const existed = alarms.has(name);
                alarms.delete(name);
                return existed;
            }),
            get: jest.fn(async (name: string) => alarms.get(name) || null),
            getAll: jest.fn(async () => Array.from(alarms.values())),
        },

        storage: {
            session: {
                get: jest.fn((keys: string | string[] | null, callback?: (result: Record<string, any>) => void) => {
                    const keyArray = keys === null ? Object.keys(sessionStorage) : Array.isArray(keys) ? keys : [keys];
                    const result: Record<string, any> = {};
                    keyArray.forEach((key) => {
                        if (sessionStorage[key] !== undefined) {
                            result[key] = sessionStorage[key];
                        }
                    });
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                }),
                set: jest.fn((items: Record<string, any>, callback?: () => void) => {
                    Object.assign(sessionStorage, items);
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
                remove: jest.fn((keys: string | string[], callback?: () => void) => {
                    const keyArray = Array.isArray(keys) ? keys : [keys];
                    keyArray.forEach((key) => delete sessionStorage[key]);
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
                clear: jest.fn((callback?: () => void) => {
                    sessionStorage = {};
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
            },
            local: {
                get: jest.fn((keys: string | string[] | null, callback?: (result: Record<string, any>) => void) => {
                    const keyArray = keys === null ? Object.keys(localStorage) : Array.isArray(keys) ? keys : [keys];
                    const result: Record<string, any> = {};
                    keyArray.forEach((key) => {
                        if (localStorage[key] !== undefined) {
                            result[key] = localStorage[key];
                        }
                    });
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                }),
                set: jest.fn((items: Record<string, any>, callback?: () => void) => {
                    Object.assign(localStorage, items);
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
                remove: jest.fn((keys: string | string[], callback?: () => void) => {
                    const keyArray = Array.isArray(keys) ? keys : [keys];
                    keyArray.forEach((key) => delete localStorage[key]);
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
                clear: jest.fn((callback?: () => void) => {
                    localStorage = {};
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
            },
            sync: {
                get: jest.fn((keys: string | string[] | null, callback?: (result: Record<string, any>) => void) => {
                    const keyArray = keys === null ? Object.keys(syncStorage) : Array.isArray(keys) ? keys : [keys];
                    const result: Record<string, any> = {};
                    keyArray.forEach((key) => {
                        if (syncStorage[key] !== undefined) {
                            result[key] = syncStorage[key];
                        }
                    });
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                }),
                set: jest.fn((items: Record<string, any>, callback?: () => void) => {
                    Object.assign(syncStorage, items);
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
                remove: jest.fn((keys: string | string[], callback?: () => void) => {
                    const keyArray = Array.isArray(keys) ? keys : [keys];
                    keyArray.forEach((key) => delete syncStorage[key]);
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
                clear: jest.fn((callback?: () => void) => {
                    syncStorage = {};
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                }),
            },
        },

        tabs: {
            query: jest.fn(async () => []),
            update: jest.fn(async () => ({})),
            create: jest.fn(async (createProperties) => ({id: 1,
        url: createProperties.url,
        active: createProperties.active !== false,
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 1,
        incognito: false,
      })),
      remove: jest.fn(async () => undefined),
            sendMessage: jest.fn(async () => undefined),
        onUpdated: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    },

    scripting: {
      executeScript: jest.fn(async () => []),
    },

        notifications: {
            create: jest.fn(
                (
                    notificationId: string,
                    options: NotificationOptions,
                    callback?: (notificationId: string) => void
                ) => {
                    if (callback) callback(notificationId);
                }
            ),
            clear: jest.fn((notificationId: string, callback?: (wasCleared: boolean) => void) => {
                if (callback) callback(true);
            }),
        },

        identity: {
            getAuthToken: jest.fn(async () => ({token: 'mock-google-token'})),
            removeCachedAuthToken: jest.fn(async () => undefined),
            launchWebAuthFlow: jest.fn(async () => 'https://callback?token=mock'),
            clearAllCachedAuthTokens: jest.fn(async () => undefined),
        },

        action: {
            setBadgeText: jest.fn(async () => undefined),
            setBadgeBackgroundColor: jest.fn(async () => undefined),
            setIcon: jest.fn(async () => undefined),
            setTitle: jest.fn(async () => undefined),
        },
    };
}

// The mock chrome object
let chromeMock = createChromeMock();

/**
 * Setup the Chrome mock on globalThis
 * Must be called before importing modules that use chrome APIs
 */
export function setupChromeMock(): typeof chromeMock {
    (globalThis as any).chrome = chromeMock;
    return chromeMock;
}

/**
 * Reset Chrome mock state between tests
 * Clears all listeners, storage, and mock call history
 */
export function resetChromeMock(): void {
    // Clear listeners
    messageListeners.length = 0;
    installedListeners.length = 0;
    startupListeners.length = 0;
    alarmListeners.length = 0;

    // Clear storage
    sessionStorage = {};
    localStorage = {};
    syncStorage = {};

    // Clear alarms
    alarms.clear();

    // Recreate the mock to clear all jest.fn() call history
    chromeMock = createChromeMock();
    (globalThis as any).chrome = chromeMock;
}

/**
 * Get the current chrome mock instance
 */
export function getChromeMock(): typeof chromeMock {
    return chromeMock;
}

// ============================================================================
// Event Trigger Helpers
// ============================================================================

/**
 * Trigger chrome.runtime.onMessage event
 * @returns Promise that resolves when the handler completes or sends a response
 */
export function triggerOnMessage(
    request: any,
    sender: Partial<MessageSender> = {}
): Promise<any> {
    return new Promise((resolve) => {
        const fullSender: MessageSender = {
            id: chromeMock.runtime.id,
            ...sender,
        };

        let responseReceived = false;
        const mockSendResponse = (response?: any) => {
            if (!responseReceived) {
                responseReceived = true;
                resolve(response);
            }
        };

        const results = messageListeners.map((listener) => {
            return listener(request, fullSender, mockSendResponse);
        });

        // If no listener returned true (async), resolve immediately
        if (!results.some((r) => r === true)) {
            resolve(undefined);
        }
    });
}

/**
 * Trigger chrome.runtime.onInstalled event
 */
export function triggerOnInstalled(
    details: Partial<InstalledDetails> = {}
): void {
    const fullDetails: InstalledDetails = {
        reason: 'install',
        ...details,
    };
    installedListeners.forEach((listener) => listener(fullDetails));
}

/**
 * Trigger chrome.runtime.onStartup event
 */
export function triggerOnStartup(): void {
    startupListeners.forEach((listener) => listener());
}

/**
 * Trigger chrome.alarms.onAlarm event
 */
export function triggerOnAlarm(alarm: Partial<Alarm>): void {
    const fullAlarm: Alarm = {
        name: 'test-alarm',
        scheduledTime: Date.now(),
        ...alarm,
    };
    alarmListeners.forEach((listener) => listener(fullAlarm));
}

