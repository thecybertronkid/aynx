import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Link, Download, FileAudio, FileVideo, 
  Search, Sparkles, ListMusic, 
  RefreshCw, AlertCircle, ShieldAlert, Key,
  Folder, FolderOpen, Play, Pause, X, Trash2, 
  Layers, Clock, Star, Globe, ShieldCheck, 
  HardDrive, Activity, Eye, PlayCircle, EyeOff, LayoutGrid, Lock,
  Upload, FileText, Plus
} from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore, getDaysRemaining } from '../store/authStore';
import { LockedWidgetCard, showUpgradeToast } from './UpgradeToast';

interface FormatOption {
  formatId: string;
  extension: string;
  resolution: string;
  fileSize: number;
}

interface AnalyzedMetadata {
  platform: string;
  id: string;
  title: string;
  channel?: string;
  duration?: number;
  thumbnailUrl?: string;
  formats?: FormatOption[];
  tracks?: Array<{
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    thumbnailUrl: string;
    searchString: string;
  }>;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedMetadata | null>(null);

  // Download selection states
  const [contentType, setContentType] = useState<'video' | 'audio'>('video');
  const [selectedFormat, setSelectedFormat] = useState('MP4'); 
  const [selectedQuality, setSelectedQuality] = useState('Best Available');
  const [selectedTracks, setSelectedTracks] = useState<Record<string, boolean>>({});

  // Widget visibility customization state (persisted in localStorage)
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>({
    stats: true,
    platform: true,
    storage: true,
    activity: true,
    system: true,
    recent: true
  });
  const [showLayoutCustomizer, setShowLayoutCustomizer] = useState(false);

