import React, { useState, useEffect } from 'react';
import { CarListing } from '../types';
import { getListings, removeListing, simulateMarketChanges } from '../services/storageService';
import CarCard from './CarCard';
import { RefreshCw, Plus, Search, Car, LayoutGrid, List as ListIcon } from 'lucide-react';

interface DashboardProps {
  onAddClick: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAddClick }) => {
  const [listings, setListings] = useState<CarListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = () => {
    setListings(getListings());
  };

  useEffect(() => {
    loadData();
    
    // Listen for storage events (if changed from popup)
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRemove = (id: string) => {
    if (confirm('Are you sure you want to stop tracking this car?')) {
      removeListing(id);
      loadData();
    }
  };

  const handleSimulateChanges = () => {
    setIsUpdating(true);
    setTimeout(() => {
      const updated = simulateMarketChanges();
      setListings(updated);
      setIsUpdating(false);
    }, 800);
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
          
          <button 
            onClick={handleSimulateChanges}
            disabled={isUpdating}
            className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-all ${isUpdating ? 'opacity-70' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Checking...' : 'Check Changes'}
          </button>

          <button 
            onClick={onAddClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Manually
          </button>
        </div>
      </header>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
          <Car className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No cars tracked yet</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md text-center">
            Open the Extension Popup on a car listing page, or use the "Add Manually" button to simulate adding a URL.
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
