import React, { Suspense, lazy, useMemo } from 'react';
import { AuthProvider } from '@/auth/AuthContext';
import { AppProvider } from '@/context/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Initialize i18n
import '@/i18n';

// Lazy load views for better code splitting
const Dashboard = lazy(() => import('@/components/Dashboard'));
const ExtensionPopup = lazy(() => import('@/components/ExtensionPopup'));
const SettingsPage = lazy(() => import('@/components/SettingsPage'));

type AppView = 'dashboard' | 'popup' | 'settings';

/**
 * Parse the current view from URL parameters
 */
const getViewFromUrl = (): AppView => {
  const queryParams = new URLSearchParams(window.location.search);
  const requestedView = queryParams.get('view');
  
  if (requestedView === 'popup') return 'popup';
  if (requestedView === 'settings') return 'settings';
  if (requestedView === 'dashboard') return 'dashboard';

  // Default to dashboard if no param or opening options page
  if (window.location.pathname.includes('options')) return 'dashboard';

  return 'dashboard';
};


/**
 * View container with appropriate styling based on view type
 */
const ViewContainer: React.FC<{ view: AppView; children: React.ReactNode }> = ({ view, children }) => {
  const containerClass = useMemo(() => {
    switch (view) {
      case 'popup':
        return 'w-[400px] min-h-[500px] bg-white';
      case 'settings':
      case 'dashboard':
      default:
        return 'w-full min-h-screen bg-gray-50';
    }
  }, [view]);

  return <div className={containerClass}>{children}</div>;
};

/**
 * Route to the appropriate view component
 */
const ViewRouter: React.FC<{ view: AppView }> = ({ view }) => {
  switch (view) {
    case 'popup':
      return <ExtensionPopup />;
    case 'settings':
      return <SettingsPage />;
    case 'dashboard':
    default:
      return <Dashboard />;
  }
};

/**
 * Main Application Component
 *
 * Architecture:
 * - AuthProvider wraps everything for authentication state
 * - AppProvider provides global app state management
 * - ErrorBoundary catches and displays errors gracefully
 * - Suspense handles lazy loading with fallback UI
 * - ViewRouter determines which view to render based on URL params
 */
const App: React.FC = () => {
  const currentView = useMemo(() => getViewFromUrl(), []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <ViewContainer view={currentView}>
            <Suspense fallback={<LoadingSpinner className="h-full min-h-[200px] p-8" />}>
              <ViewRouter view={currentView} />
            </Suspense>
          </ViewContainer>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;