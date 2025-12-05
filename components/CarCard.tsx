import React from 'react';
import { CarListing, ListingStatus } from '../types';
import PriceChart from './PriceChart';
import { Trash2, ExternalLink, Fuel, Calendar, Gauge, Info } from 'lucide-react';

interface CarCardProps {
  listing: CarListing;
  onRemove: (id: string) => void;
}

const CarCard: React.FC<CarCardProps> = ({ listing, onRemove }) => {
  const isLowerPrice = listing.priceHistory.length > 1 && listing.currentPrice < listing.priceHistory[listing.priceHistory.length - 2].price;
  const isHigherPrice = listing.priceHistory.length > 1 && listing.currentPrice > listing.priceHistory[listing.priceHistory.length - 2].price;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Header Image & Status */}
      <div className="relative h-48 bg-gray-100">
        <img 
          src={listing.thumbnailUrl} 
          alt={listing.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 flex gap-2">
           <span className={`px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-md ${
            listing.status === ListingStatus.ACTIVE ? 'bg-green-500/20 text-green-900 bg-white/80' : 'bg-red-500/20 text-red-900 bg-white/80'
          }`}>
            {listing.status}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
           <h3 className="text-white font-bold text-lg truncate">{listing.title}</h3>
           <div className="flex items-center gap-2 text-white/90">
             <span className="text-xl font-bold">
               {listing.currentPrice.toLocaleString()} {listing.currency}
             </span>
             {isLowerPrice && <span className="text-xs bg-green-500 text-white px-1.5 rounded">↓ Drop</span>}
             {isHigherPrice && <span className="text-xs bg-red-500 text-white px-1.5 rounded">↑ Rise</span>}
           </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-slate-600">
          <div className="flex flex-col items-center bg-slate-50 p-2 rounded">
            <Calendar className="w-4 h-4 mb-1 text-slate-400" />
            <span className="font-medium">{listing.details.year}</span>
          </div>
          <div className="flex flex-col items-center bg-slate-50 p-2 rounded">
            <Gauge className="w-4 h-4 mb-1 text-slate-400" />
            <span className="font-medium">{listing.details.mileage.toLocaleString()} km</span>
          </div>
          <div className="flex flex-col items-center bg-slate-50 p-2 rounded">
            <Fuel className="w-4 h-4 mb-1 text-slate-400" />
            <span className="font-medium truncate max-w-full">{listing.details.fuelType}</span>
          </div>
        </div>

        {/* VIN & Tech specs (mini) */}
        <div className="flex flex-wrap gap-2 mb-4">
          {listing.details.vin && (
             <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
               VIN: {listing.details.vin}
             </span>
          )}
          {listing.details.engineCapacity && (
             <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
               {listing.details.engineCapacity}
             </span>
          )}
        </div>

        {/* Chart */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Price History</p>
          <PriceChart history={listing.priceHistory} currency={listing.currency} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <a 
            href={listing.url} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Open Listing <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button 
            onClick={() => onRemove(listing.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Stop Tracking"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CarCard;
