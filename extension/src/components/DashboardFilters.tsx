/**
 * Dashboard Filters Component
 *
 * Provides filtering and sorting controls for the car listings dashboard.
 * Supports multi-select for makes and models.
 */

import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ListingStatus} from '../types';
import {AlertCircle, Archive, Car, CheckCircle, ChevronDown, Filter, Globe, SortAsc, X} from 'lucide-react';

export type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name';
export type ArchiveFilter = 'all' | 'active' | 'archived';

export interface FilterState {
    status: ListingStatus | 'all';
    archived: ArchiveFilter;
    makes: string[];  // Changed from single make to array
    models: string[]; // Added models filter
    sources: string[]; // Marketplace sources (e.g., 'otomoto', 'autoplac')
}

export interface MakeModelOption {
    make: string;
    models: string[];
}

export interface DashboardFiltersProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    sortBy: SortOption;
    onSortChange: (sort: SortOption) => void;
    availableMakeModels: MakeModelOption[];
    availableSources: { id: string; name: string }[];
    activeFiltersCount: number;
    onClearFilters: () => void;
}

export const DEFAULT_FILTERS: FilterState = {
    status: 'all',
    archived: 'active', // By default, show only non-archived
    makes: [],
    models: [],
    sources: [],
};

export const DEFAULT_SORT: SortOption = 'newest';

/**
 * Multi-select dropdown component
 */
interface MultiSelectProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({label, options, selected, onChange, placeholder}) => {
    const {t} = useTranslation('common');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const selectAll = () => onChange([...options]);
    const clearAll = () => onChange([]);

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500">{label}:</label>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[100px]"
                >
          <span className="truncate">
            {selected.length === 0 ? placeholder :
                selected.length === 1 ? selected[0] :
                    `${selected.length} selected`}
          </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                </button>
            </div>

