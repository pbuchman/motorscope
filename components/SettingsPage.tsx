import React, { useEffect, useState } from 'react';
import { ExtensionSettings, GeminiStats } from '../types';
import { DEFAULT_SETTINGS, getGeminiStats, getSettings, saveSettings } from '../services/settingsService';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<GeminiStats>({ totalCalls: 0, history: [] });
  const [saving, setSaving] = useState(false);
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
    const latestStats = await getGeminiStats();
    setStats(latestStats);
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Check Frequency (minutes)</label>
          <input
            type="number"
            min={15}
            max={1440}
            value={settings.checkFrequencyMinutes}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, checkFrequencyMinutes: parseInt(e.target.value, 10) || DEFAULT_SETTINGS.checkFrequencyMinutes }))
            }
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
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
              className="text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
        {stats.history.length === 0 ? (
          <p className="text-sm text-slate-500">No Gemini calls recorded yet.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {stats.history.map((entry) => (
              <article key={entry.id} className="border border-gray-100 rounded-lg p-4">
                <p className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}</p>
                <p className="text-sm font-medium text-slate-800 truncate">{entry.url}</p>
                <pre className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {entry.promptPreview}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
