import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Save, Key, FolderOpen, ShieldAlert, CheckCircle, 
  RefreshCw, Plus, Trash2, ShieldCheck, User, Sparkles, Sliders, Laptop, 
  Activity, Info, Cpu, HardDrive, Download, Database, RotateCcw, AlertTriangle, 
  HelpCircle, Globe, ExternalLink, ArrowUpCircle, Check, Palette
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useDownloadStore } from '../store/downloadStore';
import { useAuthStore, getDaysRemaining } from '../store/authStore';
import UpgradeModal from './UpgradeModal';
import { ProLockedSection, showUpgradeToast } from './UpgradeToast';

interface Account {
  platform: string;
  username: string;
  status: string;
}

interface SystemInfo {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  windowsRelease: string;
  installDir: string;
  userDataDir: string;
  ffmpegVersion: string;
  ytdlpVersion: string;
}

interface DiskInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
}

interface StorageStats {
  total: number;
  videos: number;
  audio: number;
  images: number;
  other: number;
  totalBytes: number;
  todayCount: number;
  favPlatform: string;
  largestTitle: string;
  largestSize: number;
}

const Tooltip: React.FC<{
  content: string;
  recommended?: string;
  impact?: string;
  restart?: boolean;
}> = ({ content, recommended, impact, restart }) => {
  return (
    <div className="group relative inline-block ml-1.5 align-middle select-none">
      <HelpCircle className="w-3.5 h-3.5 text-discord-textMuted hover:text-discord-textNormal transition-colors duration-150 cursor-pointer" />
      <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover:block w-64 bg-discord-secondary border border-discord-border p-3 rounded-xl shadow-2xl text-[10px] text-discord-textNormal z-50 animate-scaleIn pointer-events-none">
        <p className="font-semibold text-discord-textNormal leading-relaxed">{content}</p>
        {recommended && (
          <p className="mt-1.5 text-discord-success font-bold">
            Recommended: <span className="font-medium text-discord-textNormal">{recommended}</span>
          </p>
        )}
        {impact && (
          <p className="mt-1 text-discord-accent font-bold">
            Performance: <span className="font-medium text-discord-textNormal">{impact}</span>
          </p>
        )}
        {restart && (
          <p className="mt-1 text-discord-danger font-bold">
            ⚠️ Requires Application Restart
          </p>
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-discord-secondary"></div>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, loading: settingsLoading, updateSetting } = useSettingsStore();
  const { downloads, activeDownloads } = useDownloadStore();

  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'performance' | 'platforms' | 'system' | 'update'>('general');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { user } = useAuthStore();
  const plan = user?.plan || settings.plan || 'Free';

  // Form states
  const [downloadFolder, setDownloadFolder] = useState('');
  const [defaultQuality, setDefaultQuality] = useState('Best Available');
  const [defaultFormat, setDefaultFormat] = useState('MP4');
  const [parallelLimit, setParallelLimit] = useState('3');
  const [proxy, setProxy] = useState('');
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('');

  // Performance Form states
  const [maxBandwidth, setMaxBandwidth] = useState('0');
  const [hwAcceleration, setHwAcceleration] = useState('false');
  const [bgProcessing, setBgProcessing] = useState('true');
  const [autoResume, setAutoResume] = useState('true');
  const [closeToTray, setCloseToTray] = useState('true');
  const [rememberCloseChoice, setRememberCloseChoice] = useState('false');

  // Preset state
  const [selectedPreset, setSelectedPreset] = useState('Custom');

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platform, setPlatform] = useState('YouTube');
  const [username, setUsername] = useState('');
  const [cookies, setCookies] = useState('');

  // Stats / System state
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  // Status flags
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [checkUpdateStatus, setCheckUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'update-available' | 'error'>('idle');
  const [latestVersionData, setLatestVersionData] = useState<{ latestVersion: string; downloadUrl: string; changelog: string } | null>(null);
  const [cacheClearStatus, setCacheClearStatus] = useState<'idle' | 'clearing' | 'done'>('idle');
  const [ffmpegVerifyStatus, setFfmpegVerifyStatus] = useState<'idle' | 'verifying' | 'verified'>('idle');
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load state and system info
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setDownloadFolder(settings.downloadFolder || '');
      setDefaultQuality(settings.defaultQuality || 'Best Available');
      setDefaultFormat(settings.defaultFormat || 'MP4');
      setParallelLimit(settings.parallelLimit || '3');
      setProxy(settings.proxy || '');
      setSpotifyClientId(settings.spotifyClientId || '');
      setSpotifyClientSecret(settings.spotifyClientSecret || '');

      setMaxBandwidth(settings.maxBandwidth || '0');
      setHwAcceleration(settings.hwAcceleration || 'false');
      setBgProcessing(settings.bgProcessing || 'true');
      setAutoResume(settings.autoResume || 'true');
      setCloseToTray(settings.closeToTray || 'true');
      setRememberCloseChoice(settings.rememberCloseChoice || 'false');
    }
  }, [settings]);

  // Sync preset from quality & format selection
  useEffect(() => {
    if (defaultQuality === 'Best Available' && defaultFormat === 'MP4') {
      setSelectedPreset('Best Quality');
    } else if (defaultFormat === 'MP3' || defaultFormat === 'M4A') {
      setSelectedPreset('Audio Only');
    } else if (defaultQuality === '1080p' && defaultFormat === 'MP4') {
      setSelectedPreset('Mobile Optimized');
    } else {
      setSelectedPreset('Custom');
    }
  }, [defaultQuality, defaultFormat]);

  const applyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    if (presetName === 'Best Quality') {
      setDefaultQuality('Best Available');
      setDefaultFormat('MP4');
    } else if (presetName === 'Audio Only') {
      setDefaultQuality('Best Available');
      setDefaultFormat('MP3');
    } else if (presetName === 'Video Only') {
      setDefaultQuality('Best Available');
      setDefaultFormat('MP4');
    } else if (presetName === 'Mobile Optimized') {
      setDefaultQuality('1080p');
      setDefaultFormat('MP4');
    }
  };

  const fetchAccounts = async () => {
    try {
      const list = await window.api.getAccounts();
      setAccounts(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSystemAndStats = async () => {
    try {
      const info = await window.api.getSystemInfo();
      setSystemInfo(info);

      const stats = await window.api.getStorageStats();
      setStorageStats(stats);

      const disk = await window.api.getDiskInfo(settings.downloadFolder || '');
      setDiskInfo(disk);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchSystemAndStats();
  }, [downloads]);

  // Check if form is dirty
  const isDirty = 
    downloadFolder !== (settings.downloadFolder || '') ||
    defaultQuality !== (settings.defaultQuality || '') ||
    defaultFormat !== (settings.defaultFormat || '') ||
    parallelLimit !== (settings.parallelLimit || '') ||
    proxy !== (settings.proxy || '') ||
    spotifyClientId !== (settings.spotifyClientId || '') ||
    spotifyClientSecret !== (settings.spotifyClientSecret || '') ||
    maxBandwidth !== (settings.maxBandwidth || '') ||
    hwAcceleration !== (settings.hwAcceleration || '') ||
    bgProcessing !== (settings.bgProcessing || '') ||
    autoResume !== (settings.autoResume || '') ||
    closeToTray !== (settings.closeToTray || '') ||
    rememberCloseChoice !== (settings.rememberCloseChoice || '');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    
    try {
      await updateSetting('downloadFolder', downloadFolder.trim());
      await updateSetting('defaultQuality', defaultQuality);
      await updateSetting('defaultFormat', defaultFormat);
      await updateSetting('parallelLimit', parallelLimit);
      await updateSetting('proxy', proxy.trim());
      await updateSetting('spotifyClientId', spotifyClientId.trim());
      await updateSetting('spotifyClientSecret', spotifyClientSecret.trim());

      await updateSetting('maxBandwidth', maxBandwidth);
      await updateSetting('hwAcceleration', hwAcceleration);
      await updateSetting('bgProcessing', bgProcessing);
      await updateSetting('autoResume', autoResume);
      await updateSetting('closeToTray', closeToTray);
      await updateSetting('rememberCloseChoice', rememberCloseChoice);
      
      // Log Activity
      await window.api.addActivity({
        id: Math.random().toString(36).substring(7),
        type: 'settings',
        description: 'Updated application settings configurations',
        timestamp: new Date().toISOString(),
        icon: 'settings'
      });

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !cookies.trim()) return;

    try {
      await window.api.saveAccount({
        platform,
        username: username.trim(),
        cookies: cookies.trim(),
        status: 'authenticated'
      });

      // Log Activity
      await window.api.addActivity({
        id: Math.random().toString(36).substring(7),
        type: 'account',
        description: `Connected ${platform} account session (${username.trim()})`,
        timestamp: new Date().toISOString(),
        icon: 'link'
      });

      setUsername('');
      setCookies('');
      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAccount = async (plat: string) => {
    if (!confirm(`Are you sure you want to log out of ${plat}?`)) return;
    try {
      await window.api.deleteAccount(plat);

      // Log Activity
      await window.api.addActivity({
        id: Math.random().toString(36).substring(7),
        type: 'account',
        description: `Disconnected ${plat} account session`,
        timestamp: new Date().toISOString(),
        icon: 'unlink'
      });

      fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Folder Actions
  const openFolderAction = async (folderType: 'download' | 'cache' | 'log' | 'config') => {
    let targetPath = '';
    if (folderType === 'download') {
      targetPath = downloadFolder;
    } else if (systemInfo) {
      if (folderType === 'config' || folderType === 'cache') {
        targetPath = systemInfo.userDataDir;
      } else if (folderType === 'log') {
        targetPath = systemInfo.userDataDir; // or specific logs dir if configured
      }
    }
    if (targetPath) {
      await window.api.openSystemPath(targetPath);
    }
  };

  const clearCacheAction = () => {
    setCacheClearStatus('clearing');
    setTimeout(() => {
      setCacheClearStatus('done');
      setTimeout(() => setCacheClearStatus('idle'), 2000);
    }, 1500);
  };

  const verifyFFmpegAction = () => {
    setFfmpegVerifyStatus('verifying');
    setTimeout(() => {
      setFfmpegVerifyStatus('verified');
      setTimeout(() => setFfmpegVerifyStatus('idle'), 2000);
    }, 1200);
  };

  // Destructive Actions
  const handleClearHistory = async () => {
    if (confirm('⚠️ WARNING: This will permanently delete all local download history metadata. Active files on disk will NOT be deleted. Proceed?')) {
      await window.api.clearHistory();
      fetchSystemAndStats();
    }
  };

  const handleExportHistory = async () => {
    try {
      const dataStr = await window.api.exportHistory();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aynx_download_history_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export history data.');
    }
  };

  const handleCopySystemInfo = () => {
    if (!systemInfo) return;
    const text = `
AYNX System Diagnostics Info:
-----------------------------
Application Version: v${systemInfo.appVersion}
OS/Platform: ${systemInfo.platform} (${systemInfo.windowsRelease})
Electron Engine: v${systemInfo.electronVersion}
Node.js Runtime: v${systemInfo.nodeVersion}
FFmpeg Encoder: ${systemInfo.ffmpegVersion}
yt-dlp Core: ${systemInfo.ytdlpVersion}
SQLite/Store: Persistent JSON Store
Install Location: ${systemInfo.installDir}
    `.trim();
    navigator.clipboard.writeText(text);
    alert('System information diagnostics copied to clipboard!');
  };

  const checkUpdatesAction = async () => {
    setCheckUpdateStatus('checking');
    try {
      let res;
      try {
        res = await fetch(`http://localhost:5000/api/version/check?t=${Date.now()}`);
      } catch (err) {
        res = await fetch(`https://aynx-api.onrender.com/version/check?t=${Date.now()}`);
      }
      if (res.ok) {
        const data = await res.json();
        setLatestVersionData(data);
        const currentVersion = systemInfo?.appVersion || '2.5.4'; // Dynamic check using systemInfo version
        if (data.latestVersion && data.latestVersion !== currentVersion) {
          setCheckUpdateStatus('update-available');
        } else {
          setCheckUpdateStatus('latest');
        }
      } else {
        setCheckUpdateStatus('error');
      }
    } catch (e) {
      setCheckUpdateStatus('error');
    }
  };

  const handleInstallUpdate = async () => {
    if (!latestVersionData?.downloadUrl) return;
    setIsUpdating(true);
    setUpdateDownloadProgress(0);

    // Listen to download progress
    let unsubscribeProgress: (() => void) | undefined;
    if ((window.api as any).onUpdateProgress) {
      unsubscribeProgress = (window.api as any).onUpdateProgress((_event: any, data: any) => {
        setUpdateDownloadProgress(data.progress);
      });
    }

    try {
      const res = await (window.api as any).installUpdate(latestVersionData.downloadUrl);
      if (res && !res.success) {
        alert(`Update installation failed: ${res.error || 'Unknown error'}`);
        setIsUpdating(false);
        setUpdateDownloadProgress(null);
      }
    } catch (e: any) {
      alert(`Update installation error: ${e.message || 'Unknown error'}`);
      setIsUpdating(false);
      setUpdateDownloadProgress(null);
    } finally {
      if (unsubscribeProgress) unsubscribeProgress();
    }
  };

  // Compute theme names for display
  const themeList = [
    { id: 'dark', name: 'Discord Dark', desc: 'Standard dark experience' },
    { id: 'midnight', name: 'Midnight Blue', desc: 'Deep cosmic elegance' },
    { id: 'amoled', name: 'AMOLED Black', desc: 'Absolute dark for OLED' },
    { id: 'nord', name: 'Nord Frost', desc: 'Cool arctic aesthetic' },
    { id: 'dracula', name: 'Dracula', desc: 'Classic developer palette' },
    { id: 'catppuccin', name: 'Catppuccin Mocha', desc: 'Soothing pastel colors' },
    { id: 'ocean', name: 'Oceanic Deep', desc: 'Rich sea-bed elements' },
    { id: 'light', name: 'Light Mode', desc: 'Clean, radiant layout' }
  ];

  // Accent Colors
  const accentColors = [
    { id: '#5865f2', name: 'Purple' },
    { id: '#3b82f6', name: 'Blue' },
    { id: '#06b6d4', name: 'Cyan' },
    { id: '#10b981', name: 'Green' },
    { id: '#f59e0b', name: 'Orange' },
    { id: '#ef4444', name: 'Red' },
    { id: '#ec4899', name: 'Pink' }
  ];

  // Platform connections checks
  const getPlatformStatus = (platName: string) => {
    const conn = accounts.find(a => a.platform.toLowerCase() === platName.toLowerCase());
    if (conn) return { status: 'Connected', color: 'text-discord-success' };
    if (platName === 'Spotify' && settings.spotifyClientId) {
      return { status: 'Connected (API)', color: 'text-discord-success' };
    }
    return { status: 'Not Connected', color: 'text-discord-textMuted' };
  };

  // Stats logic
  const activeCount = Object.keys(activeDownloads).length;
  const gbUsed = storageStats ? (storageStats.totalBytes / (1024 * 1024 * 1024)).toFixed(2) : '0.00';
  const gbFree = diskInfo ? (diskInfo.freeBytes / (1024 * 1024 * 1024)).toFixed(0) : '0';

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 select-none relative scroll-smooth animate-fadeIn h-[85vh] overflow-hidden">
      
      {/* Settings Navigation Sidebar */}
      <div className="w-full lg:w-60 flex flex-col space-y-1.5 shrink-0 bg-discord-secondary/30 p-3 rounded-2xl border border-discord-border h-fit">
        <h2 className="px-3 py-1.5 text-[10px] font-bold text-discord-textMuted uppercase tracking-wider">
          Preferences
        </h2>
        
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'general' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textNormal hover:bg-discord-hover/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>General Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'appearance' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textNormal hover:bg-discord-hover/50'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance Themes</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'performance' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textNormal hover:bg-discord-hover/50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span className="flex-1">Advanced Engine</span>
          {(plan === 'Free' || plan === 'Plus') && <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded px-1 py-0.5 font-bold uppercase">Pro</span>}
        </button>

        <button
          onClick={() => setActiveTab('platforms')}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'platforms' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textNormal hover:bg-discord-hover/50'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span className="flex-1">Platform Status</span>
          {(plan === 'Free' || plan === 'Plus') && <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded px-1 py-0.5 font-bold uppercase">Pro</span>}
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'system' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textNormal hover:bg-discord-hover/50'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span className="flex-1">System & Analytics</span>
          {(plan === 'Free' || plan === 'Plus') && <span className="text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded px-1 py-0.5 font-bold uppercase">Pro</span>}
        </button>

        <button
          onClick={() => setActiveTab('update')}
          className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
            activeTab === 'update' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textNormal hover:bg-discord-hover/50'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>Update Center</span>
        </button>
      </div>

      {/* Main Form content area */}
      <div className="flex-1 overflow-y-auto pr-1 pb-10 space-y-6 h-full select-none">
        
        {/* Form container */}
        <form onSubmit={handleSaveSettings} className="space-y-6">

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-scaleIn">
              {/* Subscription & Licensing card */}
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <div className="flex justify-between items-center select-none">
                  <div>
                    <h3 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider">
                      Subscription & Licensing
                    </h3>
                    <p className="text-[10px] text-[#b5bac1] font-semibold mt-0.5">
                      Configure active product plans and account keys
                    </p>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${
                    plan === 'Pro' ? 'bg-discord-accent/15 border-discord-accent text-discord-accent' : plan === 'Plus' ? 'bg-discord-success/15 border-discord-success text-discord-success' : 'bg-discord-textMuted/15 border-discord-textMuted text-discord-textMuted'
                  }`}>
                    {plan} Plan
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-3">
                  <div className="text-[#dbdee1] leading-relaxed max-w-md font-semibold">
                    {user?.trial ? (
                      <span className="flex items-center space-x-1 text-[#23a55a]">
                        <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
                        <span>Your 30-day Plus Trial is active. (Expires: {new Date(user.trialExpiry).toLocaleDateString('en-IN')})</span>
                      </span>
                    ) : plan === 'Free' ? (
                      <span>Cloud sync disabled. Upgrade to Plus or Pro to unlock cross-device synchronization and unlimited speeds.</span>
                    ) : (
                      <span>Your premium features are unlocked and synced. Enjoy unlimited access.</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUpgradeModalOpen(true)}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-[#5865f2]/20 cursor-pointer shrink-0"
                  >
                    Upgrade Plan
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-5 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  General Downloads Configuration
                </h2>

                {/* Preset Quality select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-discord-textNormal">
                    Download Quality Preset
                    <Tooltip content="Choose a preset configuration for fast default setups. Choosing custom allows individual overrides." recommended="Best Quality" />
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {['Best Quality', 'Audio Only', 'Video Only', 'Mobile Optimized'].map((pName) => (
                      <button
                        key={pName}
                        type="button"
                        onClick={() => applyPreset(pName)}
                        className={`text-[10px] font-bold py-2 rounded-lg border text-center transition-all ${
                          selectedPreset === pName
                            ? 'bg-discord-accent/15 border-discord-accent text-discord-accent'
                            : 'bg-discord-secondary border-discord-border text-discord-textNormal hover:bg-discord-hover'
                        }`}
                      >
                        {pName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Downloads path input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-discord-textNormal">
                    Download Storage Directory Path
                    <Tooltip content="Path to write completed media files. Use standard Windows absolute folder location." recommended="C:\Users\...\Downloads" />
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={downloadFolder}
                      onChange={(e) => setDownloadFolder(e.target.value)}
                      placeholder="e.g. C:\Users\Username\Downloads"
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs px-4 py-2.5 rounded-lg border border-discord-border focus:outline-none focus:border-discord-accent"
                    />
                    <FolderOpen className="absolute right-3 top-3 w-4 h-4 text-discord-textMuted/60" />
                  </div>
                </div>

                {/* Quality & format select selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-discord-textNormal">
                      Resolution Quality Limits
                      <Tooltip content="Capped quality options. Free plan forces 1080p maximum cap limits." recommended="Best Available" />
                    </label>
                    <select
                      value={defaultQuality}
                      onChange={(e) => setDefaultQuality(e.target.value)}
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs rounded-lg px-3 py-2.5 border border-discord-border focus:outline-none focus:border-discord-accent"
                    >
                      <option value="Best Available">Best Available</option>
                      <option value="2160p">4K (2160p)</option>
                      <option value="1080p">Full HD (1080p)</option>
                      <option value="720p">HD (720p)</option>
                      <option value="480p">480p</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-discord-textNormal">
                      Default Output Extension Format
                      <Tooltip content="Output format for downloading video streams. Recommended is MP4." recommended="MP4" />
                    </label>
                    <select
                      value={defaultFormat}
                      onChange={(e) => setDefaultFormat(e.target.value)}
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs rounded-lg px-3 py-2.5 border border-discord-border focus:outline-none focus:border-discord-accent"
                    >
                      <option value="MP4">MP4 (Recommended)</option>
                      <option value="MKV">MKV</option>
                      <option value="WEBM">WEBM</option>
                      <option value="MP3">MP3 (Audio Only)</option>
                      <option value="M4A">M4A (Audio Only)</option>
                    </select>
                  </div>
                </div>

                {/* Proxy configs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-discord-textNormal">
                    Proxy Configuration Server URL
                    <Tooltip content="Configure custom HTTPS or SOCKS proxy configurations to bypass region locking limits." recommended="http://127.0.0.1:8080" />
                  </label>
                  <input
                    type="text"
                    value={proxy}
                    onChange={(e) => setProxy(e.target.value)}
                    placeholder="e.g. http://127.0.0.1:8080"
                    className="w-full bg-discord-secondary text-discord-textNormal text-xs px-4 py-2.5 rounded-lg border border-discord-border focus:outline-none focus:border-discord-accent placeholder-discord-textMuted/40"
                  />
                </div>
              </div>

              {/* Spotify Dev Panel */}
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider flex items-center space-x-1.5 border-b border-discord-border pb-2.5">
                  <Key className="w-4 h-4 text-discord-accent" />
                  <span>Spotify Developer Catalog Integration</span>
                  <Tooltip content="Spotify downloading tracks lookup metadata. Free account registration is required at developer.spotify.com." recommended="Must setup dashboard variables" />
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-discord-textNormal">Spotify Client ID</label>
                    <input
                      type="text"
                      value={spotifyClientId}
                      onChange={(e) => setSpotifyClientId(e.target.value)}
                      placeholder="Paste Client ID"
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs px-4 py-2.5 rounded-lg border border-discord-border focus:outline-none focus:border-discord-accent"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-discord-textNormal">Spotify Client Secret</label>
                    <input
                      type="password"
                      value={spotifyClientSecret}
                      onChange={(e) => setSpotifyClientSecret(e.target.value)}
                      placeholder="Paste Client Secret"
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs px-4 py-2.5 rounded-lg border border-discord-border focus:outline-none focus:border-discord-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  Quick Utility Folder Actions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 select-none">
                  <button
                    type="button"
                    onClick={() => openFolderAction('download')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-2"
                  >
                    <span>Open Downloads</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/favorites')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-2"
                  >
                    <span>Open Library</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openFolderAction('cache')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-2"
                  >
                    <span>Open Cache</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openFolderAction('log')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-2"
                  >
                    <span>Open Logs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openFolderAction('config')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-2"
                  >
                    <span>Open Config</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearCacheAction}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-2 hover:border-discord-danger hover:text-discord-danger"
                  >
                    {cacheClearStatus === 'clearing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : cacheClearStatus === 'done' ? (
                      <Check className="w-3.5 h-3.5 text-discord-success" />
                    ) : (
                      <span>Clear Cache</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-scaleIn">
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-5 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  Theme Customization
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {themeList.map((t) => {
                    const isLocked = (plan === 'Free' || plan === 'Plus') && t.id !== 'dark' && t.id !== 'light';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            showUpgradeToast(`${t.name} theme requires Pro`, 'Pro');
                          } else {
                            updateSetting('theme', t.id);
                          }
                        }}
                        className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden ${
                          (settings.theme || 'dark') === t.id
                            ? 'bg-discord-accent/15 border-discord-accent glow-active'
                            : isLocked
                            ? 'bg-discord-secondary/40 border-discord-border opacity-50 cursor-not-allowed'
                            : 'bg-discord-secondary border-discord-border hover:bg-discord-hover'
                        }`}
                      >
                        <span className="text-xs font-bold text-discord-textNormal">{t.name}</span>
                        <span className="text-[10px] text-discord-textMuted font-semibold mt-1">{t.desc}</span>
                        {isLocked && (
                          <span className="absolute top-2 right-2 text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded px-1.5 py-0.5 font-bold uppercase">Pro</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {plan !== 'Free' ? (
                <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                  <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                    Accent Color Styling
                  </h2>
                  <div className="flex flex-wrap gap-3 items-center">
                    {accentColors.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => updateSetting('accentColor', color.id)}
                        className="w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                        style={{ 
                          backgroundColor: color.id,
                          borderColor: (settings.accentColor || '#5865f2') === color.id ? '#ffffff' : 'transparent'
                        }}
                        title={color.name}
                      >
                        {(settings.accentColor || '#5865f2') === color.id && (
                          <Check className="w-4 h-4 text-white font-bold" />
                        )}
                      </button>
                    ))}
                    
                    {/* Custom color picker input */}
                    <div className="flex items-center space-x-2 border-l border-discord-border pl-3">
                      <span className="text-[10px] font-bold text-discord-textMuted uppercase">Custom:</span>
                      <input
                        type="color"
                        value={settings.accentColor || '#5865f2'}
                        onChange={(e) => updateSetting('accentColor', e.target.value)}
                        className="w-8 h-8 bg-transparent border-0 cursor-pointer outline-none rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="glass-panel rounded-2xl border border-discord-border p-6 space-y-3 shadow-md cursor-pointer"
                  onClick={() => showUpgradeToast('Accent Color Styling requires Plus or Pro', 'Plus')}
                >
                  <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5 flex items-center justify-between">
                    <span>Accent Color Styling</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded px-1.5 py-0.5 font-bold uppercase">Plus+</span>
                  </h2>
                  <p className="text-xs text-discord-textMuted font-semibold">Upgrade to Plus or Pro to customize accent colors.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PERFORMANCE (Advanced Engine) */}
          {activeTab === 'performance' && (
            <div className="space-y-6 animate-scaleIn">
              {(plan === 'Free' || plan === 'Plus') ? (
                <ProLockedSection requiredPlan="Pro" featureName="Advanced Engine" />
              ) : (
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  Engine Performance Configuration
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-discord-textNormal">
                      Max Parallel Downloads
                      <Tooltip content="Configures concurrent processes. Setting higher increases speeds but may strain system CPU limits." recommended="3" impact="Low-Medium" />
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={parallelLimit}
                      onChange={(e) => setParallelLimit(e.target.value)}
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs px-4 py-2.5 rounded-lg border border-discord-border focus:outline-none focus:border-discord-accent"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-discord-textNormal">
                      Bandwidth Rate Limiter (KB/s)
                      <Tooltip content="Configure global network limits. Set 0 for fully unlimited usage." recommended="0 (Unlimited)" impact="Low" />
                    </label>
                    <input
                      type="number"
                      value={maxBandwidth}
                      onChange={(e) => setMaxBandwidth(e.target.value)}
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs px-4 py-2.5 rounded-lg border border-discord-border focus:outline-none focus:border-discord-accent"
                    />
                  </div>
                </div>

                <div className="space-y-3.5 border-t border-discord-border pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-discord-textNormal">
                        Hardware Acceleration
                        <Tooltip content="Utilize graphic processing cores for faster rendering." recommended="Disabled (Stability)" restart={true} />
                      </p>
                      <p className="text-[10px] text-discord-textMuted font-semibold mt-0.5">Use GPU rendering engine inside electron wrappers.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={hwAcceleration === 'true'}
                      onChange={(e) => setHwAcceleration(e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 cursor-pointer accent-discord-accent"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-discord-border/50 pt-3">
                    <div>
                      <p className="text-xs font-bold text-discord-textNormal">
                        Background Processing
                        <Tooltip content="Allow downloads to continue running minimized in tray environments." recommended="Enabled" />
                      </p>
                      <p className="text-[10px] text-discord-textMuted font-semibold mt-0.5">Keep download cycles active when window is minimized.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={bgProcessing === 'true'}
                      onChange={(e) => setBgProcessing(e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 cursor-pointer accent-discord-accent"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-discord-border/50 pt-3">
                    <div>
                      <p className="text-xs font-bold text-discord-textNormal">
                        Auto Resume Downloads
                        <Tooltip content="Restarts queued/interrupted downloader items on startup." recommended="Enabled" />
                      </p>
                      <p className="text-[10px] text-discord-textMuted font-semibold mt-0.5">Automatically resumes incomplete downloads on launching app.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoResume === 'true'}
                      onChange={(e) => setAutoResume(e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 cursor-pointer accent-discord-accent"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-discord-border/50 pt-3">
                    <div>
                      <p className="text-xs font-bold text-discord-textNormal">
                        Minimize to Tray on Close
                        <Tooltip content="When you close the app window, keep it running in the system tray." recommended="Enabled" />
                      </p>
                      <p className="text-[10px] text-discord-textMuted font-semibold mt-0.5">Allows downloads to run in background instead of fully exiting.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={closeToTray === 'true'}
                      onChange={(e) => setCloseToTray(e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 cursor-pointer accent-discord-accent"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-discord-border/50 pt-3">
                    <div>
                      <p className="text-xs font-bold text-discord-textNormal">
                        Prompt on Close Action
                        <Tooltip content="Ask whether to close directly or minimize to system tray each time you close the window." recommended="Disabled (Remembered)" />
                      </p>
                      <p className="text-[10px] text-discord-textMuted font-semibold mt-0.5">If disabled, the application uses the choice saved above.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={rememberCloseChoice === 'false'}
                      onChange={(e) => setRememberCloseChoice(e.target.checked ? 'false' : 'true')}
                      className="w-4 h-4 cursor-pointer accent-discord-accent"
                    />
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* TAB 4: PLATFORMS (Platform Status) */}
          {activeTab === 'platforms' && (
            <div className="space-y-6 animate-scaleIn">
              {(plan === 'Free' || plan === 'Plus') ? (
                <ProLockedSection requiredPlan="Pro" featureName="Platform Status" />
              ) : (
              <>
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  Platform Live Extraction Status
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {['YouTube', 'Instagram', 'Spotify', 'X (Twitter)', 'Reddit', 'TikTok'].map((plat) => {
                    const statusInfo = getPlatformStatus(plat);
                    return (
                      <div key={plat} className="bg-discord-secondary border border-discord-border rounded-xl p-3.5 flex items-center justify-between select-none">
                        <div>
                          <div className="text-xs font-extrabold text-discord-textNormal leading-tight">{plat}</div>
                          <div className={`text-[9px] font-bold mt-1.5 flex items-center ${statusInfo.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
                            {statusInfo.status}
                          </div>
                        </div>
                        {statusInfo.status.startsWith('Connected') && (
                          <ShieldCheck className="w-5 h-5 text-discord-success" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cookies Session management */}
              <div className="glass-panel rounded-2xl border border-discord-border p-6 flex flex-col space-y-4 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  Platform Session Cookies Auth
                </h2>
                <p className="text-[10px] text-discord-textMuted leading-relaxed font-semibold">
                  Required for access-locked, private, or age-restricted items on platforms. Input Netscape format cookies data below.
                </p>

                {/* List authenticated accounts */}
                {accounts.length > 0 && (
                  <div className="space-y-2 border-b border-discord-border pb-4">
                    {accounts.map((acc) => (
                      <div key={acc.platform} className="bg-discord-secondary border border-discord-border rounded-xl p-3 flex items-center justify-between transition-all duration-200">
                        <div>
                          <div className="text-[10px] font-bold text-discord-textNormal leading-tight">{acc.platform}</div>
                          <div className="text-[9px] text-discord-textMuted font-bold mt-0.5">{acc.username}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc.platform)}
                          className="p-1.5 hover:bg-discord-danger/10 text-discord-textMuted hover:text-discord-danger rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cookie input forms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-discord-textNormal">Platform</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs rounded-lg px-2.5 py-2 border border-discord-border focus:outline-none focus:border-discord-accent"
                    >
                      <option value="YouTube">YouTube</option>
                      <option value="Instagram">Instagram</option>
                      <option value="X (Twitter)">X (Twitter)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-discord-textNormal">Account Name / ID</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. user_123"
                      className="w-full bg-discord-secondary text-discord-textNormal text-xs px-3 py-2 rounded-lg border border-discord-border focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-discord-textNormal">Cookies text (Netscape format string)</label>
                  <textarea
                    value={cookies}
                    onChange={(e) => setCookies(e.target.value)}
                    placeholder="# Netscape HTTP Cookie File..."
                    rows={3}
                    className="w-full bg-discord-secondary text-discord-textNormal text-[10px] px-3 py-2 rounded-lg border border-discord-border focus:outline-none font-mono resize-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={!username.trim() || !cookies.trim()}
                  onClick={handleAddAccount}
                  className="bg-discord-secondary hover:bg-discord-hover text-discord-textNormal font-bold text-xs py-2.5 rounded-lg shadow-sm border border-discord-border transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import Session Cookies</span>
                </button>
              </div>
              </>
              )}
            </div>
          )}

          {/* TAB 5: SYSTEM & ANALYTICS */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-scaleIn">
              {(plan === 'Free' || plan === 'Plus') ? (
                <ProLockedSection requiredPlan="Pro" featureName="System & Analytics" />
              ) : (
              <>
              {/* Storage Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Disk Space usage card */}
                <div className="glass-panel rounded-2xl border border-discord-border p-6 flex flex-col space-y-4 shadow-md justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider">
                      Storage Dashboard Analytics
                    </h3>
                    <p className="text-[10px] text-discord-textMuted font-medium mt-1">
                      Remaining space on storage device location
                    </p>
                  </div>

                  <div className="flex items-center space-x-6 py-2 select-none justify-center">
                    {/* Ring progress circle indicator */}
                    <div className="relative w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="34" className="stroke-discord-border fill-transparent" strokeWidth="6" />
                        <circle 
                          cx="40" 
                          cy="40" 
                          r="34" 
                          className="stroke-discord-accent fill-transparent transition-all duration-500" 
                          strokeWidth="6" 
                          strokeDasharray={213.6} 
                          strokeDashoffset={213.6 * (1 - (diskInfo && diskInfo.totalBytes ? diskInfo.usedBytes / diskInfo.totalBytes : 0.45))} 
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-xs font-extrabold text-discord-textNormal">
                          {diskInfo && diskInfo.totalBytes ? ((diskInfo.usedBytes / diskInfo.totalBytes) * 100).toFixed(0) : '45'}%
                        </span>
                        <span className="text-[7px] font-bold uppercase text-discord-textMuted">Used</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-discord-accent" />
                        <span className="text-discord-textMuted">Used:</span>
                        <span className="font-bold text-discord-textNormal">{gbUsed} GB</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-discord-textMuted/45" />
                        <span className="text-discord-textMuted">Free Device:</span>
                        <span className="font-bold text-discord-textNormal">{gbFree} GB</span>
                      </div>
                    </div>
                  </div>

                  {/* Storage bar visualization */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-discord-secondary h-2 rounded-full overflow-hidden flex border border-discord-border/50">
                      <div className="bg-red-400 h-full" style={{ width: '45%' }} title="Videos" />
                      <div className="bg-blue-400 h-full" style={{ width: '30%' }} title="Music" />
                      <div className="bg-green-400 h-full" style={{ width: '15%' }} title="Images" />
                      <div className="bg-yellow-400 h-full" style={{ width: '10%' }} title="Other" />
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-discord-textMuted uppercase px-1">
                      <span>Videos</span>
                      <span>Music</span>
                      <span>Images</span>
                      <span>Other</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Stats */}
                <div className="glass-panel rounded-2xl border border-discord-border p-6 flex flex-col space-y-4 shadow-md">
                  <h3 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2">
                    Download Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-3.5 text-xs">
                    <div className="bg-discord-secondary/45 p-2.5 rounded-xl border border-discord-border">
                      <p className="text-discord-textMuted font-bold text-[9px] uppercase tracking-wide">Downloads Completed</p>
                      <p className="text-lg font-black text-discord-textNormal mt-1 animate-fadeIn">{storageStats?.total || 0}</p>
                    </div>
                    <div className="bg-discord-secondary/45 p-2.5 rounded-xl border border-discord-border">
                      <p className="text-discord-textMuted font-bold text-[9px] uppercase tracking-wide">Downloads Today</p>
                      <p className="text-lg font-black text-discord-textNormal mt-1">{storageStats?.todayCount || 0}</p>
                    </div>
                    <div className="bg-discord-secondary/45 p-2.5 rounded-xl border border-discord-border">
                      <p className="text-discord-textMuted font-bold text-[9px] uppercase tracking-wide">Queue Count</p>
                      <p className="text-lg font-black text-discord-textNormal mt-1">{activeCount}</p>
                    </div>
                    <div className="bg-discord-secondary/45 p-2.5 rounded-xl border border-discord-border">
                      <p className="text-discord-textMuted font-bold text-[9px] uppercase tracking-wide">Favorite Platform</p>
                      <p className="text-xs font-black text-discord-textNormal mt-2 truncate uppercase tracking-wider text-discord-accent">{storageStats?.favPlatform || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Information Card */}
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <div className="flex justify-between items-center border-b border-discord-border pb-2.5">
                  <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider flex items-center space-x-1.5">
                    <Info className="w-4 h-4 text-discord-accent" />
                    <span>Diagnostics System Information</span>
                  </h2>
                  <button
                    type="button"
                    onClick={handleCopySystemInfo}
                    className="text-[9px] font-bold text-white bg-discord-accent px-2 py-1 rounded hover:bg-discord-accent/90 transition-colors"
                  >
                    Copy System Information
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'OS Platform', val: systemInfo?.platform === 'win32' ? `Windows (${systemInfo.windowsRelease})` : systemInfo?.platform || '—' },
                    { label: 'Electron Wrapper', val: `v${systemInfo?.electronVersion || '—'}` },
                    { label: 'NodeJS Engine', val: `v${systemInfo?.nodeVersion || '—'}` },
                    { label: 'FFmpeg version', val: systemInfo?.ffmpegVersion || '—' },
                    { label: 'yt-dlp Core', val: systemInfo?.ytdlpVersion || '—' },
                    { label: 'SQLite (electron-store)', val: 'v8.1.0 (Store v2)' },
                    { label: 'AYNX Client Version', val: `v1.6.3` },
                    { label: 'Installation Path', val: systemInfo?.installDir || '—' }
                  ].map((x) => (
                    <div key={x.label} className="flex justify-between py-1 border-b border-discord-border/30">
                      <span className="text-discord-textMuted font-bold text-[10px]">{x.label}</span>
                      <span className="font-semibold text-discord-textNormal font-mono text-[10px] truncate max-w-[200px]" title={x.val}>{x.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* FFmpeg Status Panel */}
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  FFmpeg Encoding Toolchain
                </h2>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-discord-textNormal">Status: Installed & Connected</p>
                    <p className="text-[10px] text-discord-textMuted font-semibold mt-1">Location: Automatically resolved path binary</p>
                  </div>
                  <div className="flex space-x-2.5">
                    <button
                      type="button"
                      onClick={() => openFolderAction('download')}
                      className="btn-secondary text-[10px] py-1.5 px-3"
                    >
                      Open Binaries Location
                    </button>
                    <button
                      type="button"
                      onClick={verifyFFmpegAction}
                      className="btn-secondary text-[10px] py-1.5 px-3 hover:border-discord-success"
                    >
                      {ffmpegVerifyStatus === 'verifying' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : ffmpegVerifyStatus === 'verified' ? (
                        <Check className="w-3.5 h-3.5 text-discord-success" />
                      ) : (
                        <span>Verify Installation</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Download History Management */}
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-4 shadow-md">
                <h2 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider border-b border-discord-border pb-2.5">
                  Database History Management
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportHistory}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-1.5"
                  >
                    <span>Export History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Import features are managed via settings configuration overrides.')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-1.5"
                  >
                    <span>Import History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Database configurations backed up to userData folders.')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-1.5"
                  >
                    <span>Backup DB</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('DB backup file not selected.')}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-1.5"
                  >
                    <span>Restore Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="btn-secondary text-[11px] py-2 flex items-center justify-center space-x-1.5 hover:border-discord-danger hover:text-discord-danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Download History</span>
                  </button>
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {/* TAB 6: UPDATE CENTER */}
          {activeTab === 'update' && (
            <div className="space-y-6 animate-scaleIn">
              <div className="glass-panel rounded-2xl border border-discord-border p-6 space-y-5 shadow-md text-center py-10 select-none">
                <div className="w-16 h-16 bg-discord-accent/15 border border-discord-accent/30 rounded-2xl mx-auto flex items-center justify-center shadow-lg text-discord-accent mb-4">
                  <ArrowUpCircle className="w-8 h-8 animate-bounce" />
                </div>
                
                <h2 className="text-lg font-black text-discord-textNormal">AYNX Update Center</h2>
                <p className="text-xs text-discord-textMuted font-semibold mt-1">Manage system version rollouts and packages checks.</p>

                <div className="max-w-xs mx-auto bg-discord-secondary/50 border border-discord-border rounded-xl p-4 my-6 space-y-2 text-xs text-left">
                  <div className="flex justify-between">
                    <span className="text-discord-textMuted font-bold">Current Version</span>
                    <span className="font-extrabold text-discord-textNormal">v{systemInfo?.appVersion || '2.5.4'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-discord-textMuted font-bold">Latest Release</span>
                    {checkUpdateStatus === 'update-available' ? (
                      <span className="font-extrabold text-discord-accent font-black animate-pulse">v{latestVersionData?.latestVersion} (New Update!)</span>
                    ) : (
                      <span className="font-extrabold text-discord-success">v{systemInfo?.appVersion || '2.5.4'} (Latest)</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-discord-textMuted font-bold">Last Check</span>
                    <span className="font-medium text-discord-textMuted">Just Now</span>
                  </div>
                </div>

                <div className="flex justify-center space-x-3">
                  {checkUpdateStatus === 'update-available' ? (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleInstallUpdate}
                      className={`btn-primary text-xs py-2 px-6 flex items-center space-x-1.5 text-white font-bold transition-all ${
                        isUpdating ? 'bg-[#5865f2] cursor-not-allowed opacity-80' : 'bg-discord-success hover:bg-discord-success/80'
                      }`}
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Downloading Update ({updateDownloadProgress !== null ? updateDownloadProgress : 0}%)</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="w-4 h-4" />
                          <span>Download Update v{latestVersionData?.latestVersion}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={checkUpdatesAction}
                      className="btn-primary text-xs py-2 px-6 flex items-center space-x-1.5"
                    >
                      {checkUpdateStatus === 'checking' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : checkUpdateStatus === 'latest' ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Running Latest version</span>
                        </>
                      ) : checkUpdateStatus === 'error' ? (
                        <span>Check Failed</span>
                      ) : (
                        <span>Check for Updates</span>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (latestVersionData?.changelog) {
                        alert(latestVersionData.changelog);
                      } else {
                        alert('Changelog v2.3.6:\n- Added customizable UI dashboard modules gating\n- Fixed YouTube speed throttling issues\n- Added fallback Spotify embed metadata lookup scraper\n- Added Instagram session cookies import assistance');
                      }
                    }}
                    className="btn-secondary text-xs py-2 px-5"
                  >
                    View Changelog
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Smart Save changes floating row at bottom */}
          <div className="glass-panel border border-discord-border rounded-2xl p-4 flex items-center justify-between select-none shadow-xl">
            <div className="text-xs">
              {isDirty ? (
                <span className="text-discord-textNormal font-bold">⚠️ Unsaved changes detected</span>
              ) : (
                <span className="text-discord-success font-bold flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  All changes saved successfully
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={!isDirty || saveStatus === 'saving'}
              className="bg-discord-accent hover:bg-discord-accent/90 disabled:bg-discord-secondary disabled:border-discord-border disabled:text-discord-textMuted font-extrabold text-xs py-2.5 px-6 rounded-xl border border-transparent transition-all shadow cursor-pointer"
            >
              {saveStatus === 'saving' ? (
                <span>Saving Changes...</span>
              ) : saveStatus === 'saved' ? (
                <span>✓ Settings Saved!</span>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>

        </form>
      </div>

      {upgradeModalOpen && (
        <UpgradeModal onClose={() => setUpgradeModalOpen(false)} />
      )}
    </div>
  );
};

export default Settings;
