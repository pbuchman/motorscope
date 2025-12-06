import React, { useState, useMemo, useCallback } from 'react';
import { CarListing } from '../types';
import { useListings } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import CarCard from './CarCard';
import { Search, Car, Settings, Loader2, LogOut, ExternalLink } from 'lucide-react';

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
  const { listings, isLoading, refreshingIds, remove, refresh } = useListings();
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const isLoggedIn = auth.status === 'logged_in';
  const isAuthLoading = auth.status === 'loading';

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

  // Memoize filtered listings for performance
  const filteredListings = useMemo(() => {
    if (!searchTerm.trim()) return listings;

    const term = searchTerm.toLowerCase();
    return listings.filter(l => {
      return (
        l.title.toLowerCase().includes(term) ||
        (l.vehicle?.make || '').toLowerCase().includes(term) ||
        (l.vehicle?.model || '').toLowerCase().includes(term) ||
        (l.vehicle?.vin || '').toLowerCase().includes(term) ||
        (l.seller?.phone || '').includes(searchTerm)
      );
    });
  }, [listings, searchTerm]);

  // Loading state
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

            {/* Auth Button */}
            {isAuthLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                <span className="max-w-32 truncate">{auth.user?.email}</span>
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                <GoogleLogo className="w-4 h-4" />
                <span>Sign in</span>
              </button>
            )}

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
            <p className="text-gray-500 text-sm mt-1 max-w-md text-center">
              Navigate to a supported car marketplace (e.g.{' '}
              <a
                href="https://otomoto.pl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                otomoto.pl
                <ExternalLink className="w-3 h-3" />
              </a>
              ) to track listings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredListings.map(listing => (
              <CarCard
                key={listing.id}
                listing={listing}
                onRemove={handleRemove}
                onRefresh={handleRefresh}
                isRefreshing={refreshingIds.has(listing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;