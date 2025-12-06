import React, { useEffect, useState, useCallback } from 'react';
import { GeminiStats } from '../types';
import { useSettings, useRefreshStatus } from '../context/AppContext';
import { getGeminiStats, clearGeminiLogs } from '../services/settingsService';
import { useChromeMessaging } from '../hooks/useChromeMessaging';
import { RefreshCw, Clock, Play, CheckCircle, XCircle, AlertCircle, LayoutDashboard, Loader2, Circle, Trash2 } from 'lucide-react';
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
  const { settings, update: updateSettings } = useSettings();
  const { status: refreshStatus } = useRefreshStatus();
  const { triggerManualRefresh } = useChromeMessaging();

  // Local form state (synced from context)
  const [formSettings, setFormSettings] = useState(settings);
  const [stats, setStats] = useState<GeminiStats>({ allTimeTotalCalls: 0, totalCalls: 0, successCount: 0, errorCount: 0, history: [] });
  const [countdown, setCountdown] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringRefresh, setTriggeringRefresh] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Sync form state when context settings change
  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Load stats on mount
  useEffect(() => {
    const load = async () => {
      const loadedStats = await getGeminiStats();
      setStats(loadedStats);
    };
    load();
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

  const handleTriggerManualRefresh = useCallback(async () => {
    setTriggeringRefresh(true);
    setStatusMessage('');
    try {
      const response = await triggerManualRefresh();
      if (response?.success) {
        setStatusMessage('Refresh started in background.');
      } else {
        setStatusMessage('Failed to trigger refresh: ' + (response?.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Failed to trigger refresh:', e);
      setStatusMessage('Failed to trigger refresh. Is the extension loaded correctly?');
    } finally {
      setTimeout(() => setTriggeringRefresh(false), 1000);
    }
  }, [triggerManualRefresh]);

  const handleSave = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage('');

    try {
      await updateSettings(formSettings);
      setStatusMessage('Settings saved successfully. Refresh schedule updated.');
    } catch (error) {
      setStatusMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }, [formSettings, updateSettings]);

  const refreshStats = useCallback(async () => {
    setRefreshing(true);
    const latestStats = await getGeminiStats();
    setStats(latestStats);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">MotorScope Settings</h1>
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
            value={formSettings.geminiApiKey}
            onChange={(e) => setFormSettings((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Gemini API key"
          />
          <p className="text-xs text-slate-400 mt-1">Stored securely in chrome.storage.local on this device.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Check Frequency</label>
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
                  setFormSettings((prev) => ({ ...prev, checkFrequencyMinutes: FREQUENCY_STEPS[stepIndex] }));
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>10 sec</span>
                <span>1 month</span>
              </div>
            </div>
            <span className="w-20 text-sm font-medium text-slate-700 text-center bg-slate-100 px-2 py-1 rounded">
              {formatFrequency(formSettings.checkFrequencyMinutes)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">How often the background worker re-checks tracked listings.</p>
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
            onClick={handleTriggerManualRefresh}
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
      </section>

      <GeminiUsageSection stats={stats} refreshing={refreshing} onRefresh={refreshStats} onClearLogs={async () => {
        await clearGeminiLogs();
        const latestStats = await getGeminiStats();
        setStats(latestStats);
      }} />
    </div>
  );
};

// Gemini Usage Section as a separate component for cleanliness
interface GeminiUsageSectionProps {
  stats: GeminiStats;
  refreshing: boolean;
  onRefresh: () => void;
  onClearLogs: () => void;
}

const GeminiUsageSection: React.FC<GeminiUsageSectionProps> = ({ stats, refreshing, onRefresh, onClearLogs }) => {
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [clearing, setClearing] = useState(false);

  const filteredHistory = stats.history.filter(entry => {
    if (filter === 'all') return true;
    return entry.status === filter;
  });

  const toggleExpanded = (id: string, section: 'prompt' | 'response') => {
    const key = `${id}-${section}`;
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section className="mt-10 bg-white shadow-sm rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Gemini Usage</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400" title="All-time total (never resets)">
            All-time: {stats.allTimeTotalCalls || 0}
          </span>
          <span className="text-slate-500">Session: {stats.totalCalls}</span>
          <span className="text-green-600">✓ {stats.successCount || 0}</span>
          <span className="text-red-600">✗ {stats.errorCount || 0}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
            title="Refresh stats"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={async () => {
              if (confirm('Clear all Gemini logs and reset session counts? All-time total will be preserved.')) {
                setClearing(true);
                await onClearLogs();
                setClearing(false);
              }
            }}
            disabled={clearing || stats.history.length === 0}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Clear logs (preserves all-time total)"
          >
            <Trash2 className={`w-4 h-4 ${clearing ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            filter === 'all' 
              ? 'bg-slate-700 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter('success')}
          className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
            filter === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          Success
        </button>
        <button
          type="button"
          onClick={() => setFilter('error')}
          className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
            filter === 'error' 
              ? 'bg-red-600 text-white' 
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          <XCircle className="w-3 h-3" />
          Errors
        </button>
      </div>

      {filteredHistory.length === 0 ? (
        <p className="text-sm text-slate-500">
          {filter === 'all' ? 'No Gemini calls recorded yet.' : `No ${filter} calls.`}
        </p>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredHistory.map((entry) => (
            <article
              key={entry.id}
              className={`border rounded-lg p-4 ${
                entry.status === 'error' ? 'border-red-200 bg-red-50/50' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {entry.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <p className="text-xs text-slate-400">{formatEuropeanDateTimeWithSeconds(entry.timestamp)}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-800 truncate mb-2" title={entry.url}>{entry.url}</p>

              {/* Prompt section */}
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(entry.id, 'prompt')}
                  className="text-xs text-blue-600 cursor-pointer hover:text-blue-700"
                >
                  {expandedIds.has(`${entry.id}-prompt`) ? '▼' : '▶'} Prompt ({entry.promptPreview.length.toLocaleString()} chars)
                </button>
                {expandedIds.has(`${entry.id}-prompt`) && (
                  <pre className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded font-mono whitespace-pre-wrap max-h-64 overflow-y-auto border border-slate-200">
                    {entry.promptPreview}
                  </pre>
                )}
              </div>

              {/* Response section (success) */}
              {entry.rawResponse && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.id, 'response')}
                    className="text-xs text-green-600 cursor-pointer hover:text-green-700"
                  >
                    {expandedIds.has(`${entry.id}-response`) ? '▼' : '▶'} Response (JSON)
                  </button>
                  {expandedIds.has(`${entry.id}-response`) && (
                    <pre className="text-xs text-green-700 mt-2 bg-green-50 p-3 rounded font-mono whitespace-pre-wrap max-h-96 overflow-y-auto border border-green-200">
                      {entry.rawResponse}
                    </pre>
                  )}
                </div>
              )}
              {/* Error section */}
              {entry.error && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.id, 'response')}
                    className="text-xs text-red-600 cursor-pointer hover:text-red-700"
                  >
                    {expandedIds.has(`${entry.id}-response`) ? '▼' : '▶'} Error Response
                  </button>
                  {expandedIds.has(`${entry.id}-response`) && (
                    <pre className="text-xs text-red-600 mt-2 bg-red-50 p-3 rounded font-mono whitespace-pre-wrap max-h-96 overflow-y-auto border border-red-200">
                      {(() => {
                        // Try to parse and format as JSON if possible
                        try {
                          const parsed = JSON.parse(entry.error);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return entry.error;
                        }
                      })()}
                    </pre>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default SettingsPage;
