import React, { useState, useMemo, useCallback } from 'react';
import { CarListing } from '../types';
import { useListings } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import CarCard from './CarCard';
import { Search, Car, Settings, Loader2, Cloud, CloudOff } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { listings, isLoading, refreshingIds, remove, refresh } = useListings();
  const auth = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const isLoggedIn = auth.status === 'logged_in';

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
    <div className="flex-1 bg-gray-50 min-h-screen p-6 overflow-y-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-600" />
            MotorScope Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Tracking {listings.length} active vehicle listings</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text" 
              placeholder="Search make, model, VIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 md:w-64 pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
          </div>
          {isLoggedIn ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <Cloud className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 max-w-32 truncate">{auth.user?.email}</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
              <CloudOff className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Not signed in</span>
            </div>
          )}
          <a
            href="index.html?view=settings"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </a>
        </div>
      </header>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
          <Car className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No cars tracked yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md text-center">
            Navigate to a car marketplace like Otomoto or Mobile.de and open the extension popup to start tracking.
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
  );
};

export default Dashboard;