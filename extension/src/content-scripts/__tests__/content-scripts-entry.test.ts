const flushMicrotasks = (): Promise<void> => new Promise(resolve => queueMicrotask(resolve));

const createChromeMock = () => ({
    runtime: {
        getURL: jest.fn().mockReturnValue('chrome-extension://test/icon.png'),
        sendMessage: jest.fn().mockImplementation(async (payload: {type?: string}) => {
            if (payload?.type === 'GET_TRACKED_URLS') {
                return {urls: ['https://www.otomoto.pl/oferta/mock']};
            }
            return {success: true};
        }),
        onMessage: {
            addListener: jest.fn(),
        },
    },
    tabs: {
        create: jest.fn().mockResolvedValue(undefined),
    },
}) as unknown as typeof chrome;

type SharedMock = {
    normalizeTrackedUrls: jest.Mock;
    processArticles: jest.Mock;
    createSelectorObserver: jest.Mock;
    createOtomotoMainController: jest.Mock;
    __mockController: {runExtraction: jest.Mock};
};

const getSharedMock = (): SharedMock => {
    return jest.requireMock('../shared') as SharedMock;
};

jest.mock('../shared', () => {
    const logFn = jest.fn();
    const mockController = {runExtraction: jest.fn()};
    return {
        __esModule: true,
        createLogger: jest.fn(() => logFn),
        onDOMReady: jest.fn((callback: () => void) => callback()),
        isSearchPage: jest.fn(() => true),
        isListingPage: jest.fn(() => true),
        createSelectorObserver: jest.fn().mockReturnValue({disconnect: jest.fn()}),
        normalizeTrackedUrls: jest.fn((urls: string[]) => new Set(urls)),
        processArticles: jest.fn(() => 1),
        resetArticleProcessingState: jest.fn(),
        createMotorScopeIcon: jest.fn(() => document.createElement('button')),
        createOtomotoMainController: jest.fn(() => mockController),
        findButtonByText: jest.fn(),
        getReactFiber: jest.fn(),
        searchFiber: jest.fn(),
        cleanPhoneNumber: jest.fn(),
        isValidPhone: jest.fn(),
        __mockController: mockController,
    } as const;
});

const BASE_LISTING_MARKUP = `
    <article data-id="1">
        <h2><a href="/oferta/mock">Mock listing</a></h2>
        <button aria-label="Dodaj do obserwowanych"></button>
    </article>
`;

describe('content-script entry harness', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        document.body.innerHTML = BASE_LISTING_MARKUP;
        (globalThis as any).chrome = createChromeMock();
        jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
        delete (globalThis as any).chrome;
        jest.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('initializes the OTOMOTO listing script and processes articles', async () => {
        const shared = getSharedMock();
        await import('../otomoto-listing');
        await flushMicrotasks();

        const chromeMock = (globalThis as any).chrome;
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({type: 'GET_TRACKED_URLS'}));
        expect(shared.normalizeTrackedUrls).toHaveBeenCalled();
        expect(shared.processArticles).toHaveBeenCalled();
        expect(shared.createSelectorObserver).toHaveBeenCalled();
    });

    it('initializes the OTOMOTO main script and schedules extraction retries', async () => {
        const shared = getSharedMock();
        const originalGlobalTimeout = global.setTimeout;
        const originalWindowTimeout = window.setTimeout;
        const immediateTimeout: typeof setTimeout = ((callback: () => void) => {
            if (typeof callback === 'function') {
                callback();
            }
            return 0 as unknown as ReturnType<typeof setTimeout>;
        }) as typeof setTimeout;

        global.setTimeout = immediateTimeout;
        window.setTimeout = immediateTimeout;

        try {
            await import('../otomoto-main');
            await flushMicrotasks();
        } finally {
            global.setTimeout = originalGlobalTimeout;
            window.setTimeout = originalWindowTimeout;
        }

        expect(shared.createOtomotoMainController).toHaveBeenCalledTimes(1);
        expect(shared.__mockController.runExtraction).toHaveBeenCalledTimes(3);
    });
});
