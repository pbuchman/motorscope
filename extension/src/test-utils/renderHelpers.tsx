/**
 * React Testing Library Utilities
 *
 * Provides custom render function and re-exports RTL utilities.
 * Wraps components in necessary providers for testing.
 */

import React, {ReactElement, ReactNode} from 'react';
import {render, RenderOptions, RenderResult} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {I18nextProvider} from 'react-i18next';
import i18n from '@/i18n'; // Uses the mock via Jest moduleNameMapper

// Provider wrapper for tests
interface WrapperProps {
    children: ReactNode;
}

/**
 * Creates all necessary providers for testing
 */
const AllProviders: React.FC<WrapperProps> = ({children}) => {
    return (
        <I18nextProvider i18n={i18n}>
            {children}
        </I18nextProvider>
    );
};

/**
 * Custom render function that wraps component in providers
 */
export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
    const user = userEvent.setup();

    const result = render(ui, {
        wrapper: AllProviders,
        ...options,
    });

    return {
        ...result,
        user,
    };
}

// Re-export everything from RTL
export * from '@testing-library/react';
export {screen, waitFor, within, fireEvent, cleanup, act} from '@testing-library/react';
export {userEvent};
export {renderWithProviders as render};

