import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, X, Layers, Clock, 
  AlertTriangle, ArrowUp, ArrowDown, 
  Sparkles, Folder, ExternalLink,
  Info, Activity, Trash2, Lock, Zap,
  FileVideo, FileAudio, Globe, CheckCircle2
} from 'lucide-react';
import { useDownloadStore, DownloadItem } from '../store/downloadStore';
import { useSettingsStore } from '../store/settingsStore';
import { showUpgradeToast } from './UpgradeToast';

const QueueManager: React.FC = () => {
  const { 
    activeDownloads, 
    activeOrder, 
    speedHistory, 
    selectedDownloadId,
    setSelectedDownloadId,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    pauseAll,
    resumeAll,
    cancelAll,
    reorderQueue
  } = useDownloadStore();
  const { settings } = useSettingsStore();

  const plan = settings.plan || 'Free';
  const items = activeOrder.map(id => activeDownloads[id]).filter(Boolean);

  // Compute status metrics
  const activeCount = items.filter(i => i.status === 'downloading').length;
  const queuedCount = items.filter(i => i.status === 'queued').length;
  const pausedCount = items.filter(i => i.status === 'paused').length;

  const selectedItem = selectedDownloadId ? activeDownloads[selectedDownloadId] : null;

  // Bandwidth stats for graph
  const currentSpeed = speedHistory[speedHistory.length - 1] || 0;
  const peakSpeed = Math.max(...speedHistory, 0);
  const avgSpeed = speedHistory.filter(v => v > 0).reduce((s, v) => s + v, 0) / (speedHistory.filter(v => v > 0).length || 1);

  const formatSpeed = (kbSpeed: number) => {
    if (kbSpeed >= 1024) return `${(kbSpeed / 1024).toFixed(1)} MB/s`;
    return `${Math.round(kbSpeed)} KB/s`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // SVG graph path generator
  const generateGraphPath = () => {
    if (speedHistory.length < 2) return '';
    const width = 500;
    const height = 80;
    const maxVal = Math.max(peakSpeed, 512); // at least 512 KB/s scale

    return speedHistory.map((val, idx) => {
      const x = (idx / (speedHistory.length - 1)) * width;
      const y = height - (val / maxVal) * (height * 0.85) - 4;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const getPlatformColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p === 'youtube' || p === 'youtube music') return 'bg-red-500/10 border-red-500/25 text-red-400';
    if (p === 'spotify') return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400';
    if (p === 'instagram') return 'bg-pink-500/10 border-pink-500/25 text-pink-400';
    if (p === 'tiktok') return 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400';
    if (p === 'x (twitter)' || p === 'twitter') return 'bg-sky-500/10 border-sky-500/25 text-sky-400';
    return 'bg-discord-accent/10 border-discord-accent/25 text-discord-accent';
  };

  const getStatusColor = (status: DownloadItem['status']) => {
    switch (status) {
      case 'downloading': return 'text-discord-accent';
      case 'paused': return 'text-amber-400';
      case 'failed': return 'text-discord-danger';
      case 'completed': return 'text-discord-success';
      default: return 'text-discord-textMuted';
    }
  };

  // Handle metadata panel click — gate to Plus/Pro
  const handleItemClick = (id: string) => {
    if (plan === 'Free') {
      showUpgradeToast('Job Metadata Details is a Plus / Pro feature', 'Plus');
      return;
    }
    setSelectedDownloadId(id);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto flex h-full select-none overflow-hidden animate-fadeIn gap-6 py-2">
      {/* Left Area: Controls, Graphs, and Items List */}
      <div className="flex-1 flex flex-col min-w-0 h-full space-y-4">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-discord-textNormal flex items-center space-x-2.5">
              <Layers className="w-6 h-6 text-discord-accent animate-pulse" />
              <span>Download Manager</span>
            </h1>
            <p className="text-xs text-discord-textMuted mt-1 font-medium">
              Manage your active download session and configure real-time queue priorities.
            </p>
          </div>
          
          {/* Queue Actions */}
          <div className="flex items-center space-x-1.5 bg-discord-secondary/30 p-1 rounded-xl border border-discord-border">
            <button
              onClick={resumeAll}
              className="btn-secondary text-[11px] py-1.5 px-3 flex items-center space-x-1 hover:text-discord-success"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume All</span>
            </button>
            <button
              onClick={pauseAll}
              className="btn-secondary text-[11px] py-1.5 px-3 flex items-center space-x-1 hover:text-amber-500"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause All</span>
            </button>
            <button
              onClick={cancelAll}
              className="btn-secondary text-[11px] py-1.5 px-3 flex items-center space-x-1 hover:text-discord-danger"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel All</span>
            </button>
          </div>
        </div>

        {/* Live Bandwidth Graph Banner */}
        <div className="bg-discord-card border border-discord-border rounded-xl p-4 shrink-0 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1 shrink-0">
            <div className="text-[9px] text-discord-textMuted uppercase font-extrabold tracking-widest">Live Speed Graph</div>
            <div className="text-2xl font-black text-discord-textNormal tracking-tight font-mono">
              {currentSpeed > 0 ? formatSpeed(currentSpeed) : '0 KB/s'}
            </div>
            <div className="flex items-center space-x-3 text-[10px] font-semibold text-discord-textMuted">
              <span className="flex items-center">
                <Activity className="w-3 h-3 mr-1 text-discord-success" /> 
                Avg: {avgSpeed > 0 ? formatSpeed(avgSpeed) : '0 KB/s'}
              </span>
              <span className="flex items-center">
                <Sparkles className="w-3 h-3 mr-1 text-amber-400" /> 
                Peak: {peakSpeed > 0 ? formatSpeed(peakSpeed) : '0 KB/s'}
              </span>
              <span className="flex items-center">
                <Zap className="w-3 h-3 mr-1 text-discord-accent" />
                {activeCount} active
              </span>
            </div>
          </div>
          
          {/* SVG Chart — wide, live-updating */}
          <div className="flex-1 h-16 relative min-w-0">
            <svg className="w-full h-full" viewBox="0 0 500 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {speedHistory.some(v => v > 0) && (
                <path
                  d={`${generateGraphPath()} L 500 80 L 0 80 Z`}
                  fill="url(#chartGrad)"
                />
              )}
              <path
                d={generateGraphPath()}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Quick statistics widgets */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-discord-card border border-discord-border rounded-xl p-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-discord-textMuted uppercase">Active Jobs</span>
            <span className="text-sm font-extrabold text-discord-accent bg-discord-accent/15 px-2.5 py-0.5 rounded-full">{activeCount}</span>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-discord-textMuted uppercase">Queued Jobs</span>
            <span className="text-sm font-extrabold text-discord-textNormal bg-discord-hover/50 px-2.5 py-0.5 rounded-full">{queuedCount}</span>
          </div>
          <div className="bg-discord-card border border-discord-border rounded-xl p-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-discord-textMuted uppercase">Paused Jobs</span>
            <span className="text-sm font-extrabold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">{pausedCount}</span>
          </div>
        </div>

        {/* Queue Items Table Container */}
        <div className="flex-1 min-h-0 bg-discord-secondary/20 rounded-2xl border border-discord-border overflow-hidden flex flex-col">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <Layers className="w-16 h-16 text-discord-textMuted/20" />
              <div>
                <div className="text-sm font-extrabold text-discord-textNormal">Active queue is empty</div>
                <div className="text-xs text-discord-textMuted max-w-xs mt-1 font-semibold">
                  Start downloads from the Home Dashboard to monitor operations here.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pr-2">
              {items.map((item, index) => {
                const isSelected = item.id === selectedDownloadId;
                const progressPct = Math.min(Math.max(item.progress || 0, 0), 100);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`bg-discord-card border rounded-xl p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-discord-accent shadow-md bg-discord-secondary/40'
                        : 'border-discord-border hover:border-discord-hover hover:bg-discord-secondary/20 shadow-sm'
                    }`}
                  >
                    {/* Reorder + platform info */}
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex flex-col space-y-1">
                        <button
                          disabled={index === 0}
                          onClick={(e) => { e.stopPropagation(); reorderQueue(index, index - 1); }}
                          className="p-0.5 hover:bg-discord-hover rounded disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === items.length - 1}
                          onClick={(e) => { e.stopPropagation(); reorderQueue(index, index + 1); }}
                          className="p-0.5 hover:bg-discord-hover rounded disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <span className={`text-[9px] font-extrabold border px-2 py-0.5 rounded uppercase select-none ${getPlatformColor(item.platform)}`}>
                            {item.platform}
                          </span>
                          <span className="text-[9px] font-bold bg-discord-hover/50 px-2 py-0.5 rounded text-discord-textMuted uppercase">
                            {item.contentType}
                          </span>
                          {item.format && (
                            <span className="text-[9px] font-bold bg-discord-accent/10 border border-discord-accent/20 px-2 py-0.5 rounded text-discord-accent uppercase">
                              {item.format}
                            </span>
                          )}
                          {item.quality && item.quality !== 'Best Available' && (
                            <span className="text-[9px] font-bold bg-discord-secondary px-2 py-0.5 rounded text-discord-textMuted uppercase">
                              {item.quality}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-discord-textNormal truncate mt-1 leading-tight">{item.title}</h3>
                        <p className="text-[10px] text-discord-textMuted mt-0.5 font-semibold">
                          {item.channel || 'Fetching details...'}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking — real time */}
                    <div className="w-56 shrink-0 flex flex-col space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className={`capitalize font-extrabold ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        {item.status === 'downloading' && item.speed && (
                          <span className="text-discord-textMuted font-mono text-[9px]">{item.speed}</span>
                        )}
                        <span className="text-discord-textNormal font-mono font-black">{progressPct.toFixed(1)}%</span>
                      </div>
                      
                      <div className="w-full h-1.5 bg-discord-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            item.status === 'paused' 
                              ? 'bg-amber-500' 
                              : item.status === 'failed'
                              ? 'bg-discord-danger'
                              : 'bg-discord-accent'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {item.status === 'downloading' && item.eta && item.eta !== '--:--' && (
                        <div className="text-[9px] text-discord-textMuted font-semibold flex items-center">
                          <Clock className="w-2.5 h-2.5 mr-1 shrink-0" />
                          ETA {item.eta}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {item.status === 'downloading' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); pauseDownload(item.id); }}
                          className="p-1.5 hover:bg-discord-hover rounded-lg text-discord-textMuted hover:text-amber-400 transition"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {(item.status === 'paused' || item.status === 'failed') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); resumeDownload(item.id); }}
                          className="p-1.5 hover:bg-discord-hover rounded-lg text-discord-accent hover:text-discord-textNormal transition"
                          title="Resume"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); cancelDownload(item.id); }}
                        className="p-1.5 hover:bg-discord-danger/10 rounded-lg text-discord-textMuted hover:text-discord-danger transition"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Job Metadata — Plus/Pro only */}
      {selectedItem && plan !== 'Free' ? (
        <div className="w-80 shrink-0 bg-discord-secondary/35 border border-discord-border rounded-2xl flex flex-col h-full overflow-hidden animate-slideInRight select-none">
          {/* Panel Header */}
          <div className="p-4 border-b border-discord-border flex items-center justify-between shrink-0 bg-discord-secondary/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-discord-textNormal flex items-center space-x-1.5">
              <Info className="w-4 h-4 text-discord-accent" />
              <span>Job Metadata Details</span>
            </h3>
            <button
              onClick={() => setSelectedDownloadId(null)}
              className="p-1 hover:bg-discord-hover rounded-lg text-discord-textMuted hover:text-discord-textNormal transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

            {/* Title */}
            <div className="space-y-1 bg-discord-card border border-discord-border p-3 rounded-xl shadow-sm">
              <span className="text-[9px] text-discord-textMuted font-extrabold uppercase tracking-widest block">Media Title</span>
              <div className="font-bold text-discord-textNormal leading-snug break-all">{selectedItem.title}</div>
            </div>

            {/* Platform + Type + Format + Quality */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-discord-card border border-discord-border p-2.5 rounded-xl">
                <span className="text-[9px] text-discord-textMuted font-extrabold uppercase block mb-0.5">Platform</span>
                <span className={`font-bold text-[11px] ${getPlatformColor(selectedItem.platform).split(' ').pop()}`}>{selectedItem.platform}</span>
              </div>
              <div className="bg-discord-card border border-discord-border p-2.5 rounded-xl">
                <span className="text-[9px] text-discord-textMuted font-extrabold uppercase block mb-0.5">Content Type</span>
                <span className="font-bold text-discord-textNormal mt-0.5 inline-flex items-center space-x-1 capitalize">
                  {selectedItem.contentType === 'audio' 
                    ? <FileAudio className="w-3 h-3" /> 
                    : <FileVideo className="w-3 h-3" />}
                  <span>{selectedItem.contentType}</span>
                </span>
              </div>
              <div className="bg-discord-card border border-discord-border p-2.5 rounded-xl">
                <span className="text-[9px] text-discord-textMuted font-extrabold uppercase block mb-0.5">Format</span>
                <span className="font-black text-discord-accent uppercase text-[11px]">{selectedItem.format || 'Auto'}</span>
              </div>
              <div className="bg-discord-card border border-discord-border p-2.5 rounded-xl">
                <span className="text-[9px] text-discord-textMuted font-extrabold uppercase block mb-0.5">Quality</span>
                <span className="font-bold text-discord-textNormal text-[11px]">{selectedItem.quality || 'Best Available'}</span>
              </div>
            </div>

            {/* URL */}
            <div className="space-y-1 border-t border-discord-border/40 pt-3">
              <span className="text-[9px] text-discord-textMuted font-extrabold uppercase tracking-widest block">Download Address (URL)</span>
              <div className="bg-discord-secondary/50 px-2 py-1.5 rounded text-[9px] text-discord-textNormal break-all font-mono leading-relaxed max-h-20 overflow-y-auto">
                {selectedItem.url || selectedItem.id}
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-1">
              <span className="text-[9px] text-discord-textMuted font-extrabold uppercase tracking-widest block">Destination Folder</span>
              <div className="bg-discord-secondary/50 px-2.5 py-1.5 rounded text-[10px] text-discord-textNormal flex items-center justify-between">
                <span className="truncate mr-2 font-semibold">Downloads/{selectedItem.platform}</span>
                <Folder className="w-3.5 h-3.5 text-discord-accent shrink-0" />
              </div>
            </div>

            {/* Real-time stats */}
            <div className="space-y-2 border-t border-discord-border/40 pt-3">
              <h4 className="text-[9px] text-discord-textMuted font-extrabold uppercase tracking-widest">Live Transfer Metrics</h4>
              
              {/* Live progress bar inside metadata */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-discord-textMuted">Progress</span>
                  <span className="text-discord-textNormal font-mono font-black">{(selectedItem.progress || 0).toFixed(1)}% completed</span>
                </div>
                <div className="w-full h-2 bg-discord-tertiary rounded-full overflow-hidden border border-discord-border/20">
                  <div
                    className="h-full bg-discord-accent rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(selectedItem.progress || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-discord-card border border-discord-border rounded-xl p-3 space-y-2.5 font-semibold">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-discord-textMuted flex items-center space-x-1">
                    <Activity className="w-3 h-3" />
                    <span>Transfer Bandwidth</span>
                  </span>
                  <span className="text-discord-textNormal font-mono font-black">{selectedItem.speed || '0 KB/s'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-discord-textMuted flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Est. Wait Time (ETA)</span>
                  </span>
                  <span className="text-discord-textNormal font-mono">{selectedItem.eta || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-discord-textMuted flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>Status</span>
                  </span>
                  <span className={`font-extrabold capitalize ${getStatusColor(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>
                {selectedItem.fileSize && (
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-discord-textMuted">File Size</span>
                    <span className="text-discord-textNormal font-mono">{formatBytes(selectedItem.fileSize)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error trace if failed */}
            {selectedItem.status === 'failed' && (
              <div className="space-y-1 border-t border-discord-danger/20 pt-3">
                <span className="text-[9px] text-discord-danger font-extrabold uppercase flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>System Failure Trace</span>
                </span>
                <div className="bg-discord-danger/5 border border-discord-danger/15 text-discord-danger p-2.5 rounded-lg text-[10px] font-mono max-h-28 overflow-y-auto leading-relaxed">
                  yt-dlp error: extraction signature failed. Check Internet connection or platform extraction update status.
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-discord-border shrink-0 bg-discord-secondary/50">
            <button
              onClick={() => cancelDownload(selectedItem.id)}
              className="w-full bg-[#da373c] hover:bg-[#c93237] text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel Active Operation</span>
            </button>
          </div>
        </div>
      ) : selectedItem && plan === 'Free' ? (
        /* Free plan metadata lock overlay */
        <div className="w-80 shrink-0 bg-discord-secondary/35 border border-discord-border rounded-2xl flex flex-col h-full overflow-hidden select-none">
          <div className="p-4 border-b border-discord-border flex items-center justify-between shrink-0 bg-discord-secondary/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-discord-textMuted flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Job Metadata Details</span>
            </h3>
            <button onClick={() => setSelectedDownloadId(null)} className="p-1 hover:bg-discord-hover rounded-lg text-discord-textMuted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <Lock className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="space-y-1.5 max-w-[200px]">
              <h3 className="text-sm font-extrabold text-discord-textNormal">Job Metadata Details</h3>
              <span className="text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded inline-block">Plus Plan Required</span>
              <p className="text-[10px] text-discord-textMuted font-semibold leading-relaxed mt-2">
                Upgrade to Plus or Pro to view live transfer stats, format details, and advanced job metadata.
              </p>
            </div>
            <button
              onClick={() => showUpgradeToast('Job Metadata Details is a Plus / Pro feature', 'Plus')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-extrabold uppercase rounded-xl transition"
            >
              Upgrade to Plus
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default QueueManager;
export { QueueManager };
