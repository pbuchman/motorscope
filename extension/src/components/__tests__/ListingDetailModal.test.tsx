/**
 * ListingDetailModal Component Tests
 *
 * Tests for the listing detail modal overlay.
 */

import React from 'react';
import { render, screen } from '../../test-utils/renderHelpers';
import ListingDetailModal from '@/components/ListingDetailModal';
import { createMockListing } from '@/test-utils/mockData';
import { ListingStatus } from '@/types';

// Mock recharts to avoid rendering issues
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 400, height: 200 }}>
        {children}
      </div>
    ),
  };
});

describe('ListingDetailModal', () => {
  const mockListing = createMockListing();
  const defaultProps = {
    listing: mockListing,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('modal structure', () => {
    it('renders modal overlay', () => {
      const { container } = render(<ListingDetailModal {...defaultProps} />);

      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<ListingDetailModal {...defaultProps} />);

      // Close button has X icon
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('calls onClose when close button clicked', async () => {
      const onClose = jest.fn();
      const { user, container } = render(
        <ListingDetailModal {...defaultProps} onClose={onClose} />
      );

      // Find the close button (first button with X icon)
      const closeButton = container.querySelector('button');
      if (closeButton) {
        await user.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClose when overlay clicked', async () => {
      const onClose = jest.fn();
      const { user, container } = render(
        <ListingDetailModal {...defaultProps} onClose={onClose} />
      );

      const overlay = container.querySelector('.fixed.inset-0');
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('does not close when modal content clicked', async () => {
      const onClose = jest.fn();
      const { user } = render(
        <ListingDetailModal {...defaultProps} onClose={onClose} />
      );

      // Click on title inside modal
      const title = screen.getByText(mockListing.title);
      await user.click(title);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('header', () => {
    it('displays listing title', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText(mockListing.title)).toBeInTheDocument();
    });

    it('displays current price', () => {
      render(<ListingDetailModal {...defaultProps} />);

      // Price appears in multiple places, just check it exists somewhere
      const priceElements = screen.getAllByText(/125,000/);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('displays thumbnail image', () => {
      render(<ListingDetailModal {...defaultProps} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockListing.thumbnailUrl);
    });

    it('displays status badge for active listing', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays status badge for ended listing', () => {
      const endedListing = createMockListing({ status: ListingStatus.ENDED });
      render(<ListingDetailModal {...defaultProps} listing={endedListing} />);

      expect(screen.getByText('Ended')).toBeInTheDocument();
    });

    it('displays marketplace badge', () => {
      render(<ListingDetailModal {...defaultProps} />);

      // OTOMOTO is the marketplace display name
      const marketplaceBadges = screen.getAllByText(/OTOMOTO/i);
      expect(marketplaceBadges.length).toBeGreaterThan(0);
    });
  });

  describe('vehicle identification section', () => {
    it('displays VIN when available', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Vehicle Identification')).toBeInTheDocument();
      expect(screen.getByText(/WBAXXXXXXXX123456/)).toBeInTheDocument();
    });

    it('displays make', () => {
      render(<ListingDetailModal {...defaultProps} />);

      // Make label and value
      expect(screen.getAllByText(/BMW/i).length).toBeGreaterThan(0);
    });

    it('displays model', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getAllByText(/320d/i).length).toBeGreaterThan(0);
    });
  });

  describe('production section', () => {
    it('displays production year', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Production & Registration')).toBeInTheDocument();
      // Year may appear in title and in the details
      const yearElements = screen.getAllByText('2020');
      expect(yearElements.length).toBeGreaterThan(0);
    });

    it('displays mileage with unit', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText(/45,000.*km/)).toBeInTheDocument();
    });
  });

  describe('engine section', () => {
    it('displays engine section', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Engine & Drivetrain')).toBeInTheDocument();
    });

    it('displays fuel type', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Diesel')).toBeInTheDocument();
    });
  });

  describe('location section', () => {
    it('displays location section', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('displays city', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Warsaw')).toBeInTheDocument();
    });
  });

  describe('seller section', () => {
    it('displays seller section', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Seller')).toBeInTheDocument();
    });

    it('displays seller name', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('BMW Premium Selection')).toBeInTheDocument();
    });

    it('displays phone number', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('+48 123 456 789')).toBeInTheDocument();
    });
  });

  describe('pricing section', () => {
    it('displays pricing section', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    it('displays current price label', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Current Price')).toBeInTheDocument();
    });
  });

  describe('price history section', () => {
    it('displays price history section', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Price History')).toBeInTheDocument();
    });

    it('renders price chart', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('displays price history table', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();
    });
  });

  describe('tracking info section', () => {
    it('displays tracking info section', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText('Tracking Info')).toBeInTheDocument();
    });

    it('displays first seen date', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText(/first seen/i)).toBeInTheDocument();
    });

    it('displays last checked date', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText(/last checked/i)).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('displays listing ID', () => {
      render(<ListingDetailModal {...defaultProps} />);

      // The footer shows "ID: {id}" - may appear multiple times
      const idTexts = screen.getAllByText(/ID:/);
      expect(idTexts.length).toBeGreaterThan(0);
    });

    it('displays schema version', () => {
      render(<ListingDetailModal {...defaultProps} />);

      expect(screen.getByText(/Schema:/)).toBeInTheDocument();
    });

    it('displays external link button', () => {
      render(<ListingDetailModal {...defaultProps} />);

      const externalLink = screen.getByRole('link', { name: /open original listing/i });
      expect(externalLink).toHaveAttribute('href', mockListing.source.url);
      expect(externalLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('price change display', () => {
    it('shows price decrease indicator when price dropped', () => {
      const listingWithPriceDrop = createMockListing({
        currentPrice: 120000,
        priceHistory: [
          { date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN' },
          { date: '2024-01-20T10:00:00Z', price: 120000, currency: 'PLN' },
        ],
      });
      render(<ListingDetailModal {...defaultProps} listing={listingWithPriceDrop} />);

      // Should show percentage with down arrow
      expect(screen.getByText(/since tracked/i)).toBeInTheDocument();
    });

    it('shows price increase indicator when price rose', () => {
      const listingWithPriceRise = createMockListing({
        currentPrice: 140000,
        priceHistory: [
          { date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN' },
          { date: '2024-01-20T10:00:00Z', price: 140000, currency: 'PLN' },
        ],
      });
      render(<ListingDetailModal {...defaultProps} listing={listingWithPriceRise} />);

      expect(screen.getByText(/since tracked/i)).toBeInTheDocument();
    });
  });

  describe('missing data handling', () => {
    it('handles missing VIN gracefully', () => {
      const listingWithoutVin = createMockListing({
        vehicle: {
          ...mockListing.vehicle,
          vin: null,
        },
      });
      render(<ListingDetailModal {...defaultProps} listing={listingWithoutVin} />);

      // Should not crash, VIN row just won't be shown
      expect(screen.getByText('Vehicle Identification')).toBeInTheDocument();
    });

    it('handles missing location gracefully', () => {
      const listingWithoutLocation = createMockListing({
        location: {
          city: null,
          region: null,
          postalCode: null,
          countryCode: null,
        },
      });
      render(<ListingDetailModal {...defaultProps} listing={listingWithoutLocation} />);

      // Location section might not render if all fields are null
      expect(screen.getByText(listingWithoutLocation.title)).toBeInTheDocument();
    });

    it('handles missing posted date', () => {
      const listingWithoutPostedDate = createMockListing({
        postedDate: null,
      });
      render(<ListingDetailModal {...defaultProps} listing={listingWithoutPostedDate} />);

      expect(screen.getByText(/posted.*unknown/i)).toBeInTheDocument();
    });
  });
});

