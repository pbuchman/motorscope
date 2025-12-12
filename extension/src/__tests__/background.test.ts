/**
 * Background Service Worker Tests
 *
 * Comprehensive unit tests for the Chrome extension background service worker.
 * Tests message routing, alarm handling, and auth management.
 */

import {
    getChromeMock,
    resetChromeMock,
    setupChromeMock,
    triggerOnAlarm,
    triggerOnInstalled,
    triggerOnMessage,
    triggerOnStartup,
} from '../test-utils/chromeMock';
import {RefreshStatus} from '../types';

// Setup Chrome mock before any imports that might use chrome APIs
setupChromeMock();

// Track mock state
let mockStorageValue: any = null;
let mockStorageSetCalls: Array<{ key: string; value: any }> = [];
let mockGetTokenValue: string | null = 'mock-jwt-token';
let mockGetStoredTokenValue: string | null = 'mock-stored-token';
let mockIsTokenExpiredValue = false;
let mockTrySilentLoginResult: any = {token: 'mock-token'};
let mockInitializeAuthCalled = false;
let mockTrySilentLoginCalled = false;
let mockGetStoredTokenCalled = false;
let mockRefreshSingleListingCallCount = 0;
let mockFetchQueue: Array<{ ok: boolean; status?: number; data: any }> = [];

// Mock extensionStorage module
jest.mock('../services/extensionStorage', () => ({
    extensionStorage: {
        get: jest.fn().mockImplementation(async () => mockStorageValue),
        set: jest.fn().mockImplementation(async (key: string, value: any) => {
            mockStorageSetCalls.push({key, value});
        }),
    },
}));

// Mock refresh service
jest.mock('../services/refresh', () => ({
    refreshSingleListing: jest.fn().mockImplementation(async (listing: any) => {
        mockRefreshSingleListingCallCount++;
        return {success: true, listing, rateLimited: false};
    }),
    sortListingsByRefreshPriority: jest.fn((listings: any[]) => listings),
}));

// Mock OAuth client
jest.mock('../auth/oauthClient', () => ({
    initializeAuth: jest.fn().mockImplementation(async () => {
        mockInitializeAuthCalled = true;
    }),
    trySilentLogin: jest.fn().mockImplementation(async () => {
        mockTrySilentLoginCalled = true;
        return mockTrySilentLoginResult;
    }),
    isTokenExpired: jest.fn().mockImplementation(async () => mockIsTokenExpiredValue),
    getToken: jest.fn().mockImplementation(async () => mockGetTokenValue),
}));

// Mock auth storage
jest.mock('../auth/storage', () => ({
    getStoredToken: jest.fn().mockImplementation(async () => {
        mockGetStoredTokenCalled = true;
        return mockGetStoredTokenValue;
    }),
}));

// Mock local server storage
jest.mock('../auth/localServerStorage', () => ({
    getBackendServerUrl: jest.fn().mockResolvedValue('https://api.motorscope.com'),
}));

// Mock global fetch
const createMockResponse = (data: any, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
});

global.fetch = jest.fn().mockImplementation(async (url: string) => {
    if (mockFetchQueue.length > 0) {
        const next = mockFetchQueue.shift()!;
        return createMockResponse(next.data, next.ok, next.status);
    }
    // Default: return settings with gemini key
    if (url.includes('/settings')) {
        return createMockResponse({checkFrequencyMinutes: 60, geminiApiKey: 'test-key'});
    }
    if (url.includes('/listings')) {
        return createMockResponse([]);
    }
    return createMockResponse({});
}) as jest.Mock;

// Helper to create mock refresh status
const createMockRefreshStatus = (overrides: Partial<RefreshStatus> = {}): RefreshStatus => ({
    lastRefreshTime: null,
    nextRefreshTime: null,
    lastRefreshCount: 0,
    isRefreshing: false,
    currentIndex: 0,
    totalCount: 0,
    currentListingTitle: null,
    pendingItems: [],
    recentlyRefreshed: [],
    refreshErrors: [],
    ...overrides,
});

// Helper to reset all mock state
const resetMocks = () => {
    mockStorageValue = null;
    mockStorageSetCalls = [];
    mockGetTokenValue = 'mock-jwt-token';
    mockGetStoredTokenValue = 'mock-stored-token';
    mockIsTokenExpiredValue = false;
    mockTrySilentLoginResult = {token: 'mock-token'};
    mockInitializeAuthCalled = false;
    mockTrySilentLoginCalled = false;
    mockGetStoredTokenCalled = false;
    mockRefreshSingleListingCallCount = 0;
    mockFetchQueue = [];
    jest.clearAllMocks();
};

