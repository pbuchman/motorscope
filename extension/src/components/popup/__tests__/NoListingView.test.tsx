/**
 * NoListingView Component Tests
 *
 * Tests for the view shown when user is not on a trackable listing page.
 */

import React from 'react';
import { render, screen } from '../../../test-utils/renderHelpers';
import { NoListingView } from '@/components/popup/NoListingView';
import { MarketplaceConfig } from '@/config/marketplaces';

describe('NoListingView', () => {
  const mockMarketplace: MarketplaceConfig = {
    id: 'otomoto',
    name: 'Otomoto',
    url: 'https://www.otomoto.pl',
    enabled: true,
    domains: ['otomoto.pl', 'www.otomoto.pl'],
    offerPagePatterns: ['/oferta/'],
    countries: ['PL'],
  };

  const mockEnabledMarketplaces: MarketplaceConfig[] = [
    mockMarketplace,
    {
      id: 'mobile-de',
      name: 'Mobile.de',
      url: 'https://www.mobile.de',
      enabled: true,
      domains: ['mobile.de', 'www.mobile.de'],
      offerPagePatterns: ['/fahrzeuge/'],
      countries: ['DE'],
    },
    {
      id: 'autoscout24',
      name: 'AutoScout24',
      url: 'https://www.autoscout24.de',
      enabled: true,
      domains: ['autoscout24.de', 'www.autoscout24.de'],
      offerPagePatterns: ['/offers/'],
      countries: ['DE'],
    },
  ];

  describe('when on a marketplace but not on offer page', () => {
    it('shows message about not being on offer page', () => {
      render(
        <NoListingView
          isOnMarketplace={true}
          detectedMarketplace={mockMarketplace}
          enabledMarketplaces={mockEnabledMarketplaces}
        />
      );

      expect(screen.getByText(/no listing detected/i)).toBeInTheDocument();
    });

    it('shows hint to navigate to specific listing', () => {
      render(
        <NoListingView
          isOnMarketplace={true}
          detectedMarketplace={mockMarketplace}
          enabledMarketplaces={mockEnabledMarketplaces}
        />
      );

      expect(screen.getByText(/navigate to/i)).toBeInTheDocument();
    });
  });

  describe('when not on any supported marketplace', () => {
    it('shows message about not being on a marketplace', () => {
      render(
        <NoListingView
          isOnMarketplace={false}
          detectedMarketplace={null}
          enabledMarketplaces={mockEnabledMarketplaces}
        />
      );

      expect(screen.getByText(/not on a supported marketplace/i)).toBeInTheDocument();
    });

    it('shows supported marketplace links', () => {
      render(
        <NoListingView
          isOnMarketplace={false}
          detectedMarketplace={null}
          enabledMarketplaces={mockEnabledMarketplaces}
        />
      );

      // Should show marketplace links
      expect(screen.getByText('Otomoto')).toBeInTheDocument();
      expect(screen.getByText('Mobile.de')).toBeInTheDocument();
    });

    it('renders marketplace links with correct hrefs', () => {
      render(
        <NoListingView
          isOnMarketplace={false}
          detectedMarketplace={null}
          enabledMarketplaces={mockEnabledMarketplaces}
        />
      );

      const otomotoLink = screen.getByText('Otomoto');
      expect(otomotoLink).toHaveAttribute('href', 'https://www.otomoto.pl');
      expect(otomotoLink).toHaveAttribute('target', '_blank');
      expect(otomotoLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('shows maximum 3 marketplace suggestions', () => {
      const manyMarketplaces: MarketplaceConfig[] = [
        ...mockEnabledMarketplaces,
        {
          id: 'cars24',
          name: 'Cars24',
          url: 'https://www.cars24.com',
          enabled: true,
          domains: ['cars24.com', 'www.cars24.com'],
          offerPagePatterns: ['/buy-used-cars/'],
          countries: ['IN'],
        },
      ];

      render(
        <NoListingView
          isOnMarketplace={false}
          detectedMarketplace={null}
          enabledMarketplaces={manyMarketplaces}
        />
      );

      // Should only show first 3
      const links = screen.getAllByRole('link');
      expect(links.length).toBe(3);
    });
  });

  describe('accessibility', () => {
    it('renders with external link icon', () => {
      const { container } = render(
        <NoListingView
          isOnMarketplace={false}
          detectedMarketplace={null}
          enabledMarketplaces={mockEnabledMarketplaces}
        />
      );

      // Should have an SVG icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});

