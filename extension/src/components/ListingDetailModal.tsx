/**
 * Listing Detail Modal Component
 *
 * Displays detailed information about a car listing in an overlay modal.
 * Groups information by category and includes price history chart.
 */

import React from 'react';
import { CarListing, ListingStatus } from '@/types';
import PriceChart from '@/components/PriceChart';
import {
  X,
  ExternalLink,
  Calendar,
  Gauge,
  Fuel,
  Settings2,
  Car,
  Globe,
  MapPin,
  User,
  Phone,
  Clock,
  Eye,
  RefreshCw,
  FileText,
  Cog,
  Hash,
  Palette,
  Shield,
  Building,
  Tag,
} from 'lucide-react';
import { formatEuropeanDateTime } from '@/utils/formatters';

interface ListingDetailModalProps {
  listing: CarListing;
  onClose: () => void;
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, highlight }) => {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className={`flex items-start gap-2 py-2 ${highlight ? 'bg-blue-50 px-2 rounded' : ''}`}>
      <span className="text-slate-400 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-500 block">{label}</span>
        <span className="text-sm font-medium text-slate-800 break-words">{String(value)}</span>
      </div>
    </div>
  );
};

interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
}

const InfoSection: React.FC<InfoSectionProps> = ({ title, children }) => {
  // Filter out null children
  const validChildren = React.Children.toArray(children).filter(Boolean);
  if (validChildren.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-4">
        {children}
      </div>
    </div>
  );
};

