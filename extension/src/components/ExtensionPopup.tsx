/**
 * ExtensionPopup Component
 *
 * Main popup UI for the Chrome extension.
 * Handles analyzing car listings and displaying tracked items.
 *
 * Architecture:
 * - Uses sub-components for different views (Login, Preview, SavedItem, etc.)
 * - Uses hooks for Chrome API interactions
 * - Manages local state for UI flow (preview, warnings, etc.)
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AlertCircle, Loader2, X} from 'lucide-react';

// Hooks
import {useListings, useSettings} from '@/context/AppContext';
import {useAuth} from '@/auth/AuthContext';
import {useCurrentTab, useExtensionNavigation, usePageContent} from '@/hooks';

// Services
import {parseCarDataWithGemini} from '@/services/gemini';

// Components
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import {AnalyzePrompt, LoginView, NoListingView, PopupHeader, PreviewCard, SavedItemView} from '@/components/popup';

// Config & Utils
import {
    getEnabledMarketplaces,
    getMarketplaceForUrl,
    isSupportedMarketplace,
    isTrackableOfferPage,
} from '@/config/marketplaces';
import {normalizeUrl} from '@/utils/formatters';
import {uploadListingThumbnail} from '@/utils/imageUpload';

// Types
import {CarListing} from '@/types';

/**
 * Main popup component
 */
