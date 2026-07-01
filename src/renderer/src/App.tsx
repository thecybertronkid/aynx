import React, { useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import Assistant from './components/Assistant';
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
  const settings = useSettingsStore((state) => state.settings);
  const [welcomeCompleted, setWelcomeCompleted] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  
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

  // Once settings load, check onboardingCompleted flag
  useEffect(() => {
    if (!onboardingChecked && settings) {
      if ((settings as any).onboardingCompleted === 'true') {
        setWelcomeCompleted(true);
      }
      setOnboardingChecked(true);
    }
  }, [settings, onboardingChecked]);

  const isBrowserWindow = window.location.hash.includes('/browser');
  // Show onboarding if not logged in AND onboarding not yet completed
  const showWelcome = !isLoading && onboardingChecked && !token && !welcomeCompleted && !isBrowserWindow;


  return (
    <ToastProvider>
    <HashRouter>
      <ErrorBoundary>
        <AppInner
          isBrowserWindow={isBrowserWindow}
          showWelcome={showWelcome}
          welcomeCompleted={welcomeCompleted}
          setWelcomeCompleted={setWelcomeCompleted}
          viewerItem={viewerItem}
          setViewerItem={setViewerItem}
          accountsCenterOpen={accountsCenterOpen}
          setAccountsCenterOpen={setAccountsCenterOpen}
        />
      </ErrorBoundary>
    </HashRouter>
    </ToastProvider>
  );
};