describe('Background Service Worker', () => {
    let chrome: ReturnType<typeof getChromeMock>;

    beforeEach(() => {
        resetMocks();
        resetChromeMock();
        chrome = getChromeMock();

        // Re-import background to register listeners
        jest.isolateModules(() => {
            require('../background');
        });
    });

    afterEach(() => {
        jest.resetModules();
    });

    // ==========================================================================
    // Event Listener Registration
    // ==========================================================================

    describe('Event Listener Registration', () => {
        it('should register onInstalled listener', () => {
            expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
        });

        it('should register onStartup listener', () => {
            expect(chrome.runtime.onStartup.addListener).toHaveBeenCalled();
        });

        it('should register onAlarm listener', () => {
            expect(chrome.alarms.onAlarm.addListener).toHaveBeenCalled();
        });

        it('should register onMessage listener', () => {
            expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // Message Routing - TRIGGER_MANUAL_REFRESH
    // ==========================================================================

    describe('TRIGGER_MANUAL_REFRESH message', () => {
        it('should handle the message type', async () => {
            mockStorageValue = createMockRefreshStatus();

            await triggerOnMessage({type: 'TRIGGER_MANUAL_REFRESH'});
            await new Promise(r => setTimeout(r, 100));

            // Fetch should have been called for settings and/or listings
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should not start refresh when already refreshing', async () => {
            mockStorageValue = createMockRefreshStatus({isRefreshing: true});

            await triggerOnMessage({type: 'TRIGGER_MANUAL_REFRESH'});
            await new Promise(r => setTimeout(r, 100));

            // Should not have refreshed any listings
            expect(mockRefreshSingleListingCallCount).toBe(0);
        });

        it('should skip refresh when not authenticated', async () => {
            mockStorageValue = createMockRefreshStatus();
            mockGetTokenValue = null;

            await triggerOnMessage({type: 'TRIGGER_MANUAL_REFRESH'});
            await new Promise(r => setTimeout(r, 100));

            expect(mockRefreshSingleListingCallCount).toBe(0);
            expect(chrome.alarms.create).toHaveBeenCalled(); // Should still schedule next alarm
        });
    });

    // ==========================================================================
    // Message Routing - RESCHEDULE_ALARM
    // ==========================================================================

    describe('RESCHEDULE_ALARM message', () => {
        it('should reschedule alarm with provided minutes', async () => {
            await triggerOnMessage({type: 'RESCHEDULE_ALARM', minutes: 45});
            await new Promise(r => setTimeout(r, 100));

            expect(chrome.alarms.clear).toHaveBeenCalledWith('motorscope_check_alarm');
            expect(chrome.alarms.create).toHaveBeenCalledWith(
                'motorscope_check_alarm',
                expect.objectContaining({delayInMinutes: expect.any(Number)}),
            );
        });

        it('should use default frequency when minutes not provided', async () => {
            await triggerOnMessage({type: 'RESCHEDULE_ALARM'});
            await new Promise(r => setTimeout(r, 100));

            expect(chrome.alarms.create).toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // Message Routing - CLEAR_REFRESH_ERRORS
    // ==========================================================================

    describe('CLEAR_REFRESH_ERRORS message', () => {
        it('should clear refresh errors', async () => {
            mockStorageValue = createMockRefreshStatus({
                refreshErrors: [{
                    id: 'e1',
                    title: 'Test',
                    url: 'http://test.com',
                    error: 'err',
                    timestamp: '2024-01-01',
                }],
            });

            await triggerOnMessage({type: 'CLEAR_REFRESH_ERRORS'});
            await new Promise(r => setTimeout(r, 100));

            const clearedCall = mockStorageSetCalls.find(
                call => call.value?.refreshErrors?.length === 0,
            );
            expect(clearedCall).toBeDefined();
        });
    });

    // ==========================================================================
    // Message Routing - CHECK_AUTH
    // ==========================================================================

    describe('CHECK_AUTH message', () => {
        it('should check stored token', async () => {
            await triggerOnMessage({type: 'CHECK_AUTH'});
            await new Promise(r => setTimeout(r, 100));

            expect(mockGetStoredTokenCalled).toBe(true);
        });

        it('should try silent login when token expired', async () => {
            mockIsTokenExpiredValue = true;
            mockTrySilentLoginResult = {token: 'new-token'};

            await triggerOnMessage({type: 'CHECK_AUTH'});
            await new Promise(r => setTimeout(r, 100));

            expect(mockTrySilentLoginCalled).toBe(true);
        });

        it('should notify UI of successful auth refresh', async () => {
            mockIsTokenExpiredValue = true;
            mockTrySilentLoginResult = {token: 'new-token'};

            await triggerOnMessage({type: 'CHECK_AUTH'});
            await new Promise(r => setTimeout(r, 100));

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'AUTH_STATE_CHANGED', status: 'logged_in'}),
            );
        });

        it('should notify UI when silent refresh fails', async () => {
            mockIsTokenExpiredValue = true;
            mockTrySilentLoginResult = null;

            await triggerOnMessage({type: 'CHECK_AUTH'});
            await new Promise(r => setTimeout(r, 100));

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'AUTH_STATE_CHANGED', status: 'logged_out'}),
            );
        });

        it('should skip when no stored token', async () => {
            mockGetStoredTokenValue = null;

            await triggerOnMessage({type: 'CHECK_AUTH'});
            await new Promise(r => setTimeout(r, 100));

            expect(mockTrySilentLoginCalled).toBe(false);
        });
    });

    // ==========================================================================
    // Message Routing - TRY_SILENT_LOGIN
    // ==========================================================================

    describe('TRY_SILENT_LOGIN message', () => {
        it('should attempt silent login', async () => {
            await triggerOnMessage({type: 'TRY_SILENT_LOGIN'});
            await new Promise(r => setTimeout(r, 100));

            expect(mockTrySilentLoginCalled).toBe(true);
        });
    });

    // ==========================================================================
    // Message Routing - INITIALIZE_ALARM
    // ==========================================================================

    describe('INITIALIZE_ALARM message', () => {
        it('should initialize alarm when user is authenticated', async () => {
            mockGetTokenValue = 'mock-jwt-token';
            mockStorageValue = createMockRefreshStatus();

            await triggerOnMessage({type: 'INITIALIZE_ALARM'});
            await new Promise(r => setTimeout(r, 100));

            // Should have created an alarm
            expect(getChromeMock().alarms.create).toHaveBeenCalled();
        });

        it('should skip alarm initialization when user is not authenticated', async () => {
            mockGetTokenValue = null;
            mockStorageValue = createMockRefreshStatus();

            // Reset the mock to track new calls
            getChromeMock().alarms.create.mockClear();
            getChromeMock().alarms.clear.mockClear();

            await triggerOnMessage({type: 'INITIALIZE_ALARM'});
            await new Promise(r => setTimeout(r, 100));

            // Should have cleared the alarm but not created a new one
            expect(getChromeMock().alarms.clear).toHaveBeenCalledWith('motorscope_check_alarm');
            // alarms.create should only be called for auth check, not for refresh
            const createCalls = getChromeMock().alarms.create.mock.calls;
            const refreshAlarmCalls = createCalls.filter(
                (call: any[]) => call[0] === 'motorscope_check_alarm',
            );
            expect(refreshAlarmCalls.length).toBe(0);
        });

        it('should trigger immediate refresh when nextRefreshTime is in the past', async () => {
            mockGetTokenValue = 'mock-jwt-token';
            // Set nextRefreshTime to 10 minutes in the past
            const pastTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            mockStorageValue = createMockRefreshStatus({nextRefreshTime: pastTime});

            // Clear previous fetch calls
            (global.fetch as jest.Mock).mockClear();

            await triggerOnMessage({type: 'INITIALIZE_ALARM'});
            await new Promise(r => setTimeout(r, 150));

            // Should have triggered a refresh (fetch should be called for listings)
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // Message Routing - Unknown Messages
    // ==========================================================================

    describe('Unknown message types', () => {
        it('should handle unknown message type gracefully', async () => {
            const response = await triggerOnMessage({type: 'UNKNOWN_MESSAGE'});
            expect(response).toBeUndefined();
        });

        it('should handle message without type', async () => {
            const response = await triggerOnMessage({data: 'test'});
            expect(response).toBeUndefined();
        });
    });

    // ==========================================================================
    // Alarm Handling
    // ==========================================================================

    describe('Alarm Handling', () => {
        describe('motorscope_check_alarm', () => {
            it('should trigger refresh when alarm fires', async () => {
                mockStorageValue = createMockRefreshStatus();

                triggerOnAlarm({name: 'motorscope_check_alarm'});
                await new Promise(r => setTimeout(r, 100));

                expect(global.fetch).toHaveBeenCalled();
            });

            it('should skip refresh when no API key', async () => {
                mockStorageValue = createMockRefreshStatus();
                mockFetchQueue.push({
                    ok: true,
                    data: {checkFrequencyMinutes: 60, geminiApiKey: ''},
                });

                triggerOnAlarm({name: 'motorscope_check_alarm'});
                await new Promise(r => setTimeout(r, 100));

                expect(mockRefreshSingleListingCallCount).toBe(0);
            });
        });

        describe('motorscope_auth_check', () => {
            it('should check auth when alarm fires', async () => {
                triggerOnAlarm({name: 'motorscope_auth_check'});
                await new Promise(r => setTimeout(r, 100));

                expect(mockGetStoredTokenCalled).toBe(true);
            });
        });

        describe('Unknown alarm', () => {
            it('should ignore unknown alarm names', () => {
                const prevTokenCalled = mockGetStoredTokenCalled;
                const prevRefreshCount = mockRefreshSingleListingCallCount;

                triggerOnAlarm({name: 'unknown_alarm'});

                expect(mockGetStoredTokenCalled).toBe(prevTokenCalled);
                expect(mockRefreshSingleListingCallCount).toBe(prevRefreshCount);
            });
        });
    });

    // ==========================================================================
    // Extension Lifecycle
    // ==========================================================================

    describe('Extension Lifecycle', () => {
        describe('onInstalled', () => {
            it('should initialize alarm on install', async () => {
                mockStorageValue = createMockRefreshStatus();

                triggerOnInstalled({reason: 'install'});
                await new Promise(r => setTimeout(r, 150));

                expect(chrome.alarms.create).toHaveBeenCalled();
            });

            it('should schedule auth check alarm', async () => {
                mockStorageValue = createMockRefreshStatus();

                triggerOnInstalled({reason: 'install'});
                await new Promise(r => setTimeout(r, 150));

                expect(chrome.alarms.create).toHaveBeenCalledWith(
                    'motorscope_auth_check',
                    expect.objectContaining({periodInMinutes: expect.any(Number)}),
                );
            });

            it('should initialize auth', async () => {
                mockStorageValue = createMockRefreshStatus();

                triggerOnInstalled({reason: 'install'});
                await new Promise(r => setTimeout(r, 150));

                expect(mockInitializeAuthCalled).toBe(true);
            });
        });

        describe('onStartup', () => {
            it('should restore alarm on startup', async () => {
                mockStorageValue = createMockRefreshStatus();

                triggerOnStartup();
                await new Promise(r => setTimeout(r, 150));

                expect(chrome.alarms.create).toHaveBeenCalled();
            });

            it('should check auth on startup', async () => {
                mockStorageValue = createMockRefreshStatus();

                triggerOnStartup();
                await new Promise(r => setTimeout(r, 150));

                expect(mockGetStoredTokenCalled).toBe(true);
            });

            it('should restore scheduled time from storage', async () => {
                const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                mockStorageValue = createMockRefreshStatus({nextRefreshTime: futureTime});

                triggerOnStartup();
                await new Promise(r => setTimeout(r, 150));

                expect(chrome.alarms.create).toHaveBeenCalled();
            });
        });
    });

    // ==========================================================================
    // Refresh Status Updates
    // ==========================================================================

    describe('Refresh Status Updates', () => {
        it('should notify UI of status changes', async () => {
            mockStorageValue = createMockRefreshStatus();

            await triggerOnMessage({type: 'TRIGGER_MANUAL_REFRESH'});
            await new Promise(r => setTimeout(r, 150));

            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({type: 'REFRESH_STATUS_CHANGED'}),
            );
        });
    });

    // ==========================================================================
    // Error Handling
    // ==========================================================================

    describe('Error Handling', () => {
        it('should handle fetch failure gracefully', async () => {
            mockStorageValue = createMockRefreshStatus();
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            // Should not throw
            await expect(triggerOnMessage({type: 'TRIGGER_MANUAL_REFRESH'})).resolves.not.toThrow();
        });

        it('should handle API error response', async () => {
            mockStorageValue = createMockRefreshStatus();
            mockFetchQueue.push({ok: false, status: 500, data: {error: 'Server error'}});

            await triggerOnMessage({type: 'TRIGGER_MANUAL_REFRESH'});
            await new Promise(r => setTimeout(r, 150));

            // Should still schedule alarm
            expect(chrome.alarms.create).toHaveBeenCalled();
        });
    });
});
