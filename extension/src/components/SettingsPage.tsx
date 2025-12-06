import React, { useEffect, useState, useCallback } from 'react';
import { GeminiStats } from '../types';
import { useSettings, useRefreshStatus, useListings } from '../context/AppContext';
import { useAuth } from '../auth/AuthContext';
import { getGeminiStats, clearGeminiLogs } from '../services/settingsService';
import { BACKEND_SERVER_OPTIONS } from '../auth/config';
import { useChromeMessaging } from '../hooks/useChromeMessaging';
import { RefreshCw, Clock, Play, CheckCircle, XCircle, AlertCircle, LayoutDashboard, Loader2, Circle, Trash2, Car, Sparkles, LogOut, Key, ExternalLink } from 'lucide-react';
import { formatEuropeanDateTimeWithSeconds } from '../utils/formatters';

// Google logo SVG component
const GoogleLogo: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

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
const validateGeminiApiKey = async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
  if (!apiKey.trim()) {
    return { valid: false, error: 'API key is required' };
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
      return { valid: false, error: 'Invalid API key' };
    }
    if (response.status === 403) {
      return { valid: false, error: 'API key does not have access to Gemini API' };
    }
    return { valid: false, error: data.error?.message || 'Failed to validate API key' };
  } catch (error) {
    return { valid: false, error: 'Network error while validating API key' };
  }
};

