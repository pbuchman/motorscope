/**
 * SavedItemView Component
 *
 * Displays details for an already-tracked listing.
 */

import React from 'react';
import { Check, Car, Calendar, Gauge, Fuel, Eye, RefreshCw } from 'lucide-react';
import { CarListing } from '@/types';
import PriceChart from '@/components/PriceChart';
import { formatEuropeanDateTime } from '@/utils/formatters';

interface SavedItemViewProps {
  listing: CarListing;
  onUntrack: () => void;
}

export const SavedItemView: React.FC<SavedItemViewProps> = ({ listing, onUntrack }) => (
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
      {listing.thumbnailUrl && (
        <img
          src={listing.thumbnailUrl}
          alt={listing.title}
          className="w-full h-28 object-cover rounded mb-2"
        />
      )}
      <p className="font-bold text-slate-900 text-sm mb-1 truncate">{listing.title}</p>
      <p className="text-blue-600 font-mono font-bold mb-2">
        {listing.currentPrice?.toLocaleString()} {listing.currency}
      </p>

      <div className="grid grid-cols-2 gap-1 text-xs mb-2">
        <div className="flex items-center gap-1 text-slate-600">
          <Car className="w-3 h-3" />
          <span className="truncate">
            {listing.vehicle?.make} {listing.vehicle?.model}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600">
          <Calendar className="w-3 h-3" />
          <span>{listing.vehicle?.productionYear}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-600">
          <Gauge className="w-3 h-3" />
          <span>
            {listing.vehicle?.mileage?.value?.toLocaleString()}{' '}
            {listing.vehicle?.mileage?.unit || 'km'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600">
          <Fuel className="w-3 h-3" />
          <span className="truncate">{listing.vehicle?.engine?.fuelType}</span>
        </div>
      </div>

      {listing.vehicle?.vin && (
        <div className="bg-green-50 border border-green-200 rounded px-2 py-0.5 mb-2">
          <span className="text-[10px] text-green-700 font-mono">VIN: {listing.vehicle.vin}</span>
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
            📅 Posted: {formatEuropeanDateTime(listing.postedDate)}
          </span>
        </div>
      )}

      {/* Tracking Info */}
      <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Eye className="w-3 h-3" />
          Tracked since {formatEuropeanDateTime(listing.firstSeenAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Last checked {formatEuropeanDateTime(listing.lastSeenAt)}
        </span>
      </div>

      {/* Price History Chart - only show when there's actual history (2+ points) */}
      {listing.priceHistory && listing.priceHistory.length >= 2 && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
            Price History
          </p>
          <PriceChart history={listing.priceHistory} currency={listing.currency} />
        </div>
      )}
    </div>

    <button onClick={onUntrack} className="text-red-500 text-sm hover:underline w-full py-2">
      Stop Tracking
    </button>
  </div>
);

