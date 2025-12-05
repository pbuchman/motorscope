import React, { useState, useEffect } from 'react';
import { getListings, saveListing, removeListing } from '../services/storageService';
import { parseCarDataWithGemini } from '../services/geminiService';
import { CarListing } from '../types';
import { Bookmark, Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

// Declare chrome API
declare const chrome: any;

const ExtensionPopup: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedItem, setSavedItem] = useState<CarListing | null>(null);
  const [pageData, setPageData] = useState<{title: string, content: string} | null>(null);

  useEffect(() => {
    // 1. Get Active Tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        const activeTab = tabs[0];
        if (activeTab?.url) {
          setCurrentUrl(activeTab.url);
          checkIfSaved(activeTab.url);
          
          // 2. Execute script to get page content
          if (activeTab.id && !activeTab.url.startsWith('chrome://')) {
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => {
                // Content Script Logic
                return {
                  title: document.title,
                  // Limit content size for AI context window
                  content: document.body.innerText.substring(0, 20000),
                  image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
                };
              }
            }, (results: any[]) => {
              if (results && results[0] && results[0].result) {
                setPageData(results[0].result);
              }
            });
          }
        }
      });
    } else {
      // Fallback for non-extension environment (e.g. debugging locally)
      setCurrentUrl(window.location.href);
      setError("Extension context not found. Cannot scrape page.");
    }
  }, []);

  const checkIfSaved = (url: string) => {
    const listings = getListings();
    const existing = listings.find(l => l.url === url);
    setSavedItem(existing || null);
  };

  const handleBookmark = async () => {
    if (!pageData) {
      setError("Could not read page content. Refresh the page and try again.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Use the scraped content + Gemini to parse
      const listingData = await parseCarDataWithGemini(
        currentUrl, 
        pageData.content,
        pageData.title,
        // @ts-ignore - dynamic property from scrape
        pageData.image
      );
      
      const newListing = listingData as CarListing;
      saveListing(newListing);
      setSavedItem(newListing);
      
      // Notify other views
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'LISTING_UPDATED' });
      }
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to extract car data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnbookmark = () => {
    if (savedItem) {
      removeListing(savedItem.id);
      setSavedItem(null);
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'LISTING_UPDATED' });
      }
    }
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.openOptionsPage();
    }
  };

  // Simple heuristic for supported sites
  const isMarketplace = currentUrl.includes('otomoto') || currentUrl.includes('mobile.de') || currentUrl.includes('autoscout') || currentUrl.includes('olx') || currentUrl.includes('allegro');

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans min-h-[500px]">
      {/* Navbar */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
        <h2 className="font-bold text-lg">MotoTracker</h2>
        <button 
          onClick={openDashboard}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
        >
          Dashboard
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
        {!isMarketplace && !savedItem ? (
          <div className="text-slate-500">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 mb-2">No listing detected</p>
            <p className="text-sm">Navigate to a supported car marketplace (e.g. Otomoto) to track it.</p>
          </div>
        ) : (
          <>
             {loading ? (
               <div className="flex flex-col items-center animate-pulse">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                 <p className="text-slate-600 font-medium">Analyzing Page...</p>
                 <p className="text-slate-400 text-xs mt-2">AI is extracting vehicle specs</p>
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
                 
                 <div className="bg-slate-50 p-4 rounded-lg text-left mb-6 border border-slate-100">
                   <p className="font-bold text-slate-800 truncate mb-1">{savedItem.title}</p>
                   <p className="text-blue-600 font-mono font-bold">{savedItem.currentPrice.toLocaleString()} {savedItem.currency}</p>
                 </div>

                 <button 
                   onClick={handleUnbookmark}
                   className="text-red-500 text-sm hover:underline w-full py-2"
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
                     Save VIN, mileage, specs and track price history.
                   </p>
                 </div>
                 <button 
                   onClick={handleBookmark}
                   disabled={!pageData}
                   className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                 >
                   Add to Watchlist
                 </button>
                 {error && (
                   <div className="flex items-start gap-2 text-left text-red-600 text-xs mt-4 bg-red-50 p-3 rounded border border-red-100">
                     <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                     {error}
                   </div>
                 )}
               </div>
             )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-gray-100 text-center text-[10px] text-slate-400 truncate">
        {currentUrl}
      </div>
    </div>
  );
};

export default ExtensionPopup;