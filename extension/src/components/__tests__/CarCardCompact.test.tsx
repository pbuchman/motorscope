/**
 * CarCardCompact Component Tests
 *
 * Tests for the compact car listing card component used in dashboard list view.
 */

import React from 'react';
import {render, screen} from '../../test-utils/renderHelpers';
import CarCardCompact from '@/components/CarCardCompact';
import {createMockListing} from '@/test-utils/mockData';
import {ListingStatus} from '@/types';

describe('CarCardCompact', () => {
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
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText(mockListing.title)).toBeInTheDocument();
        });

        it('displays current price with currency', () => {
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText(/125,000/)).toBeInTheDocument();
            expect(screen.getByText(/PLN/)).toBeInTheDocument();
        });

        it('displays production year', () => {
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText('2020')).toBeInTheDocument();
        });

        it('displays mileage with unit', () => {
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText(/45,000/)).toBeInTheDocument();
            expect(screen.getByText(/km/)).toBeInTheDocument();
        });

        it('displays fuel type', () => {
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText(/Diesel/)).toBeInTheDocument();
        });

        it('displays thumbnail image with link', () => {
            render(<CarCardCompact {...defaultProps} />);

            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('src', mockListing.thumbnailUrl);
            expect(img).toHaveAttribute('alt', mockListing.title);

            // Image should be inside a link
            const link = img.closest('a');
            expect(link).toHaveAttribute('href', mockListing.source.url);
        });

        it('displays marketplace name', () => {
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText(/otomoto/i)).toBeInTheDocument();
        });

        it('displays tracking date', () => {
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText(/Tracked since/)).toBeInTheDocument();
        });
    });

    describe('status indicators', () => {
        it('shows ACTIVE status badge', () => {
            render(<CarCardCompact {...defaultProps} />);

            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('shows ENDED status badge', () => {
            const endedListing = createMockListing({status: ListingStatus.ENDED});
            render(<CarCardCompact {...defaultProps} listing={endedListing}/>);

            expect(screen.getByText('Ended')).toBeInTheDocument();
        });

        it('shows Archived status badge', () => {
            const archivedListing = createMockListing({isArchived: true});
            render(<CarCardCompact {...defaultProps} listing={archivedListing}/>);

            expect(screen.getByText('Archived')).toBeInTheDocument();
        });

        it('shows final price label for ended listings', () => {
            const endedListing = createMockListing({status: ListingStatus.ENDED});
            render(<CarCardCompact {...defaultProps} listing={endedListing}/>);

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
            const {container} = render(<CarCardCompact {...defaultProps} listing={listingWithPriceDrop}/>);

            // Should show percentage and green color
            expect(screen.getByText(/8%/)).toBeInTheDocument();
            const priceChangeEl = container.querySelector('.text-green-600');
            expect(priceChangeEl).toBeInTheDocument();
        });

        it('shows price rise indicator when price increased', () => {
            const listingWithPriceRise = createMockListing({
                currentPrice: 140000,
                priceHistory: [
                    {date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN'},
                    {date: '2024-01-20T10:00:00Z', price: 140000, currency: 'PLN'},
                ],
            });
            const {container} = render(<CarCardCompact {...defaultProps} listing={listingWithPriceRise}/>);

            // Should show percentage and red color
            expect(screen.getByText(/8%/)).toBeInTheDocument();
            const priceChangeEl = container.querySelector('.text-red-600');
            expect(priceChangeEl).toBeInTheDocument();
        });

        it('shows original price crossed out when changed', () => {
            const listingWithPriceChange = createMockListing({
                currentPrice: 120000,
                priceHistory: [
                    {date: '2024-01-15T10:00:00Z', price: 130000, currency: 'PLN'},
                    {date: '2024-01-20T10:00:00Z', price: 120000, currency: 'PLN'},
                ],
            });
            const {container} = render(<CarCardCompact {...defaultProps} listing={listingWithPriceChange}/>);

            // Should show original price with line-through
            const crossedOut = container.querySelector('.line-through');
            expect(crossedOut).toBeInTheDocument();
            expect(crossedOut).toHaveTextContent('130,000');
        });
    });

    describe('refresh state', () => {
        it('shows loading overlay when refreshing', () => {
            const {container} = render(<CarCardCompact {...defaultProps} isRefreshing={true}/>);

            const spinner = container.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });

        it('highlights card when just refreshed', () => {
            const {container} = render(<CarCardCompact {...defaultProps} justRefreshed={true}/>);

            const card = container.firstChild;
            expect(card).toHaveClass('border-green-400');
        });
    });

    describe('error state', () => {
        it('shows error banner when last refresh failed', () => {
            const listingWithError = createMockListing({
                lastRefreshStatus: 'error',
                lastRefreshError: 'Failed to fetch listing'
            });
            render(<CarCardCompact {...defaultProps} listing={listingWithError}/>);

            expect(screen.getByText('Failed to fetch listing')).toBeInTheDocument();
        });

        it('shows error border when last refresh failed', () => {
            const listingWithError = createMockListing({lastRefreshStatus: 'error'});
            const {container} = render(<CarCardCompact {...defaultProps} listing={listingWithError}/>);

            const card = container.firstChild;
            expect(card).toHaveClass('border-red-200');
        });
    });

    describe('actions', () => {
        it('calls onShowDetails when details button is clicked', async () => {
            const onShowDetails = jest.fn();
            const {user} = render(<CarCardCompact {...defaultProps} onShowDetails={onShowDetails}/>);

            const detailsButton = screen.getByTitle(/view details/i);
            await user.click(detailsButton);

            expect(onShowDetails).toHaveBeenCalledWith(mockListing);
        });

        it('calls onRefresh when refresh button is clicked', async () => {
            const onRefresh = jest.fn();
            const {user} = render(<CarCardCompact {...defaultProps} onRefresh={onRefresh}/>);

            const refreshButton = screen.getByTitle(/refresh/i);
            await user.click(refreshButton);

            expect(onRefresh).toHaveBeenCalledWith(mockListing);
        });

        it('calls onArchive when archive button is clicked', async () => {
            const onArchive = jest.fn();
            const {user} = render(<CarCardCompact {...defaultProps} onArchive={onArchive}/>);

            const archiveButton = screen.getByTitle(/archive/i);
            await user.click(archiveButton);

            expect(onArchive).toHaveBeenCalledWith(mockListing);
        });

        it('shows unarchive button for archived listings', () => {
            const archivedListing = createMockListing({isArchived: true});
            render(<CarCardCompact {...defaultProps} listing={archivedListing}/>);

            expect(screen.getByTitle(/unarchive/i)).toBeInTheDocument();
        });

        it('calls onRemove when delete button is clicked', async () => {
            const onRemove = jest.fn();
            const {user} = render(<CarCardCompact {...defaultProps} onRemove={onRemove}/>);

            const deleteButton = screen.getByTitle(/delete/i);
            await user.click(deleteButton);

            expect(onRemove).toHaveBeenCalledWith(mockListing.id);
        });

        it('has external link to listing', () => {
            render(<CarCardCompact {...defaultProps} />);

            const externalLink = screen.getByTitle(/open listing/i);
            expect(externalLink).toHaveAttribute('href', mockListing.source.url);
            expect(externalLink).toHaveAttribute('target', '_blank');
        });

        it('disables refresh button when refreshing', () => {
            render(<CarCardCompact {...defaultProps} isRefreshing={true}/>);

            const refreshButton = screen.getByTitle(/refresh/i);
            expect(refreshButton).toBeDisabled();
        });
    });

    describe('archived state', () => {
        it('applies reduced opacity for archived listings', () => {
            const archivedListing = createMockListing({isArchived: true});
            const {container} = render(<CarCardCompact {...defaultProps} listing={archivedListing}/>);

            const card = container.firstChild;
            expect(card).toHaveClass('opacity-75');
        });
    });
});

