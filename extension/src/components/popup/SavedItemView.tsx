/**
 * SavedItemView Component
 *
 * Displays details for an already-tracked listing.
 */

import React from 'react';
import {useTranslation} from 'react-i18next';
import {Calendar, Car, Check, ExternalLink, Eye, Fuel, Gauge, RefreshCw} from 'lucide-react';
import {CarListing} from '@/types';
import PriceChart from '@/components/PriceChart';
import {formatEuropeanDateTime} from '@/utils/formatters';

interface SavedItemViewProps {
    listing: CarListing;
    onUntrack: () => void;
    onViewInDashboard?: () => void;
}

export const SavedItemView: React.FC<SavedItemViewProps> = ({listing, onUntrack, onViewInDashboard}) => {
    const {t} = useTranslation(['popup', 'common', 'dashboard']);

    return (
        <div className="w-full">
            {/* Full Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left mb-4">
                {/* Image with Tracked overlay */}
                <div className="relative mb-2">
                    {listing.thumbnailUrl && (
                        <img
                            src={listing.thumbnailUrl}
                            alt={listing.title}
                            className="w-full h-28 object-cover rounded"
                        />
                    )}
                    {/* Tracked badge overlay */}
                    <div
                        className="absolute top-2 left-2 bg-green-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                        <Check className="w-3 h-3"/>
                        <span className="text-xs font-semibold">{t('popup:saved.badge')}</span>
                    </div>
                </div>
                <p className="font-bold text-slate-900 text-sm mb-1 truncate">{listing.title}</p>
                <p className="text-blue-600 font-mono font-bold mb-2">
                    {listing.currentPrice?.toLocaleString()} {listing.currency}
                </p>

                <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                    <div className="flex items-center gap-1 text-slate-600">
                        <Car className="w-3 h-3"/>
                        <span className="truncate">
              {listing.vehicle?.make} {listing.vehicle?.model}
            </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3 h-3"/>
                        <span>{listing.vehicle?.productionYear}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                        <Gauge className="w-3 h-3"/>
                        <span>
              {listing.vehicle?.mileage?.value?.toLocaleString()}{' '}
                            {listing.vehicle?.mileage?.unit || 'km'}
            </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                        <Fuel className="w-3 h-3"/>
                        <span className="truncate">{listing.vehicle?.engine?.fuelType}</span>
                    </div>
                </div>

                {listing.vehicle?.vin && (
                    <div className="bg-green-50 border border-green-200 rounded px-2 py-0.5 mb-2">
                        <span
                            className="text-[10px] text-green-700 font-mono">{t('common:vehicle.vin')}: {listing.vehicle.vin}</span>
                    </div>
                )}

                {listing.seller?.phone && (
                    <div className="bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mb-2">
                        <a
                            href={`tel:${listing.seller.phone}`}
                            className="text-[10px] text-blue-700 font-mono hover:underline"
                        >
                            📞 {listing.seller.phone}
                        </a>
                    </div>
                )}

                {listing.postedDate && (
                    <div className="bg-green-50 border border-green-200 rounded px-2 py-0.5 mb-2">
            <span className="text-[10px] text-green-700">
              📅 {t('common:time.posted', {date: formatEuropeanDateTime(listing.postedDate)})}
            </span>
                    </div>
                )}

                {/* Tracking Info */}
                <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3"/>
              {t('common:time.trackedSince', {date: formatEuropeanDateTime(listing.firstSeenAt)})}
          </span>
                    <span className="inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3"/>
                        {t('common:time.lastChecked', {date: formatEuropeanDateTime(listing.lastSeenAt)})}
          </span>
                </div>

                {/* Price History Chart - only show when there's actual history (2+ points) */}
                {listing.priceHistory && listing.priceHistory.length >= 2 && (
                    <div className="mt-2">
                        <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                            {t('dashboard:priceHistory.title')}
                        </p>
                        <PriceChart history={listing.priceHistory} currency={listing.currency}/>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
                {onViewInDashboard && (
                    <button
                        onClick={onViewInDashboard}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg w-full py-2 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4"/>
                        {t('popup:saved.viewInDashboard')}
                    </button>
                )}
                <button onClick={onUntrack} className="text-red-500 text-sm hover:underline w-full py-2">
                    {t('common:button.stopTracking')}
                </button>
            </div>
        </div>
    );
};

