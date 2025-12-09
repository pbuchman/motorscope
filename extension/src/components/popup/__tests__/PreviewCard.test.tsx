/**
 * PreviewCard Component Tests
 *
 * Tests for the listing preview card shown before saving.
 */

import React from 'react';
import { render, screen } from '../../../test-utils/renderHelpers';
import { PreviewCard } from '@/components/popup/PreviewCard';
import { createMockListing } from '@/test-utils/mockData';

describe('PreviewCard', () => {
  const mockListing = createMockListing();
  const defaultProps = {
    listing: mockListing,
    showVinWarning: false,
    showDateWarning: false,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listing details', () => {
    it('displays listing title', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByText(mockListing.title)).toBeInTheDocument();
    });

    it('displays current price with currency', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByText(/125,000/)).toBeInTheDocument();
      expect(screen.getByText(/PLN/)).toBeInTheDocument();
    });

    it('displays production year', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByText('2020')).toBeInTheDocument();
    });

    it('displays mileage with unit', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByText(/45,000/)).toBeInTheDocument();
      expect(screen.getByText(/km/)).toBeInTheDocument();
    });

    it('displays fuel type', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByText(/Diesel/)).toBeInTheDocument();
    });

    it('displays VIN when available', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByText(/WBAXXXXXXXX123456/)).toBeInTheDocument();
    });

    it('displays thumbnail image', () => {
      render(<PreviewCard {...defaultProps} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockListing.thumbnailUrl);
      expect(img).toHaveAttribute('alt', mockListing.title);
    });
  });

  describe('warnings', () => {
    it('shows VIN warning when showVinWarning is true', () => {
      render(<PreviewCard {...defaultProps} showVinWarning={true} />);

      expect(screen.getByText(/vin.*not found/i)).toBeInTheDocument();
    });

    it('shows date warning when showDateWarning is true', () => {
      render(<PreviewCard {...defaultProps} showDateWarning={true} />);

      expect(screen.getByText(/posted date.*not found/i)).toBeInTheDocument();
    });

    it('shows both warnings when both are true', () => {
      render(<PreviewCard {...defaultProps} showVinWarning={true} showDateWarning={true} />);

      expect(screen.getByText(/vin.*not found/i)).toBeInTheDocument();
      expect(screen.getByText(/posted date.*not found/i)).toBeInTheDocument();
    });

    it('does not show warning section when no warnings', () => {
      const { container } = render(<PreviewCard {...defaultProps} />);

      const warningSection = container.querySelector('.bg-amber-50');
      expect(warningSection).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('renders confirm button', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('renders cancel button', () => {
      render(<PreviewCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = jest.fn();
      const { user } = render(<PreviewCard {...defaultProps} onConfirm={onConfirm} />);

      const button = screen.getByRole('button', { name: /save/i });
      await user.click(button);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn();
      const { user } = render(<PreviewCard {...defaultProps} onCancel={onCancel} />);

      const button = screen.getByRole('button', { name: /cancel/i });
      await user.click(button);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('missing data handling', () => {
    it('shows "No VIN" badge when VIN is null', () => {
      const listingWithoutVin = createMockListing({
        vehicle: {
          ...mockListing.vehicle,
          vin: null,
        },
      });

      render(<PreviewCard {...defaultProps} listing={listingWithoutVin} />);

      expect(screen.getByText(/no vin/i)).toBeInTheDocument();
    });

    it('handles missing thumbnail gracefully', () => {
      const listingWithoutImage = createMockListing({ thumbnailUrl: '' });

      // Should not throw
      render(<PreviewCard {...defaultProps} listing={listingWithoutImage} />);

      const img = screen.queryByRole('img');
      expect(img).not.toBeInTheDocument();
    });
  });
});

