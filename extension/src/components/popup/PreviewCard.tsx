/**
 * PreviewCard Component
 *
 * Displays a preview of the car listing to be saved.
 * Shows warnings for missing VIN or posted date.
 */

import React from 'react';
import { AlertTriangle, Car, Calendar, Gauge, Fuel } from 'lucide-react';
import { CarListing } from '@/types';
import { formatEuropeanDateTime } from '@/utils/formatters';

interface PreviewCardProps {
  listing: CarListing;
  showVinWarning: boolean;
  showDateWarning: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PreviewCard: React.FC<PreviewCardProps> = ({
  listing,
  showVinWarning,
  showDateWarning,
  onConfirm,
  onCancel,
}) => (
  <div className="w-full">
    {/* Warnings - compact */}
    {(showVinWarning || showDateWarning) && (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-left">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            {showVinWarning && (
              <p className="text-amber-700">
                <span className="font-medium">No VIN detected</span> - car will be identified by URL only
              </p>
            )}
            {showDateWarning && (
              <p className="text-amber-700 mt-1">
                <span className="font-medium">No posted date</span> - listing date unknown
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    <h3 className="font-bold text-slate-800 mb-2 text-left text-sm">Confirm Details</h3>

    {/* Preview Card - Compact */}
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left mb-3">
      {listing.thumbnailUrl && (
        <img
          src={listing.thumbnailUrl}
          alt={listing.title}
          className="w-full h-24 object-cover rounded mb-2"
        />
      )}
      <p className="font-bold text-slate-900 text-sm mb-1 truncate">{listing.title}</p>
      <p className="text-blue-600 font-mono font-bold mb-2">
        {listing.currentPrice?.toLocaleString()} {listing.currency}
      </p>

      <div className="grid grid-cols-2 gap-1 text-xs">
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

      {/* VIN, Phone, Date - inline compact badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {listing.vehicle?.vin ? (
          <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 font-mono">
            VIN: {listing.vehicle.vin}
          </span>
        ) : (
          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            No VIN
          </span>
        )}
        {listing.seller?.phone && (
          <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 font-mono">
            📞 {listing.seller.phone}
          </span>
        )}
        {listing.postedDate && (
          <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
            📅 {formatEuropeanDateTime(listing.postedDate)}
          </span>
        )}
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2">
      <button
        onClick={onCancel}
        className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
      >
        Save
      </button>
    </div>
  </div>
);

