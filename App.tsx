import React from 'react';
import Dashboard from './components/Dashboard';
import ExtensionPopup from './components/ExtensionPopup';
import SettingsPage from './components/SettingsPage';

const App: React.FC = () => {
  // Check URL params to determine which view to show
  // manifest.json defines: 
  // action.default_popup = index.html?view=popup
  // options_page = index.html?view=dashboard
  const queryParams = new URLSearchParams(window.location.search);
  const requestedView = queryParams.get('view');
  
  // Default to Dashboard if no param (e.g. opening index.html directly)
  // or specifically requested
  if (requestedView === 'dashboard' || (!requestedView && window.location.pathname.includes('options'))) {
    return (
      <div className="w-full min-h-screen bg-gray-50">
        <Dashboard /> 
      </div>
    );
  }

  if (requestedView === 'popup') {
    return (
      <div className="w-[400px] min-h-[500px] bg-white">
        <ExtensionPopup />
      </div>
    );
  }

  if (requestedView === 'settings') {
    return (
      <div className="w-full min-h-screen bg-gray-50">
        <SettingsPage />
      </div>
    );
  }

  return <div>Unknown View</div>;
};

export default App;