/**
 * StatusBadge Component
 *
 * Displays listing status (ACTIVE, SOLD, EXPIRED) with appropriate styling.
 */

import React from 'react';
import { ListingStatus } from '@/types';

interface StatusBadgeProps {
  status: ListingStatus;
  className?: string;
}

const statusStyles: Record<ListingStatus, string> = {
  [ListingStatus.ACTIVE]: 'bg-green-500/20 text-green-900 bg-white/80',
  [ListingStatus.SOLD]: 'bg-orange-500/20 text-orange-900 bg-white/80',
  [ListingStatus.EXPIRED]: 'bg-red-500/20 text-red-900 bg-white/80',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => (
  <span
    className={`px-2 py-1 text-xs font-semibold rounded-md backdrop-blur-md ${statusStyles[status]} ${className}`}
  >
    {status}
  </span>
);

