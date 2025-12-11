/**
 * StatusBadge Component
 *
 * Displays listing status (ACTIVE, ENDED) with appropriate styling.
 */

import React from 'react';
import {ListingStatus} from '@/types';
import {useTranslation} from 'react-i18next';

interface StatusBadgeProps {
    status: ListingStatus;
    className?: string;
}

const statusStyles: Record<ListingStatus, string> = {
    [ListingStatus.ACTIVE]: 'bg-green-500/20 text-green-900 bg-white/80',
    [ListingStatus.ENDED]: 'bg-red-500/20 text-red-900 bg-white/80',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({status, className = ''}) => {
    const {t} = useTranslation('common');
    const labelKey = status === ListingStatus.ACTIVE ? 'status.active' : 'status.ended';
    return (
        <span
            className={`px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-md ${statusStyles[status]} ${className}`}
        >
            {t(labelKey)}
        </span>
    );
};
