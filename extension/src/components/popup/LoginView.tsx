/**
 * LoginView Component
 *
 * Displayed when user is not authenticated.
 * Shows sign-in prompt with Google button.
 */

import React from 'react';
import { Car, Loader2 } from 'lucide-react';
import { GoogleLogo } from '../ui/GoogleLogo';

interface LoginViewProps {
  onLogin: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, isLoading, error }) => (
  <div className="flex flex-col items-center py-8">
    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
      <Car className="w-8 h-8 text-blue-600" />
    </div>
    <h3 className="font-bold text-slate-800 mb-2">Sign in to use MotorScope</h3>
    <p className="text-slate-500 text-sm mb-6 text-center px-4">
      Track car listings, monitor price changes, and sync across devices.
    </p>
    <button
      onClick={onLogin}
      disabled={isLoading}
      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <GoogleLogo className="w-5 h-5" />
      )}
      <span>Sign in with Google</span>
    </button>
    {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
  </div>
);

