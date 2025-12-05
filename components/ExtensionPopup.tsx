import React, { useState, useEffect } from 'react';
import { getListings, saveListing, removeListing } from '../services/storageService';
import { parseCarDataWithGemini } from '../services/geminiService';
import { CarListing } from '../types';
import { Bookmark, Check, Loader2, ArrowRight, ExternalLink } from 'lucide-react';

interface ExtensionPopupProps {
  currentUrl: string; // The "active tab" URL passed from simulator
  onNavigateToDashboard: () => void;
}

const ExtensionPopup: React.FC<ExtensionPopupProps> = ({ currentUrl, onNavigateToDashboard }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedItem, setSavedItem] = useState<CarListing | null>(null);

  // Check if current URL is already tracked
  useEffect(() => {
    const listings = getListings();
    const existing = listings.find(l => l.url === currentUrl);
    setSavedItem(existing || null);
  }, [currentUrl]);

  const handleBookmark = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate fetching page content (in a real extension, we'd have the DOM)
      const simulatedContent = `User is browsing ${currentUrl}.`;
      
      const listingData = await parseCarDataWithGemini(currentUrl, simulatedContent);
      
      const newListing = listingData as CarListing; // Cast assuming happy path from service
      saveListing(newListing);
      setSavedItem(newListing);
      
      // Trigger update in dashboard
      window.dispatchEvent(new Event('storage'));
      
    } catch (e) {
      setError("Failed to extract car data. Ensure API Key is valid.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnbookmark = () => {
    if (savedItem) {
      removeListing(savedItem.id);
      setSavedItem(null);
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Determine if URL looks like a supported marketplace
  const isMarketplace = currentUrl.includes('otomoto.pl') || currentUrl.includes('mobile.de') || currentUrl.includes('cars');

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans">
      {/* Navbar */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
        <h2 className="font-bold text-lg flex items-center gap-2">
          MotoTracker
        </h2>
        <button 
          onClick={onNavigateToDashboard}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
        >
          Open Dashboard
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
        {!isMarketplace ? (
          <div className="text-slate-500">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 mb-2">No listing detected</p>
            <p className="text-sm">Navigate to a car listing (e.g., otomoto.pl) to track it.</p>
          </div>
        ) : (
          <>
             {loading ? (
               <div className="flex flex-col items-center animate-pulse">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                 <p className="text-slate-600 font-medium">Analyzing Listing with AI...</p>
                 <p className="text-slate-400 text-xs mt-2">Extracting specs & price</p>
               </div>
             ) : savedItem ? (
               <div className="w-full">
                 <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                   <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Check className="w-6 h-6 text-green-600" />
                   </div>
                   <h3 className="text-green-800 font-bold text-lg mb-1">Tracked!</h3>
                   <p className="text-green-700 text-sm">We are monitoring this listing.</p>
                 </div>
                 
                 <div className="bg-slate-50 p-4 rounded-lg text-left mb-6">
                   <p className="font-bold text-slate-800 truncate mb-1">{savedItem.title}</p>
                   <p className="text-blue-600 font-mono font-bold">{savedItem.currentPrice.toLocaleString()} {savedItem.currency}</p>
                 </div>

                 <button 
                   onClick={handleUnbookmark}
                   className="text-red-500 text-sm hover:underline"
                 >
                   Stop Tracking
                 </button>
               </div>
             ) : (
               <div className="w-full">
                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                   <Bookmark className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                   <h3 className="text-slate-800 font-bold mb-2">Track this Car?</h3>
                   <p className="text-slate-500 text-sm">
                     Save spec, history, and get notified on price drops.
                   </p>
                 </div>
                 <button 
                   onClick={handleBookmark}
                   className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                 >
                   Add to Watchlist
                 </button>
                 {error && (
                   <p className="text-red-500 text-xs mt-4 bg-red-50 p-2 rounded">{error}</p>
                 )}
               </div>
             )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 text-center text-xs text-slate-400">
        Current URL: <br/>
        <span className="font-mono text-[10px] block truncate px-4">{currentUrl}</span>
      </div>
    </div>
  );
};

export default ExtensionPopup;
