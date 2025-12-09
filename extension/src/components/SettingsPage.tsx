import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { GeminiStats, GeminiCallHistoryEntry } from '@/types';
import { useSettings, useRefreshStatus } from '@/context/AppContext';
import { useAuth } from '@/auth/AuthContext';
import { getGeminiStats, getGeminiHistory, clearGeminiLogs } from '@/services/settings/geminiStats';
import { BACKEND_SERVER_OPTIONS } from '@/auth/config';
import { getBackendServerUrl, setBackendServerUrl } from '@/auth/localServerStorage';
import { useChromeMessaging } from '@/hooks/useChromeMessaging';
import { RefreshCw, Clock, Play, CheckCircle, XCircle, AlertCircle, LayoutDashboard, Loader2, Circle, Trash2, Car, Sparkles, Key, ExternalLink, Server } from 'lucide-react';
import { formatEuropeanDateTimeWithSeconds } from '@/utils/formatters';
import { GoogleLogo, UserMenu } from '@/components/ui';

// Frequency steps from 10 seconds to 1 month (in minutes, with fractions for seconds)
const FREQUENCY_STEPS = [
  0.167, 1, 2, 5, 10, 15, 30, 45,
  60, 120, 180, 240, 360, 480, 720,
  1440, 2880, 4320, 10080, 20160, 43200
];

const formatFrequency = (minutes: number): string => {
  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} sec`;
  }
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''}`;
  if (minutes < 10080) return `${minutes / 1440} day${minutes / 1440 > 1 ? 's' : ''}`;
  if (minutes < 43200) return `${minutes / 10080} week${minutes / 10080 > 1 ? 's' : ''}`;
  return '1 month';
};

// Validate Gemini API key by making a test request
const validateGeminiApiKey = async (apiKey: string, t: (key: string) => string): Promise<{ valid: boolean; error?: string }> => {
  if (!apiKey.trim()) {
    return { valid: false, error: t('settings:validation.apiKeyRequired') };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 }
        })
      }
    );

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json();
    if (response.status === 400 && data.error?.message?.includes('API key')) {
      return { valid: false, error: t('settings:validation.invalidApiKey') };
    }
    if (response.status === 403) {
      return { valid: false, error: t('settings:validation.noGeminiAccess') };
    }
    return { valid: false, error: data.error?.message || t('settings:validation.failedToValidate') };
  } catch (error) {
    return { valid: false, error: t('settings:validation.networkError') };
  }
};

