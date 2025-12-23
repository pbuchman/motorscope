import React, {memo} from 'react';
import {useTranslation} from 'react-i18next';
import {CarListing, ListingStatus} from '@/types';
import PriceChart from '@/components/PriceChart';
import {
    AlertTriangle,
    Archive,
    ArchiveRestore,
    Calendar,
    Car,
    Clock,
    ExternalLink,
    Eye,
    Fuel,
    Gauge,
    Globe,
    Info,
    Loader2,
    MapPin,
    RefreshCw,
    Settings2,
    Trash2,
    XCircle,
} from 'lucide-react';
import {formatEuropeanDateTime} from '@/utils/formatters';
import {getMarketplaceDisplayName} from '@/config/marketplaces';

interface CarCardProps {
    listing: CarListing;
    onRemove: (id: string) => void;
    onRefresh: (listing: CarListing) => void;
    onArchive: (listing: CarListing) => void;
    onShowDetails: (listing: CarListing) => void;
    isRefreshing: boolean;
    justRefreshed?: boolean;
}

// Helper to safely get vehicle data
const getVehicleData = (listing: CarListing) => {
    const v = listing.vehicle;

    return {
        make: v.make,
        model: v.model,
        year: v.productionYear,
        mileage: v.mileage?.value,
        mileageUnit: v.mileage?.unit || 'km',
        fuelType: v.engine?.fuelType,
        engineCapacity: v.engine?.capacityCc
            ? `${(v.engine.capacityCc / 1000).toFixed(1)}L`
            : null,
        transmission: v.drivetrain?.transmissionType,
        vin: v.vin,
        color: v.colorAndInterior?.exteriorColor,
        bodyType: v.bodyType,
        powerHp: v.engine?.powerHp,
        driveType: v.drivetrain?.driveType,
        isNew: v.condition?.isNew,
        isImported: v.condition?.isImported,
        accidentFree: v.condition?.accidentFreeDeclared,
        originCountry: v.registration?.originCountry,
        registeredInCountry: v.registration?.registeredInCountryCode,
    };
};

// Helper to get location string
const getLocationString = (listing: CarListing): string | null => {
    const loc = listing.location;
    if (loc?.city) {
        const parts = [loc.city];
        if (loc.region) parts.push(loc.region);
        return parts.join(', ');
    }
    return null;
};


