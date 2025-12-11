/**
 * CarCard Component Tests
 *
 * Tests for the car listing card component used in the dashboard.
 */

import React from 'react';
import {render, screen} from '../../test-utils/renderHelpers';
import CarCard from '@/components/CarCard';
import {createMockListing} from '@/test-utils/mockData';
import {ListingStatus} from '@/types';

describe('CarCard', () => {
    const mockListing = createMockListing();
    const defaultProps = {
        listing: mockListing,
        onRemove: jest.fn(),
        onRefresh: jest.fn(),
        onArchive: jest.fn(),
        onShowDetails: jest.fn(),
        isRefreshing: false,
        justRefreshed: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('listing details', () => {
        it('displays listing title', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(mockListing.title)).toBeInTheDocument();
        });

        it('displays current price with currency', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/125,000/)).toBeInTheDocument();
            expect(screen.getByText(/PLN/)).toBeInTheDocument();
        });

        it('displays listing status', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/active/i)).toBeInTheDocument();
        });

        it('displays marketplace name', () => {
            render(<CarCard {...defaultProps} />);

            // Should show marketplace badge
            expect(screen.getByText(/otomoto/i)).toBeInTheDocument();
        });

        it('displays vehicle mileage', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/45,000/)).toBeInTheDocument();
            expect(screen.getByText(/km/i)).toBeInTheDocument();
        });

        it('displays fuel type', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/Diesel/i)).toBeInTheDocument();
        });

        it('displays production year', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText('2020')).toBeInTheDocument();
        });

        it('renders thumbnail image with link to listing', () => {
            render(<CarCard {...defaultProps} />);

            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('src', mockListing.thumbnailUrl);

            // Image should be wrapped in a link
            const link = img.closest('a');
            expect(link).toHaveAttribute('href', mockListing.source.url);
            expect(link).toHaveAttribute('target', '_blank');
        });
    });

    describe('status indicators', () => {
        it('shows ACTIVE status with green styling', () => {
            render(<CarCard {...defaultProps} />);

            const statusBadge = screen.getByText(/active/i);
            expect(statusBadge).toHaveClass('text-green-900');
        });

        it('shows ENDED status with red styling', () => {
            const endedListing = createMockListing({status: ListingStatus.ENDED});
            render(<CarCard {...defaultProps} listing={endedListing}/>);

            const statusBadge = screen.getByText(/ended/i);
            expect(statusBadge).toHaveClass('text-red-900');
        });

        it('shows final price label for ended listings', () => {
            const endedListing = createMockListing({status: ListingStatus.ENDED});
            render(<CarCard {...defaultProps} listing={endedListing}/>);

            expect(screen.getByText(/final price/i)).toBeInTheDocument();
        });
    });

    describe('price changes', () => {
        it('shows price drop indicator when price decreased', () => {
            const listingWithPriceDrop = createMockListing({
                currentPrice: 120000,
                priceHistory: [
                    {date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN'},
                    {date: '2024-01-20T10:00:00Z', price: 120000, currency: 'PLN'},
                ],
            });
            render(<CarCard {...defaultProps} listing={listingWithPriceDrop}/>);

            expect(screen.getByText(/drop/i)).toBeInTheDocument();
        });

        it('shows price rise indicator when price increased', () => {
            const listingWithPriceRise = createMockListing({
                currentPrice: 140000,
                priceHistory: [
                    {date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN'},
                    {date: '2024-01-20T10:00:00Z', price: 140000, currency: 'PLN'},
                ],
            });
            render(<CarCard {...defaultProps} listing={listingWithPriceRise}/>);

            expect(screen.getByText(/rise/i)).toBeInTheDocument();
        });

        it('shows discount badge when original price is higher', () => {
            const listingWithDiscount = createMockListing({
                currentPrice: 100000,
                originalPrice: 120000,
            });
            render(<CarCard {...defaultProps} listing={listingWithDiscount}/>);

            // Should show discount percentage
            expect(screen.getByText(/-17%/i)).toBeInTheDocument();
        });

        it('shows negotiable badge when price is negotiable', () => {
            const negotiableListing = createMockListing({negotiable: true});
            render(<CarCard {...defaultProps} listing={negotiableListing}/>);

            expect(screen.getByText(/negotiable/i)).toBeInTheDocument();
        });
    });

    describe('archived state', () => {
        it('shows archived badge for archived listings', () => {
            const archivedListing = createMockListing({isArchived: true});
            render(<CarCard {...defaultProps} listing={archivedListing}/>);

            expect(screen.getByText(/archived/i)).toBeInTheDocument();
        });

        it('applies reduced opacity for archived listings', () => {
            const archivedListing = createMockListing({isArchived: true});
            const {container} = render(<CarCard {...defaultProps} listing={archivedListing}/>);

            const card = container.firstChild;
            expect(card).toHaveClass('opacity-80');
        });
    });

    describe('refresh state', () => {
        it('shows loading overlay when refreshing', () => {
            render(<CarCard {...defaultProps} isRefreshing={true}/>);

            expect(screen.getByText(/refreshing/i)).toBeInTheDocument();
        });

        it('shows spinner when refreshing', () => {
            const {container} = render(<CarCard {...defaultProps} isRefreshing={true}/>);

            const spinner = container.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });

        it('highlights card when just refreshed', () => {
            const {container} = render(<CarCard {...defaultProps} justRefreshed={true}/>);

            const card = container.firstChild;
            expect(card).toHaveClass('border-green-400');
        });
    });

    describe('actions', () => {
        it('calls onShowDetails when details button is clicked', async () => {
            const onShowDetails = jest.fn();
            const {user} = render(<CarCard {...defaultProps} onShowDetails={onShowDetails}/>);

            const detailsButton = screen.getByRole('button', {name: /details/i});
            await user.click(detailsButton);

            expect(onShowDetails).toHaveBeenCalledWith(mockListing);
        });

        it('calls onRefresh when refresh button is clicked', async () => {
            const onRefresh = jest.fn();
            const {user} = render(<CarCard {...defaultProps} onRefresh={onRefresh}/>);

            const refreshButton = screen.getByRole('button', {name: /refresh/i});
            await user.click(refreshButton);

            expect(onRefresh).toHaveBeenCalledWith(mockListing);
        });

        it('calls onArchive when archive button is clicked', async () => {
            const onArchive = jest.fn();
            const {user} = render(<CarCard {...defaultProps} onArchive={onArchive}/>);

            const archiveButton = screen.getByRole('button', {name: /archive/i});
            await user.click(archiveButton);

            expect(onArchive).toHaveBeenCalledWith(mockListing);
        });

        it('shows unarchive button for archived listings', () => {
            const archivedListing = createMockListing({isArchived: true});
            render(<CarCard {...defaultProps} listing={archivedListing}/>);

            expect(screen.getByRole('button', {name: /unarchive/i})).toBeInTheDocument();
        });

        it('calls onRemove when delete button is clicked', async () => {
            const onRemove = jest.fn();
            const {user} = render(<CarCard {...defaultProps} onRemove={onRemove}/>);

            const deleteButton = screen.getByTitle(/stop tracking/i);
            await user.click(deleteButton);

            expect(onRemove).toHaveBeenCalledWith(mockListing.id);
        });
    });

    describe('vehicle details', () => {
        it('displays VIN when available', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/WBAXXXXXXXX123456/)).toBeInTheDocument();
        });

        it('displays location when available', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/Warsaw/)).toBeInTheDocument();
        });

        it('displays engine capacity', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/2.0L/)).toBeInTheDocument();
        });

        it('displays transmission type', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/Automatic/i)).toBeInTheDocument();
        });
    });

    describe('tracking info', () => {
        it('displays first seen date', () => {
            render(<CarCard {...defaultProps} />);

            // Should show tracking date info
            expect(screen.getByText(/tracked/i)).toBeInTheDocument();
        });

        it('displays last checked date', () => {
            render(<CarCard {...defaultProps} />);

            expect(screen.getByText(/last checked/i)).toBeInTheDocument();
        });
    });

    describe('error indicators', () => {
        it('shows warning when last refresh failed', () => {
            const listingWithError = createMockListing({lastRefreshStatus: 'error'});
            const {container} = render(<CarCard {...defaultProps} listing={listingWithError}/>);

            // Should have error indicator (red styling in the error banner)
            const errorBanner = container.querySelector('.bg-red-50');
            expect(errorBanner).toBeInTheDocument();
        });
    });
});

