import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {CarListing} from '@/types';
import {useListings, useSettings} from '@/context/AppContext';
import {useAuth} from '@/auth/AuthContext';
import CarCard from '@/components/CarCard';
import CarCardCompact from '@/components/CarCardCompact';
import ListingDetailModal from '@/components/ListingDetailModal';
import DashboardFilters, {
    DEFAULT_FILTERS,
    DEFAULT_SORT,
    FilterState,
    MakeModelOption,
    SortOption,
} from '@/components/DashboardFilters';
import {GoogleLogo, UserMenu} from '@/components/ui';
import {Car, ExternalLink, LayoutGrid, List, Loader2, Search, Settings} from 'lucide-react';
import {getEnabledMarketplaces, getMarketplaceDisplayName} from '@/config/marketplaces';
import {patchRemoteSettings} from '@/api/client';

export type ViewMode = 'grid' | 'compact';


const Dashboard: React.FC = () => {
    const {t} = useTranslation(['dashboard', 'common', 'auth', 'errors', 'settings']);
    const {listings, isLoading, refreshingIds, recentlyRefreshedIds, remove, refresh, update} = useListings();
    const {settings, isLoading: settingsLoading} = useSettings();
    const auth = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
    const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
    const [prefsLoaded, setPrefsLoaded] = useState(false);
    const [selectedListing, setSelectedListing] = useState<CarListing | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isLoggedIn = auth.status === 'logged_in';
    const isAuthLoading = auth.status === 'loading';

    // Check URL for listing ID to auto-open detail modal
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        // Handle listing by ID
        const listingId = params.get('listing');
        if (listingId && listings.length > 0 && !isLoading) {
            const listing = listings.find(l => l.id === listingId);
            if (listing) {
                setSelectedListing(listing);
                // Remove the param from URL without reload
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('listing');
                window.history.replaceState({}, '', newUrl.toString());
            }
        }

        // Handle listing by URL (from content script)
        const openListingUrl = params.get('openListing');
        if (openListingUrl && listings.length > 0 && !isLoading) {
            // Normalize URL for comparison
            const normalizeUrl = (url: string): string => {
                try {
                    const parsed = new URL(url);
                    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
                } catch {
                    return url.replace(/\/$/, '');
                }
            };

            const normalizedTarget = normalizeUrl(openListingUrl);
            const listing = listings.find(l => normalizeUrl(l.source.url) === normalizedTarget);
            if (listing) {
                setSelectedListing(listing);
                // Remove the param from URL without reload
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('openListing');
                window.history.replaceState({}, '', newUrl.toString());
            }
        }
    }, [listings, isLoading]);

    // Load dashboard preferences from settings once loaded
    useEffect(() => {
        if (!settingsLoading && settings.dashboardPreferences && !prefsLoaded) {
            const prefs = settings.dashboardPreferences;
            setFilters({
                status: (prefs.filters?.status as FilterState['status']) || 'all',
                archived: (prefs.filters?.archived as FilterState['archived']) || 'active',
                makes: prefs.filters?.makes || [],
                models: prefs.filters?.models || [],
                sources: prefs.filters?.sources || [],
            });
            setSortBy((prefs.sortBy as SortOption) || DEFAULT_SORT);
            setViewMode((prefs.viewMode as ViewMode) || 'grid');
            setPrefsLoaded(true);
        }
    }, [settingsLoading, settings.dashboardPreferences, prefsLoaded]);

    // Save dashboard preferences to API (debounced)
    const saveDashboardPreferences = useCallback((
        newFilters: FilterState,
        newSortBy: SortOption,
        newViewMode: ViewMode,
    ) => {
        if (!isLoggedIn) return;

        // Debounce save to avoid too many API calls
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await patchRemoteSettings({
                    dashboardFilters: {
                        status: newFilters.status,
                        archived: newFilters.archived,
                        makes: newFilters.makes,
                        models: newFilters.models,
                        sources: newFilters.sources,
                    },
                    dashboardSort: newSortBy,
                    dashboardViewMode: newViewMode,
                });
            } catch (err) {
                console.warn('[Dashboard] Failed to save preferences:', err);
            }
        }, 1000); // 1 second debounce
    }, [isLoggedIn]);

    // Handle filter changes with auto-save
    const handleFiltersChange = useCallback((newFilters: FilterState) => {
        setFilters(newFilters);
        saveDashboardPreferences(newFilters, sortBy, viewMode);
    }, [sortBy, viewMode, saveDashboardPreferences]);

    // Handle sort changes with auto-save
    const handleSortChange = useCallback((newSort: SortOption) => {
        setSortBy(newSort);
        saveDashboardPreferences(filters, newSort, viewMode);
    }, [filters, viewMode, saveDashboardPreferences]);

    // Handle view mode changes with auto-save
    const handleViewModeChange = useCallback((newViewMode: ViewMode) => {
        setViewMode(newViewMode);
        saveDashboardPreferences(filters, sortBy, newViewMode);
    }, [filters, sortBy, saveDashboardPreferences]);

    const handleLogin = useCallback(async () => {
        await auth.login();
    }, [auth]);

    const handleLogout = useCallback(async () => {
        await auth.logout();
    }, [auth]);

    // Memoize the removal handler
    const handleRemove = useCallback(async (id: string) => {
        if (confirm(t('errors:confirmDelete'))) {
            await remove(id);
        }
    }, [remove, t]);

    // Memoize the refresh handler
    const handleRefresh = useCallback(async (listing: CarListing) => {
        await refresh(listing);
    }, [refresh]);

    // Archive/unarchive handler
    const handleArchive = useCallback(async (listing: CarListing) => {
        const updatedListing: CarListing = {
            ...listing,
            isArchived: !listing.isArchived,
        };
        await update(updatedListing);
    }, [update]);

    // Show details handler
    const handleShowDetails = useCallback((listing: CarListing) => {
        setSelectedListing(listing);
    }, []);

    // Close details modal
    const handleCloseDetails = useCallback(() => {
        setSelectedListing(null);
    }, []);

    // Get available makes and models for filter dropdowns
    const availableMakeModels = useMemo((): MakeModelOption[] => {
        const makeModelMap = new Map<string, Set<string>>();

        listings.forEach(l => {
            const make = l.vehicle?.make;
            const model = l.vehicle?.model;

            if (make) {
                if (!makeModelMap.has(make)) {
                    makeModelMap.set(make, new Set());
                }
                if (model) {
                    makeModelMap.get(make)!.add(model);
                }
            }
        });

        return Array.from(makeModelMap.entries())
            .map(([make, models]) => ({
                make,
                models: Array.from(models).sort(),
            }))
            .sort((a, b) => a.make.localeCompare(b.make));
    }, [listings]);

    // Get available sources (marketplaces) - use display names from actual listings
    const availableSources = useMemo(() => {
        // Get unique display names from listings
        const sourceNames = new Set(
            listings.map(l => getMarketplaceDisplayName(l.source.platform)),
        );

        return Array.from(sourceNames)
            .sort()
            .map(name => ({id: name, name}));
    }, [listings]);

    // Count active filters
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.archived !== 'active') count++;
        if (filters.makes.length > 0) count++;
        if (filters.models.length > 0) count++;
        if (filters.sources.length > 0) count++;
        return count;
    }, [filters]);

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        handleFiltersChange(DEFAULT_FILTERS);
    }, [handleFiltersChange]);

    // Memoize filtered and sorted listings
    const filteredAndSortedListings = useMemo(() => {
        let result = [...listings];

        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(l => {
                return (
                    l.title.toLowerCase().includes(term) ||
                    (l.vehicle?.make || '').toLowerCase().includes(term) ||
                    (l.vehicle?.model || '').toLowerCase().includes(term) ||
                    (l.vehicle?.vin || '').toLowerCase().includes(term) ||
                    (l.seller?.phone || '').includes(searchTerm)
                );
            });
        }

        // Apply status filter
        if (filters.status !== 'all') {
            result = result.filter(l => l.status === filters.status);
        }

        // Apply archive filter
        if (filters.archived === 'active') {
            result = result.filter(l => !l.isArchived);
        } else if (filters.archived === 'archived') {
            result = result.filter(l => l.isArchived);
        }

        // Apply makes filter (multi-select)
        if (filters.makes.length > 0) {
            result = result.filter(l => l.vehicle?.make && filters.makes.includes(l.vehicle.make));
        }

        // Apply models filter (multi-select)
        if (filters.models.length > 0) {
            result = result.filter(l => l.vehicle?.model && filters.models.includes(l.vehicle.model));
        }

        // Apply sources filter (multi-select) - compare display names
        if (filters.sources.length > 0) {
            result = result.filter(l => {
                const displayName = getMarketplaceDisplayName(l.source.platform);
                return filters.sources.includes(displayName);
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime();
                case 'oldest':
                    return new Date(a.firstSeenAt).getTime() - new Date(b.firstSeenAt).getTime();
                case 'price-asc':
                    return a.currentPrice - b.currentPrice;
                case 'price-desc':
                    return b.currentPrice - a.currentPrice;
                case 'name':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return result;
    }, [listings, searchTerm, filters, sortBy]);

    // Auth loading state
    if (isAuthLoading) {
        return (
            <div className="flex-1 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4"/>
                    <p className="text-slate-500">{t('common:loading')}</p>
                </div>
            </div>
        );
    }

    // Login required state
    if (!isLoggedIn) {
        return (
            <div className="flex-1 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Car className="w-10 h-10 text-blue-600"/>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">{t('auth:signIn.title')}</h2>
                    <p className="text-slate-500 mb-8">
                        {t('auth:signIn.description')}
                    </p>
                    <button
                        onClick={handleLogin}
                        disabled={auth.isLoggingIn}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-medium transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {auth.isLoggingIn ? (
                            <Loader2 className="w-5 h-5 animate-spin"/>
                        ) : (
                            <GoogleLogo className="w-5 h-5"/>
                        )}
                        <span>{t('auth:signIn.button')}</span>
                    </button>
                    {auth.error && (
                        <p className="text-red-500 text-sm mt-4">{auth.error}</p>
                    )}
                </div>
            </div>
        );
    }

    // Data loading state
    if (isLoading) {
        return (
            <div className="flex-1 bg-gray-50 min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4"/>
                    <p className="text-slate-500">{t('common:loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-50 min-h-screen overflow-y-auto">
            {/* Header - Full Width Dark */}
            <header className="bg-slate-900 text-white px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Car className="w-8 h-8 text-blue-400"/>
                        <div>
                            <h1 className="text-xl font-bold">{t('dashboard:title')}</h1>
                            <p className="text-slate-400 text-sm">{t('dashboard:tracking', {count: listings.length})}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search
                                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                            <input
                                type="text"
                                placeholder={t('dashboard:searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-48 md:w-64 pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* View mode toggle */}
                        <div className="flex items-center bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => handleViewModeChange('grid')}
                                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                title={t('dashboard:view.grid')}
                            >
                                <LayoutGrid className="w-4 h-4"/>
                            </button>
                            <button
                                onClick={() => handleViewModeChange('compact')}
                                className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                title={t('dashboard:view.compact')}
                            >
                                <List className="w-4 h-4"/>
                            </button>
                        </div>

                        {/* User Menu */}
                        <UserMenu
                            userEmail={auth.user?.email || ''}
                            onLogout={handleLogout}
                            variant="dark"
                        />

                        <a
                            href="index.html?view=settings"
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Settings className="w-4 h-4"/>
                            {t('settings:title')}
                        </a>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-6">
                {listings.length === 0 ? (
                    <div
                        className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
                        <Car className="w-12 h-12 text-gray-300 mb-4"/>
                        <h3 className="text-lg font-medium text-gray-900">{t('dashboard:empty.title')}</h3>
                        <p className="text-gray-500 text-sm mt-1 max-w-md text-center mb-3">
                            {t('dashboard:empty.description')}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {getEnabledMarketplaces().slice(0, 4).map(marketplace => (
                                <a
                                    key={marketplace.id}
                                    href={marketplace.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded text-blue-600 hover:underline inline-flex items-center gap-1"
                                >
                                    {marketplace.name}
                                    <ExternalLink className="w-3 h-3"/>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Filters */}
                        <DashboardFilters
                            filters={filters}
                            onFiltersChange={handleFiltersChange}
                            sortBy={sortBy}
                            onSortChange={handleSortChange}
                            availableMakeModels={availableMakeModels}
                            availableSources={availableSources}
                            activeFiltersCount={activeFiltersCount}
                            onClearFilters={handleClearFilters}
                        />

                        {/* Results count */}
                        {filteredAndSortedListings.length !== listings.length && (
                            <p className="text-sm text-slate-500 mb-4">
                                {t('dashboard:showingResults', {
                                    shown: filteredAndSortedListings.length,
                                    total: listings.length,
                                })}
                            </p>
                        )}

                        {/* Listings */}
                        {filteredAndSortedListings.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                                <p className="text-gray-500">{t('dashboard:noResults.title')}</p>
                                <button
                                    onClick={handleClearFilters}
                                    className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                    {t('dashboard:noResults.clearFilters')}
                                </button>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredAndSortedListings.map(listing => (
                                    <CarCard
                                        key={listing.id}
                                        listing={listing}
                                        onRemove={handleRemove}
                                        onRefresh={handleRefresh}
                                        onArchive={handleArchive}
                                        onShowDetails={handleShowDetails}
                                        isRefreshing={refreshingIds.has(listing.id)}
                                        justRefreshed={recentlyRefreshedIds.has(listing.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {filteredAndSortedListings.map(listing => (
                                    <CarCardCompact
                                        key={listing.id}
                                        listing={listing}
                                        onRemove={handleRemove}
                                        onRefresh={handleRefresh}
                                        onArchive={handleArchive}
                                        onShowDetails={handleShowDetails}
                                        isRefreshing={refreshingIds.has(listing.id)}
                                        justRefreshed={recentlyRefreshedIds.has(listing.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedListing && (
                <ListingDetailModal
                    listing={selectedListing}
                    onClose={handleCloseDetails}
                />
            )}
        </div>
    );
};

export default Dashboard;