const CarCard: React.FC<CarCardProps> = ({
    listing,
    onRemove,
    onRefresh,
    onArchive,
    onShowDetails,
    isRefreshing,
    justRefreshed,
}) => {
    const {t} = useTranslation(['common', 'dashboard', 'errors']);
    // Get normalized vehicle data
    const vehicleData = getVehicleData(listing);
    const locationStr = getLocationString(listing);

    // Check if listing is inactive (ended)
    const isInactive = listing.status === ListingStatus.ENDED;

    // Compare current price with the previous price (if exists)
    // Ensure priceHistory has at least one entry before accessing
    const hasPriceHistory = listing.priceHistory && listing.priceHistory.length > 0;
    const previousPrice = hasPriceHistory && listing.priceHistory.length > 1
        ? listing.priceHistory[listing.priceHistory.length - 2].price
        : hasPriceHistory ? listing.priceHistory[0].price : listing.currentPrice;
    const isLowerPrice = hasPriceHistory && listing.priceHistory.length > 1 && listing.currentPrice < previousPrice;
    const isHigherPrice = hasPriceHistory && listing.priceHistory.length > 1 && listing.currentPrice > previousPrice;

    // Check for original price discount
    const hasDiscount = listing.originalPrice && listing.originalPrice > listing.currentPrice;
    const discountPercent = hasDiscount
        ? Math.round(((listing.originalPrice! - listing.currentPrice) / listing.originalPrice!) * 100)
        : 0;

    // Check if last refresh failed
    const lastRefreshFailed = listing.lastRefreshStatus === 'error';

    return (
        <div
            className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-300 relative ${
                listing.isArchived ? 'border-amber-200 opacity-80' :
                    isInactive ? 'border-red-200' :
                        justRefreshed ? 'border-green-400 ring-2 ring-green-200' :
                            'border-gray-200'
            }`}>
            {/* ENDED overlay - subtle red tint */}
            {isInactive && !listing.isArchived && (
                <div className="absolute inset-0 bg-red-50/40 pointer-events-none z-[1]"/>
            )}

            {/* Archived badge */}
            {listing.isArchived && (
                <div
                    className="absolute top-0 left-0 right-0 z-20 bg-amber-50 border-b border-amber-200 px-3 py-1 flex items-center gap-2">
                    <Archive className="w-3 h-3 text-amber-600"/>
                    <span className="text-[10px] font-medium text-amber-700">{t('dashboard:archivedBadge')}</span>
                </div>
            )}

            {/* Loading Overlay */}
            {isRefreshing && (
                <div
                    className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2"/>
                    <p className="text-sm font-medium text-slate-600">{t('common:refreshing')}</p>
                </div>
            )}


            {/* Header Image & Status */}
            <div className="relative h-48 bg-gray-100">
                <a href={listing.source.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                    <img
                        src={listing.thumbnailUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                    />
                </a>
                <div className={`absolute right-3 flex gap-2 ${listing.isArchived ? 'top-10' : 'top-3'}`}>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-md ${
               listing.status === ListingStatus.ACTIVE ? 'bg-green-500/20 text-green-900 bg-white/80' :
                   'bg-red-500/20 text-red-900 bg-white/80'
                    }`}>
                        {t('common:status.' + (listing.status === ListingStatus.ACTIVE ? 'active' : 'ended'))}
                    </span>
                    <span
                        className="px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-md bg-cyan-500/20 text-cyan-900 bg-white/80">
                        {getMarketplaceDisplayName(listing.source.platform)}
                    </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg truncate">{listing.title}</h3>
                    <div className="flex items-center gap-2 text-white/90 flex-wrap">
                        <span className="text-xl font-bold">
                            {listing.currentPrice.toLocaleString()} {listing.currency}
                        </span>
                        {isInactive && (
                            <span
                                className="text-xs bg-slate-500 text-white px-1.5 rounded">{t('common:status.finalPrice')}</span>
                        )}
                        {hasDiscount && !isInactive && (
                            <>
                                <span className="text-sm line-through text-white/60">
                                    {listing.originalPrice!.toLocaleString()}
                                </span>
                                <span
                                    className="text-xs bg-green-500 text-white px-1.5 rounded">{t('common:price.discount', {percent: discountPercent})}</span>
                            </>
                        )}
                        {isLowerPrice && !hasDiscount && !isInactive && <span
                            className="text-xs bg-green-500 text-white px-1.5 rounded">↓ {t('common:price.drop')}</span>}
                        {isHigherPrice && !isInactive && <span
                            className="text-xs bg-red-500 text-white px-1.5 rounded">↑ {t('common:price.rise')}</span>}
                        {listing.negotiable && !isInactive && <span
                            className="text-xs bg-yellow-500 text-white px-1.5 rounded">{t('common:price.negotiable')}</span>}
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-slate-600">
                    {vehicleData.year && (
                        <div className="flex flex-col items-center bg-slate-50 p-2 rounded">
                            <Calendar className="w-4 h-4 mb-1 text-slate-400"/>
                            <span className="font-medium">{vehicleData.year}</span>
                        </div>
                    )}
                    {vehicleData.mileage !== null && (
                        <div className="flex flex-col items-center bg-slate-50 p-2 rounded">
                            <Gauge className="w-4 h-4 mb-1 text-slate-400"/>
                            <span
                                className="font-medium">{vehicleData.mileage.toLocaleString()} {vehicleData.mileageUnit}</span>
                        </div>
                    )}
                    {vehicleData.fuelType && (
                        <div className="flex flex-col items-center bg-slate-50 p-2 rounded">
                            <Fuel className="w-4 h-4 mb-1 text-slate-400"/>
                            <span className="font-medium truncate max-w-full">{vehicleData.fuelType}</span>
                        </div>
                    )}
                </div>

                {/* VIN & Tech specs (mini) */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {listing.postedDate && (
                        <span
                            className="inline-flex items-center text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            <Clock className="w-3 h-3 mr-1"/>
                            {t('common:time.posted', {date: formatEuropeanDateTime(listing.postedDate)})}
                        </span>
                    )}
                    {listing.statusChangedAt && listing.status === ListingStatus.ENDED && (
                        <span
                            className="inline-flex items-center text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <XCircle className="w-3 h-3 mr-1"/>
                            {t('common:time.ended', {date: formatEuropeanDateTime(listing.statusChangedAt)})}
                        </span>
                    )}
                    {vehicleData.vin && (
                        <span
                            className="inline-flex items-center text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-mono">
                            {t('common:vehicle.vin')}: {vehicleData.vin}
                        </span>
                    )}
                    {listing.seller?.phone && (
                        <a
                            href={`tel:${listing.seller.phone}`}
                            className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100 font-mono"
                        >
                            📞 {listing.seller.phone}
                        </a>
                    )}
                    {vehicleData.engineCapacity && (
                        <span
                            className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Settings2 className="w-3 h-3 mr-1"/>
                            {vehicleData.engineCapacity}
                        </span>
                    )}
                    {vehicleData.transmission && (
                        <span
                            className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {vehicleData.transmission}
                        </span>
                    )}
                    {vehicleData.powerHp && (
                        <span
                            className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {vehicleData.powerHp} {t('common:vehicle.hpUnit')}
                        </span>
                    )}
                    {vehicleData.color && (
                        <span
                            className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {vehicleData.color}
                        </span>
                    )}
                    {vehicleData.bodyType && (
                        <span
                            className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Car className="w-3 h-3 mr-1"/>
                            {vehicleData.bodyType}
                        </span>
                    )}
                    {locationStr && (
                        <span
                            className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <MapPin className="w-3 h-3 mr-1"/>
                            {locationStr}
                        </span>
                    )}
                    {vehicleData.accidentFree === true && (
                        <span
                            className="inline-flex items-center text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">
               ✓ {t('common:vehicle.accidentFree')}
                        </span>
                    )}
                    {vehicleData.isNew === true && (
                        <span
                            className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {t('common:vehicle.new')}
                        </span>
                    )}
                    {vehicleData.originCountry && (
                        <span
                            className="inline-flex items-center text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <Globe className="w-3 h-3 mr-1"/>
                            {t('common:vehicle.from', {country: vehicleData.originCountry})}
                        </span>
                    )}
                    {vehicleData.isImported === true && !vehicleData.originCountry && (
                        <span
                            className="inline-flex items-center text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            {t('common:vehicle.imported')}
                        </span>
                    )}
                </div>

                {/* Tracking Info */}
                <div className="flex flex-wrap gap-2 mb-4 text-[10px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3"/>
                        {t('common:time.trackedSince', {date: formatEuropeanDateTime(listing.firstSeenAt)})}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <RefreshCw className="w-3 h-3"/>
                        {t('common:time.lastChecked', {date: formatEuropeanDateTime(listing.lastSeenAt)})}
                    </span>
                </div>

                {/* Chart */}
                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t('dashboard:priceHistory.title')}</p>
                    <PriceChart history={listing.priceHistory} currency={listing.currency}/>
                </div>

                {/* Error Banner */}
                {lastRefreshFailed && !isRefreshing && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/>
                        <p className="text-xs text-red-600">
                            {listing.lastRefreshError || t('errors:listing.failedToRefresh')}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <a
                        href={listing.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        {t('common:button.openListing')} <ExternalLink className="w-3.5 h-3.5"/>
                    </a>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onShowDetails(listing)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                            title={t('common:button.viewDetails')}
                        >
                            <Info className="w-4 h-4"/>
                        </button>
                        <button
                            onClick={() => onRefresh(listing)}
                            disabled={isRefreshing}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
                            title={t('common:button.refresh')}
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}/>
                        </button>
                        <button
                            onClick={() => onArchive(listing)}
                            className={`p-2 rounded-full transition-colors ${
                                listing.isArchived
                                    ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                            }`}
                            title={listing.isArchived ? t('common:button.unarchive') : t('common:button.archive')}
                        >
                            {listing.isArchived ? (
                                <ArchiveRestore className="w-4 h-4"/>
                            ) : (
                                <Archive className="w-4 h-4"/>
                            )}
                        </button>
                        <button
                            onClick={() => onRemove(listing.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title={t('common:button.stopTracking')}
                        >
                            <Trash2 className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Memoize component to prevent unnecessary re-renders
// Only re-render when listing data or refresh state changes
export default memo(CarCard, (prevProps, nextProps) => {
    return (
        prevProps.listing.id === nextProps.listing.id &&
        prevProps.listing.currentPrice === nextProps.listing.currentPrice &&
        prevProps.listing.status === nextProps.listing.status &&
        prevProps.listing.isArchived === nextProps.listing.isArchived &&
        prevProps.listing.lastSeenAt === nextProps.listing.lastSeenAt &&
        prevProps.listing.lastRefreshStatus === nextProps.listing.lastRefreshStatus &&
        prevProps.listing.lastRefreshError === nextProps.listing.lastRefreshError &&
        prevProps.listing.priceHistory.length === nextProps.listing.priceHistory.length &&
        prevProps.isRefreshing === nextProps.isRefreshing &&
        prevProps.justRefreshed === nextProps.justRefreshed
    );
});
