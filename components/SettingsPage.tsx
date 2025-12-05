import React, { useEffect, useState } from 'react';
import { ExtensionSettings, GeminiStats, RefreshStatus } from '../types';
import { DEFAULT_SETTINGS, getGeminiStats, getSettings, saveSettings, getRefreshStatus, DEFAULT_REFRESH_STATUS } from '../services/settingsService';
import { RefreshCw, Clock, Play, CheckCircle, XCircle, AlertCircle, LayoutDashboard, Trash2, Loader2, Circle } from 'lucide-react';
import { formatEuropeanDateTimeWithSeconds } from '../utils/formatters';

// Frequency steps from 10 seconds to 1 month (in minutes, with fractions for seconds)
const FREQUENCY_STEPS = [
  0.167,                       // 10 seconds
  1,                           // 1 minute (60 seconds)
  2,                           // 2 minutes (120 seconds)
  5, 10, 15, 30, 45,           // minutes
  60, 120, 180, 240, 360, 480, 720,  // hours (1h to 12h)
  1440, 2880, 4320,            // days (1d, 2d, 3d)
  10080, 20160,                // weeks (1w, 2w)
  43200                        // ~1 month (30 days)
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


const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<GeminiStats>({ totalCalls: 0, history: [] });
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>(DEFAULT_REFRESH_STATUS);
  const [countdown, setCountdown] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringRefresh, setTriggeringRefresh] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Load initial data
  useEffect(() => {
    const load = async () => {
      const loadedSettings = await getSettings();
      const loadedStats = await getGeminiStats();
      const loadedRefreshStatus = await getRefreshStatus();
      setSettings(loadedSettings);
      setStats(loadedStats);
      setRefreshStatus(loadedRefreshStatus);
    };
    load();

    // Listen for storage changes to update refresh status
    const handleStorageChange = () => {
      getRefreshStatus().then(setRefreshStatus);
      getGeminiStats().then(setStats);
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      if (!refreshStatus.nextRefreshTime) {
        setCountdown('Not scheduled');
        return;
      }

      const next = new Date(refreshStatus.nextRefreshTime).getTime();
      const now = Date.now();
      const diff = next - now;

      if (diff <= 0) {
        setCountdown('Refreshing soon...');
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
  }, [refreshStatus.nextRefreshTime]);

  const triggerManualRefresh = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      setTriggeringRefresh(true);
      setStatusMessage('');
      try {
        const response = await chrome.runtime.sendMessage({ type: 'TRIGGER_MANUAL_REFRESH' });
        if (response?.success) {
          setStatusMessage('Refresh started in background.');
        } else {
          setStatusMessage('Failed to trigger refresh: ' + (response?.error || 'Unknown error'));
        }
      } catch (e) {
        console.error('Failed to trigger refresh:', e);
        setStatusMessage('Failed to trigger refresh. Is the extension loaded correctly?');
      } finally {
        // Delay to show the triggering state
        setTimeout(() => setTriggeringRefresh(false), 1000);
      }
    } else {
      setStatusMessage('Chrome runtime not available. Are you running in the extension context?');
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage('');

    try {
      await saveSettings(settings);

      // Explicitly trigger alarm reschedule
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          await chrome.runtime.sendMessage({
            type: 'RESCHEDULE_ALARM',
            minutes: settings.checkFrequencyMinutes
          });
        } catch (e) {
          console.log('Could not reschedule alarm via message, storage listener should handle it');
        }
      }

      setStatusMessage('Settings saved successfully. Refresh schedule updated.');
    } catch (error) {
      setStatusMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    const latestStats = await getGeminiStats();
    setStats(latestStats);
    // Keep spinning for at least 500ms so user sees the animation
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MotoTracker Settings</h1>
          <p className="text-slate-500">Configure your Gemini API key and background verification cadence.</p>
        </div>
        <a
          href="index.html?view=dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </a>
      </header>

      <form onSubmit={handleSave} className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
          <input
            type="password"
            value={settings.geminiApiKey}
            onChange={(e) => setSettings((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Gemini API key"
          />
          <p className="text-xs text-slate-400 mt-1">Stored securely in chrome.storage.local on this device.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Check Frequency</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={FREQUENCY_STEPS.length - 1}
              value={FREQUENCY_STEPS.indexOf(settings.checkFrequencyMinutes) !== -1
                ? FREQUENCY_STEPS.indexOf(settings.checkFrequencyMinutes)
                : FREQUENCY_STEPS.findIndex(s => s >= settings.checkFrequencyMinutes) || 0}
              onChange={(e) => {
                const stepIndex = parseInt(e.target.value, 10);
                setSettings((prev) => ({ ...prev, checkFrequencyMinutes: FREQUENCY_STEPS[stepIndex] }));
              }}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="w-24 text-sm font-medium text-slate-700 text-right">
              {formatFrequency(settings.checkFrequencyMinutes)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>10 sec</span>
            <span>1 month</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">How often the background worker re-checks tracked listings.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {statusMessage && <p className="text-sm text-slate-500">{statusMessage}</p>}
      </form>

      {/* Listing Refresh Status */}
      <section className="mt-10 bg-white shadow-sm rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Listing Refresh</h2>
          <button
            type="button"
            onClick={triggerManualRefresh}
            disabled={triggeringRefresh || refreshStatus.isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshStatus.isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Refreshing {refreshStatus.currentIndex}/{refreshStatus.totalCount}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Refresh Now
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Last Refresh */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Last Refresh</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {refreshStatus.lastRefreshTime
                ? formatEuropeanDateTimeWithSeconds(refreshStatus.lastRefreshTime)
                : 'Never'}
            </p>
            {refreshStatus.lastRefreshCount > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {refreshStatus.lastRefreshCount} listing{refreshStatus.lastRefreshCount !== 1 ? 's' : ''} refreshed
              </p>
            )}
          </div>

          {/* Next Refresh */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Next Refresh</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {refreshStatus.nextRefreshTime
                ? formatEuropeanDateTimeWithSeconds(refreshStatus.nextRefreshTime)
                : 'Not scheduled'}
            </p>
          </div>

          {/* Countdown */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Countdown</span>
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

        {/* Refresh Progress / Recently Refreshed Listings */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            {refreshStatus.isRefreshing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                Refreshing ({refreshStatus.currentIndex}/{refreshStatus.totalCount})
              </>
            ) : (
              'Recently Refreshed'
            )}
          </h3>

          {/* Show pending items during refresh, otherwise show recently refreshed */}
          {refreshStatus.isRefreshing && refreshStatus.pendingItems && refreshStatus.pendingItems.length > 0 ? (
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
                  <span className="truncate flex-1 text-slate-700" title={item.url}>
                    {item.url} <span className="text-slate-400">({item.title})</span>
                  </span>
                </div>
              ))}
            </div>
          ) : refreshStatus.recentlyRefreshed && refreshStatus.recentlyRefreshed.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {refreshStatus.recentlyRefreshed.slice(0, 20).map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm"
                >
                  {item.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : item.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                  )}
                  <span className="truncate flex-1 text-slate-700" title={item.url}>
                    {item.url} <span className="text-slate-400">({item.title})</span>
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatEuropeanDateTimeWithSeconds(item.timestamp).split(' ')[1]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No recent refresh activity.</p>
          )}
        </div>

        {/* Refresh Errors Section */}
        {refreshStatus.refreshErrors && refreshStatus.refreshErrors.length > 0 && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Refresh Errors ({refreshStatus.refreshErrors.length})
              </h3>
              <button
                type="button"
                onClick={async () => {
                  if (typeof chrome !== 'undefined' && chrome.runtime) {
                    await chrome.runtime.sendMessage({ type: 'CLEAR_REFRESH_ERRORS' });
                  }
                }}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {refreshStatus.refreshErrors.slice(0, 20).map((error, index) => (
                <div
                  key={`error-${error.id}-${index}`}
                  className="p-2 bg-red-50 border border-red-100 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="truncate flex-1 text-slate-700" title={error.url}>
                      {error.url} <span className="text-slate-400">({error.title})</span>
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatEuropeanDateTimeWithSeconds(error.timestamp).split(' ')[1]}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1 ml-6 truncate" title={error.error}>
                    {error.error}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-10 bg-white shadow-sm rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Gemini Usage</h2>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>Total calls: {stats.totalCalls}</span>
            <button
              type="button"
              onClick={refreshStats}
              disabled={refreshing}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        {stats.history.length === 0 ? (
          <p className="text-sm text-slate-500">No Gemini calls recorded yet.</p>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {stats.history.map((entry) => (
              <article key={entry.id} className="border border-gray-100 rounded-lg p-4">
                <p className="text-xs text-slate-400">{formatEuropeanDateTimeWithSeconds(entry.timestamp)}</p>
                <p className="text-sm font-medium text-slate-800 truncate">{entry.url}</p>
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                    Show prompt ({entry.promptPreview.length.toLocaleString()} chars)
                  </summary>
                  <pre className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded font-mono whitespace-pre-wrap max-h-96 overflow-y-auto border border-slate-200">
                    {entry.promptPreview}
                  </pre>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