// Success message component that auto-dismisses
const SuccessMessage: React.FC<{ message: string; onDismiss: () => void }> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm animate-fade-in">
      <CheckCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const { settings, update: updateSettings } = useSettings();
  const { status: refreshStatus } = useRefreshStatus();
  const { reload: reloadListings } = useListings();
  const auth = useAuth();
  const { triggerManualRefresh } = useChromeMessaging();

  const isLoggedIn = auth.status === 'logged_in';
  const isAuthLoading = auth.status === 'loading';

  // Local form state
  const [formSettings, setFormSettings] = useState(settings);
  const [stats, setStats] = useState<GeminiStats>({ allTimeTotalCalls: 0, totalCalls: 0, successCount: 0, errorCount: 0, history: [] });
  const [countdown, setCountdown] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringRefresh, setTriggeringRefresh] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [validatingKey, setValidatingKey] = useState(false);

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

  const handleLogin = useCallback(async () => {
    await auth.login();
  }, [auth]);

  const handleLogout = useCallback(async () => {
    await auth.logout();
  }, [auth]);

  const handleServerChange = useCallback((newUrl: string) => {
    if (newUrl === formSettings.backendUrl) return;

    const confirmed = window.confirm(
      'Changing the server will reload all listings and settings from the new server. Continue?'
    );

    if (confirmed) {
      setFormSettings(prev => ({ ...prev, backendUrl: newUrl }));
    }
  }, [formSettings.backendUrl]);

  const handleTriggerManualRefresh = useCallback(async () => {
    if (!formSettings.geminiApiKey) return;
    setTriggeringRefresh(true);
    try {
      const response = await triggerManualRefresh();
      if (response?.success) {
        setSuccessMessage('Background refresh started');
      }
    } catch (e) {
      console.error('Failed to trigger refresh:', e);
    } finally {
      setTimeout(() => setTriggeringRefresh(false), 1000);
    }
  }, [triggerManualRefresh, formSettings.geminiApiKey]);

  const handleSave = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setApiKeyError('');

    // Validate API key if it was modified
    const keyChanged = formSettings.geminiApiKey !== settings.geminiApiKey;
    if (keyChanged && formSettings.geminiApiKey) {
      setValidatingKey(true);
      const validation = await validateGeminiApiKey(formSettings.geminiApiKey);
      setValidatingKey(false);

      if (!validation.valid) {
        setApiKeyError(validation.error || 'Invalid API key');
        return;
      }
    }

    setSaving(true);
    try {
      await updateSettings(formSettings);

      // Reload listings if server changed
      if (formSettings.backendUrl !== settings.backendUrl) {
        await reloadListings();
      }

      setSuccessMessage('Settings saved successfully');
    } catch (error) {
      setApiKeyError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [formSettings, settings, updateSettings, reloadListings]);

  const refreshStats = useCallback(async () => {
    setRefreshing(true);
    const latestStats = await getGeminiStats();
    setStats(latestStats);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const hasApiKey = !!formSettings.geminiApiKey;

  return (
    <div className="flex-1 bg-gray-50 min-h-screen overflow-y-auto">
      {/* Header - Full Width */}
      <header className="bg-slate-900 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Car className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">MotorScope Settings</h1>
              <p className="text-slate-400 text-sm">Configure API keys and background sync</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Auth Button */}
            {isAuthLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                <span className="max-w-32 truncate">{auth.user?.email}</span>
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                <GoogleLogo className="w-4 h-4" />
                <span>Sign in</span>
              </button>
            )}
            <a
              href="index.html?view=dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Content - Centered */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <SuccessMessage message={successMessage} onDismiss={() => setSuccessMessage('')} />
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Backend Server - Only show when logged in */}
          {isLoggedIn && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Backend Server</label>
              <select
                value={formSettings.backendUrl}
                onChange={(e) => handleServerChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {BACKEND_SERVER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Server where your data is stored</p>
            </div>
          )}

          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Gemini API Key
              {!hasApiKey && <span className="text-red-500 ml-1">*</span>}
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
                  apiKeyError || !hasApiKey ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your Gemini API key"
              />
            </div>
            {apiKeyError ? (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {apiKeyError}
              </p>
            ) : !hasApiKey ? (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                API key is required for listing analysis
              </p>
            ) : null}
            <p className="text-xs text-slate-400 mt-1">
              Get your API key from{' '}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Auto-Refresh Interval</label>
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
                  <span>10 sec</span>
                  <span>1 month</span>
                </div>
              </div>
              <span className="w-20 text-sm font-medium text-slate-700 text-center bg-slate-100 px-2 py-1 rounded">
                {formatFrequency(formSettings.checkFrequencyMinutes)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">How often listings are automatically refreshed in the background</p>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving || validatingKey}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {(saving || validatingKey) && <Loader2 className="w-4 h-4 animate-spin" />}
            {validatingKey ? 'Validating...' : saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        {/* Background Sync Status */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              Background Sync
            </h2>
            <div className="flex items-center gap-2">
              {!hasApiKey ? (
                <a
                  href="index.html?view=settings"
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                >
                  <AlertCircle className="w-3 h-3" />
                  Configure API key
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerManualRefresh}
                  disabled={triggeringRefresh || refreshStatus.isRefreshing || !hasApiKey}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refreshStatus.isRefreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing {refreshStatus.currentIndex}/{refreshStatus.totalCount}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Sync Now
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
                <span className="text-xs font-medium uppercase">Last Sync</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {refreshStatus.lastRefreshTime
                  ? formatEuropeanDateTimeWithSeconds(refreshStatus.lastRefreshTime)
                  : 'Never'}
              </p>
              {refreshStatus.lastRefreshCount > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {refreshStatus.lastRefreshCount} listing{refreshStatus.lastRefreshCount !== 1 ? 's' : ''} updated
                </p>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <RefreshCw className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Next Sync</span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {refreshStatus.nextRefreshTime
                  ? formatEuropeanDateTimeWithSeconds(refreshStatus.nextRefreshTime)
                  : 'Not scheduled'}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Time Remaining</span>
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
                  Syncing ({refreshStatus.currentIndex}/{refreshStatus.totalCount})
                </>
              ) : (
                'Recent Activity'
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
              <p className="text-sm text-slate-400">No recent sync activity</p>
            )}
          </div>
        </section>

        {/* Gemini AI Stats */}
        <GeminiUsageSection stats={stats} refreshing={refreshing} onRefresh={refreshStats} onClearLogs={async () => {
          await clearGeminiLogs();
          const latestStats = await getGeminiStats();
          setStats(latestStats);
        }} />
      </div>
    </div>
  );
};

// Gemini Usage Section
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
          Gemini AI Analysis Stats
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400" title="All-time total">
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
              if (confirm('Clear all Gemini logs and reset session counts?')) {
                setClearing(true);
                await onClearLogs();
                setClearing(false);
              }
            }}
            disabled={clearing || stats.history.length === 0}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Clear logs"
          >
            <Trash2 className={`w-4 h-4 ${clearing ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter */}
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
            {f === 'all' ? 'All' : f === 'success' ? 'Success' : 'Errors'}
            <span className="ml-1 opacity-75">
              ({f === 'all' ? stats.history.length : stats.history.filter(e => e.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* History */}
      {filteredHistory.length === 0 ? (
        <p className="text-sm text-slate-400">No API calls recorded yet</p>
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
                  {expandedIds.has(`${entry.id}-prompt`) ? '▼' : '▶'} Prompt
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
                    {expandedIds.has(`${entry.id}-response`) ? '▼' : '▶'} Response
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

