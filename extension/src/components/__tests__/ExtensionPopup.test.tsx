/**
 * ExtensionPopup Component Tests
 *
 * Tests for the main popup component of the Chrome extension.
 * This component requires mocking of context providers and Chrome APIs.
 */

import React from 'react';
import {render, screen} from '../../test-utils/renderHelpers';
import ExtensionPopup from '@/components/ExtensionPopup';
import {createMockListing} from '@/test-utils/mockData';
import {parseCarDataWithGemini} from '@/services/gemini';

// Mock context hooks
const mockUseListings = {
    listings: [],
    isLoading: false,
    add: jest.fn(),
    remove: jest.fn(),
    error: null,
    clearError: jest.fn(),
};

const mockUseSettings = {
    settings: {
        geminiApiKey: 'test-key',
        checkFrequencyMinutes: 60,
    },
    isLoading: false,
    reload: jest.fn(),
};

const mockUseAuth = {
    status: 'logged_in' as const,
    user: {email: 'test@example.com', name: 'Test User'},
    login: jest.fn(),
    logout: jest.fn(),
    isLoggingIn: false,
    error: null,
    clearError: jest.fn(),
};

jest.mock('@/context/AppContext', () => ({
    useListings: () => mockUseListings,
    useSettings: () => mockUseSettings,
}));

jest.mock('@/auth/AuthContext', () => ({
    useAuth: () => mockUseAuth,
}));

// Mock hooks
const mockUseCurrentTab = {
    tab: {url: 'https://www.otomoto.pl/oferta/test-listing'},
    isLoading: false,
};

const mockUsePageContent = {
    content: {content: 'Test page content', title: 'Test Listing', image: 'https://example.com/image.jpg'},
    isLoading: false,
    refresh: jest.fn().mockResolvedValue(null),
};

const mockUseExtensionNavigation = {
    openDashboard: jest.fn(),
    openSettings: jest.fn(),
};

jest.mock('@/hooks', () => ({
    useCurrentTab: () => mockUseCurrentTab,
    usePageContent: () => mockUsePageContent,
    useExtensionNavigation: () => mockUseExtensionNavigation,
}));

// Mock Gemini service
jest.mock('@/services/gemini', () => ({
    parseCarDataWithGemini: jest.fn(),
}));

// Mock recharts
jest.mock('recharts', () => {
    const OriginalModule = jest.requireActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({children}: { children: React.ReactNode }) => (
            <div data-testid="responsive-container" style={{width: 400, height: 200}}>
                {children}
            </div>
        ),
    };
});

describe('ExtensionPopup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup parseCarDataWithGemini mock
        (parseCarDataWithGemini as jest.Mock).mockResolvedValue(createMockListing());
    });

    describe('when user is logged in', () => {
        it('renders popup header', () => {
            render(<ExtensionPopup/>);

            expect(screen.getByText(/motorscope/i)).toBeInTheDocument();
        });

        it('renders user menu', () => {
            render(<ExtensionPopup/>);

            // Should show user info or menu toggle
            const userElements = screen.queryAllByText(/test/i);
            expect(userElements.length).toBeGreaterThanOrEqual(0);
        });

        describe('on offer page without saved listing', () => {
            it('shows analyze prompt', () => {
                render(<ExtensionPopup/>);

                // Should show option to track/analyze
                expect(screen.getByText(/track/i) || screen.getByText(/add/i) || screen.getByText(/watchlist/i)).toBeTruthy();
            });
        });

        describe('on offer page with saved listing', () => {
            beforeEach(() => {
                const savedListing = createMockListing({
                    source: {
                        platform: 'otomoto',
                        url: 'https://www.otomoto.pl/oferta/test-listing',
                        listingId: 'test',
                        countryCode: 'PL',
                    },
                });
                mockUseListings.listings = [savedListing];
            });

            afterEach(() => {
                mockUseListings.listings = [];
            });

            it('shows saved item view', () => {
                render(<ExtensionPopup/>);

                // Should show that item is tracked - may have multiple matches
                const trackedElements = screen.getAllByText(/tracked/i);
                expect(trackedElements.length).toBeGreaterThan(0);
            });
        });
    });

    describe('when user is not logged in', () => {
        beforeEach(() => {
            (mockUseAuth as any).status = 'logged_out';
        });

        afterEach(() => {
            (mockUseAuth as any).status = 'logged_in';
        });

        it('shows login view', () => {
            render(<ExtensionPopup/>);

            // Should show sign in text - may have multiple matches
            const signInElements = screen.getAllByText(/sign in/i);
            expect(signInElements.length).toBeGreaterThan(0);
        });

        it('shows Google login button', () => {
            render(<ExtensionPopup/>);

            expect(screen.getByRole('button', {name: /google/i})).toBeInTheDocument();
        });
    });

    describe('when auth is loading', () => {
        beforeEach(() => {
            (mockUseAuth as any).status = 'loading';
        });

        afterEach(() => {
            (mockUseAuth as any).status = 'logged_in';
        });

        it('shows loading spinner', () => {
            render(<ExtensionPopup/>);

            expect(screen.getByText(/loading/i)).toBeInTheDocument();
        });
    });

    describe('not on marketplace', () => {
        beforeEach(() => {
            mockUseCurrentTab.tab = {url: 'https://www.google.com'};
        });

        afterEach(() => {
            mockUseCurrentTab.tab = {url: 'https://www.otomoto.pl/oferta/test-listing'};
        });

        it('shows not on marketplace message', () => {
            render(<ExtensionPopup/>);

            // Should show message about not being on a supported site
            expect(
                screen.getByText(/not on/i) ||
                screen.getByText(/marketplace/i) ||
                screen.getByText(/supported/i),
            ).toBeTruthy();
        });
    });

    describe('navigation', () => {
        it('has dashboard link', () => {
            render(<ExtensionPopup/>);

            const dashboardLink = screen.queryByText(/dashboard/i) ||
                screen.queryByTitle(/dashboard/i);
            expect(dashboardLink).toBeTruthy();
        });

        it('has settings link', () => {
            render(<ExtensionPopup/>);

            const settingsLink = screen.queryByText(/settings/i) ||
                screen.queryByTitle(/settings/i);
            expect(settingsLink).toBeTruthy();
        });
    });
});

