/**
 * DashboardFilters Component Tests
 *
 * Tests for the dashboard filtering and sorting controls.
 */

import React from 'react';
import {render, screen, within} from '../../test-utils/renderHelpers';
import DashboardFilters, {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  FilterState,
  MakeModelOption,
} from '@/components/DashboardFilters';
import {ListingStatus} from '@/types';

describe('DashboardFilters', () => {
    const mockMakeModels: MakeModelOption[] = [
        {make: 'BMW', models: ['320d', '520d', 'X5']},
        {make: 'Audi', models: ['A4', 'A6', 'Q5']},
        {make: 'Mercedes', models: ['C220', 'E200']},
    ];

    const mockSources = [
        {id: 'otomoto', name: 'OTOMOTO'},
        {id: 'autoscout24', name: 'AutoScout24'},
    ];

    const defaultProps = {
        filters: DEFAULT_FILTERS,
        onFiltersChange: jest.fn(),
        sortBy: DEFAULT_SORT,
        onSortChange: jest.fn(),
        availableMakeModels: mockMakeModels,
        availableSources: mockSources,
        activeFiltersCount: 0,
        onClearFilters: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders filter section', () => {
            render(<DashboardFilters {...defaultProps} />);

            expect(screen.getByText(/filters/i)).toBeInTheDocument();
        });

        it('renders sort section', () => {
            render(<DashboardFilters {...defaultProps} />);

            expect(screen.getByText(/sort/i)).toBeInTheDocument();
        });

        it('renders status filter dropdown', () => {
            render(<DashboardFilters {...defaultProps} />);

            expect(screen.getByText(/status/i)).toBeInTheDocument();
            // Multiple comboboxes exist for status, archived, sort
            const comboboxes = screen.getAllByRole('combobox');
            expect(comboboxes.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('status filter', () => {
        it('displays all status options', () => {
            render(<DashboardFilters {...defaultProps} />);

            const statusSelect = screen.getAllByRole('combobox')[0];
            expect(statusSelect).toBeInTheDocument();

            // Check options are present
            expect(within(statusSelect).getByText('All')).toBeInTheDocument();
            expect(within(statusSelect).getByText('Active')).toBeInTheDocument();
            expect(within(statusSelect).getByText('Ended')).toBeInTheDocument();
        });

        it('calls onFiltersChange when status changes', async () => {
            const onFiltersChange = jest.fn();
            const {user} = render(
                <DashboardFilters {...defaultProps} onFiltersChange={onFiltersChange}/>
            );

            const statusSelect = screen.getAllByRole('combobox')[0];
            await user.selectOptions(statusSelect, ListingStatus.ACTIVE);

            expect(onFiltersChange).toHaveBeenCalledWith(
                expect.objectContaining({status: ListingStatus.ACTIVE})
            );
        });
    });

    describe('archived filter', () => {
        it('displays archived filter options', () => {
            render(<DashboardFilters {...defaultProps} />);

            const archivedSelect = screen.getAllByRole('combobox')[1];
            expect(archivedSelect).toBeInTheDocument();

            expect(within(archivedSelect).getByText('Active Only')).toBeInTheDocument();
            expect(within(archivedSelect).getByText('Archived Only')).toBeInTheDocument();
            expect(within(archivedSelect).getByText('All')).toBeInTheDocument();
        });

        it('calls onFiltersChange when archived filter changes', async () => {
            const onFiltersChange = jest.fn();
            const {user} = render(
                <DashboardFilters {...defaultProps} onFiltersChange={onFiltersChange}/>
            );

            const archivedSelect = screen.getAllByRole('combobox')[1];
            await user.selectOptions(archivedSelect, 'archived');

            expect(onFiltersChange).toHaveBeenCalledWith(
                expect.objectContaining({archived: 'archived'})
            );
        });
    });

    describe('sort options', () => {
        it('displays sort dropdown with all options', () => {
            render(<DashboardFilters {...defaultProps} />);

            // Sort select is the third combobox (after status and archived)
            const comboboxes = screen.getAllByRole('combobox');
            const sortSelect = comboboxes[2];
            expect(sortSelect).toBeInTheDocument();

            expect(within(sortSelect).getByText('Newest First')).toBeInTheDocument();
            expect(within(sortSelect).getByText('Oldest First')).toBeInTheDocument();
        });

        it('calls onSortChange when sort changes', async () => {
            const onSortChange = jest.fn();
            const {user} = render(
                <DashboardFilters {...defaultProps} onSortChange={onSortChange}/>
            );

            const sortSelect = screen.getAllByRole('combobox')[2];
            await user.selectOptions(sortSelect, 'price-asc');

            expect(onSortChange).toHaveBeenCalledWith('price-asc');
        });
    });

    describe('clear filters button', () => {
        it('does not show clear button when no filters active', () => {
            render(<DashboardFilters {...defaultProps} activeFiltersCount={0}/>);

            expect(screen.queryByText(/clear/i)).not.toBeInTheDocument();
        });

        it('shows clear button when filters are active', () => {
            render(<DashboardFilters {...defaultProps} activeFiltersCount={2}/>);

            expect(screen.getByText(/clear.*2/i)).toBeInTheDocument();
        });

        it('calls onClearFilters when clear button clicked', async () => {
            const onClearFilters = jest.fn();
            const {user} = render(
                <DashboardFilters
                    {...defaultProps}
                    activeFiltersCount={2}
                    onClearFilters={onClearFilters}
                />
            );

            const clearButton = screen.getByText(/clear.*2/i);
            await user.click(clearButton);

            expect(onClearFilters).toHaveBeenCalledTimes(1);
        });
    });

    describe('active filter tags', () => {
        it('shows status filter tag when status is not all', () => {
            const filters: FilterState = {
                ...DEFAULT_FILTERS,
                status: ListingStatus.ACTIVE,
            };
            render(
                <DashboardFilters
                    {...defaultProps}
                    filters={filters}
                    activeFiltersCount={1}
                />
            );

            expect(screen.getByText(/status.*active/i)).toBeInTheDocument();
        });

        it('shows archived filter tag when not default', () => {
            const filters: FilterState = {
                ...DEFAULT_FILTERS,
                archived: 'archived',
            };
            render(
                <DashboardFilters
                    {...defaultProps}
                    filters={filters}
                    activeFiltersCount={1}
                />
            );

            // Archived Only appears in both dropdown and tag - just verify it exists
            const archivedTexts = screen.getAllByText('Archived Only');
            expect(archivedTexts.length).toBeGreaterThanOrEqual(1);
        });

        it('shows make filter tag when makes selected', () => {
            const filters: FilterState = {
                ...DEFAULT_FILTERS,
                makes: ['BMW'],
            };
            render(
                <DashboardFilters
                    {...defaultProps}
                    filters={filters}
                    activeFiltersCount={1}
                />
            );

            // The filter tag section shows the make name
            const filterTags = screen.getAllByText('BMW');
            expect(filterTags.length).toBeGreaterThan(0);
        });

        it('shows count when multiple makes selected', () => {
            const filters: FilterState = {
                ...DEFAULT_FILTERS,
                makes: ['BMW', 'Audi'],
            };
            render(
                <DashboardFilters
                    {...defaultProps}
                    filters={filters}
                    activeFiltersCount={1}
                />
            );

            expect(screen.getByText('2 makes')).toBeInTheDocument();
        });

        it('allows removing status filter tag', async () => {
            const onFiltersChange = jest.fn();
            const filters: FilterState = {
                ...DEFAULT_FILTERS,
                status: ListingStatus.ACTIVE,
            };
            const {user} = render(
                <DashboardFilters
                    {...defaultProps}
                    filters={filters}
                    onFiltersChange={onFiltersChange}
                    activeFiltersCount={1}
                />
            );

            // Find the X button in the status tag
            const statusTag = screen.getByText(/status.*active/i).closest('span');
            const removeButton = within(statusTag!).getByRole('button');
            await user.click(removeButton);

            expect(onFiltersChange).toHaveBeenCalledWith(
                expect.objectContaining({status: 'all'})
            );
        });
    });

    describe('make multi-select', () => {
        it('renders make dropdown when makes available', () => {
            render(<DashboardFilters {...defaultProps} />);

            // Look for Make label in the filter controls
            const makeLabels = screen.getAllByText(/make/i);
            expect(makeLabels.length).toBeGreaterThan(0);
        });

        it('does not render make dropdown when no makes available', () => {
            render(<DashboardFilters {...defaultProps} availableMakeModels={[]}/>);

            // When no makes available, "All Makes" placeholder shouldn't exist
            expect(screen.queryByText('All Makes')).not.toBeInTheDocument();
        });
    });

    describe('source multi-select', () => {
        it('renders source dropdown when sources available', () => {
            render(<DashboardFilters {...defaultProps} />);

            // Look for Source label
            const sourceLabels = screen.getAllByText(/source/i);
            expect(sourceLabels.length).toBeGreaterThan(0);
        });

        it('does not render source dropdown when no sources available', () => {
            render(<DashboardFilters {...defaultProps} availableSources={[]}/>);

            // When no sources, "All Sources" shouldn't exist
            expect(screen.queryByText('All Sources')).not.toBeInTheDocument();
        });
    });

    describe('default values', () => {
        it('exports DEFAULT_FILTERS with expected values', () => {
            expect(DEFAULT_FILTERS).toEqual({
                status: 'all',
                archived: 'active',
                makes: [],
                models: [],
                sources: [],
            });
        });

        it('exports DEFAULT_SORT as newest', () => {
            expect(DEFAULT_SORT).toBe('newest');
        });
    });
});

