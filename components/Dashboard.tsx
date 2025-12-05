import React, { useState, useEffect } from 'react';
import { CarListing } from '../types';
import { getListings, removeListing } from '../services/storageService';
import CarCard from './CarCard';
import { Search, Car } from 'lucide-react';

// Declare chrome
declare const chrome: any;

const Dashboard: React.FC = () => {
  const [listings, setListings] = useState<CarListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    setListings(getListings());
  };

  useEffect(() => {
    loadData();
    
    // Listen for storage events (cross-tab sync)
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);

    // Listen for Extension Runtime messages (if Popup adds item)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        const messageListener = (request: any) => {
            if (request.type === 'LISTING_UPDATED') {
                loadData();
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRemove = (id: string) => {
    if (confirm('Are you sure you want to stop tracking this car?')) {
      removeListing(id);
      loadData();
    }
  };

  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.details.make.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-gray-50 min-h-screen p-6 overflow-y-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-600" />
            MotoTracker Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Tracking {listings.length} active vehicle listings</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search make, model..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            <CarCard key={listing.id} listing={listing} onRemove={handleRemove} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;