import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ExtensionPopup from './components/ExtensionPopup';
import { ViewMode } from './types';
import { Laptop, Smartphone, Monitor } from 'lucide-react';

// Declare chrome to avoid TS errors
declare const chrome: any;

const App: React.FC = () => {
  // ROUTING LOGIC:
  // Check if we are running as a real extension via URL params (defined in manifest.json)
  // or if we are in the Dev Simulator.
  const queryParams = new URLSearchParams(window.location.search);
  const requestedView = queryParams.get('view');
  
  // Real Extension Mode: Dashboard
  if (requestedView === 'dashboard') {
    return (
      <div className="w-full min-h-screen bg-gray-50">
        <Dashboard onAddClick={() => {}} /> 
        {/* Note: In real options page, 'Add' might open a new tab or focus the omnibox */}
      </div>
    );
  }

  // Real Extension Mode: Popup
  if (requestedView === 'popup') {
    // In a real extension, we query the active tab to get the URL
    const [realUrl, setRealUrl] = useState<string>('');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      // Check if chrome API is available (Real Extension)
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
          if (tabs[0]?.url) {
            setRealUrl(tabs[0].url);
          }
          setIsLoaded(true);
        });
      } else {
        // Fallback if testing ?view=popup in a normal browser window
        setRealUrl(window.location.href);
        setIsLoaded(true);
      }
    }, []);

    if (!isLoaded) return <div className="p-4 text-xs">Loading context...</div>;

    return (
      <div className="w-[400px] min-h-[500px] bg-white">
        <ExtensionPopup 
          currentUrl={realUrl} 
          onNavigateToDashboard={() => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              chrome.runtime.openOptionsPage();
            } else {
              window.open('/?view=dashboard', '_blank');
            }
          }} 
        />
      </div>
    );
  }

  // --- DEV SIMULATOR MODE (Default) ---
  return <SimulatorApp />;
};

// The Simulator Logic moved to a sub-component to keep the main App clean
const SimulatorApp: React.FC = () => {
  const [activeUrl, setActiveUrl] = useState<string>('https://www.otomoto.pl/osobowe/oferta/ford-mustang-gt-5-0-v8-ID6HMj4X.html');
  const [urlInput, setUrlInput] = useState(activeUrl);
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveUrl(urlInput);
    setViewMode('POPUP');
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden">
      
      {/* Simulator Sidebar / Controls */}
      <aside className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col text-slate-300 z-10 shadow-2xl">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Monitor className="text-blue-400"/> Dev Simulator
          </h2>
          <p className="text-xs text-slate-400">
            Simulates the Browser Extension environment.
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Browser Address Bar (Active Tab)
            </label>
            <form onSubmit={handleUrlSubmit}>
              <div className="flex flex-col gap-2">
                 <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                  placeholder="https://..."
                />
                <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-xs py-1 px-3 rounded text-white transition-colors">
                  Go / Visit
                </button>
              </div>
            </form>
            <div className="mt-2 flex gap-2 flex-wrap">
              <button 
                onClick={() => {
                  const url = "https://www.otomoto.pl/oferta/bmw-m3-competition-ID6XYZ.html";
                  setUrlInput(url);
                  setActiveUrl(url);
                  setViewMode('POPUP');
                }}
                className="text-[10px] bg-slate-800 px-2 py-1 rounded hover:text-white"
              >
                Preset: BMW M3
              </button>
              <button 
                onClick={() => {
                  const url = "https://www.otomoto.pl/oferta/toyota-yaris-hybrid-ID9ABC.html";
                  setUrlInput(url);
                  setActiveUrl(url);
                  setViewMode('POPUP');
                }}
                className="text-[10px] bg-slate-800 px-2 py-1 rounded hover:text-white"
              >
                Preset: Toyota Yaris
              </button>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Extension View Context
            </label>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setViewMode('DASHBOARD')}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${viewMode === 'DASHBOARD' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
              >
                <Laptop className="w-5 h-5" />
                <div className="text-left">
                  <span className="block text-sm font-bold">Dashboard</span>
                  <span className="block text-[10px] opacity-70">Main extension page (full width)</span>
                </div>
              </button>
              
              <button 
                onClick={() => setViewMode('POPUP')}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${viewMode === 'POPUP' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
              >
                <Smartphone className="w-5 h-5" />
                <div className="text-left">
                  <span className="block text-sm font-bold">Popup Action</span>
                  <span className="block text-[10px] opacity-70">Small dropdown (400x600)</span>
                </div>
              </button>
            </div>
          </div>
          
          <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded text-amber-200 text-xs">
            <strong>Note:</strong> Since we cannot execute actual scraping in this demo environment, Gemini AI simulates the data extraction based on the URL you provide in the simulator address bar.
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 relative bg-gray-200 flex items-center justify-center overflow-hidden">
        
        {viewMode === 'DASHBOARD' && (
          <div className="w-full h-full bg-white overflow-y-auto">
             <Dashboard onAddClick={() => setViewMode('POPUP')} />
          </div>
        )}

        {viewMode === 'POPUP' && (
          <div className="relative">
             <div className="absolute -top-12 left-0 text-slate-500 text-xs font-bold uppercase tracking-wider">
               Browser Extension Popup (Simulated)
             </div>
             <div className="w-[400px] h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-slate-800 ring-4 ring-black/20">
               <ExtensionPopup 
                 currentUrl={activeUrl} 
                 onNavigateToDashboard={() => setViewMode('DASHBOARD')}
               />
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;