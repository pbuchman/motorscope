/**
 * UserMenu Component Tests
 *
 * Tests for the user dropdown menu component.
 */

import React from 'react';
import {render, screen, waitFor} from '../../../test-utils/renderHelpers';
import {UserMenu} from '@/components/ui/UserMenu';

// Mock the API client
jest.mock('@/api/client', () => ({
    patchRemoteSettings: jest.fn().mockResolvedValue({}),
}));

describe('UserMenu', () => {
    const defaultProps = {
        userEmail: 'test@example.com',
        onLogout: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('display', () => {
        it('displays user email', () => {
            render(<UserMenu {...defaultProps} />);

            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        it('truncates long email addresses', () => {
            render(<UserMenu {...defaultProps} userEmail="verylongemail@verylongdomain.com"/>);

            const emailElement = screen.getByText('verylongemail@verylongdomain.com');
            expect(emailElement).toHaveClass('truncate');
        });
    });

    describe('dropdown toggle', () => {
        it('opens menu when button is clicked', async () => {
            const {user} = render(<UserMenu {...defaultProps} />);

            // Menu should be closed initially
            expect(screen.queryByText('Log Out')).not.toBeInTheDocument();

            // Click to open
            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            await user.click(menuButton);

            // Menu should be open
            expect(screen.getByText('Log Out')).toBeInTheDocument();
        });

        it('closes menu when clicking outside', async () => {
            const {user} = render(
                <div>
                    <UserMenu {...defaultProps} />
                    <button>Outside</button>
                </div>
            );

            // Open menu
            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            await user.click(menuButton);
            expect(screen.getByText('Log Out')).toBeInTheDocument();

            // Click outside
            const outsideButton = screen.getByRole('button', {name: /outside/i});
            await user.click(outsideButton);

            // Menu should be closed
            await waitFor(() => {
                expect(screen.queryByText('Log Out')).not.toBeInTheDocument();
            });
        });

        it('closes menu when Escape is pressed', async () => {
            const {user} = render(<UserMenu {...defaultProps} />);

            // Open menu
            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            await user.click(menuButton);
            expect(screen.getByText('Log Out')).toBeInTheDocument();

            // Press Escape
            await user.keyboard('{Escape}');

            // Menu should be closed
            await waitFor(() => {
                expect(screen.queryByText('Log Out')).not.toBeInTheDocument();
            });
        });

        it('shows chevron icon that rotates when open', async () => {
            const {user, container} = render(<UserMenu {...defaultProps} />);

            const chevron = container.querySelector('.transition-transform');
            expect(chevron).not.toHaveClass('rotate-180');

            // Open menu
            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            await user.click(menuButton);

            // Chevron should be rotated
            expect(chevron).toHaveClass('rotate-180');
        });
    });

    describe('logout', () => {
        it('calls onLogout when logout is clicked', async () => {
            const onLogout = jest.fn();
            const {user} = render(<UserMenu {...defaultProps} onLogout={onLogout}/>);

            // Open menu
            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            await user.click(menuButton);

            // Click logout
            const logoutButton = screen.getByText('Log Out');
            await user.click(logoutButton);

            expect(onLogout).toHaveBeenCalledTimes(1);
        });

        it('closes menu after logout', async () => {
            const {user} = render(<UserMenu {...defaultProps} />);

            // Open menu
            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            await user.click(menuButton);

            // Click logout
            const logoutButton = screen.getByText('Log Out');
            await user.click(logoutButton);

            // Menu should be closed
            await waitFor(() => {
                expect(screen.queryByText('Log Out')).not.toBeInTheDocument();
            });
        });
    });

    describe('language switching', () => {
        it('shows language options in menu', async () => {
            const {user} = render(<UserMenu {...defaultProps} />);

            // Open menu
            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            await user.click(menuButton);

            // Should show language options
            expect(screen.getByText('English')).toBeInTheDocument();
            expect(screen.getByText('Polski')).toBeInTheDocument();
        });
    });

    describe('variants', () => {
        it('applies light variant styling', () => {
            const {container} = render(<UserMenu {...defaultProps} variant="light"/>);

            const button = container.querySelector('button');
            expect(button).toHaveClass('bg-white');
        });

        it('applies dark variant styling', () => {
            const {container} = render(<UserMenu {...defaultProps} variant="dark"/>);

            const button = container.querySelector('button');
            expect(button).toHaveClass('bg-slate-700');
        });

        it('applies compact mode', () => {
            const {container} = render(<UserMenu {...defaultProps} compact={true}/>);

            const emailSpan = container.querySelector('.truncate');
            expect(emailSpan).toHaveClass('max-w-[120px]');
        });
    });

    describe('accessibility', () => {
        it('has aria-expanded attribute', async () => {
            const {user} = render(<UserMenu {...defaultProps} />);

            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            expect(menuButton).toHaveAttribute('aria-expanded', 'false');

            await user.click(menuButton);
            expect(menuButton).toHaveAttribute('aria-expanded', 'true');
        });

        it('has aria-haspopup attribute', () => {
            render(<UserMenu {...defaultProps} />);

            const menuButton = screen.getByRole('button', {name: /test@example.com/i});
            expect(menuButton).toHaveAttribute('aria-haspopup', 'true');
        });
    });
});

