/**
 * ErrorBoundary Component Tests
 *
 * Tests for the error boundary component that catches and displays errors.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '@/components/ErrorBoundary';
import { renderWithProviders } from '@/test-utils/renderHelpers';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Suppress console.error for error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      renderWithProviders(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders multiple children correctly', () => {
      renderWithProviders(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error UI when child throws', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows reload button', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('shows try again button', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('displays helpful message to user', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
    });
  });

  describe('recovery', () => {
    it('resets error state when try again is clicked', async () => {
      const user = userEvent.setup();

      const { rerender } = renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click try again
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });

      // Rerender with non-throwing component before clicking
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      await user.click(tryAgainButton);

      // Should show normal content after reset
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      renderWithProviders(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('error logging', () => {
    it('logs error to console', () => {
      renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('renders with proper layout', () => {
      const { container } = renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should have centered layout
      const wrapper = container.querySelector('.min-h-screen');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders alert icon', () => {
      const { container } = renderWithProviders(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should have SVG icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});

