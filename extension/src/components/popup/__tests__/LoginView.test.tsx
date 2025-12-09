/**
 * LoginView Component Tests
 *
 * Tests for the login view shown when user is not authenticated.
 */

import React from 'react';
import { render, screen } from '../../../test-utils/renderHelpers';
import { LoginView } from '@/components/popup/LoginView';

describe('LoginView', () => {
  const defaultProps = {
    onLogin: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sign in title and description', () => {
    render(<LoginView {...defaultProps} />);

    expect(screen.getByText('Sign In Required')).toBeInTheDocument();
    expect(screen.getByText(/sign in with your Google account/i)).toBeInTheDocument();
  });

  it('renders Google sign in button', () => {
    render(<LoginView {...defaultProps} />);

    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('calls onLogin when sign in button is clicked', async () => {
    const onLogin = jest.fn();
    const { user } = render(<LoginView {...defaultProps} onLogin={onLogin} />);

    const button = screen.getByRole('button', { name: /sign in/i });
    await user.click(button);

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('disables button when loading', () => {
    render(<LoginView {...defaultProps} isLoading={true} />);

    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    const { container } = render(<LoginView {...defaultProps} isLoading={true} />);

    // Check for animate-spin class on loading indicator
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Authentication failed';
    render(<LoginView {...defaultProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('does not display error when error is null', () => {
    render(<LoginView {...defaultProps} error={null} />);

    // Error container should not be present
    const container = document.querySelector('.text-red-500');
    expect(container).not.toBeInTheDocument();
  });

  it('renders car icon', () => {
    const { container } = render(<LoginView {...defaultProps} />);

    // lucide-react icons render as svg
    const carIcon = container.querySelector('svg');
    expect(carIcon).toBeInTheDocument();
  });
});