  // Batch Downloader States
  const [downloaderTab, setDownloaderTab] = useState<'single' | 'batch'>('single');
  const [batchInput, setBatchInput] = useState('');
  const [batchParsing, setBatchParsing] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchStatusMsg, setBatchStatusMsg] = useState('');

  // Live welcome clock
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());
  const [dateStr, setDateStr] = useState(new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

  // Aggregated data stats from backend
  const [dbStats, setDbStats] = useState<any>(null);
  const [diskStats, setDiskStats] = useState<any>(null);
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentDownloads, setRecentDownloads] = useState<any[]>([]);

  const { activeDownloads, activeOrder, queueDownload, fetchActiveDownloads, pauseDownload, resumeDownload, cancelDownload } = useDownloadStore();
  const { settings } = useSettingsStore();
  const { user, isOnline } = useAuthStore();

  const plan = user?.plan || settings.plan || 'Free';
  const displayName = user?.name || settings.displayName || 'Local Service';
  const trialDaysLeft = user?.trialExpiry ? getDaysRemaining(user.trialExpiry) : 0;
  const isTrial = user?.trial || false;

  useEffect(() => {
    // Load local storage widget preferences
    const saved = localStorage.getItem('aynx_dashboard_widgets');
    if (saved) {
      try { setWidgetVisibility(JSON.parse(saved)); } catch (_) {}
    }

    // Tick clock every second
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);

    // Initial fetch of dashboard aggregates
    loadDashboardMetrics();

    // Poll active queue status frequently
    const activePoll = setInterval(() => {
      fetchActiveDownloads();
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(activePoll);
    };
  }, []);

  const loadDashboardMetrics = async () => {
    try {
      // 1. Storage stats
      const stats = await window.api.getStorageStats();
      setDbStats(stats);

      // 2. Disk info
      const disk = await window.api.getDiskInfo(settings.downloadFolder || '');
      setDiskStats(disk);

      // 3. System info
      const sys = await window.api.getSystemInfo();
      setSysInfo(sys);

      // 4. Activity log
      const act = await window.api.getActivity();
      setRecentActivities(act.slice(0, 5));

      // 5. Recent completed downloads history
      const downloads = await window.api.getDownloads();
      const completed = (downloads || []).filter((d: any) => d.status === 'completed').slice(0, 10);
      setRecentDownloads(completed);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    }
  };

  const handleDownloadTemplate = () => {
    const content = `# AYNX Batch Download Links List Template
# Lines starting with "#" will be ignored.
# Paste one valid URL per line below (YouTube, Spotify, Instagram, etc.)

https://www.youtube.com/watch?dQw4w9WgXcQ
https://www.youtube.com/watch?ewRjZoRtu0Y
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const urlBlob = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlBlob;
    link.download = 'aynx_batch_template.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(urlBlob);
  };

  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setBatchInput(text);
    };
    reader.readAsText(file);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchInput.trim()) return;

    const urls = batchInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    if (urls.length === 0) {
      setBatchError('No valid URLs found in link list.');
      return;
    }

    setBatchParsing(true);
    setBatchError(null);
    setBatchStatusMsg(`Processing batch (0/${urls.length})...`);

    let queuedCount = 0;
    for (let i = 0; i < urls.length; i++) {
      const targetUrl = urls[i];
      setBatchStatusMsg(`Analyzing link ${i + 1}/${urls.length}...`);
      try {
        const meta = await window.api.analyzeUrl(targetUrl);
        await queueDownload({
          id: targetUrl,
          url: targetUrl,
          title: meta.title || `Extract Item ${i + 1}`,
          channel: meta.channel || '',
          platform: meta.platform || 'Unknown',
          contentType: 'video'
        });
        queuedCount++;
      } catch (err: any) {
        console.error(`Failed to batch queue ${targetUrl}:`, err);
        try {
          await queueDownload({
            id: targetUrl,
            url: targetUrl,
            title: `Batch Download - Item ${i + 1}`,
            platform: 'YouTube',
            contentType: 'video'
          });
          queuedCount++;
        } catch (_) {}
      }
    }

    setBatchParsing(false);
    setBatchStatusMsg('');
    setBatchInput('');
    
    // Unlock Batch Master achievement
    await window.api.unlockAchievement('batchDownload');
    
    alert(`Successfully parsed and queued ${queuedCount} downloads in queue manager!`);
    loadDashboardMetrics();
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const data = await window.api.analyzeUrl(url.trim());
      setResult(data);
      
      if (data.platform === 'Spotify' || data.platform === 'SoundCloud' || data.platform === 'YouTube Music') {
        setContentType('audio');
        setSelectedFormat('MP3');
      } else {
        setContentType('video');
        setSelectedFormat('MP4');
      }

      if (data.tracks) {
        const tracksSelection: Record<string, boolean> = {};
        data.tracks.forEach((t: any) => {
          tracksSelection[t.id] = true;
        });
        setSelectedTracks(tracksSelection);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Failed to analyze URL. Make sure it is valid.';
      const errLower = errMsg.toLowerCase();
      if (errLower.includes("confirm you're not a bot") || errLower.includes("sign in")) {
        errMsg = "YouTube bot detection has blocked this request. To bypass this, please export your YouTube browser cookies and import them in Settings -> Settings (Platform Session Cookies Auth tab), or try using a proxy/VPN.";
      } else if (errLower.includes("drm protected") || errLower.includes("drm-protected")) {
        errMsg = "This video is DRM (Digital Rights Management) protected/encrypted by the platform. Universal downloaders cannot download DRM-encrypted premium content (like purchased YouTube movies or premium TV series).";
      } else if (errLower.includes("empty media response") || errLower.includes("login_required") || errLower.includes("login required") || errLower.includes("instagram")) {
        if (url.toLowerCase().includes("instagram.com")) {
          errMsg = "Instagram returned an empty media response. Instagram blocks anonymous scrapers for most posts. To fix this, please export your Instagram session cookies and import them in Settings -> Settings (Platform Session Cookies Auth tab).";
        }
      }
      setError(errMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStartDownload = async () => {
    if (!result) return;

    if (isPlatformLocked(result.platform)) {
      setError(`Platform ${result.platform} is locked on your plan.`);
      return;
    }

    let finalQuality = selectedQuality;
    if (plan === 'Free') {
      if (contentType === 'video' && (finalQuality === 'Best Available' || finalQuality === '2160p' || finalQuality === '1440p')) {
        finalQuality = '1080p';
      }
      if (contentType === 'audio' && (finalQuality === 'Best Available' || finalQuality === '320' || finalQuality === '256')) {
        finalQuality = '192';
      }
    }

    if (result.platform === 'Spotify' && result.tracks) {
      const tracksToDownload = result.tracks.filter(t => selectedTracks[t.id]);
      if (tracksToDownload.length === 0) {
        setError('Please select at least one track to download.');
        return;
      }

      for (const track of tracksToDownload) {
        await queueDownload({
          id: track.id,
          url: `https://open.spotify.com/track/${track.id}`,
          title: `${track.artist} - ${track.title}`,
          channel: track.artist,
          platform: 'Spotify',
          contentType: 'audio',
          quality: '192k',
          format: selectedFormat
        });
      }

      setUrl('');
      setResult(null);
      return;
    }

    await queueDownload({
      id: url.trim(),
      url: url.trim(),
      title: result.title,
      channel: result.channel,
      platform: result.platform,
      contentType: contentType,
      quality: finalQuality,
      format: selectedFormat
    });

    // Record this activity
    await window.api.addActivity({
      id: 'act_' + Date.now(),
      type: 'download',
      description: `Downloaded ${contentType} from ${result.platform}: ${result.title}`,
      timestamp: new Date().toISOString()
    });

    setUrl('');
    setResult(null);
    loadDashboardMetrics();
  };

  const toggleTrack = (trackId: string) => {
    setSelectedTracks(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }));
  };

  const selectAllTracks = (select: boolean) => {
    if (!result || !result.tracks) return;
    const nextSelection: Record<string, boolean> = {};
    result.tracks.forEach(t => {
      nextSelection[t.id] = select;
    });
    setSelectedTracks(nextSelection);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isPlatformLocked = (platformName: string): boolean => {
    if (plan === 'Pro') return false;
    const pName = platformName.toLowerCase();
    
    if (plan === 'Free') {
      return pName !== 'youtube';
    }
    
    if (plan === 'Plus') {
      return pName !== 'youtube' && pName !== 'spotify' && pName !== 'instagram';
    }
    
    return false;
  };

  const platformLocked = result ? isPlatformLocked(result.platform) : false;

  const toggleWidget = (wKey: string) => {
    const next = { ...widgetVisibility, [wKey]: !widgetVisibility[wKey] };
    setWidgetVisibility(next);
    localStorage.setItem('aynx_dashboard_widgets', JSON.stringify(next));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Clipboard auto-detect
  const handleInputFocus = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && /^https?:\/\//.test(text.trim()) && text !== url) {
        setUrl(text.trim());
      }
    } catch (_) {}
  };

  // Drag & drop link handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text');
    if (text && /^https?:\/\//.test(text.trim())) {
      setUrl(text.trim());
    }
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto space-y-6 select-none relative pb-8 animate-fadeIn overflow-y-auto pr-1 h-full scrollbar-thin">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-discord-accent/5 rounded-full filter blur-[120px] -z-10 pointer-events-none" />

      {isTrial && (
        <div className="bg-discord-accent/10 border border-discord-accent/30 p-4 rounded-xl flex items-center justify-between text-xs text-discord-textNormal select-none shrink-0 animate-slideIn">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-discord-accent animate-pulse shrink-0" />
            <span>
              <strong>AYNX Plus Trial Active:</strong> You have <strong>{trialDaysLeft} days</strong> remaining on your free trial. Upgrade to AYNX Plus or Pro to retain premium features and speed!
            </span>
          </div>
        </div>
      )}

      {/* Header and Welcome Panel */}
      <div className="shrink-0 flex items-center justify-between border-b border-discord-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-discord-textNormal tracking-tight">
            Welcome back, <span className="text-discord-accent">{displayName}</span>
          </h1>
          <p className="text-[11px] text-discord-textMuted mt-1 font-semibold flex items-center space-x-2">
            <span>{dateStr}</span>
            <span className="text-discord-border">•</span>
            <span className="font-mono bg-discord-secondary px-2 py-0.5 rounded text-discord-textNormal border border-discord-border">{timeStr}</span>
          </p>
        </div>

        {/* Control Layout Settings — Pro only */}
        <div className="relative">
          {plan === 'Pro' ? (
            <>
              <button
                onClick={() => setShowLayoutCustomizer(!showLayoutCustomizer)}
                className="p-2 bg-discord-secondary/40 border border-discord-border hover:bg-discord-hover text-[#dbdee1] rounded-xl flex items-center space-x-1.5 transition text-xs font-bold active:scale-95 cursor-pointer"
              >
                <LayoutGrid className="w-4 h-4 text-discord-accent" />
                <span>Customize Dashboard</span>
              </button>

              {showLayoutCustomizer && (
                <div className="absolute right-0 top-11 bg-discord-secondary border border-discord-border rounded-xl p-3 w-56 shadow-2xl space-y-2.5 animate-scaleIn z-50">
                  <span className="text-[9px] text-discord-textMuted font-bold uppercase tracking-wider block border-b border-[#313338] pb-1.5">Configure Widget Board</span>
                  <div className="space-y-1.5 text-xs font-semibold">
                    {Object.keys(widgetVisibility).map((key) => (
                      <button
                        key={key}
                        onClick={() => toggleWidget(key)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-discord-hover transition text-[#dbdee1]"
                      >
                        <span className="capitalize">{key === 'recent' ? 'Recent Downloads' : key === 'stats' ? 'Statistics Widget' : key === 'platform' ? 'Platform Chart' : key === 'storage' ? 'Storage Donut' : key === 'activity' ? 'Activity Log' : 'System Specs'}</span>
                        {widgetVisibility[key] ? <Eye className="w-4 h-4 text-[#23a55a]" /> : <EyeOff className="w-4 h-4 text-discord-textMuted" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => showUpgradeToast('Dashboard customization is a Pro feature', 'Pro')}
              className="p-2 bg-discord-secondary/40 border border-discord-border hover:bg-discord-hover text-discord-textMuted rounded-xl flex items-center space-x-1.5 transition text-xs font-bold active:scale-95 cursor-pointer opacity-60"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Customize Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Downloader Mode Tab Switcher */}
      <div className="flex items-center space-x-1.5 border-b border-discord-border pb-3 shrink-0">
        <button
          onClick={() => setDownloaderTab('single')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            downloaderTab === 'single'
              ? 'bg-discord-secondary text-discord-textNormal border border-discord-border'
              : 'text-discord-textMuted hover:text-discord-textNormal'
          }`}
        >
          Single Downloader
        </button>
        <button
          type="button"
          onClick={() => {
            if (plan === 'Free') {
              showUpgradeToast('Batch Link Downloading is a Plus / Pro plan feature.', 'Plus');
            } else {
              setDownloaderTab('batch');
            }
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center space-x-1.5 ${
            downloaderTab === 'batch'
              ? 'bg-discord-secondary text-[#dbdee1] border border-discord-border'
              : 'text-discord-textMuted hover:text-discord-textNormal'
          }`}
        >
          <span>Batch Downloader</span>
          {plan === 'Free' ? (
            <span className="text-[8px] font-extrabold uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-1 py-0.2 rounded shrink-0">
              Plus
            </span>
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-discord-accent animate-pulse" />
          )}
        </button>
      </div>

      {downloaderTab === 'single' ? (
        <form onSubmit={handleAnalyze} className="w-full shrink-0">
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative group bg-discord-secondary rounded-xl border border-discord-border focus-within:border-discord-accent transition-all duration-300 shadow-md p-1 flex items-center"
          >
            <Search className="w-5 h-5 text-discord-textMuted/60 group-focus-within:text-discord-accent transition-colors ml-4 shrink-0" />
            <input
              type="text"
              value={url}
              onFocus={handleInputFocus}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste media link here (YouTube, Instagram, Spotify...) or drag & drop..."
              disabled={analyzing}
              className="w-full bg-transparent text-discord-textNormal pl-3 pr-28 py-3.5 focus:outline-none text-xs select-text font-semibold caret-discord-accent"
            />
            <button
              type="submit"
              disabled={analyzing || !url.trim()}
              className="bg-discord-accent hover:bg-[#4752c4] disabled:bg-[#5865f2]/50 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition duration-200 flex items-center space-x-1.5 absolute right-1.5 top-1.5 h-[38px] cursor-pointer"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Parse link</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="glass-panel rounded-2xl border border-discord-border p-5 space-y-4 shadow-xl animate-scaleIn bg-discord-secondary/10">
          <div className="flex justify-between items-center select-none border-b border-discord-border pb-3">
            <div>
              <h2 className="text-xs font-extrabold text-discord-textNormal uppercase tracking-wider">Spontaneous Batch Downloader</h2>
              <p className="text-[10px] text-discord-textMuted font-semibold mt-0.5">Paste links list (one link per line) or upload links file (.txt)</p>
            </div>
            
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-discord-secondary border border-discord-border hover:bg-discord-hover text-discord-textNormal text-[10px] font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Get TXT Template</span>
            </button>
          </div>

          <form onSubmit={handleBatchSubmit} className="space-y-4">
            {batchError && (
              <p className="text-[10px] font-extrabold text-discord-danger bg-discord-danger/5 border border-discord-danger/15 px-3 py-2 rounded-lg">
                ⚠️ {batchError}
              </p>
            )}

            {batchStatusMsg && (
              <p className="text-[10px] font-extrabold text-discord-accent bg-discord-accent/5 border border-discord-accent/15 px-3 py-2 rounded-lg flex items-center">
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" />
                <span>{batchStatusMsg}</span>
              </p>
            )}

            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={"Paste list of URLs here (one link per line) e.g.,\nhttps://www.youtube.com/watch?dQw4w9WgXcQ\nhttps://open.spotify.com/track/4PTG3Z6ehGkBF3zIqYQGSy\n\nOr drag & drop a URL directly here →"}
              rows={5}
              disabled={batchParsing}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-discord-accent'); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove('border-discord-accent'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-discord-accent');
                const droppedText = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '';
                if (droppedText.trim()) {
                  setBatchInput((prev) => prev ? prev + '\n' + droppedText.trim() : droppedText.trim());
                }
              }}
              className="w-full bg-discord-secondary text-[#dbdee1] text-xs px-4 py-3 rounded-xl border border-discord-border focus:outline-none focus:border-discord-accent font-semibold leading-relaxed resize-none font-mono placeholder:opacity-50 select-text transition-colors duration-150"
            />

            <div className="flex items-center justify-between gap-4">
              {/* File upload selector */}
              <div className="relative overflow-hidden cursor-pointer flex items-center space-x-2 px-3.5 py-2.5 bg-discord-secondary border border-discord-border hover:bg-discord-hover rounded-xl shadow-sm text-discord-textNormal text-[10px] font-bold uppercase transition">
                <Upload className="w-3.5 h-3.5 text-discord-accent" />
                <span>Upload link list file (.txt)</span>
                <input
                  type="file"
                  accept=".txt"
                  disabled={batchParsing}
                  onChange={handleBatchFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={batchParsing || !batchInput.trim()}
                className="px-6 py-2.5 bg-discord-accent hover:bg-[#4752c4] disabled:bg-[#5865f2]/40 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition shadow flex items-center space-x-2 cursor-pointer"
              >
                {batchParsing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Queuing Batch...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Start Spontaneous Download</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Parsing progress spinner */}
      {analyzing && (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-discord-border animate-pulse p-6">
          <div className="h-4 w-48 bg-discord-hover rounded mb-4 skeleton-shimmer animate-shimmer" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-4">
              <div className="aspect-video w-full rounded-lg bg-discord-hover skeleton-shimmer animate-shimmer" />
              <div className="h-4 w-full bg-discord-hover rounded skeleton-shimmer" />
            </div>
            <div className="md:col-span-8 space-y-4">
              <div className="h-10 w-full bg-discord-hover rounded skeleton-shimmer" />
              <div className="h-10 w-full bg-discord-hover rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="bg-discord-danger/10 border border-discord-danger/20 rounded-xl p-4 flex items-start space-x-3 animate-scaleIn">
          <AlertCircle className="w-5 h-5 text-discord-danger shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-discord-textNormal font-sans">URL parsing error</div>
            <div className="text-xs text-discord-textNormal/75 mt-0.5 leading-relaxed font-semibold">{error}</div>
          </div>
        </div>
      )}

      {/* Parse result detail panel */}
      {result && !analyzing && (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-discord-border animate-scaleIn bg-discord-secondary/20">
          {platformLocked ? (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-discord-danger/10 flex items-center justify-center text-discord-danger border border-discord-danger/20">
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h2 className="text-sm font-bold text-discord-textNormal">Platform Support Locked</h2>
                <p className="text-xs text-discord-textMuted font-semibold leading-relaxed">
                  Your <span className="text-discord-accent font-bold uppercase">{plan} Plan</span> does not support downloading files from <span className="text-discord-textNormal font-bold">{result.platform}</span>.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-discord-secondary/50 px-5 py-3 border-b border-discord-border flex items-center justify-between">
                <span className="text-[10px] font-bold text-discord-accent uppercase tracking-wider flex items-center">
                  <span className="w-2 h-2 rounded-full bg-discord-accent inline-block animate-ping mr-2"></span>
                  Detected Platform: {result.platform}
                </span>
                {result.duration && <span className="text-xs text-discord-textMuted font-semibold">Duration: {formatDuration(result.duration)}</span>}
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Info block */}
                <div className="md:col-span-4 flex flex-col space-y-2">
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-discord-tertiary border border-discord-border relative">
                    {(result as any).thumbnailUrl || (result as any).coverUrl ? (
                      <img src={(result as any).thumbnailUrl || (result as any).coverUrl} alt={result.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-discord-textMuted text-xs font-semibold">No Image</div>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-discord-textNormal leading-snug line-clamp-2">{result.title}</h3>
                  {result.channel && <p className="text-[10px] text-discord-textMuted font-semibold">{result.channel}</p>}
                </div>

                {/* Configurations */}
                <div className="md:col-span-8 flex flex-col space-y-4 justify-between">
                  <div className="space-y-4 text-xs font-semibold">
                    {result.platform !== 'Spotify' && (
                      <div>
                        <label className="block text-discord-textMuted text-[10px] font-bold uppercase mb-1.5">Download Type</label>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => { setContentType('video'); setSelectedFormat('MP4'); }}
                            className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center space-x-2 transition ${
                              contentType === 'video' ? 'bg-discord-accent/15 border-discord-accent text-discord-textNormal' : 'bg-discord-secondary border-discord-border text-discord-textMuted'
                            }`}
                          >
                            <FileVideo className="w-4 h-4" />
                            <span>Video + Audio</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setContentType('audio'); setSelectedFormat('MP3'); }}
                            className={`flex-1 py-2 px-3 rounded-lg border flex items-center justify-center space-x-2 transition ${
                              contentType === 'audio' ? 'bg-discord-accent/15 border-discord-accent text-discord-textNormal' : 'bg-discord-secondary border-discord-border text-discord-textMuted'
                            }`}
                          >
                            <FileAudio className="w-4 h-4" />
                            <span>Audio Only</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Qualities */}
                    {contentType === 'video' && result.platform !== 'Spotify' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-discord-textMuted text-[10px] font-bold uppercase mb-1">Quality</label>
                          <select
                            value={selectedQuality}
                            onChange={(e) => setSelectedQuality(e.target.value)}
                            className="w-full bg-discord-secondary border border-discord-border text-[#dbdee1] rounded px-2.5 py-1.5 text-xs"
                          >
                            <option value="Best Available">{plan === 'Free' ? 'Best (Free max 1080p)' : 'Best Available'}</option>
                            {plan !== 'Free' && <option value="2160p">4K / 2160p</option>}
                            {plan !== 'Free' && <option value="1440p">2K / 1440p</option>}
                            <option value="1080p">FHD / 1080p</option>
                            <option value="720p">HD / 720p</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-discord-textMuted text-[10px] font-bold uppercase mb-1">Container</label>
                          <div className="flex space-x-2">
                            {['MP4', 'MKV', 'WEBM'].map((ext) => (
                              <button
                                key={ext}
                                type="button"
                                onClick={() => setSelectedFormat(ext)}
                                className={`flex-1 py-1.5 rounded text-xs font-bold transition ${
                                  selectedFormat === ext ? 'bg-discord-accent text-white' : 'bg-discord-secondary text-discord-textMuted'
                                }`}
                              >
                                {ext}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {contentType === 'audio' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-discord-textMuted text-[10px] font-bold uppercase mb-1">Audio Bitrate</label>
                          <select
                            value={selectedQuality}
                            onChange={(e) => setSelectedQuality(e.target.value)}
                            className="w-full bg-discord-secondary border border-discord-border text-[#dbdee1] rounded px-2.5 py-1.5 text-xs"
                          >
                            {plan !== 'Free' && <option value="320">320 kbps (High Quality)</option>}
                            {plan !== 'Free' && <option value="256">256 kbps</option>}
                            <option value="192">192 kbps (Free Cap)</option>
                            <option value="128">128 kbps</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-discord-textMuted text-[10px] font-bold uppercase mb-1">Format</label>
                          <div className="flex flex-wrap gap-1.5">
                            {['MP3', 'M4A', 'FLAC', 'WAV'].map((ext) => (
                              <button
                                key={ext}
                                type="button"
                                onClick={() => setSelectedFormat(ext)}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                                  selectedFormat === ext ? 'bg-discord-accent text-white' : 'bg-discord-secondary text-discord-textMuted'
                                }`}
                              >
                                {ext}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleStartDownload}
                    className="w-full bg-discord-accent hover:bg-[#4752c4] text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer active:scale-98 shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Media</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Redesigned Home Dashboard Grid Widgets */}
      {!result && !analyzing && (
        <div className="space-y-6">
          
          {/* Quick Actions Grid (6 cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 shrink-0">
            {[
              { label: 'Paste URL', icon: Search, click: () => addressInputRefFocus(), locked: false, requiredPlan: null as any },
              { label: 'Open Browser', icon: Globe, click: () => window.api.openBrowser(), locked: plan === 'Free', requiredPlan: 'Plus' as const },
              { label: 'Open Downloads', icon: FolderOpen, click: () => window.api.openFolder(settings.downloadFolder || ''), locked: false, requiredPlan: null as any },
              { label: 'View Queue', icon: Layers, click: () => navigate('/queue'), locked: false, requiredPlan: null as any },
              { label: 'Media Library', icon: Folder, click: () => navigate('/downloads'), locked: false, requiredPlan: null as any },
              { label: 'Scheduler', icon: Clock, click: () => navigate('/scheduler'), locked: plan !== 'Pro', requiredPlan: 'Pro' as const }
            ].map((act, i) => (
              <button
                key={i}
                onClick={() => {
                  if (act.locked) {
                    showUpgradeToast(`${act.label} requires ${act.requiredPlan}`, act.requiredPlan);
                  } else {
                    act.click();
                  }
                }}
                className={`bg-discord-card border border-discord-border p-3.5 rounded-xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm transition hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer relative overflow-hidden ${
                  act.locked
                    ? 'opacity-60 hover:border-discord-danger/30'
                    : 'hover:border-discord-accent'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${act.locked ? 'bg-discord-secondary' : 'bg-discord-accent/10 text-discord-accent'}`}>
                  <act.icon className={`w-5 h-5 ${act.locked ? 'text-discord-textMuted' : ''}`} />
                </div>
                <span className={`text-[10px] font-extrabold tracking-wide uppercase ${act.locked ? 'text-discord-textMuted' : 'text-discord-textNormal'}`}>{act.label}</span>
                {act.locked && (
                  <div className="absolute top-1.5 right-1.5">
                    <Lock className="w-3 h-3 text-discord-textMuted" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Core Analytics Metrics (Stats & Circular Storage side-by-side) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Stats Dashboard — Pro only */}
            {plan === 'Pro' && widgetVisibility.stats ? (
              <div className="bg-discord-card border border-discord-border rounded-2xl p-4 md:col-span-2 flex flex-col justify-between shadow-sm">
                <div className="border-b border-[#313338] pb-2 mb-3">
                  <h3 className="text-xs font-bold text-discord-textNormal uppercase tracking-wider flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-discord-accent" />
                    <span>Download Metrics Board</span>
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
                  <div className="bg-discord-secondary/30 p-2.5 rounded-xl border border-discord-border">
                    <span className="text-[9px] text-discord-textMuted uppercase block">Total Completed</span>
                    <span className="text-base font-extrabold text-discord-textNormal mt-0.5 inline-block">{dbStats?.total || 0} files</span>
                  </div>
                  <div className="bg-discord-secondary/30 p-2.5 rounded-xl border border-discord-border">
                    <span className="text-[9px] text-discord-textMuted uppercase block">Storage Used</span>
                    <span className="text-base font-extrabold text-discord-textNormal mt-0.5 inline-block">{formatBytes(dbStats?.totalBytes || 0)}</span>
                  </div>
                  <div className="bg-discord-secondary/30 p-2.5 rounded-xl border border-discord-border">
                    <span className="text-[9px] text-discord-textMuted uppercase block">Downloads Today</span>
                    <span className="text-base font-extrabold text-[#23a55a] mt-0.5 inline-block">{dbStats?.todayCount || 0} files</span>
                  </div>
                  <div className="bg-discord-secondary/30 p-2.5 rounded-xl border border-discord-border">
                    <span className="text-[9px] text-discord-textMuted uppercase block">Favorite Hub</span>
                    <span className="text-base font-extrabold text-discord-accent mt-0.5 inline-block truncate max-w-full">{dbStats?.favPlatform || 'YouTube'}</span>
                  </div>
                </div>
              </div>
            ) : plan !== 'Pro' ? (
              <LockedWidgetCard title="Download Metrics" requiredPlan="Pro" className="md:col-span-2" />
            ) : null}

            {/* Circular Storage Widget — Pro only */}
            {plan === 'Pro' && widgetVisibility.storage ? (
              <div className="bg-discord-card border border-discord-border rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <div className="border-b border-[#313338] pb-2 mb-2">
                  <h3 className="text-xs font-bold text-discord-textNormal uppercase tracking-wider flex items-center space-x-1.5">
                    <HardDrive className="w-4 h-4 text-discord-accent" />
                    <span>Disk Capacity</span>
                  </h3>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative w-14 h-14 shrink-0">
                    <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                      <path className="text-[#313338]" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-discord-accent" strokeDasharray={`${diskStats ? ((diskStats.usedBytes / diskStats.totalBytes) * 100).toFixed(0) : 10}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-discord-textNormal">
                      {diskStats ? ((diskStats.usedBytes / diskStats.totalBytes) * 100).toFixed(0) : '0'}%
                    </div>
                  </div>
                  <div className="text-[10px] space-y-0.5 font-bold text-[#dbdee1] flex-1">
                    <div className="flex justify-between"><span className="text-discord-textMuted">Total Drive Space</span><span>{diskStats ? formatBytes(diskStats.totalBytes) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-discord-textMuted">Free Space</span><span className="text-[#23a55a]">{diskStats ? formatBytes(diskStats.freeBytes) : '—'}</span></div>
                    <div className="flex justify-between border-t border-[#313338] pt-1 mt-1"><span className="text-discord-textMuted">Download Folder Size</span><span className="text-discord-accent">{dbStats ? formatBytes(dbStats.totalBytes) : '—'}</span></div>
                  </div>
                </div>
              </div>
            ) : plan !== 'Pro' ? (
              <LockedWidgetCard title="Disk Storage Gauge" requiredPlan="Pro" />
            ) : null}
          </div>

          {/* Lower Grid: Platform Overviews & Timelines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Platform usage charts — Plus + Pro */}
            {(plan === 'Plus' || plan === 'Pro') && widgetVisibility.platform ? (
              <div className="bg-discord-card border border-discord-border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="border-b border-[#313338] pb-2 mb-3">
                  <h3 className="text-xs font-bold text-discord-textNormal uppercase tracking-wider">Usage Overview</h3>
                </div>
                <div className="space-y-3 font-semibold text-xs text-[#dbdee1]">
                  {[
                    { name: 'YouTube', color: 'bg-red-500', count: dbStats?.platformCounts?.YouTube || 0 },
                    { name: 'Spotify', color: 'bg-emerald-500', count: dbStats?.platformCounts?.Spotify || 0 },
                    { name: 'Instagram', color: 'bg-pink-500', count: dbStats?.platformCounts?.Instagram || 0 },
                    { name: 'TikTok', color: 'bg-[#00f2fe]', count: dbStats?.platformCounts?.TikTok || 0 }
                  ].map((plat, idx) => {
                    const total = dbStats?.total || 1;
                    const pct = Math.min((plat.count / total) * 100, 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[10px]"><span>{plat.name}</span><span className="text-discord-textMuted">{plat.count} files ({pct.toFixed(0)}%)</span></div>
                        <div className="w-full h-2 bg-[#111214] rounded-full overflow-hidden"><div className={`h-full rounded-full ${plat.color}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : plan === 'Free' ? (
              <LockedWidgetCard title="Platform Usage Chart" requiredPlan="Plus" />
            ) : null}

            {/* Recent Timeline Activities — Plus + Pro */}
            {(plan === 'Plus' || plan === 'Pro') && widgetVisibility.activity ? (
              <div className="bg-discord-card border border-discord-border rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <div className="border-b border-[#313338] pb-2 mb-3">
                  <h3 className="text-xs font-bold text-discord-textNormal uppercase tracking-wider">Local Activity timeline</h3>
                </div>
                <div className="space-y-3.5 min-h-[160px] flex flex-col justify-center">
                  {recentActivities.length === 0 ? (
                    <span className="text-[10px] text-discord-textMuted text-center font-bold">No logs parsed yet.</span>
                  ) : (
                    recentActivities.map((act: any) => (
                      <div key={act.id} className="flex items-start space-x-2.5 text-xs text-[#dbdee1]">
                        <Clock className="w-4 h-4 text-discord-accent shrink-0 mt-0.5 animate-pulse" />
                        <div className="min-w-0 flex-1 leading-snug">
                          <p className="font-semibold text-discord-textNormal break-words line-clamp-1">{act.description}</p>
                          <span className="text-[9px] text-discord-textMuted font-bold uppercase">{new Date(act.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : plan === 'Free' ? (
              <LockedWidgetCard title="Activity Log" requiredPlan="Plus" />
            ) : null}
          </div>

          {/* Recent downloads table */}
          {widgetVisibility.recent && recentDownloads.length > 0 && (
            <div className="bg-discord-card border border-discord-border rounded-2xl p-4 shadow-sm">
              <div className="border-b border-[#313338] pb-2.5 mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-discord-textNormal uppercase tracking-wider">Recent Completed Downloads</h3>
                <button 
                  onClick={() => navigate('/downloads')}
                  className="text-[10px] font-bold text-discord-accent hover:underline uppercase"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {recentDownloads.map((dl: any) => (
                  <div key={dl.id} className="bg-discord-secondary/30 border border-discord-border p-2.5 rounded-xl flex items-center space-x-3 hover:bg-discord-secondary/60 transition duration-150">
                    <div className="w-9 h-9 rounded overflow-hidden shrink-0 border border-discord-border relative bg-discord-secondary">
                      {dl.thumbnailUrl ? (
                        <img src={dl.thumbnailUrl} alt={dl.title} className="w-full h-full object-cover" />
                      ) : (
                        <PlayCircle className="w-5 h-5 absolute inset-2 text-discord-textMuted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[8px] font-extrabold bg-[#2b2d31]/50 px-1.5 py-0.5 rounded text-discord-textMuted uppercase">{dl.platform}</span>
                      <h4 className="text-[11px] font-bold text-discord-textNormal truncate mt-0.5 leading-snug">{dl.title}</h4>
                      <p className="text-[9px] text-discord-textMuted mt-0.5 truncate">{formatBytes(dl.fileSize || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Downloads Widget (Mini Queue) */}
          {activeOrder.length > 0 && (
            <div className="bg-discord-card border border-discord-border rounded-2xl p-4 shadow-sm">
              <div className="border-b border-[#313338] pb-2.5 mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-discord-textNormal uppercase tracking-wider flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-discord-accent inline-block animate-ping mr-2"></span>
                  <span>Active Processes (Mini Queue)</span>
                </h3>
                <button
                  onClick={() => navigate('/queue')}
                  className="text-[10px] font-bold text-discord-accent hover:underline uppercase"
                >
                  Configure Manager
                </button>
              </div>

              <div className="space-y-2">
                {activeOrder.slice(0, 3).map((id) => {
                  const item = activeDownloads[id];
                  if (!item) return null;
                  return (
                    <div key={id} className="bg-discord-secondary/30 border border-discord-border px-3 py-2 rounded-xl flex items-center justify-between text-xs font-semibold text-[#dbdee1]">
                      <div className="min-w-0 flex-1 mr-4">
                        <span className="text-[9px] font-bold uppercase bg-discord-hover px-2 py-0.5 rounded text-discord-textMuted mr-2">{item.platform}</span>
                        <span className="text-discord-textNormal font-bold truncate leading-tight inline-block align-middle max-w-[200px] sm:max-w-[400px]">{item.title}</span>
                      </div>
                      
                      {/* Mini actions */}
                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="text-[10px] text-discord-accent">{item.progress ? `${Math.round(item.progress)}%` : 'waiting...'}</span>
                        <div className="flex items-center space-x-1">
                          {item.status === 'downloading' ? (
                            <button onClick={() => pauseDownload(id)} className="p-1 hover:bg-[#35363c] rounded text-discord-textMuted hover:text-[#dbdee1]"><Pause className="w-3.5 h-3.5" /></button>
                          ) : (
                            <button onClick={() => resumeDownload(id)} className="p-1 hover:bg-[#35363c] rounded text-discord-accent hover:text-[#dbdee1]"><Play className="w-3.5 h-3.5" /></button>
                          )}
                          <button onClick={() => cancelDownload(id)} className="p-1 hover:bg-discord-danger/10 rounded text-discord-textMuted hover:text-discord-danger"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System status widgets panel — Pro only */}
          {plan === 'Pro' && widgetVisibility.system && sysInfo && (
            <div className="bg-discord-card border border-discord-border rounded-2xl p-4 shadow-sm">
              <div className="border-b border-[#313338] pb-2 mb-3">
                <h3 className="text-xs font-bold text-[#dbdee1] uppercase tracking-wider">Native Server Specs Status</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[10px] font-bold text-discord-textMuted select-none">
                <div className="bg-[#111214]/40 border border-discord-border p-2.5 rounded-xl flex items-center justify-between">
                  <span>FFmpeg</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] ${sysInfo.ffmpegVersion !== '—' ? 'bg-[#23a55a]/10 text-[#23a55a]' : 'bg-[#da373c]/10 text-[#da373c]'}`}>{sysInfo.ffmpegVersion !== '—' ? 'OK' : 'MISSING'}</span>
                </div>
                <div className="bg-[#111214]/40 border border-discord-border p-2.5 rounded-xl flex items-center justify-between">
                  <span>yt-dlp</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] ${sysInfo.ytdlpVersion !== '—' ? 'bg-[#23a55a]/10 text-[#23a55a]' : 'bg-[#da373c]/10 text-[#da373c]'}`}>{sysInfo.ytdlpVersion !== '—' ? 'OK' : 'MISSING'}</span>
                </div>
                <div className="bg-[#111214]/40 border border-discord-border p-2.5 rounded-xl flex items-center justify-between">
                  <span>Internet</span>
                  <span className="bg-[#23a55a]/10 text-[#23a55a] px-2 py-0.5 rounded text-[9px]">ONLINE</span>
                </div>
                <div className="bg-[#111214]/40 border border-discord-border p-2.5 rounded-xl flex items-center justify-between">
                  <span>Electron</span>
                  <span className="text-[#dbdee1] font-mono font-semibold">{sysInfo.electronVersion}</span>
                </div>
                <div className="bg-[#111214]/40 border border-discord-border p-2.5 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
                  <span>Node.js</span>
                  <span className="text-[#dbdee1] font-mono font-semibold">{sysInfo.nodeVersion}</span>
                </div>
              </div>
            </div>
          )}
          {plan !== 'Pro' && widgetVisibility.system && (
            <LockedWidgetCard title="System Specs Status" requiredPlan="Pro" />
          )}

        </div>
      )}
    </div>
  );

  // Helper to focus url address input field
  function addressInputRefFocus() {
    const el = document.querySelector('input[placeholder*="Paste media link"]');
    if (el) {
      (el as HTMLInputElement).focus();
      (el as HTMLInputElement).select();
    }
  }
};

export default Dashboard;
export { Dashboard };