const ExtensionPopup: React.FC = () => {
    const {t} = useTranslation(['popup', 'common', 'errors']);

    // Context hooks
    const {listings, add, remove, error: listingsError, clearError} = useListings();
    const {settings, isLoading: settingsLoading, reload: reloadSettings} = useSettings();
    const auth = useAuth();

    // Custom hooks
    const {tab} = useCurrentTab();
    const {content: pageData, refresh: refreshPageContent} = usePageContent();
    const {openDashboard, openSettings} = useExtensionNavigation();

    // Local state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<CarListing | null>(null);
    const [showVinWarning, setShowVinWarning] = useState(false);
    const [showDateWarning, setShowDateWarning] = useState(false);

    // Derived state
    const currentUrl = tab?.url || '';
    const isLoggedIn = auth.status === 'logged_in';
    const isAuthLoading = auth.status === 'loading' || auth.isLoggingIn;
    const displayError = error || listingsError || auth.error;

    // API key check - assume available while loading to prevent flash
    const hasApiKey = settingsLoading || !!settings.geminiApiKey;

    // Check if current URL is a trackable offer page
    const isOfferPage = useMemo(() => isTrackableOfferPage(currentUrl), [currentUrl]);
    const isOnMarketplace = useMemo(() => isSupportedMarketplace(currentUrl), [currentUrl]);
    const detectedMarketplace = useMemo(() => getMarketplaceForUrl(currentUrl), [currentUrl]);
    const enabledMarketplaces = useMemo(() => getEnabledMarketplaces(), []);

    // Find existing saved item based on URL
    const savedItem = useMemo(() => {
        if (!currentUrl) return null;
        const normalizedUrl = normalizeUrl(currentUrl);
        return listings.find((l) => normalizeUrl(l.source.url) === normalizedUrl) || null;
    }, [listings, currentUrl]);

    // Reload settings when auth status changes
    useEffect(() => {
        if (auth.status === 'logged_in' || auth.status === 'logged_out') {
            reloadSettings();
        }
    }, [auth.status, reloadSettings]);

    // Clear all errors
    const handleClearError = useCallback(() => {
        setError(null);
        clearError();
        auth.clearError();
    }, [clearError, auth]);

    // Auth handlers
    const handleLogin = useCallback(async () => {
        await auth.login();
    }, [auth]);

    const handleLogout = useCallback(async () => {
        await auth.logout();
    }, [auth]);

    // Analyze handler
    const handleAnalyze = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Re-fetch page content to capture dynamically loaded data
            const freshContent = await refreshPageContent();
            const contentToAnalyze = freshContent || pageData;

            if (!contentToAnalyze) {
                setError(t('errors:listing.noPageContent'));
                return;
            }

            const listingData = await parseCarDataWithGemini(
                currentUrl,
                contentToAnalyze.content,
                contentToAnalyze.title,
                contentToAnalyze.image,
            );

            setPreviewData(listingData as CarListing);
            setShowVinWarning(!listingData.vehicle?.vin);
            setShowDateWarning(!listingData.postedDate);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : t('errors:listing.failedToExtract');
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [pageData, currentUrl, refreshPageContent]);

    // Save confirmation handler
    const handleConfirmSave = useCallback(async () => {
        if (!previewData) return;

        try {
            // Upload image to API storage before saving
            const listingWithApiImage = await uploadListingThumbnail(previewData);
            await add(listingWithApiImage);
            setPreviewData(null);
            setShowVinWarning(false);
            setShowDateWarning(false);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : t('errors:listing.failedToSave');
            setError(errorMessage);
        }
    }, [previewData, add, t]);

    // Cancel preview handler
    const handleCancelPreview = useCallback(() => {
        setPreviewData(null);
        setShowVinWarning(false);
        setShowDateWarning(false);
    }, []);

    // Untrack handler
    const handleUnbookmark = useCallback(async () => {
        if (savedItem) {
            await remove(savedItem.id);
        }
    }, [savedItem, remove]);

    // Render content based on state
    const renderContent = () => {
        // Auth loading
        if (auth.status === 'loading') {
            return <LoadingSpinner message={t('common:loading')} className="py-8"/>;
        }

        // Not logged in
        if (!isLoggedIn) {
            return <LoginView onLogin={handleLogin} isLoading={isAuthLoading} error={auth.error}/>;
        }

        // Preview mode
        if (previewData) {
            return (
                <PreviewCard
                    listing={previewData}
                    showVinWarning={showVinWarning}
                    showDateWarning={showDateWarning}
                    onConfirm={handleConfirmSave}
                    onCancel={handleCancelPreview}
                />
            );
        }

        // Not on a trackable page and no saved item
        if (!isOfferPage && !savedItem) {
            return (
                <NoListingView
                    isOnMarketplace={isOnMarketplace}
                    detectedMarketplace={detectedMarketplace}
                    enabledMarketplaces={enabledMarketplaces}
                />
            );
        }

        // Analyzing
        if (loading) {
            return (
                <div className="flex flex-col items-center animate-pulse">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4"/>
                    <p className="text-slate-600 font-medium">{t('popup:analyzing.title')}</p>
                    <p className="text-slate-400 text-xs mt-2">{t('popup:analyzing.subtitle')}</p>
                </div>
            );
        }

        // Already tracked
        if (savedItem) {
            return (
                <SavedItemView
                    listing={savedItem}
                    onUntrack={handleUnbookmark}
                    onViewInDashboard={() => {
                        // Open dashboard with listing parameter to auto-open detail modal
                        const dashboardUrl = chrome.runtime.getURL(`index.html?view=dashboard&listing=${encodeURIComponent(savedItem.id)}`);
                        chrome.tabs.create({url: dashboardUrl});
                    }}
                />
            );
        }

        // Ready to analyze
        return (
            <AnalyzePrompt
                hasApiKey={hasApiKey}
                isLoading={loading}
                hasPageData={!!pageData}
                error={error}
                onAnalyze={handleAnalyze}
                onOpenSettings={openSettings}
            />
        );
    };

    return (
        <div className="w-full h-full bg-white flex flex-col font-sans min-h-[500px]">
            {/* Header */}
            <PopupHeader
                isLoggedIn={isLoggedIn}
                userEmail={auth.user?.email}
                onOpenDashboard={openDashboard}
                onOpenSettings={openSettings}
                onLogout={handleLogout}
            />

            {/* Main Content */}
            <div className="flex-1 p-5 flex flex-col items-center justify-center text-center overflow-y-auto">
                {renderContent()}

                {/* Global Error Display */}
                {displayError && !error && (
                    <div
                        className="mt-4 flex items-start gap-2 text-left text-red-600 text-xs bg-red-50 p-3 rounded border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                        <span className="flex-1">{displayError}</span>
                        <button onClick={handleClearError} className="text-red-400 hover:text-red-600">
                            <X className="w-4 h-4"/>
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 truncate flex-1">{currentUrl}</span>
                {isLoggedIn && (
                    <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">
            ☁️ {t('popup:footer.cloudSync')}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ExtensionPopup;

