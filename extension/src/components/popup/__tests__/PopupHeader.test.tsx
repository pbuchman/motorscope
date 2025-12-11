/**
 * PopupHeader Component Tests
 *
 * Tests for the popup header bar component.
 */

import React from 'react';
import {render, screen} from '../../../test-utils/renderHelpers';
import {PopupHeader} from '@/components/popup/PopupHeader';

// Mock the UserMenu component since it has complex behavior
jest.mock('@/components/ui', () => ({
    UserMenu: ({userEmail, onLogout}: { userEmail: string; onLogout: () => void }) => (
        <div data-testid="user-menu">
            <span>{userEmail}</span>
            <button onClick={onLogout}>Logout</button>
        </div>
    ),
}));

describe('PopupHeader', () => {
    const defaultProps = {
        isLoggedIn: false,
        userEmail: undefined,
        onOpenDashboard: jest.fn(),
        onOpenSettings: jest.fn(),
        onLogout: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('branding', () => {
        it('displays app name', () => {
            render(<PopupHeader {...defaultProps} />);

            expect(screen.getByText('MotorScope')).toBeInTheDocument();
        });

        it('renders car icon', () => {
            const {container} = render(<PopupHeader {...defaultProps} />);

            // Car icon from lucide-react
            const icon = container.querySelector('svg');
            expect(icon).toBeInTheDocument();
        });
    });

    describe('navigation buttons', () => {
        it('renders dashboard button', () => {
            render(<PopupHeader {...defaultProps} />);

            expect(screen.getByRole('button', {name: /dashboard/i})).toBeInTheDocument();
        });

        it('calls onOpenDashboard when dashboard button is clicked', async () => {
            const onOpenDashboard = jest.fn();
            const {user} = render(
                <PopupHeader {...defaultProps} onOpenDashboard={onOpenDashboard}/>
            );

            const button = screen.getByRole('button', {name: /dashboard/i});
            await user.click(button);

            expect(onOpenDashboard).toHaveBeenCalledTimes(1);
        });

        it('renders settings button', () => {
            render(<PopupHeader {...defaultProps} />);

            // Settings button should have a title attribute
            const settingsButton = screen.getByTitle(/settings/i);
            expect(settingsButton).toBeInTheDocument();
        });

        it('calls onOpenSettings when settings button is clicked', async () => {
            const onOpenSettings = jest.fn();
            const {user} = render(
                <PopupHeader {...defaultProps} onOpenSettings={onOpenSettings}/>
            );

            const settingsButton = screen.getByTitle(/settings/i);
            await user.click(settingsButton);

            expect(onOpenSettings).toHaveBeenCalledTimes(1);
        });
    });

    describe('user menu', () => {
        it('shows user menu when logged in', () => {
            render(
                <PopupHeader
                    {...defaultProps}
                    isLoggedIn={true}
                    userEmail="test@example.com"
                />
            );

            expect(screen.getByTestId('user-menu')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        it('does not show user menu when logged out', () => {
            render(<PopupHeader {...defaultProps} isLoggedIn={false}/>);

            expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
        });

        it('passes onLogout to user menu', async () => {
            const onLogout = jest.fn();
            const {user} = render(
                <PopupHeader
                    {...defaultProps}
                    isLoggedIn={true}
                    userEmail="test@example.com"
                    onLogout={onLogout}
                />
            );

            const logoutButton = screen.getByRole('button', {name: /logout/i});
            await user.click(logoutButton);

            expect(onLogout).toHaveBeenCalledTimes(1);
        });
    });

    describe('styling', () => {
        it('has dark background', () => {
            const {container} = render(<PopupHeader {...defaultProps} />);

            const header = container.firstChild;
            expect(header).toHaveClass('bg-slate-900');
        });
    });
});

