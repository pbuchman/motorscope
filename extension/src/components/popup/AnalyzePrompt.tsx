/**
 * AnalyzePrompt Component
 *
 * Prompt to analyze the current page and add to watchlist.
 * Shows API key warning if Gemini key is not configured.
 */

import React from 'react';
import {useTranslation} from 'react-i18next';
import {AlertCircle, Bookmark, Key, Loader2, Settings} from 'lucide-react';

interface AnalyzePromptProps {
    hasApiKey: boolean;
    isLoading: boolean;
    hasPageData: boolean;
    error: string | null;
    onAnalyze: () => void;
    onOpenSettings: () => void;
}

export const AnalyzePrompt: React.FC<AnalyzePromptProps> = ({
    hasApiKey,
    isLoading,
    hasPageData,
    error,
    onAnalyze,
    onOpenSettings,
}) => {
    const {t} = useTranslation(['popup', 'settings']);

    return (
        <div className="w-full">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                <Bookmark className="w-10 h-10 text-blue-600 mx-auto mb-3"/>
                <h3 className="text-slate-800 font-bold mb-2">{t('popup:analyze.title')}</h3>
                <p className="text-slate-500 text-sm">{t('popup:analyze.description')}</p>
            </div>

            {/* API Key Missing Warning */}
            {!hasApiKey ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex flex-col items-center text-center">
                        <Key className="w-6 h-6 text-amber-500 mb-2"/>
                        <p className="text-amber-800 font-medium text-sm mb-3">{t('popup:analyze.noApiKey')}</p>
                        <button
                            onClick={onOpenSettings}
                            className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded font-medium transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Settings className="w-3 h-3"/>
                            {t('settings:title')}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={onAnalyze}
                    disabled={!hasPageData || isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin"/>
                            {t('popup:analyzing.title')}
                        </>
                    ) : (
                        t('popup:analyze.button')
                    )}
                </button>
            )}

            {error && (
                <div
                    className="flex items-start gap-2 text-left text-red-600 text-xs mt-4 bg-red-50 p-3 rounded border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                    {error}
                </div>
            )}
        </div>
    );
};

