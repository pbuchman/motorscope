import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useListings, useSettings } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import { parseCarDataWithGemini } from '../services/geminiService';
import { CarListing, PageContentResult } from '../types';
import { Bookmark, Check, Loader2, ExternalLink, AlertCircle, Settings, AlertTriangle, Car, Calendar, Gauge, Fuel, Eye, RefreshCw, LogOut, X, Key } from 'lucide-react';
import PriceChart from './PriceChart';
import { formatEuropeanDateTime, normalizeUrl } from '../utils/formatters';
import { isChromeExtension } from '../hooks/useChromeMessaging';

// Google logo SVG component
const GoogleLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/**
 * Merge Dialog Component
 * Shows when user logs in with existing local data
 */
const MergeDialog: React.FC<{
  isOpen: boolean;
  localCount: number;
  onMerge: () => Promise<void>;
  onDiscard: () => Promise<void>;
}> = ({ isOpen, localCount, onMerge, onDiscard }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'merge' | 'discard' | null>(null);

  if (!isOpen) return null;

  const handleMerge = async () => {
    setIsProcessing(true);
    setAction('merge');
    try {
      await onMerge();
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  const handleDiscard = async () => {
    setIsProcessing(true);
    setAction('discard');
    try {
      await onDiscard();
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
        <h3 className="font-bold text-lg text-slate-900 mb-3">Local Data Found</h3>
        <p className="text-slate-600 text-sm mb-4">
          You have <strong>{localCount}</strong> listing{localCount !== 1 ? 's' : ''} saved locally.
          Would you like to merge them with your cloud data?
        </p>

        <div className="space-y-2">
          <button
            onClick={handleMerge}
            disabled={isProcessing}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg flex items-center justify-center gap-2"
          >
            {isProcessing && action === 'merge' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Merging...
              </>
            ) : (
              'Merge Local Data'
            )}
          </button>

          <button
            onClick={handleDiscard}
            disabled={isProcessing}
            className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-medium rounded-lg flex items-center justify-center gap-2"
          >
            {isProcessing && action === 'discard' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Discarding...
              </>
            ) : (
              'Discard Local Data'
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-3 text-center">
          Discarding will remove local data permanently.
        </p>
      </div>
    </div>
  );
};

const ExtensionPopup: React.FC = () => {
  const { listings, add, remove, error: listingsError, clearError } = useListings();
  const { settings } = useSettings();
  const auth = useAuth();

  const hasApiKey = !!settings.geminiApiKey;

  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageData, setPageData] = useState<PageContentResult | null>(null);

  // Preview state for confirmation flow
  const [previewData, setPreviewData] = useState<CarListing | null>(null);
  const [showVinWarning, setShowVinWarning] = useState(false);
  const [showDateWarning, setShowDateWarning] = useState(false);

  // Combine errors from listings context and local error state
  const displayError = error || listingsError || auth.error;

  // Find existing saved item based on URL
  const savedItem = useMemo(() => {
    if (!currentUrl) return null;
    const normalizedUrl = normalizeUrl(currentUrl);
    return listings.find(l => normalizeUrl(l.source.url) === normalizedUrl) || null;
  }, [listings, currentUrl]);

  useEffect(() => {
    // Get Active Tab
    if (isChromeExtension() && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        const activeTab = tabs[0];
        if (activeTab?.url) {
          setCurrentUrl(activeTab.url);

          // Execute script to get page content
          if (activeTab.id && !activeTab.url.startsWith('chrome://')) {
            chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: (): PageContentResult => {
                return {
                  title: document.title,
                  content: document.body.innerText.substring(0, 20000),
                  image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
                };
              }
            }, (results: chrome.scripting.InjectionResult[]) => {
              if (results && results[0] && results[0].result) {
                setPageData(results[0].result as PageContentResult);
              }
            });
          }
        }
      });
    } else {
      // Fallback for non-extension environment
      setCurrentUrl(window.location.href);
      setError("Extension context not found. Cannot scrape page.");
    }
  }, []);

  // Clear all errors
  const handleClearError = useCallback(() => {
    setError(null);
    clearError();
    auth.clearError();
  }, [clearError, auth]);

  const handleLogin = useCallback(async () => {
    await auth.login();
  }, [auth]);

  const handleLogout = useCallback(async () => {
    await auth.logout();
  }, [auth]);

  const handleAnalyze = useCallback(async () => {
    if (!pageData) {
      setError("Could not read page content. Refresh the page and try again.");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const listingData = await parseCarDataWithGemini(
        currentUrl, 
        pageData.content,
        pageData.title,
        pageData.image
      );
      
      setPreviewData(listingData as CarListing);

      // Check if VIN is missing
      if (!listingData.vehicle?.vin) {
        setShowVinWarning(true);
      }

      // Check if posted date is missing
      if (!listingData.postedDate) {
        setShowDateWarning(true);
      }

    } catch (e: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error(e);
      }
      const errorMessage = e instanceof Error ? e.message : "Failed to extract car data.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pageData, currentUrl]);

  const handleConfirmSave = useCallback(async () => {
    if (!previewData) return;

    try {
      await add(previewData);
      setPreviewData(null);
      setShowVinWarning(false);
      setShowDateWarning(false);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to save listing.";
      setError(errorMessage);
    }
  }, [previewData, add]);

  const handleCancelPreview = useCallback(() => {
    setPreviewData(null);
    setShowVinWarning(false);
    setShowDateWarning(false);
  }, []);

  const handleUnbookmark = useCallback(async () => {
    if (savedItem) {
      await remove(savedItem.id);
    }
  }, [savedItem, remove]);

  const openDashboard = useCallback(() => {
    if (isChromeExtension() && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=dashboard') });
    }
  }, []);

  const openSettings = useCallback(() => {
    if (isChromeExtension() && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html?view=settings') });
    }
  }, []);

  // Simple heuristic for supported sites
  const isMarketplace = currentUrl.includes('otomoto') || currentUrl.includes('mobile.de') || currentUrl.includes('autoscout') || currentUrl.includes('olx') || currentUrl.includes('allegro');

  const isLoggedIn = auth.status === 'logged_in';
  const isAuthLoading = auth.status === 'loading' || auth.isLoggingIn;

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans min-h-[500px]">
      {/* Merge Dialog */}
      <MergeDialog
        isOpen={auth.mergeDialog.isOpen}
        localCount={auth.mergeDialog.localCount}
        onMerge={auth.mergeDialog.onMerge}
        onDiscard={auth.mergeDialog.onDiscard}
      />

      {/* Navbar */}
      <div className="bg-slate-900 text-white p-4 flex flex-col gap-2 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            MotorScope
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={openDashboard}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={openSettings}
              className="bg-slate-700 hover:bg-slate-600 p-1.5 rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auth Section */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          {isAuthLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded transition-colors w-full justify-between"
            >
              <span className="truncate max-w-[180px]">{auth.user?.email}</span>
              <LogOut className="w-3 h-3 shrink-0" />
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 text-xs bg-white text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded transition-colors font-medium w-full justify-center"
            >
              <GoogleLogo className="w-4 h-4" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5 flex flex-col items-center justify-center text-center overflow-y-auto">
        {/* Preview/Confirmation Screen */}
        {previewData ? (
          <div className="w-full">
            {/* VIN Warning */}
            {showVinWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-left">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">VIN not detected</p>
                  <p className="text-amber-600 text-xs mt-1">
                    Without VIN, this car will be identified by URL only.
                    The same car on different URLs will be treated as separate listings.
                  </p>
                </div>
              </div>
            )}

            {/* Posted Date Warning */}
            {showDateWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-left">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">Posted date not detected</p>
                  <p className="text-amber-600 text-xs mt-1">
                    The listing date helps track how long a car has been on the market.
                    This is useful for price negotiation insights.
                  </p>
                </div>
              </div>
            )}

            <h3 className="font-bold text-slate-800 mb-3 text-left">Confirm Details</h3>

            {/* Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left mb-4">
              {previewData.thumbnailUrl && (
                <img
                  src={previewData.thumbnailUrl}
                  alt={previewData.title}
                  className="w-full h-32 object-cover rounded mb-3"
                />
              )}
              <p className="font-bold text-slate-900 mb-2">{previewData.title}</p>
              <p className="text-blue-600 font-mono font-bold text-lg mb-3">
                {previewData.currentPrice?.toLocaleString()} {previewData.currency}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <Car className="w-3 h-3" />
                  <span>{previewData.vehicle?.make} {previewData.vehicle?.model}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Calendar className="w-3 h-3" />
                  <span>{previewData.vehicle?.productionYear}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Gauge className="w-3 h-3" />
                  <span>{previewData.vehicle?.mileage?.value?.toLocaleString()} {previewData.vehicle?.mileage?.unit || 'km'}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Fuel className="w-3 h-3" />
                  <span>{previewData.vehicle?.engine?.fuelType}</span>
                </div>
              </div>

              {previewData.vehicle?.vin ? (
                <div className="mt-3 bg-green-50 border border-green-200 rounded px-2 py-1">
                  <span className="text-xs text-green-700 font-mono">VIN: {previewData.vehicle.vin}</span>
                </div>
              ) : (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  <span className="text-xs text-amber-700">No VIN detected</span>
                </div>
              )}

              {previewData.seller?.phone && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                  <a href={`tel:${previewData.seller.phone}`} className="text-xs text-blue-700 font-mono hover:underline">
                    📞 {previewData.seller.phone}
                  </a>
                </div>
              )}

              {previewData.postedDate ? (
                <div className="mt-2 bg-green-50 border border-green-200 rounded px-2 py-1">
                  <span className="text-xs text-green-700">📅 Posted: {formatEuropeanDateTime(previewData.postedDate)}</span>
                </div>
              ) : (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  <span className="text-xs text-amber-700">📅 Posted date not detected</span>
                </div>
              )}

              {previewData.vehicle?.engine?.capacityCc && (
                <p className="text-xs text-slate-500 mt-2">Engine: {(previewData.vehicle.engine.capacityCc / 1000).toFixed(1)}L</p>
              )}
              {previewData.vehicle?.drivetrain?.transmissionType && (
                <p className="text-xs text-slate-500">Transmission: {previewData.vehicle.drivetrain.transmissionType}</p>
              )}
              {previewData.location?.city && (
                <p className="text-xs text-slate-500">Location: {previewData.location.city}{previewData.location.region ? `, ${previewData.location.region}` : ''}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCancelPreview}
                className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
              >
                {(showVinWarning || showDateWarning) ? 'Save Anyway' : 'Save'}
              </button>
            </div>
          </div>
        ) : !isMarketplace && !savedItem ? (
          <div className="flex flex-col items-center py-8 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ExternalLink className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 mb-2">No listing detected</p>
            <p className="text-sm">
              Navigate to a supported car marketplace (e.g.{' '}
              <a
                href="https://otomoto.pl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                otomoto.pl
              </a>
              ) to track it.
            </p>
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
                 <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                       <Check className="w-4 h-4 text-green-600" />
                     </div>
                     <div className="text-left">
                       <h3 className="text-green-800 font-bold text-sm">Tracked!</h3>
                       <p className="text-green-700 text-xs">Monitoring this listing</p>
                     </div>
                   </div>
                 </div>
                 
                 {/* Full Details Card */}
                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left mb-4">
                   {savedItem.thumbnailUrl && (
                     <img
                       src={savedItem.thumbnailUrl}
                       alt={savedItem.title}
                       className="w-full h-28 object-cover rounded mb-2"
                     />
                   )}
                   <p className="font-bold text-slate-900 text-sm mb-1 truncate">{savedItem.title}</p>
                   <p className="text-blue-600 font-mono font-bold mb-2">
                     {savedItem.currentPrice?.toLocaleString()} {savedItem.currency}
                   </p>

                   <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                     <div className="flex items-center gap-1 text-slate-600">
                       <Car className="w-3 h-3" />
                       <span className="truncate">{savedItem.vehicle?.make} {savedItem.vehicle?.model}</span>
                     </div>
                     <div className="flex items-center gap-1 text-slate-600">
                       <Calendar className="w-3 h-3" />
                       <span>{savedItem.vehicle?.productionYear}</span>
                     </div>
                     <div className="flex items-center gap-1 text-slate-600">
                       <Gauge className="w-3 h-3" />
                       <span>{savedItem.vehicle?.mileage?.value?.toLocaleString()} {savedItem.vehicle?.mileage?.unit || 'km'}</span>
                     </div>
                     <div className="flex items-center gap-1 text-slate-600">
                       <Fuel className="w-3 h-3" />
                       <span className="truncate">{savedItem.vehicle?.engine?.fuelType}</span>
                     </div>
                   </div>

                   {savedItem.vehicle?.vin && (
                     <div className="bg-green-50 border border-green-200 rounded px-2 py-0.5 mb-2">
                       <span className="text-[10px] text-green-700 font-mono">VIN: {savedItem.vehicle.vin}</span>
                     </div>
                   )}

                   {savedItem.seller?.phone && (
                     <div className="bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mb-2">
                       <a href={`tel:${savedItem.seller.phone}`} className="text-[10px] text-blue-700 font-mono hover:underline">
                         📞 {savedItem.seller.phone}
                       </a>
                     </div>
                   )}

                   {savedItem.postedDate && (
                     <div className="bg-green-50 border border-green-200 rounded px-2 py-0.5 mb-2">
                       <span className="text-[10px] text-green-700">📅 Posted: {formatEuropeanDateTime(savedItem.postedDate)}</span>
                     </div>
                   )}

                   {/* Tracking Info */}
                   <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                     <span className="inline-flex items-center gap-1">
                       <Eye className="w-3 h-3" />
                       Tracked since {formatEuropeanDateTime(savedItem.firstSeenAt)}
                     </span>
                     <span className="inline-flex items-center gap-1">
                       <RefreshCw className="w-3 h-3" />
                       Last checked {formatEuropeanDateTime(savedItem.lastSeenAt)}
                     </span>
                   </div>

                   {/* Price History Chart - only show when there's actual history (2+ points) */}
                   {savedItem.priceHistory && savedItem.priceHistory.length >= 2 && (
                     <div className="mt-2">
                       <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Price History</p>
                       <PriceChart history={savedItem.priceHistory} currency={savedItem.currency} />
                     </div>
                   )}
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

                 {/* API Key Missing Warning */}
                 {!hasApiKey ? (
                   <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                     <div className="flex items-start gap-3">
                       <Key className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                       <div>
                         <p className="text-amber-800 font-medium text-sm">API Key Required</p>
                         <p className="text-amber-600 text-xs mt-1">
                           Configure your Gemini API key to analyze listings.
                         </p>
                         <button
                           onClick={openSettings}
                           className="mt-2 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded font-medium transition-colors"
                         >
                           Go to Settings
                         </button>
                       </div>
                     </div>
                   </div>
                 ) : (
                   <button
                     onClick={handleAnalyze}
                     disabled={!pageData}
                     className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                   >
                     Analyze & Add to Watchlist
                   </button>
                 )}

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

        {/* Global Error Display */}
        {displayError && !error && (
          <div className="mt-4 flex items-start gap-2 text-left text-red-600 text-xs bg-red-50 p-3 rounded border border-red-100">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{displayError}</span>
            <button onClick={handleClearError} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400 truncate flex-1">{currentUrl}</span>
        {isLoggedIn && (
          <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">☁️ Cloud Sync</span>
        )}
      </div>
    </div>
  );
};

export default ExtensionPopup;