            {isOpen && options.length > 0 && (
                <div
                    className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] max-h-60 overflow-auto">
                    <div className="flex justify-between px-2 py-1.5 border-b border-gray-100 text-[10px]">
                        <button onClick={selectAll}
                                className="text-blue-600 hover:underline">{t('button.selectAll')}</button>
                        <button onClick={clearAll}
                                className="text-slate-500 hover:underline">{t('button.clear')}</button>
                    </div>

                    {/* Options */}
                    {options.map(option => (
                        <label
                            key={option}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-xs"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                onChange={() => toggleOption(option)}
                                className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{option}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
                                                               filters,
                                                               onFiltersChange,
                                                               sortBy,
                                                               onSortChange,
                                                               availableMakeModels,
                                                               availableSources,
                                                               activeFiltersCount,
                                                               onClearFilters,
                                                           }) => {
    const {t} = useTranslation(['dashboard', 'common']);

    // Get all unique makes
    const availableMakes = availableMakeModels.map(mm => mm.make);

    // Get models for selected makes (or all models if no makes selected)
    const availableModels = filters.makes.length > 0
        ? availableMakeModels
            .filter(mm => filters.makes.includes(mm.make))
            .flatMap(mm => mm.models)
            .filter((v, i, a) => a.indexOf(v) === i) // unique
            .sort()
        : availableMakeModels
            .flatMap(mm => mm.models)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort();

    // When makes change, clear models that are no longer available
    const handleMakesChange = (makes: string[]) => {
        const newAvailableModels = makes.length > 0
            ? availableMakeModels
                .filter(mm => makes.includes(mm.make))
                .flatMap(mm => mm.models)
            : availableMakeModels.flatMap(mm => mm.models);

        const validModels = filters.models.filter(m => newAvailableModels.includes(m));
        onFiltersChange({...filters, makes, models: validModels});
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-slate-600">
                    <Filter className="w-4 h-4"/>
                    <span className="text-sm font-medium">{t('dashboard:filters.label')}</span>
                </div>

                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-500">{t('dashboard:filters.status')}:</label>
                    <select
                        value={filters.status}
                        onChange={(e) => onFiltersChange({...filters, status: e.target.value as ListingStatus | 'all'})}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">{t('common:filter.all')}</option>
                        <option value={ListingStatus.ACTIVE}>{t('common:status.active')}</option>
                        <option value={ListingStatus.ENDED}>{t('common:status.ended')}</option>
                    </select>
                </div>

                <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-500">{t('dashboard:filters.show')}:</label>
                    <select
                        value={filters.archived}
                        onChange={(e) => onFiltersChange({...filters, archived: e.target.value as ArchiveFilter})}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="active">{t('common:filter.activeOnly')}</option>
                        <option value="archived">{t('common:filter.archivedOnly')}</option>
                        <option value="all">{t('common:filter.all')}</option>
                    </select>
                </div>

                {availableMakes.length > 0 && (
                    <MultiSelect
                        label={t('dashboard:filters.make')}
                        options={availableMakes}
                        selected={filters.makes}
                        onChange={handleMakesChange}
                        placeholder={t('common:filter.allMakes')}
                    />
                )}

                {availableModels.length > 0 && (
                    <MultiSelect
                        label={t('dashboard:filters.model')}
                        options={availableModels}
                        selected={filters.models}
                        onChange={(models) => onFiltersChange({...filters, models})}
                        placeholder={t('common:filter.allModels')}
                    />
                )}

                {availableSources.length > 0 && (
                    <MultiSelect
                        label={t('dashboard:filters.source')}
                        options={availableSources.map(s => s.name)}
                        selected={filters.sources}
                        onChange={(sources) => onFiltersChange({...filters, sources})}
                        placeholder={t('common:filter.allSources')}
                    />
                )}

                <div className="h-6 w-px bg-gray-200"/>

                <div className="flex items-center gap-2 text-slate-600">
                    <SortAsc className="w-4 h-4"/>
                    <span className="text-sm font-medium">{t('common:sort.label')}</span>
                </div>

                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as SortOption)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="newest">{t('common:sort.newestFirst')}</option>
                    <option value="oldest">{t('common:sort.oldestFirst')}</option>
                    <option value="price-asc">{t('common:sort.priceAsc')}</option>
                    <option value="price-desc">{t('common:sort.priceDesc')}</option>
                    <option value="name">{t('common:sort.nameAsc')}</option>
                </select>

                {activeFiltersCount > 0 && (
                    <button
                        onClick={onClearFilters}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-3 h-3"/>
                        {t('common:button.clearFilters', {count: activeFiltersCount})}
                    </button>
                )}
            </div>

            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                    {filters.status !== 'all' && (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
              {filters.status === ListingStatus.ACTIVE && <CheckCircle className="w-3 h-3"/>}
                            {filters.status === ListingStatus.ENDED && <AlertCircle className="w-3 h-3"/>}
                            {t('dashboard:filters.status')}: {t('common:status.' + (filters.status === ListingStatus.ACTIVE ? 'active' : 'ended'))}
                            <button onClick={() => onFiltersChange({...filters, status: 'all'})}
                                    className="hover:text-blue-900">
                <X className="w-3 h-3"/>
              </button>
            </span>
                    )}
                    {filters.archived !== 'active' && (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
              <Archive className="w-3 h-3"/>
                            {filters.archived === 'archived' ? t('common:filter.archivedOnly') : t('common:filter.includingArchived')}
                            <button onClick={() => onFiltersChange({...filters, archived: 'active'})}
                                    className="hover:text-amber-900">
                <X className="w-3 h-3"/>
              </button>
            </span>
                    )}
                    {filters.makes.length > 0 && (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">
              <Car className="w-3 h-3"/>
                            {filters.makes.length === 1 ? filters.makes[0] : `${filters.makes.length} makes`}
                            <button onClick={() => onFiltersChange({...filters, makes: [], models: []})}
                                    className="hover:text-purple-900">
                <X className="w-3 h-3"/>
              </button>
            </span>
                    )}
                    {filters.models.length > 0 && (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              {filters.models.length === 1 ? filters.models[0] : `${filters.models.length} models`}
                            <button onClick={() => onFiltersChange({...filters, models: []})}
                                    className="hover:text-green-900">
                <X className="w-3 h-3"/>
              </button>
            </span>
                    )}
                    {filters.sources.length > 0 && (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full">
              <Globe className="w-3 h-3"/>
                            {filters.sources.length === 1
                                ? filters.sources[0]
                                : `${filters.sources.length} sources`}
                            <button onClick={() => onFiltersChange({...filters, sources: []})}
                                    className="hover:text-cyan-900">
                <X className="w-3 h-3"/>
              </button>
            </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardFilters;
