/**
 * NoListingView Component
 *
 * Displayed when user is on a page that cannot be tracked.
 * Shows appropriate message based on whether it's a marketplace or not.
 */

import React from 'react';
import {useTranslation} from 'react-i18next';
import {ExternalLink} from 'lucide-react';
import {MarketplaceConfig} from '@/config/marketplaces';

interface NoListingViewProps {
    /** Whether user is on a supported marketplace domain */
    isOnMarketplace: boolean;
    /** The detected marketplace config, if any */
    detectedMarketplace: MarketplaceConfig | null;
    /** List of enabled marketplaces to show as suggestions */
    enabledMarketplaces: MarketplaceConfig[];
}

export const NoListingView: React.FC<NoListingViewProps> = ({
                                                                isOnMarketplace,
                                                                detectedMarketplace,
                                                                enabledMarketplaces,
                                                            }) => {
    const {t} = useTranslation('popup');

    return (
        <div className="flex flex-col items-center py-8 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <ExternalLink className="w-8 h-8 text-slate-400"/>
            </div>
            {isOnMarketplace ? (
                // On a supported marketplace but not on a specific offer page
                <>
                    <p className="font-medium text-slate-700 mb-2">{t('noListing.notOfferPage.title')}</p>
                    <p className="text-sm text-center px-4">
                        {t('noListing.notOfferPage.description', {marketplace: detectedMarketplace?.name || 'this marketplace'})}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 text-center px-4">
                        {t('noListing.notOfferPage.hint')}
                    </p>
                </>
            ) : (
                // Not on any supported marketplace
                <>
                    <p className="font-medium text-slate-700 mb-2">{t('noListing.notOnMarketplace.title')}</p>
                    <p className="text-sm text-center px-4">
                        {t('noListing.notOnMarketplace.description')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {enabledMarketplaces.slice(0, 3).map((marketplace) => (
                            <a
                                key={marketplace.id}
                                href={marketplace.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-blue-600 hover:underline"
                            >
                                {marketplace.name}
                            </a>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

