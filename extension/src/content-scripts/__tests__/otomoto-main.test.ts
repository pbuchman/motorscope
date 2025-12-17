import {
    isUserLoggedIn,
    findPhoneInProps,
    createOtomotoMainController,
    type AuthConfig,
    type VinConfig,
    type PhoneConfig,
    type VinModule,
    type PhoneModule,
} from '../shared';

describe('otomoto-main shared helpers', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('isUserLoggedIn', () => {
        const AUTH_SELECTORS: AuthConfig = {
            selectors: {
                loginButton: '[data-testid="login-button"]',
                loginButtonText: '.login-text',
            },
            texts: {
                login: 'Zaloguj się',
            },
        };

        it('returns false when login button is visible with login text', () => {
            document.body.innerHTML = `
                <button data-testid="login-button">
                    <span class="login-text">Zaloguj się</span>
                </button>
            `;

            expect(isUserLoggedIn(document, AUTH_SELECTORS)).toBe(false);
        });

        it('returns true when user is logged in (button missing or different text)', () => {
            document.body.innerHTML = `
                <button data-testid="login-button">
                    <span class="login-text">Profil</span>
                </button>
            `;

            expect(isUserLoggedIn(document, AUTH_SELECTORS)).toBe(true);

            document.body.innerHTML = '';
            expect(isUserLoggedIn(document, AUTH_SELECTORS)).toBe(true);
        });
    });

    describe('findPhoneInProps', () => {
        const validator = (value: string) => /^\+?\d{6,}$/.test(value);

        it('detects phone from single-value props', () => {
            expect(findPhoneInProps({number: '+48123123123'}, validator)).toBe('+48123123123');
        });

        it('detects phone from phones array', () => {
            expect(findPhoneInProps({phones: ['+48600111222']}, validator)).toBe('+48600111222');
        });

        it('detects phone from children text', () => {
            expect(findPhoneInProps({children: '+48555111222'}, validator)).toBe('+48555111222');
        });

        it('returns null when no phone present', () => {
            expect(findPhoneInProps({number: 'abc'}, validator)).toBeNull();
        });
    });

    describe('createOtomotoMainController', () => {
        const authConfig: AuthConfig = {
            selectors: {
                loginButton: '[data-testid="login-button"]',
                loginButtonText: '.login-text',
            },
            texts: {
                login: 'Zaloguj się',
            },
        };

        const vinConfig: VinConfig = {
            selectors: {
                container: '#vin-container',
                display: '#vin-display',
            },
            texts: {
                showVin: 'Wyświetl VIN',
            },
        };

        const phoneConfig: PhoneConfig = {
            selectors: {
                sellerInfo: '#seller',
                phoneButton: '#phone-btn',
                phoneContainer: '#phone-container',
                buttonTextWrapper: '.btn-text',
                telLink: 'a[href^="tel:"]',
            },
            texts: {
                showPhone: 'Wyświetl numer',
            },
            dataAttributes: {
                phone: 'data-motorscope-phone',
            },
        };

        const createDependencies = () => {
            const reveal = jest.fn();
            const extractAndDisplay = jest.fn().mockReturnValue('+48600111222');

            const fakeVinModule: VinModule = {
                isRevealed: jest.fn(),
                findRevealButton: jest.fn(),
                getDisplayedVin: jest.fn(),
                reveal,
            };

            const fakePhoneModule: PhoneModule = {
                findAllButtons: jest.fn(),
                updateButtonText: jest.fn(),
                updateAllButtons: jest.fn(),
                getVisiblePhone: jest.fn(),
                getCachedPhone: jest.fn(),
                cachePhone: jest.fn(),
                extractFromElement: jest.fn(),
                extractAndDisplay,
            };

            return {
                reveal,
                extractAndDisplay,
                fakeVinModule,
                fakePhoneModule,
            };
        };

        it('runs VIN reveal and phone extraction once', () => {
            const {reveal, extractAndDisplay, fakeVinModule, fakePhoneModule} = createDependencies();
            const log = jest.fn();

            const controller = createOtomotoMainController({
                authConfig,
                vinConfig,
                phoneConfig,
            }, {
                doc: document,
                log,
                findButtonByText: jest.fn(),
                getReactFiber: jest.fn(),
                searchFiber: jest.fn(),
                cleanPhoneNumber: jest.fn(value => value),
                isValidPhone: jest.fn(),
                setTimeout,
                createVinModule: jest.fn().mockReturnValue(fakeVinModule),
                createPhoneModule: jest.fn().mockReturnValue(fakePhoneModule),
            });

            const result = controller.runExtraction();

            expect(reveal).toHaveBeenCalledTimes(1);
            expect(extractAndDisplay).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledWith('Phone: SUCCESS!', '+48600111222');
            expect(result).toBe('+48600111222');
        });
    });
});