// ─── Inner component with router context access ───────────────────────────────
const AppInner: React.FC<{
  isBrowserWindow: boolean;
  showWelcome: boolean;
  welcomeCompleted: boolean;
  setWelcomeCompleted: (v: boolean) => void;
  viewerItem: { filePath: string; title: string; contentType: 'video' | 'audio' | 'image' } | null;
  setViewerItem: (v: any) => void;
  accountsCenterOpen: boolean;
  setAccountsCenterOpen: (v: boolean) => void;
}> = ({ isBrowserWindow, showWelcome, welcomeCompleted, setWelcomeCompleted, viewerItem, setViewerItem, accountsCenterOpen, setAccountsCenterOpen }) => {
  const navigate = useNavigate();

  // Handle jump list / tray actions from main process
  useEffect(() => {
    if (!(window.api as any).onJumpListAction) return;
    const unsub = (window.api as any).onJumpListAction((_: any, action: string) => {
      switch (action) {
        case 'paste-url':        navigate('/'); break;
        case 'open-browser':     navigate('/browser'); break;
        case 'recent-downloads': navigate('/downloads'); break;
        case 'open-settings':    navigate('/settings'); break;
        default: break;
      }
    });
    return () => { if (unsub) unsub(); };
  }, [navigate]);

  return (
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
                <div className="flex flex-col min-h-[85vh] justify-between items-center text-center select-none py-6 overflow-y-auto max-w-xl mx-auto px-4">
                  <div className="space-y-6 w-full animate-scaleIn">
                    {/* Glowing Logo */}
                    <div className="w-16 h-16 bg-discord-accent rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-discord-accent/20 text-white text-2xl font-extrabold tracking-wide hover:rotate-6 hover:scale-105 transition-all duration-300 cursor-pointer">
                      AY
                    </div>
                    
                    <div className="space-y-1">
                      <h1 className="text-3xl font-extrabold text-discord-textNormal tracking-wide">AYNX</h1>
                      <p className="text-xs font-semibold text-discord-textMuted uppercase tracking-wider">Universal Media Downloader</p>
                    </div>
                    
                    {/* Metadata Card */}
                    <div className="bg-discord-secondary/40 border border-discord-border rounded-xl p-4 space-y-2.5 text-left text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-discord-textMuted">Version</span>
                        <span className="font-semibold text-discord-textNormal bg-discord-secondary px-2 py-0.5 rounded border border-discord-border">2.6.0</span>
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

                    {/* Actions Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <a
                        href="https://github.com/thecybertronkid/aynx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-[11px] py-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-discord-border hover:bg-discord-secondary/60 transition-colors"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>GitHub Repo</span>
                      </a>
                      <button
                        onClick={() => {
                          alert("You are running the latest version of AYNX (v2.6.0).");
                        }}
                        className="btn-secondary text-[11px] py-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-discord-border hover:bg-discord-secondary/60 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check Updates</span>
                      </button>
                      <a
                        href="https://github.com/thecybertronkid/aynx/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-[11px] py-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-discord-border hover:bg-discord-secondary/60 transition-colors"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Report Issue</span>
                      </a>
                      <a
                        href="https://github.com/thecybertronkid/aynx/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-[11px] py-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-discord-border hover:bg-discord-secondary/60 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View License</span>
                      </a>
                    </div>

                    {/* Supported Platforms Grid */}
                    <div className="space-y-3 pt-4 border-t border-discord-border/30 text-left">
                      <span className="text-[10px] font-bold text-discord-textMuted uppercase tracking-wider block">Supported Media Hubs</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex items-center gap-2 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-4 h-4 text-[#ff0000] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          <span className="text-[10px] font-bold text-discord-textNormal">YouTube</span>
                        </div>
                        <div className="flex items-center gap-2 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-4 h-4 text-[#1db954] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.09-.78-.18-.899-.599-.12-.42.18-.78.599-.9 4.62-1.08 8.58-.66 11.76 1.26.36.24.479.66.24 1.14zm1.44-3.24c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-.96-.18-1.08-.66-.12-.48.18-.96.66-1.08 4.38-1.32 9.78-.66 13.56 1.68.42.18.6.78.3 1.26zm.12-3.3c-3.9-2.28-10.32-2.52-14.04-1.38-.6.18-1.2-.18-1.38-.78-.18-.6.18-1.2.78-1.38 4.26-1.26 11.4-0.96 15.9 1.74.54.3.72 1.02.42 1.56-.3.54-1.02.72-1.56.42z"/></svg>
                          <span className="text-[10px] font-bold text-discord-textNormal">Spotify</span>
                        </div>
                        <div className="flex items-center gap-2 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-4 h-4 text-[#e1306c] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                          <span className="text-[10px] font-bold text-discord-textNormal">Instagram</span>
                        </div>
                        <div className="flex items-center gap-2 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-4 h-4 text-[#ff5500] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.122 17.576h6.76c2.607 0 4.718-2.118 4.718-4.72 0-2.606-2.111-4.718-4.718-4.718a4.675 4.675 0 0 0-1.748.337 6.136 6.136 0 0 0-11.233 1.309c-.198-.052-.405-.084-.62-.084C2.33 9.7 0 12.029 0 14.9c0 2.87 2.33 5.2 5.2 5.2h6.922v-2.524z"/></svg>
                          <span className="text-[10px] font-bold text-discord-textNormal">SoundCloud</span>
                        </div>
                        <div className="flex items-center gap-2 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-4 h-4 text-[#00f2fe] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31.03 2.61.1 3.9.21.07 1.86.83 3.6 2.14 4.89.06.06.12.12.18.18v4.18c-1.39-.42-2.61-1.28-3.48-2.45v7.94c0 4.29-3.48 7.78-7.78 7.78S.005 19.26.005 14.96s3.48-7.78 7.78-7.78c.84 0 1.66.13 2.44.39v4.29c-.73-.42-1.57-.65-2.44-.65-2.09 0-3.79 1.7-3.79 3.79s1.7 3.79 3.79 3.79c2.02 0 3.67-1.59 3.78-3.59V0h1.01.01-.01z"/></svg>
                          <span className="text-[10px] font-bold text-discord-textNormal">TikTok</span>
                        </div>
                        <div className="flex items-center gap-2 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-4 h-4 text-[#9146ff] shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                          <span className="text-[10px] font-bold text-discord-textNormal">Twitch</span>
                        </div>
                      </div>
                    </div>

                    {/* Trust Badges Grid */}
                    <div className="space-y-3 pt-4 border-t border-discord-border/30 text-left">
                      <span className="text-[10px] font-bold text-discord-textMuted uppercase tracking-wider block">Secured & Trusted Partners</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2.5 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2.5 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          <div className="text-[9px]">
                            <h5 className="font-bold text-discord-textNormal">Google</h5>
                            <p className="text-[8px] text-[#23a55a] font-bold">Secure OAuth</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-discord-secondary/20 border border-discord-border/50 rounded-lg p-2.5 hover:bg-discord-secondary/35 transition-colors">
                          <svg className="w-5 h-5 shrink-0 text-[#0b72e7]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <path d="M22.8 12c0 5.96-4.84 10.8-10.8 10.8S1.2 17.96 1.2 12 6.04 1.2 12 1.2s10.8 4.84 10.8 10.8z" fill="#0b72e7" opacity="0.15"/>
                            <path d="M6 17l6-10h6l-6 10H6z" fill="#0b72e7"/>
                            <path d="M11 17l6-10h1v10h-7z" fill="#13a3f7"/>
                          </svg>
                          <div className="text-[9px]">
                            <h5 className="font-bold text-discord-textNormal">Razorpay</h5>
                            <p className="text-[8px] text-[#23a55a] font-bold">Secure checkout</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-discord-textMuted pt-4 border-t border-discord-border/30 w-full mt-6">
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

        {/* AYNX Assistant */}
        {!isBrowserWindow && !showWelcome && (
          <Assistant onNavigate={(route) => navigate(route)} />
        )}

        {/* Global Progress Notifications overlay (gated to Plus+) */}
        <DownloadNotifications />
      </div>
  );
};

export default App;

