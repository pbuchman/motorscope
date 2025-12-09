/**
 * SavedItemView Component Tests
 *
 * Tests for the view showing a tracked listing's details.
 */

import React from 'react';
import { render, screen } from '../../../test-utils/renderHelpers';
import { SavedItemView } from '@/components/popup/SavedItemView';
import { createMockListing } from '@/test-utils/mockData';

describe('SavedItemView', () => {
  const mockListing = createMockListing();
  const defaultProps = {
    listing: mockListing,
    onUntrack: jest.fn(),
    onViewInDashboard: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listing details', () => {
    it('displays listing title', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText(mockListing.title)).toBeInTheDocument();
    });

    it('displays current price with currency', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText(/125,000/)).toBeInTheDocument();
      expect(screen.getByText(/PLN/)).toBeInTheDocument();
    });

    it('displays tracked badge', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText('Tracked')).toBeInTheDocument();
    });

    it('displays production year', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText('2020')).toBeInTheDocument();
    });

    it('displays mileage', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText(/45,000/)).toBeInTheDocument();
    });

    it('displays fuel type', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText(/Diesel/)).toBeInTheDocument();
    });

    it('displays VIN when available', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText(/WBAXXXXXXXX123456/)).toBeInTheDocument();
    });

    it('displays thumbnail image', () => {
      render(<SavedItemView {...defaultProps} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockListing.thumbnailUrl);
    });

    it('displays seller phone when available', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText(/\+48 123 456 789/)).toBeInTheDocument();
    });

    it('displays tracking start date', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByText(/Tracked since/)).toBeInTheDocument();
    });
  });

  describe('phone link', () => {
    it('renders phone as clickable link', () => {
      render(<SavedItemView {...defaultProps} />);

      const phoneLink = screen.getByRole('link', { name: /\+48 123 456 789/ });
      expect(phoneLink).toHaveAttribute('href', 'tel:+48 123 456 789');
    });
  });

  describe('actions', () => {
    it('renders stop tracking button', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByRole('button', { name: /stop tracking/i })).toBeInTheDocument();
    });

    it('calls onUntrack when stop tracking button is clicked', async () => {
      const onUntrack = jest.fn();
      const { user } = render(<SavedItemView {...defaultProps} onUntrack={onUntrack} />);

      const button = screen.getByRole('button', { name: /stop tracking/i });
      await user.click(button);

      expect(onUntrack).toHaveBeenCalledTimes(1);
    });

    it('renders view in dashboard button when handler is provided', () => {
      render(<SavedItemView {...defaultProps} />);

      expect(screen.getByRole('button', { name: /view in dashboard/i })).toBeInTheDocument();
    });

    it('calls onViewInDashboard when button is clicked', async () => {
      const onViewInDashboard = jest.fn();
      const { user } = render(
        <SavedItemView {...defaultProps} onViewInDashboard={onViewInDashboard} />
      );

      const button = screen.getByRole('button', { name: /view in dashboard/i });
      await user.click(button);

      expect(onViewInDashboard).toHaveBeenCalledTimes(1);
    });

    it('does not render view in dashboard button when handler not provided', () => {
      render(<SavedItemView {...defaultProps} onViewInDashboard={undefined} />);

      expect(screen.queryByRole('button', { name: /view in dashboard/i })).not.toBeInTheDocument();
    });
  });

  describe('missing data handling', () => {
    it('does not show VIN section when VIN is null', () => {
      const listingWithoutVin = createMockListing({
        vehicle: {
          ...mockListing.vehicle,
          vin: null,
        },
      });

      render(<SavedItemView {...defaultProps} listing={listingWithoutVin} />);

      expect(screen.queryByText(/VIN:/)).not.toBeInTheDocument();
    });

    it('does not show phone section when phone is null', () => {
      const listingWithoutPhone = createMockListing({
        seller: {
          ...mockListing.seller,
          phone: null,
        },
      });

      render(<SavedItemView {...defaultProps} listing={listingWithoutPhone} />);

      expect(screen.queryByText(/📞/)).not.toBeInTheDocument();
    });

    it('does not show posted date when null', () => {
      const listingWithoutDate = createMockListing({
        postedDate: null,
      });

      render(<SavedItemView {...defaultProps} listing={listingWithoutDate} />);

      expect(screen.queryByText(/📅/)).not.toBeInTheDocument();
    });
  });
});

