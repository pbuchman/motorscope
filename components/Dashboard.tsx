import React, { useState, useEffect } from 'react';
import { CarListing, ListingStatus } from '../types';
import { getListings, removeListing, refreshListing } from '../services/storageService';
import { refreshListingWithGemini } from '../services/geminiService';
import CarCard from './CarCard';
import { Search, Car, Settings } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [listings, setListings] = useState<CarListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    const data = await getListings();
    setListings(data);
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

  const handleRemove = async (id: string) => {
    if (confirm('Are you sure you want to stop tracking this car?')) {
      await removeListing(id);
      await loadData();
    }
  };

  const handleRefresh = async (listing: CarListing) => {
    // Add to refreshing set
    setRefreshingIds(prev => new Set(prev).add(listing.id));

    try {
      // Fetch the page content
      const response = await fetch(listing.source.url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      // Only mark as expired if we get a clear 404 or 410
      if (response.status === 404 || response.status === 410) {
        await refreshListing(listing.id, listing.currentPrice, listing.currency, ListingStatus.EXPIRED, 'success');
        await loadData();
        return;
      }

      // If we can't fetch (CORS, etc), mark as error
      if (!response.ok) {
        await refreshListing(listing.id, listing.currentPrice, listing.currency, listing.status, 'error', `HTTP ${response.status}`);
        await loadData();
        return;
      }

      const html = await response.text();

      // Extract page title from HTML
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1] : listing.title;

      // Extract text content (strip HTML tags for Gemini)
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 20000);

      // Use Gemini to analyze the page and extract price/status
      const result = await refreshListingWithGemini(listing.source.url, textContent, pageTitle);

      // If Gemini returned a valid price, use it; otherwise keep existing
      const newPrice = result.price > 0 ? result.price : listing.currentPrice;
      const newCurrency = result.currency || listing.currency;

      await refreshListing(listing.id, newPrice, newCurrency, result.status, 'success');
      await loadData();

    } catch (error) {
      // Network error, CORS, or Gemini error - mark as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Refresh failed:', error);
      await refreshListing(listing.id, listing.currentPrice, listing.currency, listing.status, 'error', errorMessage);
      await loadData();
    } finally {
      // Remove from refreshing set
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(listing.id);
        return next;
      });
    }
  };

  const filteredListings = listings.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      l.title.toLowerCase().includes(term) ||
      (l.vehicle?.make || '').toLowerCase().includes(term) ||
      (l.vehicle?.model || '').toLowerCase().includes(term) ||
      (l.vehicle?.vin || '').toLowerCase().includes(term) ||
      (l.seller?.phone || '').includes(searchTerm) // Phone search without toLowerCase since it's digits
    );
  });

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
              placeholder="Search make, model, VIN, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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