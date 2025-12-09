/**
 * AnalyzePrompt Component Tests
 *
 * Tests for the analyze prompt shown when user can analyze a listing.
 */

import React from 'react';
import { render, screen } from '../../../test-utils/renderHelpers';
import { AnalyzePrompt } from '@/components/popup/AnalyzePrompt';

describe('AnalyzePrompt', () => {
  const defaultProps = {
    hasApiKey: true,
    isLoading: false,
    hasPageData: true,
    error: null,
    onAnalyze: jest.fn(),
    onOpenSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when API key is present', () => {
    it('renders the analyze button', () => {
      render(<AnalyzePrompt {...defaultProps} />);

      const button = screen.getByRole('button', { name: /add to watchlist/i });
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });

    it('calls onAnalyze when button is clicked', async () => {
      const onAnalyze = jest.fn();
      const { user } = render(<AnalyzePrompt {...defaultProps} onAnalyze={onAnalyze} />);

      const button = screen.getByRole('button', { name: /add to watchlist/i });
      await user.click(button);

      expect(onAnalyze).toHaveBeenCalledTimes(1);
    });

    it('disables button when page data is not available', () => {
      render(<AnalyzePrompt {...defaultProps} hasPageData={false} />);

      const button = screen.getByRole('button', { name: /add to watchlist/i });
      expect(button).toBeDisabled();
    });

    it('disables button when loading', () => {
      render(<AnalyzePrompt {...defaultProps} isLoading={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('shows analyzing text when loading', () => {
      render(<AnalyzePrompt {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
    });

    it('shows loading spinner when loading', () => {
      const { container } = render(<AnalyzePrompt {...defaultProps} isLoading={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('when API key is missing', () => {
    it('shows API key warning', () => {
      render(<AnalyzePrompt {...defaultProps} hasApiKey={false} />);

      expect(screen.getByText(/api key/i)).toBeInTheDocument();
    });

    it('shows settings button instead of analyze button', () => {
      render(<AnalyzePrompt {...defaultProps} hasApiKey={false} />);

      expect(screen.queryByText(/add to watchlist/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('calls onOpenSettings when settings button is clicked', async () => {
      const onOpenSettings = jest.fn();
      const { user } = render(
        <AnalyzePrompt {...defaultProps} hasApiKey={false} onOpenSettings={onOpenSettings} />
      );

      const button = screen.getByRole('button', { name: /settings/i });
      await user.click(button);

      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('error display', () => {
    it('displays error message when error prop is provided', () => {
      const errorMessage = 'Failed to analyze listing';
      render(<AnalyzePrompt {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('does not display error section when error is null', () => {
      render(<AnalyzePrompt {...defaultProps} error={null} />);

      // Error alert icon should not be present
      const errorSection = document.querySelector('.text-red-600');
      expect(errorSection).not.toBeInTheDocument();
    });

    it('shows error with alert icon', () => {
      const { container } = render(<AnalyzePrompt {...defaultProps} error="Test error" />);

      // Check that error section contains the alert styling
      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('prompt info', () => {
    it('displays analyze title and description', () => {
      render(<AnalyzePrompt {...defaultProps} />);

      // Check for specific title text
      expect(screen.getByText('Track this listing')).toBeInTheDocument();
      // Check description is present (there are multiple watchlist mentions)
      expect(screen.getAllByText(/watchlist/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});

