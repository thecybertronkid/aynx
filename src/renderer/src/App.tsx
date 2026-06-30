import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import QueueManager from './components/QueueManager';
import MediaLibrary from './components/MediaLibrary';
import Settings from './components/Settings';
import Platforms from './components/Platforms';
import MediaViewer from './components/MediaViewer';
import PageWrapper from './components/PageWrapper';
import AccountsCenter from './components/AccountsCenter';
import Browser from './components/Browser';
import Scheduler from './components/Scheduler';
import { useSettingsStore } from './store/settingsStore';
import { useDownloadStore } from './store/downloadStore';
import { useAuthStore } from './store/authStore';
import Welcome from './components/Welcome';
import { ToastProvider } from './components/UpgradeToast';
import { DownloadNotifications } from './components/DownloadNotifications';
import ErrorBoundary from './components/ErrorBoundary';

import { Github, RefreshCw, AlertCircle, FileText } from 'lucide-react';

const App: React.FC = () => {
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const fetchDownloads = useDownloadStore((state) => state.fetchDownloads);
  const fetchActiveDownloads = useDownloadStore((state) => state.fetchActiveDownloads);
  
  // Auth Store
  const { user, token, isLoading, initialize } = useAuthStore();
  const [welcomeCompleted, setWelcomeCompleted] = useState(false);
  
  // Media Viewer state
  const [viewerItem, setViewerItem] = useState<{
    filePath: string;
    title: string;
    contentType: 'video' | 'audio' | 'image';
  } | null>(null);

  // Accounts Center State
  const [accountsCenterOpen, setAccountsCenterOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchDownloads();
    initialize(); // Initialise Auth
    
    // Poll active downloads progress every 2 seconds
    const interval = setInterval(() => {
      fetchActiveDownloads();
    }, 2000);

    // Listen to real-time online updates from backend (plan status changes)
    let unsubscribeSettings: (() => void) | undefined;
    if ((window.api as any).onSettingsUpdated) {
      unsubscribeSettings = (window.api as any).onSettingsUpdated(() => {
        console.log('[React App] Received settings change notification from backend. Reloading...');
        fetchSettings();
      });
    }

    return () => {
      clearInterval(interval);
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, []);

  const isBrowserWindow = window.location.hash.includes('/browser');
  const showWelcome = !isLoading && !token && !welcomeCompleted && !isBrowserWindow;


  return (
    <ToastProvider>
    <HashRouter>
      <ErrorBoundary>
        <div className="flex h-screen w-screen overflow-hidden bg-discord-tertiary font-sans antialiased text-discord-textNormal">
          {/* Sidebar */}
          {!isBrowserWindow && <Sidebar onOpenAccountsCenter={() => setAccountsCenterOpen(true)} />}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-discord-primary relative">
          <Routes>
            <Route path="/browser" element={<Browser />} />
            <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="/downloads" element={<PageWrapper><MediaLibrary onPlay={(item) => setViewerItem(item)} /></PageWrapper>} />
            <Route path="/queue" element={<PageWrapper><QueueManager /></PageWrapper>} />
            <Route path="/scheduler" element={<PageWrapper><Scheduler /></PageWrapper>} />
            <Route path="/favorites" element={<PageWrapper><MediaLibrary favoriteOnly={true} onPlay={(item) => setViewerItem(item)} /></PageWrapper>} />
            <Route path="/platforms" element={<PageWrapper><Platforms /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
            <Route path="/about" element={
              <PageWrapper>
                <div className="flex flex-col min-h-[80vh] justify-between items-center text-center select-none py-4">
                  <div className="my-auto space-y-6 max-w-md w-full animate-scaleIn">
                    <div className="w-16 h-16 bg-discord-accent rounded-2xl mx-auto flex items-center justify-center shadow-lg text-white text-2xl font-extrabold tracking-wide hover:rotate-6 transition-transform duration-300">
                      AY
                    </div>
                    <div className="space-y-1">
                      <h1 className="text-3xl font-extrabold text-discord-textNormal tracking-wide">AYNX</h1>
                      <p className="text-xs font-semibold text-discord-textMuted uppercase tracking-wider">Universal Media Downloader</p>
                    </div>
                    
                    <div className="bg-discord-secondary/40 border border-discord-border rounded-xl p-4 space-y-2.5 text-left text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-discord-textMuted">Version</span>
                        <span className="font-semibold text-discord-textNormal bg-discord-secondary px-2 py-0.5 rounded border border-discord-border">2.5.1</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-discord-textMuted">Created & Maintained by</span>
                        <span className="font-semibold text-discord-textNormal">Ayan Kashyap</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-discord-textMuted">Project Type</span>
                        <span className="font-semibold text-discord-textNormal">Open Source Project</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-discord-textMuted">License</span>
                        <span className="font-semibold text-discord-textNormal">MIT License</span>
                      </div>
                    </div>

                    {/* Buttons Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <a
                        href="https://github.com/ayankashyap/aynx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-[11px] py-2"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>GitHub Repo</span>
                      </a>
                      <button
                        onClick={() => {
                          alert("You are running the latest version of AYNX (v2.3.1).");
                        }}
                        className="btn-secondary text-[11px] py-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check Updates</span>
                      </button>
                      <a
                        href="https://github.com/ayankashyap/aynx/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-[11px] py-2"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Report Issue</span>
                      </a>
                      <a
                        href="https://github.com/ayankashyap/aynx/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-[11px] py-2"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View License</span>
                      </a>
                    </div>
                  </div>

                  <div className="text-[10px] text-discord-textMuted/40 border-t border-discord-border w-full pt-4 mt-8">
                    Open Source Project. Created by Ayan Kashyap. © 2026 AYNX.
                  </div>
                </div>
              </PageWrapper>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Global Premium Media Viewer Overlay */}
        {viewerItem && (
          <MediaViewer
            filePath={viewerItem.filePath}
            title={viewerItem.title}
            contentType={viewerItem.contentType}
            onClose={() => setViewerItem(null)}
          />
        )}

        {/* Accounts Center Modal Overlay */}
        {accountsCenterOpen && (
          <AccountsCenter onClose={() => setAccountsCenterOpen(false)} />
        )}

        {/* Welcome Onboarding Screen Overlay */}
        {showWelcome && (
          <Welcome onComplete={() => setWelcomeCompleted(true)} />
        )}

        {/* Global Progress Notifications overlay (gated to Plus+) */}
        <DownloadNotifications />
      </div>
      </ErrorBoundary>
    </HashRouter>
    </ToastProvider>
  );
};

export default App;

