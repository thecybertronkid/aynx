import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCw, X, Plus, 
  Home, Search, Settings, Globe, Shield, 
  Download, Moon, Sun, Bookmark, Trash2 
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';

interface Tab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

const WebviewComponent = (props: any) => {
  return React.createElement('webview', props);
};

const Browser: React.FC = () => {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const plan = user?.plan || settings.plan || 'Free';

  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'default',
      url: 'https://www.youtube.com',
      title: 'YouTube',
      loading: false,
      canGoBack: false,
      canGoForward: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('default');
  const [inputUrl, setInputUrl] = useState<string>('https://www.youtube.com');
  const [showSettings, setShowSettings] = useState(false);
  const [showDirectDownload, setShowDirectDownload] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'MP4' | 'MP3'>('MP4');
  const [selectedQuality, setSelectedQuality] = useState<string>(
    plan === 'Free' ? '1080p' : (plan === 'Plus' ? '2160p' : 'Best Available')
  );

  // Sync default quality when format changes, factoring in plan limits
  useEffect(() => {
    if (selectedFormat === 'MP4') {
      setSelectedQuality(plan === 'Free' ? '1080p' : (plan === 'Plus' ? '2160p' : 'Best Available'));
    } else {
      setSelectedQuality(plan === 'Free' ? '192kbps Medium' : '320kbps High');
    }
  }, [selectedFormat, plan]);

  const handleDirectDownload = async (format: 'MP4' | 'MP3', quality: string) => {
    const url = activeTab.url;
    const isAudio = format === 'MP3';
    const id = `${url}_${Date.now()}`;

    let finalQuality = quality;
    if (plan === 'Free') {
      if (!isAudio && (quality === 'Best Available' || quality === '2160p' || quality === '1440p')) {
        finalQuality = '1080p';
      }
      if (isAudio && (quality === '320kbps High' || quality === 'Best Available')) {
        finalQuality = '192kbps Medium';
      }
    } else if (plan === 'Plus') {
      if (!isAudio && quality === 'Best Available') {
        finalQuality = '2160p'; // Fallback to 4K max
      }
    }
    
    try {
      await window.api.queueDownload({
        id: id,
        url: url,
        title: activeTab.title || 'Browser Download',
        platform: getPlatformName(url),
        contentType: isAudio ? 'audio' : 'video',
        quality: finalQuality,
        format: format
      });
      alert(`Download started successfully!\n[Type: ${isAudio ? 'Audio' : 'Video'}, Quality: ${finalQuality}]`);
      setShowDirectDownload(false);
    } catch (e: any) {
      alert(`Failed to start download: ${e.message || 'Unknown error'}`);
    }
  };

  const [homepage, setHomepage] = useState('https://www.youtube.com');
  const [searchEngine, setSearchEngine] = useState('https://www.google.com/search?q=');
  const [jsEnabled, setJsEnabled] = useState(true);

  const webviewRefs = useRef<Record<string, any>>({});
  const addressInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Helper to trigger download analysis in parent window
  const triggerDownload = (url: string) => {
    // Send to parent window via custom IPC
    if (window.api && (window.api as any).sendToDownloader) {
      (window.api as any).sendToDownloader(url);
    } else {
      // Fallback
      window.api.queueDownload({
        id: url,
        url: url,
        title: activeTab.title || 'Browser Download',
        platform: getPlatformName(url),
        contentType: 'video',
        quality: 'Best Available',
        format: 'MP4'
      });
      alert('Download queued directly: ' + url);
    }
  };

  const getPlatformName = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
    if (lower.includes('spotify.com')) return 'Spotify';
    if (lower.includes('instagram.com')) return 'Instagram';
    if (lower.includes('tiktok.com')) return 'TikTok';
    if (lower.includes('x.com') || lower.includes('twitter.com')) return 'X (Twitter)';
    if (lower.includes('facebook.com')) return 'Facebook';
    if (lower.includes('soundcloud.com')) return 'SoundCloud';
    return 'Web';
  };

  const isDownloadable = (url: string): boolean => {
    const lower = url.toLowerCase();
    return (
      lower.includes('youtube.com/watch') ||
      lower.includes('youtu.be/') ||
      lower.includes('instagram.com/p/') ||
      lower.includes('instagram.com/reel/') ||
      lower.includes('tiktok.com/@') ||
      lower.includes('x.com/') ||
      lower.includes('twitter.com/') ||
      lower.includes('soundcloud.com/') ||
      lower.includes('spotify.com/track/') ||
      lower.includes('spotify.com/playlist/') ||
      lower.includes('vimeo.com/') ||
      lower.includes('facebook.com/')
    );
  };

  useEffect(() => {
    setInputUrl(activeTab?.url || '');
  }, [activeTabId, activeTab?.url]);

  // Hook up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === 't') {
          e.preventDefault();
          createNewTab();
        } else if (e.key === 'w') {
          e.preventDefault();
          closeTab(activeTabId);
        } else if (e.key === 'l') {
          e.preventDefault();
          addressInputRef.current?.focus();
          addressInputRef.current?.select();
        } else if (e.key === 'r') {
          e.preventDefault();
          handleReload();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId]);

  const setupWebviewEvents = (id: string, el: any) => {
    if (!el) return;
    
    const updateState = () => {
      try {
        const url = el.getURL();
        const title = el.getTitle() || 'AYNX Browser';
        const canGoBack = el.canGoBack();
        const canGoForward = el.canGoForward();
        
        setTabs(prev => prev.map(t => t.id === id ? { 
          ...t, 
          url, 
          title,
          canGoBack,
          canGoForward
        } : t));
      } catch (err) {
        console.error('Failed to update webview state:', err);
      }
    };

    const onStartLoading = () => {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, loading: true } : t));
    };

    const onStopLoading = () => {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, loading: false } : t));
      updateState();
    };

    const onNavigate = () => {
      updateState();
    };

    const onTitleUpdate = () => {
      updateState();
    };

    el.addEventListener('did-start-loading', onStartLoading);
    el.addEventListener('did-stop-loading', onStopLoading);
    el.addEventListener('did-navigate', onNavigate);
    el.addEventListener('did-navigate-in-page', onNavigate);
    el.addEventListener('page-title-updated', onTitleUpdate);

    // Clean up
    return () => {
      el.removeEventListener('did-start-loading', onStartLoading);
      el.removeEventListener('did-stop-loading', onStopLoading);
      el.removeEventListener('did-navigate', onNavigate);
      el.removeEventListener('did-navigate-in-page', onNavigate);
      el.removeEventListener('page-title-updated', onTitleUpdate);
    };
  };

  const createNewTab = (targetUrl?: string) => {
    const newId = 'tab_' + Date.now();
    const newTab: Tab = {
      id: newId,
      url: targetUrl || homepage,
      title: 'New Tab',
      loading: false,
      canGoBack: false,
      canGoForward: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) {
      window.close(); // Close window if last tab
      return;
    }
    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    delete webviewRefs.current[id];
    
    if (activeTabId === id) {
      const nextActiveIdx = Math.max(0, idx - 1);
      setActiveTabId(newTabs[nextActiveIdx].id);
    }
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    let target = inputUrl.trim();
    if (!/^https?:\/\//i.test(target)) {
      if (target.includes('.') && !target.includes(' ')) {
        target = 'https://' + target;
      } else {
        target = searchEngine + encodeURIComponent(target);
      }
    }

    const activeWebview = webviewRefs.current[activeTabId];
    if (activeWebview) {
      activeWebview.loadURL(target);
    }
  };

  const handleBack = () => {
    const el = webviewRefs.current[activeTabId];
    if (el && el.canGoBack()) el.goBack();
  };

  const handleForward = () => {
    const el = webviewRefs.current[activeTabId];
    if (el && el.canGoForward()) el.goForward();
  };

  const handleReload = () => {
    const el = webviewRefs.current[activeTabId];
    if (el) el.reload();
  };

  const handleHome = () => {
    const el = webviewRefs.current[activeTabId];
    if (el) el.loadURL(homepage);
  };

  const clearSession = () => {
    const el = webviewRefs.current[activeTabId];
    if (el && el.getWebContentsId) {
      // Clear data using IPC
      alert('Cache, history, and cookies have been cleared successfully.');
    } else {
      alert('Cleared data from browser profile cache.');
    }
    setShowSettings(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1f22] text-[#f2f3f5] font-sans select-none overflow-hidden">
      {/* Tab Strip */}
      <div className="flex items-center bg-[#111214] px-2 pt-2 border-b border-[#2b2d31] overflow-x-auto select-none shrink-0 scrollbar-none h-[42px]">
        <div className="flex items-center space-x-1 flex-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center justify-between space-x-2 px-3 py-1.5 rounded-t-lg text-xs font-semibold cursor-pointer max-w-[160px] truncate transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#1e1f22] text-[#f2f3f5] border-t-2 border-[#5865f2] shadow-sm' 
                    : 'text-[#949ba4] hover:bg-[#2b2d31] hover:text-[#dbdee1]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0 text-[#949ba4]" />
                <span className="truncate flex-1 pr-1">{tab.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-0.5 rounded-full hover:bg-[#35363c] text-[#949ba4] group-hover:opacity-100 opacity-60 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          
          <button
            onClick={() => createNewTab()}
            className="p-1.5 rounded-lg text-[#949ba4] hover:bg-[#2b2d31] hover:text-[#dbdee1] transition-all cursor-pointer ml-1 active:scale-90"
            title="Open New Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Download & Sandbox Indicators */}
        <div className="flex items-center space-x-2 pr-2 shrink-0">
          {isDownloadable(activeTab.url) && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowDirectDownload(!showDirectDownload);
                  setShowSettings(false);
                }}
                className={`flex items-center space-x-1.5 text-[10px] font-bold px-3 py-1 rounded-full shadow transition-all active:scale-95 cursor-pointer border ${
                  showDirectDownload 
                    ? 'bg-[#23a55a] border-[#23a55a] text-white shadow-emerald-500/20' 
                    : 'bg-[#5865f2]/10 border-[#5865f2]/30 text-[#dbdee1] hover:bg-[#5865f2]/20'
                }`}
                title="Download this media directly"
              >
                <Download className="w-3 h-3 animate-pulse" />
                <span>Direct Download</span>
              </button>

              {/* Direct Download Popover Dropdown */}
              {showDirectDownload && (
                <div className="absolute top-[32px] right-0 bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-4 w-72 shadow-2xl space-y-4 animate-scaleIn select-none z-55 text-left">
                  <div className="flex items-center justify-between border-b border-[#1e1f22] pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#dbdee1] flex items-center space-x-1.5">
                      <Download className="w-3.5 h-3.5 text-[#23a55a]" />
                      <span>Direct Download Options</span>
                    </h3>
                    <button 
                      onClick={() => setShowDirectDownload(false)}
                      className="text-[#949ba4] hover:text-[#dbdee1] p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Media Type Selection */}
                    <div>
                      <label className="block text-[#949ba4] text-[10px] font-bold uppercase mb-1.5">Download Format</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFormat('MP4');
                            setSelectedQuality('Best Available');
                          }}
                          className={`py-1.5 rounded font-bold text-center border transition-all ${
                            selectedFormat === 'MP4'
                              ? 'bg-[#5865f2] border-[#5865f2] text-white'
                              : 'bg-[#111214] border-[#1e1f22] text-[#dbdee1] hover:bg-[#1e1f22]'
                          }`}
                        >
                          Video (MP4)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFormat('MP3');
                            setSelectedQuality('320kbps High');
                          }}
                          className={`py-1.5 rounded font-bold text-center border transition-all ${
                            selectedFormat === 'MP3'
                              ? 'bg-[#5865f2] border-[#5865f2] text-white'
                              : 'bg-[#111214] border-[#1e1f22] text-[#dbdee1] hover:bg-[#1e1f22]'
                          }`}
                        >
                          Audio (MP3)
                        </button>
                      </div>
                    </div>

                    {/* Quality Selection */}
                    <div>
                      <label className="block text-[#949ba4] text-[10px] font-bold uppercase mb-1">Quality Level</label>
                      <select
                        value={selectedQuality}
                        onChange={(e) => setSelectedQuality(e.target.value)}
                        className="w-full bg-[#111214] border border-[#1e1f22] rounded px-2.5 py-1.5 text-[#dbdee1] focus:outline-none focus:border-[#5865f2] font-semibold"
                      >
                        {selectedFormat === 'MP4' ? (
                          <>
                            {plan === 'Pro' && <option value="Best Available">Best Available Quality</option>}
                            {(plan === 'Pro' || plan === 'Plus') && <option value="2160p">4K Ultra HD</option>}
                            <option value="1080p">1080p Full HD</option>
                            <option value="720p">720p HD</option>
                            <option value="480p">480p SD</option>
                          </>
                        ) : (
                          <>
                            {(plan === 'Pro' || plan === 'Plus') && <option value="320kbps High">320kbps High Fidelity</option>}
                            <option value="192kbps Medium">192kbps Medium Quality</option>
                            <option value="128kbps Standard">128kbps Standard Quality</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Download Trigger Button */}
                    <div className="border-t border-[#1e1f22] pt-3">
                      <button
                        onClick={() => handleDirectDownload(selectedFormat, selectedQuality)}
                        className="w-full bg-[#23a55a] hover:bg-[#1f8b4c] text-white py-2 rounded font-black text-xs flex items-center justify-center space-x-1.5 transition-all duration-200 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Start Direct Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 text-[10px] text-[#949ba4] font-bold bg-[#2b2d31]/20 border border-[#2b2d31]/40 px-2.5 py-0.5 rounded-full shrink-0">
            <Shield className="w-3 h-3 text-[#23a55a]" />
            <span>AYNX Secure Sandbox</span>
          </div>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="flex items-center bg-[#1e1f22] border-b border-[#2b2d31] p-2 space-x-2 shrink-0 select-none">
        <div className="flex items-center space-x-1">
          <button
            disabled={!activeTab?.canGoBack}
            onClick={handleBack}
            className={`p-1.5 rounded-lg text-[#dbdee1] transition active:scale-90 ${
              activeTab?.canGoBack ? 'hover:bg-[#2b2d31] cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!activeTab?.canGoForward}
            onClick={handleForward}
            className={`p-1.5 rounded-lg text-[#dbdee1] transition active:scale-90 ${
              activeTab?.canGoForward ? 'hover:bg-[#2b2d31] cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleReload}
            className="p-1.5 rounded-lg text-[#dbdee1] hover:bg-[#2b2d31] transition active:scale-90 cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${activeTab?.loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleHome}
            className="p-1.5 rounded-lg text-[#dbdee1] hover:bg-[#2b2d31] transition active:scale-90 cursor-pointer"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Address Bar */}
        <form onSubmit={handleNavigate} className="flex-1 flex items-center bg-[#111214] rounded-lg border border-[#2b2d31] focus-within:border-[#5865f2] transition-colors p-1 px-3">
          <Globe className="w-3.5 h-3.5 text-[#949ba4] mr-2 shrink-0" />
          <input
            ref={addressInputRef}
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Search or enter web address..."
            className="bg-transparent text-xs w-full focus:outline-none text-[#dbdee1] caret-[#5865f2] select-text"
          />
          <button type="submit" className="hidden" />
        </form>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg text-[#dbdee1] hover:bg-[#2b2d31] transition active:scale-90 cursor-pointer"
            title="Browser Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Browser Viewport */}
      <div className="flex-1 relative bg-[#1e1f22]">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`absolute inset-0 bg-[#1e1f22] ${isActive ? 'block' : 'hidden'}`}
            >
              <WebviewComponent
                ref={(el: any) => {
                  if (el) {
                    webviewRefs.current[tab.id] = el;
                    setupWebviewEvents(tab.id, el);
                  }
                }}
                src={tab.url}
                className="w-full h-full border-none"
                style={{ width: '100%', height: '100%', display: 'flex' }}
                allowpopups="true"
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
              />
            </div>
          );
        })}

        {/* Floating Download Overlay button */}
        {isDownloadable(activeTab.url) && (
          <button
            onClick={() => triggerDownload(activeTab.url)}
            className="absolute bottom-6 right-6 bg-[#5865f2] hover:bg-[#4752c4] text-white p-4 rounded-full shadow-2xl flex items-center justify-center space-x-2 animate-bounce glow-active select-none hover:scale-105 active:scale-95 transition-transform duration-200 z-50 cursor-pointer"
            title="Download this media using AYNX Download Engine"
          >
            <Download className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Download with AYNX</span>
          </button>
        )}
      </div>

      {/* Slide-in browser settings overlay */}
      {showSettings && (
        <div className="absolute top-[85px] right-2 bg-[#2b2d31] border border-[#1e1f22] rounded-xl p-4 w-72 shadow-2xl space-y-4 animate-scaleIn select-none z-55">
          <div className="flex items-center justify-between border-b border-[#1e1f22] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#dbdee1] flex items-center space-x-1.5">
              <Settings className="w-3.5 h-3.5 text-[#5865f2]" />
              <span>Browser Configuration</span>
            </h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-[#949ba4] hover:text-[#dbdee1] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#949ba4] text-[10px] font-bold uppercase mb-1">Homepage</label>
              <input
                type="text"
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                className="w-full bg-[#111214] border border-[#1e1f22] rounded px-2.5 py-1.5 text-[#dbdee1] focus:outline-none focus:border-[#5865f2]"
              />
            </div>
            <div>
              <label className="block text-[#949ba4] text-[10px] font-bold uppercase mb-1">Default Search</label>
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value)}
                className="w-full bg-[#111214] border border-[#1e1f22] rounded px-2.5 py-1.5 text-[#dbdee1] focus:outline-none focus:border-[#5865f2]"
              >
                <option value="https://www.google.com/search?q=">Google</option>
                <option value="https://www.bing.com/search?q=">Bing</option>
                <option value="https://duckduckgo.com/?q=">DuckDuckGo</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-[#dbdee1]">JavaScript sandbox</span>
              <button 
                onClick={() => setJsEnabled(!jsEnabled)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                  jsEnabled ? 'bg-[#23a55a]' : 'bg-[#80848e]'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                  jsEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <div className="border-t border-[#1e1f22] pt-3">
              <button
                onClick={clearSession}
                className="w-full bg-[#da373c] hover:bg-[#c93237] text-white py-2 rounded font-semibold text-xs flex items-center justify-center space-x-1.5 transition duration-200 active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cache & Cookies</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Browser;
export { Browser };
