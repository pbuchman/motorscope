/**
 * Compact Car Card Component
 *
 * A compact list-style view of a car listing, showing key information
 * without the price chart. Used in Dashboard compact view.
 */

import React, { memo } from 'react';
import { CarListing, ListingStatus } from '@/types';
import {
  Trash2,
  ExternalLink,
  Fuel,
  Calendar,
  Gauge,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Archive,
  ArchiveRestore,
  TrendingDown,
  TrendingUp,
  Minus,
  Info
} from 'lucide-react';
import { formatEuropeanDateShort } from '@/utils/formatters';
import { getMarketplaceDisplayName } from '@/config/marketplaces';

interface CarCardCompactProps {
  listing: CarListing;
  onRemove: (id: string) => void;
  onRefresh: (listing: CarListing) => void;
  onArchive: (listing: CarListing) => void;
  onShowDetails: (listing: CarListing) => void;
  isRefreshing: boolean;
}

const CarCardCompact: React.FC<CarCardCompactProps> = ({
  listing,
  onRemove,
  onRefresh,
  onArchive,
  onShowDetails,
  isRefreshing
}) => {
  const v = listing.vehicle;

  // Get first price for comparison (compare with first recorded, not previous)
  const hasPriceHistory = listing.priceHistory && listing.priceHistory.length > 1;
  const firstPrice = hasPriceHistory
    ? listing.priceHistory[0].price
    : null;

  const priceDiff = firstPrice ? listing.currentPrice - firstPrice : 0;
  const priceChangePercent = firstPrice
    ? Math.abs(Math.round((priceDiff / firstPrice) * 100))
    : 0;

  // Status colors
  const getStatusColor = () => {
    if (listing.isArchived) return 'bg-gray-100 text-gray-600';
    if (listing.status === ListingStatus.EXPIRED) return 'bg-red-100 text-red-700';
    if (listing.status === ListingStatus.SOLD) return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = () => {
    if (listing.isArchived) return 'Archived';
    return listing.status;
  };

  // Last refresh failed
  const lastRefreshFailed = listing.lastRefreshStatus === 'error';

  // Final price display (for expired/sold listings)
  const isInactive = listing.status === ListingStatus.EXPIRED || listing.status === ListingStatus.SOLD;

  return (
    <div className={`bg-white rounded-lg border ${listing.isArchived ? 'border-gray-200 opacity-75' : 'border-gray-200'} hover:shadow-md transition-all duration-200 relative overflow-hidden`}>
      {/* Loading Overlay */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
      )}

      <div className="flex items-stretch">
        {/* Thumbnail */}
        <a
          href={listing.source.url}
          target="_blank"
          rel="noreferrer"
          className="w-32 h-24 flex-shrink-0 relative block"
        >
          <img
            src={listing.thumbnailUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          {lastRefreshFailed && !isRefreshing && (
            <div className="absolute top-1 left-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          )}
        </a>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Title */}
              <h3 className="font-semibold text-sm text-slate-800 truncate">
                {listing.title}
              </h3>

              {/* Vehicle details */}
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                {v.productionYear && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {v.productionYear}
                  </span>
                )}
                {v.mileage?.value && (
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {v.mileage.value.toLocaleString()} {v.mileage.unit || 'km'}
                  </span>
                )}
                {v.engine?.fuelType && (
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3 h-3" />
                    {v.engine.fuelType}
                  </span>
                )}
              </div>
            </div>

            {/* Status and Source badges */}
            <div className="flex items-center gap-1">
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-cyan-100 text-cyan-700">
                {getMarketplaceDisplayName(listing.source.platform)}
              </span>
            </div>
          </div>

          {/* Price section */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {/* Current price */}
              <span className={`font-bold ${isInactive ? 'text-slate-500' : 'text-slate-800'}`}>
                {listing.currentPrice.toLocaleString()} {listing.currency}
              </span>

              {/* Price change indicator (compared to first recorded price) */}
              {firstPrice && priceDiff !== 0 && (
                <span className={`flex items-center gap-0.5 text-xs ${priceDiff < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceDiff < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {priceChangePercent}%
                </span>
              )}
              {firstPrice && priceDiff === 0 && (
                <span className="flex items-center gap-0.5 text-xs text-slate-400">
                  <Minus className="w-3 h-3" />
                </span>
              )}

              {/* First price (if different) */}
              {firstPrice && firstPrice !== listing.currentPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {firstPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Final price label for inactive */}
            {isInactive && (
              <span className="text-[10px] text-slate-400 uppercase">Final Price</span>
            )}
          </div>

          {/* Tracked since */}
          <div className="text-[10px] text-slate-400 mt-1">
            Tracked since {formatEuropeanDateShort(listing.firstSeenAt)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-1 px-2 border-l border-gray-100">
          <a
            href={listing.source.url}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
            title="Open listing"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => onShowDetails(listing)}
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
            title="View details"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRefresh(listing)}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
            title="Refresh listing"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onArchive(listing)}
            className={`p-1.5 rounded transition-colors ${
              listing.isArchived 
                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' 
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
            }`}
            title={listing.isArchived ? 'Unarchive' : 'Archive'}
          >
            {listing.isArchived ? (
              <ArchiveRestore className="w-4 h-4" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onRemove(listing.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(CarCardCompact, (prevProps, nextProps) => {
  return (
    prevProps.listing.id === nextProps.listing.id &&
    prevProps.listing.currentPrice === nextProps.listing.currentPrice &&
    prevProps.listing.status === nextProps.listing.status &&
    prevProps.listing.isArchived === nextProps.listing.isArchived &&
    prevProps.listing.lastSeenAt === nextProps.listing.lastSeenAt &&
    prevProps.listing.lastRefreshStatus === nextProps.listing.lastRefreshStatus &&
    prevProps.listing.priceHistory.length === nextProps.listing.priceHistory.length &&
    prevProps.isRefreshing === nextProps.isRefreshing
  );
});

