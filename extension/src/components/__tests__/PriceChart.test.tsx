/**
 * PriceChart Component Tests
 *
 * Tests for the price history chart component.
 */

import React from 'react';
import { render, screen } from '../../test-utils/renderHelpers';
import PriceChart from '@/components/PriceChart';
import { PricePoint } from '@/types';

// Mock recharts to avoid rendering issues in jsdom
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

describe('PriceChart', () => {
  const mockPriceHistory: PricePoint[] = [
    { date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN' },
    { date: '2024-01-20T10:00:00Z', price: 125000, currency: 'PLN' },
    { date: '2024-01-25T10:00:00Z', price: 120000, currency: 'PLN' },
  ];

  const defaultProps = {
    history: mockPriceHistory,
    currency: 'PLN',
  };

  describe('with sufficient data', () => {
    it('renders chart container when history has 2+ points', () => {
      render(<PriceChart {...defaultProps} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('does not show empty state when data is present', () => {
      render(<PriceChart {...defaultProps} />);

      expect(screen.queryByText(/no price history yet/i)).not.toBeInTheDocument();
    });
  });

  describe('with insufficient data', () => {
    it('shows empty state when history has 0 points', () => {
      render(<PriceChart history={[]} currency="PLN" />);

      expect(screen.getByText(/no price history yet/i)).toBeInTheDocument();
      expect(screen.getByText(/price changes will be tracked/i)).toBeInTheDocument();
    });

    it('shows empty state when history has only 1 point', () => {
      const singlePoint: PricePoint[] = [
        { date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN' },
      ];
      render(<PriceChart history={singlePoint} currency="PLN" />);

      expect(screen.getByText(/no price history yet/i)).toBeInTheDocument();
    });

    it('does not render chart when data is insufficient', () => {
      render(<PriceChart history={[]} currency="PLN" />);

      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    });
  });

  describe('empty state styling', () => {
    it('renders empty state with proper container', () => {
      const { container } = render(<PriceChart history={[]} currency="PLN" />);

      const emptyState = container.querySelector('.bg-gray-50');
      expect(emptyState).toBeInTheDocument();
    });

    it('renders title with proper styling', () => {
      render(<PriceChart history={[]} currency="PLN" />);

      const title = screen.getByText(/no price history yet/i);
      expect(title).toHaveClass('text-gray-500');
    });

    it('renders description with proper styling', () => {
      render(<PriceChart history={[]} currency="PLN" />);

      const description = screen.getByText(/price changes will be tracked/i);
      expect(description).toHaveClass('text-gray-400');
    });
  });

  describe('data processing', () => {
    it('handles price history with duplicates on same day', () => {
      const historyWithDuplicates: PricePoint[] = [
        { date: '2024-01-15T08:00:00Z', price: 130000, currency: 'PLN' },
        { date: '2024-01-15T20:00:00Z', price: 128000, currency: 'PLN' }, // Same day
        { date: '2024-01-20T10:00:00Z', price: 125000, currency: 'PLN' },
      ];

      // Should not throw and should render chart (deduplication happens internally)
      render(<PriceChart history={historyWithDuplicates} currency="PLN" />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('handles various currency formats', () => {
      const eurHistory: PricePoint[] = [
        { date: '2024-01-15T10:00:00Z', price: 30000, currency: 'EUR' },
        { date: '2024-01-20T10:00:00Z', price: 29000, currency: 'EUR' },
      ];

      render(<PriceChart history={eurHistory} currency="EUR" />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('chart container', () => {
    it('has correct height class', () => {
      const { container } = render(<PriceChart {...defaultProps} />);

      const chartContainer = container.querySelector('.h-48');
      expect(chartContainer).toBeInTheDocument();
    });

    it('has full width', () => {
      const { container } = render(<PriceChart {...defaultProps} />);

      const chartContainer = container.querySelector('.w-full');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});

