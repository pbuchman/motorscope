/**
 * PopupHeader Component
 *
 * Header bar for the extension popup.
 */

import React from 'react';
import {useTranslation} from 'react-i18next';
import {Car, Settings} from 'lucide-react';
import {UserMenu} from '@/components/ui';

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
}) => {
    const {t} = useTranslation(['common', 'settings']);

    return (
        <div className="bg-slate-900 text-white p-4 flex flex-col gap-2 shadow-md">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    <Car className="w-5 h-5 text-blue-400"/>
                    {t('common:appName')}
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
                        title={t('settings:title')}
                    >
                        <Settings className="w-4 h-4"/>
                    </button>
                </div>
            </div>

            {/* Auth Section */}
            {isLoggedIn && userEmail && (
                <div className="pt-2 border-t border-slate-700">
                    <UserMenu
                        userEmail={userEmail}
                        onLogout={onLogout}
                        variant="dark"
                        compact
                    />
                </div>
            )}
        </div>
    );
};