const ListingDetailModal: React.FC<ListingDetailModalProps> = ({ listing, onClose }) => {
  const v = listing.vehicle;
  const loc = listing.location;
  const seller = listing.seller;

  // Status styling
  const getStatusColor = () => {
    if (listing.status === ListingStatus.ACTIVE) return 'bg-green-100 text-green-700';
    if (listing.status === ListingStatus.SOLD) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  // Calculate price changes
  const firstPrice = listing.priceHistory.length > 0 ? listing.priceHistory[0].price : listing.currentPrice;
  const totalPriceChange = listing.currentPrice - firstPrice;
  const totalPriceChangePercent = firstPrice > 0
    ? Math.round((totalPriceChange / firstPrice) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          {/* Image banner */}
          <div className="h-48 bg-slate-100 relative">
            <img
              src={listing.thumbnailUrl}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Status & Source badges */}
            <div className="absolute top-4 right-4 flex gap-2">
              <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${getStatusColor()}`}>
                {listing.status}
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-100 text-cyan-700">
                {listing.source.platform}
              </span>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-xl font-bold text-white mb-1">{listing.title}</h2>
              <div className="flex items-center gap-3 text-white/90">
                <span className="text-2xl font-bold">
                  {listing.currentPrice.toLocaleString()} {listing.currency}
                </span>
                {totalPriceChange !== 0 && (
                  <span className={`text-sm px-2 py-0.5 rounded ${
                    totalPriceChange < 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {totalPriceChange < 0 ? '↓' : '↑'} {Math.abs(totalPriceChangePercent)}% since first tracked
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div>
              {/* Vehicle Identification */}
              <InfoSection title="Vehicle Identification">
                <InfoItem icon={<Hash className="w-4 h-4" />} label="VIN" value={v.vin} highlight />
                <InfoItem icon={<Car className="w-4 h-4" />} label="Make" value={v.make} />
                <InfoItem icon={<FileText className="w-4 h-4" />} label="Model" value={v.model} />
                <InfoItem icon={<Tag className="w-4 h-4" />} label="Generation" value={v.generation} />
                <InfoItem icon={<Settings2 className="w-4 h-4" />} label="Trim" value={v.trim} />
                <InfoItem icon={<Car className="w-4 h-4" />} label="Body Type" value={v.bodyType} />
              </InfoSection>

              {/* Production & Registration */}
              <InfoSection title="Production & Registration">
                <InfoItem icon={<Calendar className="w-4 h-4" />} label="Production Year" value={v.productionYear} />
                <InfoItem icon={<Calendar className="w-4 h-4" />} label="First Registration" value={v.firstRegistrationYear} />
                <InfoItem icon={<Gauge className="w-4 h-4" />} label="Mileage" value={
                  v.mileage?.value ? `${v.mileage.value.toLocaleString()} ${v.mileage.unit || 'km'}` : null
                } />
                <InfoItem icon={<Globe className="w-4 h-4" />} label="Origin Country" value={v.registration?.originCountry} />
                <InfoItem icon={<Globe className="w-4 h-4" />} label="Registered In" value={v.registration?.registeredInCountryCode} />
                <InfoItem icon={<FileText className="w-4 h-4" />} label="Plate Number" value={v.registration?.plateNumber} />
              </InfoSection>

              {/* Engine & Drivetrain */}
              <InfoSection title="Engine & Drivetrain">
                <InfoItem icon={<Fuel className="w-4 h-4" />} label="Fuel Type" value={v.engine?.fuelType} />
                <InfoItem icon={<Settings2 className="w-4 h-4" />} label="Engine Capacity" value={
                  v.engine?.capacityCc ? `${(v.engine.capacityCc / 1000).toFixed(1)}L (${v.engine.capacityCc} cc)` : null
                } />
                <InfoItem icon={<Cog className="w-4 h-4" />} label="Power" value={
                  v.engine?.powerHp ? `${v.engine.powerHp} HP${v.engine.powerKw ? ` (${v.engine.powerKw} kW)` : ''}` : null
                } />
                <InfoItem icon={<Settings2 className="w-4 h-4" />} label="Engine Code" value={v.engine?.engineCode} />
                <InfoItem icon={<Shield className="w-4 h-4" />} label="Euro Standard" value={v.engine?.euroStandard} />
                <InfoItem icon={<Fuel className="w-4 h-4" />} label="Hybrid Type" value={v.engine?.hybridType} />
                <InfoItem icon={<Cog className="w-4 h-4" />} label="Transmission" value={v.drivetrain?.transmissionType} />
                <InfoItem icon={<Settings2 className="w-4 h-4" />} label="Transmission Subtype" value={v.drivetrain?.transmissionSubtype} />
                <InfoItem icon={<Hash className="w-4 h-4" />} label="Gears" value={v.drivetrain?.gearsCount} />
                <InfoItem icon={<Car className="w-4 h-4" />} label="Drive Type" value={v.drivetrain?.driveType} />
              </InfoSection>
            </div>

            {/* Right column */}
            <div>
              {/* Condition */}
              <InfoSection title="Condition">
                <InfoItem icon={<Tag className="w-4 h-4" />} label="Condition" value={v.condition?.isNew ? 'New' : 'Used'} />
                <InfoItem icon={<Globe className="w-4 h-4" />} label="Imported" value={
                  v.condition?.isImported === true ? 'Yes' : v.condition?.isImported === false ? 'No' : null
                } />
                <InfoItem icon={<Shield className="w-4 h-4" />} label="Accident-Free" value={
                  v.condition?.accidentFreeDeclared === true ? 'Yes (declared)' :
                  v.condition?.accidentFreeDeclared === false ? 'No' : null
                } />
                <InfoItem icon={<FileText className="w-4 h-4" />} label="Service History" value={
                  v.condition?.serviceHistoryDeclared === true ? 'Available' :
                  v.condition?.serviceHistoryDeclared === false ? 'Not available' : null
                } />
              </InfoSection>

              {/* Colors & Interior */}
              <InfoSection title="Colors & Interior">
                <InfoItem icon={<Palette className="w-4 h-4" />} label="Exterior Color" value={v.colorAndInterior?.exteriorColor} />
                <InfoItem icon={<Palette className="w-4 h-4" />} label="Interior Color" value={v.colorAndInterior?.interiorColor} />
                <InfoItem icon={<Car className="w-4 h-4" />} label="Upholstery" value={v.colorAndInterior?.upholsteryType} />
              </InfoSection>

              {/* Location */}
              <InfoSection title="Location">
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="City" value={loc?.city} />
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="Region" value={loc?.region} />
                <InfoItem icon={<Building className="w-4 h-4" />} label="Postal Code" value={loc?.postalCode} />
                <InfoItem icon={<Globe className="w-4 h-4" />} label="Country" value={loc?.countryCode} />
              </InfoSection>

              {/* Seller */}
              <InfoSection title="Seller">
                <InfoItem icon={<User className="w-4 h-4" />} label="Seller Type" value={seller?.type} />
                <InfoItem icon={<User className="w-4 h-4" />} label="Name" value={seller?.name} />
                <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone" value={seller?.phone} />
                <InfoItem icon={<Building className="w-4 h-4" />} label="Company" value={
                  seller?.isCompany === true ? 'Yes' : seller?.isCompany === false ? 'No (Private)' : null
                } />
              </InfoSection>

              {/* Pricing Details */}
              <InfoSection title="Pricing">
                <InfoItem icon={<Tag className="w-4 h-4" />} label="Current Price" value={
                  `${listing.currentPrice.toLocaleString()} ${listing.currency}`
                } highlight />
                <InfoItem icon={<Tag className="w-4 h-4" />} label="Original Price" value={
                  listing.originalPrice ? `${listing.originalPrice.toLocaleString()} ${listing.currency}` : null
                } />
                <InfoItem icon={<FileText className="w-4 h-4" />} label="Negotiable" value={
                  listing.negotiable === true ? 'Yes' : listing.negotiable === false ? 'No' : null
                } />
              </InfoSection>
            </div>
          </div>

          {/* Price History Chart - Full Width */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
              Price History
            </h3>
            <PriceChart history={listing.priceHistory} currency={listing.currency} />

            {/* Price history table */}
            {listing.priceHistory.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Date</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Price</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listing.priceHistory.map((point, idx) => {
                      const prevPrice = idx > 0 ? listing.priceHistory[idx - 1].price : point.price;
                      const change = point.price - prevPrice;
                      return (
                        <tr key={point.date} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600">{formatEuropeanDateTime(point.date)}</td>
                          <td className="py-2 px-3 text-right font-medium">
                            {point.price.toLocaleString()} {point.currency}
                          </td>
                          <td className={`py-2 px-3 text-right ${
                            change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-slate-400'
                          }`}>
                            {idx === 0 ? '—' : change === 0 ? '—' :
                              `${change > 0 ? '+' : ''}${change.toLocaleString()}`
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tracking Info */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-4">
              Tracking Information
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Posted: {listing.postedDate ? formatEuropeanDateTime(listing.postedDate) : 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Eye className="w-4 h-4" />
                <span>First seen: {formatEuropeanDateTime(listing.firstSeenAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <RefreshCw className="w-4 h-4" />
                <span>Last checked: {formatEuropeanDateTime(listing.lastSeenAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Globe className="w-4 h-4" />
                <span>Listing ID: {listing.source.listingId || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-slate-50">
          <span className="text-xs text-slate-500">
            ID: {listing.id} • Schema: {listing.schemaVersion}
          </span>
          <a
            href={listing.source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Open Original Listing
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailModal;

