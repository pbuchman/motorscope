import React, { useEffect, useState } from 'react';
import { ExtensionSettings, GeminiStats } from '../types';
import { DEFAULT_SETTINGS, getGeminiStats, getSettings, saveSettings } from '../services/settingsService';
import { RefreshCw } from 'lucide-react';

// Frequency steps from 5 mins to 1 month (in minutes)
const FREQUENCY_STEPS = [
  5, 10, 15, 30, 45,           // minutes
  60, 120, 180, 240, 360, 480, 720,  // hours (1h to 12h)
  1440, 2880, 4320,            // days (1d, 2d, 3d)
  10080, 20160,                // weeks (1w, 2w)
  43200                        // ~1 month (30 days)
];

const formatFrequency = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60} hour${minutes / 60 > 1 ? 's' : ''}`;
  if (minutes < 10080) return `${minutes / 1440} day${minutes / 1440 > 1 ? 's' : ''}`;
  if (minutes < 43200) return `${minutes / 10080} week${minutes / 10080 > 1 ? 's' : ''}`;
  return '1 month';
};

const formatEuropeanDateTime = (timestamp: string | number): string => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<GeminiStats>({ totalCalls: 0, history: [] });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const loadedSettings = await getSettings();
      const loadedStats = await getGeminiStats();
      setSettings(loadedSettings);
      setStats(loadedStats);
    };
    load();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatusMessage('');

    try {
      await saveSettings(settings);
      setStatusMessage('Settings saved successfully.');
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
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">MotoTracker Settings</h1>
        <p className="text-slate-500">Configure your Gemini API key and background verification cadence.</p>
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
            <span>5 min</span>
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
                <p className="text-xs text-slate-400">{formatEuropeanDateTime(entry.timestamp)}</p>
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
