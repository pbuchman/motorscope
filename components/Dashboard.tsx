import React, { useState, useEffect } from 'react';
import { CarListing, ListingStatus } from '../types';
import { getListings, removeListing, refreshListing } from '../services/storageService';
import CarCard from './CarCard';
import { Search, Car } from 'lucide-react';

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
      const response = await fetch(listing.url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });

      // Only mark as expired if we get a clear 404 or 410
      if (response.status === 404 || response.status === 410) {
        await refreshListing(listing.id, listing.currentPrice, listing.currency, ListingStatus.EXPIRED);
        await loadData();
        return;
      }

      // If we can't fetch (CORS, etc), just update lastChecked without changing status
      if (!response.ok) {
        await refreshListing(listing.id, listing.currentPrice, listing.currency, listing.status);
        await loadData();
        return;
      }

      const html = await response.text();

      // Extract price from HTML using simple regex patterns
      let newPrice = listing.currentPrice;
      let newStatus = listing.status; // Keep current status by default

      // Only mark as SOLD if we find VERY specific sold indicators
      // These should be specific enough to avoid false positives
      const lowerHtml = html.toLowerCase();
      const soldIndicators = [
        'ogłoszenie nieaktualne',
        'oferta została zakończona',
        'to ogłoszenie zostało usunięte',
        'this listing has been sold',
        'vehicle has been sold',
        'listing no longer available',
      ];

      const isSold = soldIndicators.some(indicator => lowerHtml.includes(indicator));

      if (isSold) {
        newStatus = ListingStatus.SOLD;
      } else if (listing.status !== ListingStatus.ACTIVE) {
        // If the listing was marked as sold/expired but we can now access it, mark as active
        newStatus = ListingStatus.ACTIVE;
      }

      // Try to extract price - common patterns
      const pricePatterns = [
        /(\d{1,3}(?:[\s,]\d{3})*)\s*(?:PLN|zł|EUR|€)/gi,
        /(?:price|cena)[^\d]*(\d{1,3}(?:[\s,]\d{3})*)/gi,
      ];

      for (const pattern of pricePatterns) {
        const match = pattern.exec(html);
        if (match) {
          const priceStr = match[1].replace(/[\s,]/g, '');
          const parsed = parseInt(priceStr, 10);
          if (parsed > 0 && parsed < 100000000) { // Sanity check
            newPrice = parsed;
            break;
          }
        }
      }

      await refreshListing(listing.id, newPrice, listing.currency, newStatus);
      await loadData();

    } catch (error) {
      // Network error or CORS - just update lastChecked, don't change status
      console.error('Refresh failed:', error);
      await refreshListing(listing.id, listing.currentPrice, listing.currency, listing.status);
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