// Success/Warning message component that auto-dismisses
const StatusMessage: React.FC<{ message: string; type?: 'success' | 'warning'; onDismiss: () => void }> = ({ message, type = 'success', onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isWarning = type === 'warning' || message.toLowerCase().includes('add an api key');

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
      isWarning 
        ? 'bg-amber-50 border border-amber-200 text-amber-700' 
        : 'bg-green-50 border border-green-200 text-green-700'
    }`}>
      {isWarning ? (
        <AlertCircle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle className="w-4 h-4 shrink-0" />
      )}
      {message}
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common', 'auth']);
  const { settings, update: updateSettings, reload: reloadSettings } = useSettings();
  const { status: refreshStatus } = useRefreshStatus();
  const auth = useAuth();
  const { triggerManualRefresh } = useChromeMessaging();

  const isLoggedIn = auth.status === 'logged_in';
  const isAuthLoading = auth.status === 'loading';

  // Local form state
  const [formSettings, setFormSettings] = useState(settings);
  const [stats, setStats] = useState<GeminiStats>({ allTimeTotalCalls: 0, totalCalls: 0, successCount: 0, errorCount: 0 });
  const [history, setHistory] = useState<GeminiCallHistoryEntry[]>([]);
  const [countdown, setCountdown] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringRefresh, setTriggeringRefresh] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [validatingKey, setValidatingKey] = useState(false);

  // Backend server state (stored in chrome.storage.local, separate from other settings)
  const [currentServerUrl, setCurrentServerUrl] = useState<string>('');
  const [serverChangeLoading, setServerChangeLoading] = useState(false);
  const [showServerChangeConfirm, setShowServerChangeConfirm] = useState(false);
  const [pendingServerUrl, setPendingServerUrl] = useState<string>('');

  // Sync form state when context settings change
  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Load backend server URL from local storage on mount
  useEffect(() => {
    const loadServerUrl = async () => {
      const url = await getBackendServerUrl();
      setCurrentServerUrl(url);
    };
    loadServerUrl();
  }, []);

  // Reload settings when auth status changes (e.g., after login)
  useEffect(() => {
    if (auth.status === 'logged_in' || auth.status === 'logged_out') {
      // Force reload settings when auth state settles
      reloadSettings();
    }
  }, [auth.status, reloadSettings]);

  // Load stats and history on mount
  useEffect(() => {
    const load = async () => {
      const loadedStats = await getGeminiStats();
      const loadedHistory = await getGeminiHistory();
      setStats(loadedStats);
      setHistory(loadedHistory);
    };
    load();
  }, []);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      if (!refreshStatus.nextRefreshTime) {
        setCountdown(t('settings:syncStatus.notScheduled'));
        return;
      }
      const next = new Date(refreshStatus.nextRefreshTime).getTime();
      const now = Date.now();
      const diff = next - now;
      if (diff <= 0) {
        setCountdown(t('settings:syncStatus.refreshingSoon'));
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [refreshStatus.nextRefreshTime, t]);

  const handleLogin = useCallback(async () => {
    await auth.login();
  }, [auth]);

  const handleLogout = useCallback(async () => {
    await auth.logout();
  }, [auth]);

  // Handle server change request - shows confirmation dialog
  const handleServerChangeRequest = useCallback((newUrl: string) => {
    if (newUrl === currentServerUrl) return;
    setPendingServerUrl(newUrl);
    setShowServerChangeConfirm(true);
  }, [currentServerUrl]);

  // Confirm server change - logs out from old server, saves new server, stays on settings page
  const handleServerChangeConfirm = useCallback(async () => {
    if (!pendingServerUrl) return;

    setServerChangeLoading(true);
    setShowServerChangeConfirm(false);

    try {
      // Store the old server URL before changing
      const oldServerUrl = currentServerUrl;

      // Logout from the OLD server (invalidate token on old backend)
      if (isLoggedIn) {
        await auth.logout(oldServerUrl);
      }

      // Save new server URL to local storage
      await setBackendServerUrl(pendingServerUrl);
      setCurrentServerUrl(pendingServerUrl);

      console.log('[SettingsPage] Server changed from', oldServerUrl, 'to', pendingServerUrl);
    } catch (error) {
      console.error('[SettingsPage] Server change failed:', error);
    } finally {
      setServerChangeLoading(false);
      setPendingServerUrl('');
    }
  }, [pendingServerUrl, currentServerUrl, isLoggedIn, auth]);

  // Cancel server change
  const handleServerChangeCancel = useCallback(() => {
    setShowServerChangeConfirm(false);
    setPendingServerUrl('');
  }, []);

  const handleTriggerManualRefresh = useCallback(async () => {
    if (!settings.geminiApiKey) return; // Use persisted key, not form key
    setTriggeringRefresh(true);
    try {
      const response = await triggerManualRefresh();
      if (response?.success) {
        setSuccessMessage(t('settings:backgroundRefresh.started'));
      }
    } catch (e) {
      console.error('Failed to trigger refresh:', e);
    } finally {
      setTimeout(() => setTriggeringRefresh(false), 1000);
    }
  }, [triggerManualRefresh, settings.geminiApiKey, t]);

  const handleSave = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setApiKeyError('');
    setSuccessMessage('');

    // Validate API key if provided (not empty)
    if (formSettings.geminiApiKey.trim()) {
      // Only validate if key changed (avoid unnecessary API calls)
      const keyChanged = formSettings.geminiApiKey !== settings.geminiApiKey;
      if (keyChanged) {
        setValidatingKey(true);
        const validation = await validateGeminiApiKey(formSettings.geminiApiKey, t);
        setValidatingKey(false);

        if (!validation.valid) {
          setApiKeyError(validation.error || t('settings:validation.invalidApiKey'));
          return;
        }
      }
    }

    setSaving(true);
    try {
      await updateSettings(formSettings);

      setSuccessMessage(formSettings.geminiApiKey ? t('settings:save.success') : t('settings:save.successWithWarning'));
    } catch (error) {
      setApiKeyError(t('settings:save.failed'));
    } finally {
      setSaving(false);
    }
  }, [formSettings, updateSettings, t, settings.geminiApiKey]);

  const refreshStats = useCallback(async () => {
    setRefreshing(true);
    const latestStats = await getGeminiStats();
    const latestHistory = await getGeminiHistory();
    setStats(latestStats);
    setHistory(latestHistory);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Persisted API key (what's actually saved)
  const hasSavedApiKey = !!settings.geminiApiKey;
  // Form API key (what user is typing)
  const hasFormApiKey = !!formSettings.geminiApiKey.trim();
  // Check if form has unsaved changes
  const apiKeyChanged = formSettings.geminiApiKey !== settings.geminiApiKey;
  // Save button should be disabled if: empty form key, or currently saving/validating
  const canSave = hasFormApiKey && !saving && !validatingKey;

  // Auth loading state
  if (isAuthLoading) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // Login required state
  if (!isLoggedIn) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Car className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">{t('auth:signIn.title')}</h2>
          <p className="text-slate-500 mb-8">
            {t('auth:signIn.description')}
          </p>
          <button
            onClick={handleLogin}
            disabled={auth.isLoggingIn}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {auth.isLoggingIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleLogo className="w-5 h-5" />
            )}
            <span>{t('auth:signIn.button')}</span>
          </button>
          {auth.error && (
            <p className="text-red-500 text-sm mt-4">{auth.error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen overflow-y-auto">
      {/* Header - Full Width */}
      <header className="bg-slate-900 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Car className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">{t('settings:pageTitle')}</h1>
              <p className="text-slate-400 text-sm">{t('settings:pageSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Auth / User Menu */}
            {isAuthLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : isLoggedIn ? (
              <UserMenu
                userEmail={auth.user?.email || ''}
                onLogout={handleLogout}
                variant="dark"
              />
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                <GoogleLogo className="w-4 h-4" />
                <span>{t('settings:signIn')}</span>
              </button>
            )}
            <a
              href="index.html?view=dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              {t('common:nav.dashboard')}
            </a>
          </div>
        </div>
      </header>

      {/* Content - Centered */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Status Message */}
        {successMessage && (
          <StatusMessage message={successMessage} onDismiss={() => setSuccessMessage('')} />
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-6">

          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('settings:geminiApi.title')}
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={formSettings.geminiApiKey}
                onChange={(e) => {
                  setFormSettings(prev => ({ ...prev, geminiApiKey: e.target.value }));
                  setApiKeyError('');
                }}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  apiKeyError ? 'border-red-300 bg-red-50' 
                    : !hasFormApiKey ? 'border-amber-300 bg-amber-50'
                    : apiKeyChanged ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-300'
                }`}
                placeholder={t('settings:geminiApi.placeholder')}
              />
            </div>
            {apiKeyError ? (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {apiKeyError}
              </p>
            ) : !hasFormApiKey ? (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('settings:geminiApi.required')}
              </p>
            ) : apiKeyChanged ? (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('settings:geminiApi.clickToSave')}
              </p>
            ) : (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {t('settings:geminiApi.configured')}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {t('settings:geminiApi.getFrom')}{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Google AI Studio
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Check Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings:refreshFrequency.title')}</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={FREQUENCY_STEPS.length - 1}
                  value={FREQUENCY_STEPS.indexOf(formSettings.checkFrequencyMinutes) !== -1
                    ? FREQUENCY_STEPS.indexOf(formSettings.checkFrequencyMinutes)
                    : FREQUENCY_STEPS.findIndex(s => s >= formSettings.checkFrequencyMinutes) || 0}
                  onChange={(e) => {
                    const stepIndex = parseInt(e.target.value, 10);
                    setFormSettings(prev => ({ ...prev, checkFrequencyMinutes: FREQUENCY_STEPS[stepIndex] }));
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>{t('settings:refreshFrequency.rangeMin')}</span>
                  <span>{t('settings:refreshFrequency.rangeMax')}</span>
                </div>
              </div>
              <span className="w-20 text-sm font-medium text-slate-700 text-center bg-slate-100 px-2 py-1 rounded">
                {formatFrequency(formSettings.checkFrequencyMinutes)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{t('settings:refreshFrequency.descriptionAlt')}</p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={!canSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(saving || validatingKey) && <Loader2 className="w-4 h-4 animate-spin" />}
            {validatingKey ? t('settings:save.validating') : saving ? t('settings:save.saving') : t('settings:save.button')}
          </button>
        </form>

        {/* Background Sync Status */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              {t('settings:syncStatus.title')}
            </h2>
            <div className="flex items-center gap-2">
              {!hasSavedApiKey ? (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="w-3 h-3" />
                  {t('settings:syncStatus.configureApiKeyFirst')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerManualRefresh}
                  disabled={triggeringRefresh || refreshStatus.isRefreshing || !hasSavedApiKey}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refreshStatus.isRefreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t('settings:syncStatus.syncing')} {refreshStatus.currentIndex}/{refreshStatus.totalCount}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {t('settings:syncStatus.syncNow')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">{t('settings:syncStatus.lastSync')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {refreshStatus.lastRefreshTime
                  ? formatEuropeanDateTimeWithSeconds(refreshStatus.lastRefreshTime)
                  : t('settings:syncStatus.never')}
              </p>
              {refreshStatus.lastRefreshCount > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {t('settings:syncStatus.listingsUpdated', { count: refreshStatus.lastRefreshCount })}
                </p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <RefreshCw className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">{t('settings:syncStatus.nextSync')}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {refreshStatus.nextRefreshTime
                  ? formatEuropeanDateTimeWithSeconds(refreshStatus.nextRefreshTime)
                  : t('settings:syncStatus.notScheduled')}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">{t('settings:syncStatus.timeRemaining')}</span>
              </div>
              <p className="text-lg font-bold text-blue-700 font-mono">
                {refreshStatus.isRefreshing ? (
                  <span className="flex items-center gap-2 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {refreshStatus.currentIndex}/{refreshStatus.totalCount}
                  </span>
                ) : countdown}
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {refreshStatus.isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                  {t('settings:syncStatus.syncing')} ({refreshStatus.currentIndex}/{refreshStatus.totalCount})
                </>
              ) : (
                t('settings:syncStatus.recentActivity')
              )}
            </h3>

            {refreshStatus.isRefreshing && refreshStatus.pendingItems?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {refreshStatus.pendingItems.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      item.status === 'refreshing' ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'
                    }`}
                  >
                    {item.status === 'pending' ? (
                      <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                    ) : item.status === 'refreshing' ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                    ) : item.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="truncate flex-1 text-slate-700">{item.title}</span>
                  </div>
                ))}
              </div>
            ) : refreshStatus.recentlyRefreshed?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {refreshStatus.recentlyRefreshed.slice(0, 10).map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                    {item.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="truncate flex-1 text-slate-700">{item.title}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatEuropeanDateTimeWithSeconds(item.timestamp).split(' ')[1]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">{t('settings:syncStatus.noRecentActivity')}</p>
            )}
          </div>
        </section>

        {/* Gemini AI Stats */}
        <GeminiUsageSection stats={stats} history={history} refreshing={refreshing} onRefresh={refreshStats} onClearLogs={async () => {
          await clearGeminiLogs();
          const latestStats = await getGeminiStats();
          const latestHistory = await getGeminiHistory();
          setStats(latestStats);
          setHistory(latestHistory);
        }} />

        {/* Server Configuration - Always visible, separate from other settings */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">{t('settings:apiServer.title')}</h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings:backendServer.title')}</label>
            <select
              value={currentServerUrl}
              onChange={(e) => handleServerChangeRequest(e.target.value)}
              disabled={serverChangeLoading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {BACKEND_SERVER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {t('settings:backendServer.changeDescription')}
            </p>
          </div>
        </section>
      </div>

      {/* Server Change Confirmation Dialog */}
      {showServerChangeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('settings:serverChange.title')}</h3>
            </div>
            <p className="text-slate-600 mb-6">
              {t('settings:serverChange.description')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleServerChangeCancel}
                disabled={serverChangeLoading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {t('common:button.cancel')}
              </button>
              <button
                onClick={handleServerChangeConfirm}
                disabled={serverChangeLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {serverChangeLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {serverChangeLoading ? t('settings:serverChange.changing') : t('settings:serverChange.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Gemini Usage Section
interface GeminiUsageSectionProps {
  stats: GeminiStats;
  history: GeminiCallHistoryEntry[];
  refreshing: boolean;
  onRefresh: () => void;
  onClearLogs: () => void;
}

const GeminiUsageSection: React.FC<GeminiUsageSectionProps> = ({ stats, history, refreshing, onRefresh, onClearLogs }) => {
  const { t } = useTranslation('settings');
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  const filteredHistory = history.filter(entry => {
    if (filter === 'all') return true;
    return entry.status === filter;
  });

  const toggleExpanded = (id: string, section: 'prompt' | 'response') => {
    const key = `${id}-${section}`;
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          {t('geminiStats.title')}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400" title={t('geminiStats.allTime')}>
            {t('geminiStats.allTime')}: {stats.allTimeTotalCalls || 0}
          </span>
          <span className="text-slate-500">{t('geminiStats.session')}: {stats.totalCalls}</span>
          <span className="text-green-600">✓ {stats.successCount || 0}</span>
          <span className="text-red-600">✗ {stats.errorCount || 0}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            title={t('geminiStats.refreshStats')}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (confirm(t('geminiStats.clearLogsConfirm'))) {
                setClearing(true);
                await onClearLogs();
                setClearing(false);
              }
            }}
            disabled={clearing || history.length === 0}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
            title={t('geminiStats.clearLogs')}
          >
            <Trash2 className={`w-4 h-4 ${clearing ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'success', 'error'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === f
                ? f === 'success' ? 'bg-green-100 text-green-700'
                  : f === 'error' ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? t('geminiStats.filterAll') : f === 'success' ? t('geminiStats.filterSuccess') : t('geminiStats.filterErrors')}
            <span className="ml-1 opacity-75">
              ({f === 'all' ? history.length : history.filter(e => e.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {filteredHistory.length === 0 ? (
        <p className="text-sm text-slate-400">{t('geminiStats.noApiCalls')}</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredHistory.slice().reverse().slice(0, 50).map(entry => (
            <div key={entry.id} className="border border-gray-100 rounded-lg p-3 text-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {entry.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                    {entry.url}
                  </a>
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {formatEuropeanDateTimeWithSeconds(entry.timestamp)}
                </span>
              </div>

              {/* Prompt Preview */}
              <div className="mt-2">
                <button
                  onClick={() => toggleExpanded(entry.id, 'prompt')}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  {expandedIds.has(`${entry.id}-prompt`) ? '▼' : '▶'} {t('geminiStats.prompt')}
                </button>
                {expandedIds.has(`${entry.id}-prompt`) && (
                  <pre className="mt-1 p-2 bg-slate-50 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-40">
                    {entry.promptPreview}
                  </pre>
                )}
              </div>

              {/* Response/Error */}
              {entry.status === 'success' && entry.rawResponse && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleExpanded(entry.id, 'response')}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    {expandedIds.has(`${entry.id}-response`) ? '▼' : '▶'} {t('geminiStats.response')}
                  </button>
                  {expandedIds.has(`${entry.id}-response`) && (
                    <pre className="mt-1 p-2 bg-green-50 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-40">
                      {entry.rawResponse}
                    </pre>
                  )}
                </div>
              )}
              {entry.status === 'error' && entry.error && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">{entry.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default SettingsPage;

