/**
 * LoadingSpinner Component
 *
 * Reusable loading indicator with optional message.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Loading message to display */
  message?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin mb-3`} />
    {message && <p className="text-sm text-slate-500">{message}</p>}
  </div>
);

