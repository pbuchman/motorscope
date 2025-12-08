/**
 * PopupHeader Component
 *
 * Header bar for the extension popup.
 */

import React from 'react';
import { Car, Settings, LogOut } from 'lucide-react';

interface PopupHeaderProps {
  isLoggedIn: boolean;
  userEmail?: string;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const PopupHeader: React.FC<PopupHeaderProps> = ({
  isLoggedIn,
  userEmail,
  onOpenDashboard,
  onOpenSettings,
  onLogout,
}) => (
  <div className="bg-slate-900 text-white p-4 flex flex-col gap-2 shadow-md">
    <div className="flex items-center justify-between">
      <h2 className="font-bold text-lg flex items-center gap-2">
        <Car className="w-5 h-5 text-blue-400" />
        MotorScope
      </h2>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenDashboard}
          className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
        >
          Dashboard
        </button>
        <button
          onClick={onOpenSettings}
          className="bg-slate-700 hover:bg-slate-600 p-1.5 rounded transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Auth Section */}
    {isLoggedIn && userEmail && (
      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded transition-colors w-full justify-between"
        >
          <span className="truncate max-w-[180px]">{userEmail}</span>
          <LogOut className="w-3 h-3 shrink-0" />
        </button>
      </div>
    )}
  </div>
);

