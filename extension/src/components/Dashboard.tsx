import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CarListing, ListingStatus } from '../types';
import { useListings, useSettings } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import CarCard from './CarCard';
import CarCardCompact from './CarCardCompact';
import DashboardFilters, { FilterState, SortOption, MakeModelOption, DEFAULT_FILTERS, DEFAULT_SORT } from './DashboardFilters';
import { Search, Car, Settings, Loader2, LogOut, ExternalLink, LayoutGrid, List } from 'lucide-react';
import { getEnabledMarketplaces } from '../config/marketplaces';
import { saveRemoteSettings } from '../api/client';

export type ViewMode = 'grid' | 'compact';

// Google logo SVG component
const GoogleLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Dashboard: React.FC = () => {
  const { listings, isLoading, refreshingIds, remove, refresh, update } = useListings();
  const { settings, isLoading: settingsLoading } = useSettings();
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLoggedIn = auth.status === 'logged_in';
  const isAuthLoading = auth.status === 'loading';

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
    newViewMode: ViewMode
  ) => {
    if (!isLoggedIn) return;

    // Debounce save to avoid too many API calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveRemoteSettings({
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
    if (confirm('Are you sure you want to stop tracking this car?')) {
      await remove(id);
    }
  }, [remove]);

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

  // Get available sources (marketplaces) from config and filter to only those present in listings
  const availableSources = useMemo(() => {
    const marketplaces = getEnabledMarketplaces();
    const sourcesInListings = new Set(listings.map(l => l.source.platform));

    return marketplaces
      .filter(m => sourcesInListings.has(m.id) || sourcesInListings.has(m.name.toLowerCase()))
      .map(m => ({ id: m.id, name: m.name }));
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

    // Apply sources filter (multi-select)
    if (filters.sources.length > 0) {
      result = result.filter(l => {
        const platform = l.source.platform.toLowerCase();
        return filters.sources.some(sourceId =>
          sourceId.toLowerCase() === platform ||
          availableSources.find(s => s.id === sourceId)?.name.toLowerCase() === platform
        );
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
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
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
            <Car className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Sign in to MotorScope</h2>
          <p className="text-slate-500 mb-8">
            Track car listings, monitor price changes, and access your watchlist from anywhere.
          </p>
          <button
            onClick={handleLogin}
            disabled={auth.isLoggingIn}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {auth.isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleLogo className="w-5 h-5" />
            )}
            <span>Sign in with Google</span>
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
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading tracked vehicles...</p>
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
            <Car className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">MotorScope Dashboard</h1>
              <p className="text-slate-400 text-sm">Tracking {listings.length} vehicle{listings.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search make, model, VIN..."
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
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('compact')}
                className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Compact view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* User / Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              <span className="max-w-32 truncate">{auth.user?.email}</span>
              <LogOut className="w-4 h-4" />
            </button>

            <a
              href="index.html?view=settings"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
            <Car className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No cars tracked yet</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-md text-center mb-3">
              Navigate to a supported car marketplace to track listings.
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
                  <ExternalLink className="w-3 h-3" />
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
                Showing {filteredAndSortedListings.length} of {listings.length} listings
              </p>
            )}

            {/* Listings */}
            {filteredAndSortedListings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                <p className="text-gray-500">No listings match your filters</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Clear filters
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
                    isRefreshing={refreshingIds.has(listing.id)}
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
                    isRefreshing={refreshingIds.has(listing.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

