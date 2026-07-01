import React, { useEffect, useState } from 'react';
import { useDownloadStore, DownloadItem } from '../store/downloadStore';
import { useSettingsStore } from '../store/settingsStore';
import { PlayCircle, CheckCircle, AlertCircle, X, DownloadCloud, FolderOpen, Star, Copy, RotateCcw, ExternalLink } from 'lucide-react';

interface ActiveNotification {
  id: string;
  title: string;
  filePath?: string;
  progress: number;
  speed: string;
  status: DownloadItem['status'];
  visible: boolean;
  sizeFormatted?: string;
  fadeOutTimer?: any;
}

export const DownloadNotifications: React.FC = () => {
  const { settings } = useSettingsStore();
  const { activeDownloads } = useDownloadStore();
  const [notifications, setNotifications] = useState<Record<string, ActiveNotification>>({});
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const currentPlan = settings.plan || 'Free';

  useEffect(() => {
    setNotifications((prev) => {
      const next = { ...prev };
      let changed = false;

      // 1. Process active queue items
      for (const [id, item] of Object.entries(activeDownloads)) {
        if (dismissedIds.has(id)) {
          continue;
        }
        const progress = item.progress || 0;
        const speed = item.speed || '0 KB/s';
        const currentNotif = prev[id];

        if (!currentNotif) {
          next[id] = { id, title: item.title, filePath: (item as any).filePath, progress, speed, status: item.status, visible: true };
          changed = true;
        } else if (
          currentNotif.progress !== progress ||
          currentNotif.speed !== speed ||
          currentNotif.status !== item.status
        ) {
          next[id] = { ...currentNotif, progress, speed, status: item.status, filePath: (item as any).filePath ?? currentNotif.filePath };
          changed = true;
        }
      }

      // 2. Look for completed/failed items that left activeDownloads
      for (const id of Object.keys(prev)) {
        if (!activeDownloads[id]) {
          const notif = prev[id];
          if (notif.status === 'downloading' || notif.status === 'queued') {
            next[id] = { ...notif, status: 'completed', progress: 100, speed: '0 KB/s' };
            changed = true;
          }

          // Schedule fadeout for terminal state notifications
          if (
            next[id] &&
            (next[id].status === 'completed' || next[id].status === 'failed' || next[id].status === 'cancelled') &&
            !next[id].fadeOutTimer
          ) {
            const timer = setTimeout(() => {
              setNotifications((curr) => {
                const updated = { ...curr };
                if (updated[id]) {
                  updated[id] = { ...updated[id], visible: false };
                  setTimeout(() => {
                    setNotifications((c) => { const f = { ...c }; delete f[id]; return f; });
                  }, 300);
                }
                return updated;
              });
            }, 6000); // longer delay so user can read action buttons

            next[id] = { ...next[id], fadeOutTimer: timer };
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [activeDownloads]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prevSet) => {
      const nextSet = new Set(prevSet);
      nextSet.add(id);
      return nextSet;
    });
    setNotifications((prev) => {
      const next = { ...prev };
      if (next[id]) {
        if (next[id].fadeOutTimer) clearTimeout(next[id].fadeOutTimer);
        next[id] = { ...next[id], visible: false };
        setTimeout(() => {
          setNotifications((c) => { const f = { ...c }; delete f[id]; return f; });
        }, 300);
      }
      return next;
    });
  };

  const handleOpenFolder = async (filePath?: string) => {
    if (!filePath) {
      const s = await (window.api as any).getSettings();
      (window.api as any).openFolder(s.downloadFolder);
    } else {
      (window.api as any).showItemInFolder(filePath);
    }
  };

  const handlePlay = (filePath?: string) => {
    if (filePath) (window.api as any).openFile(filePath);
  };

  const handleCopyPath = (filePath?: string) => {
    if (filePath) navigator.clipboard.writeText(filePath);
  };

  const list = Object.values(notifications);
  if (list.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-20 z-[9990] flex flex-col space-y-3 max-w-sm w-full select-none pointer-events-none">
      {list.map((notif) => {
        const isCompleted = notif.status === 'completed';
        const isFailed = notif.status === 'failed';
        const isQueued = notif.status === 'queued';
        const isDownloading = !isCompleted && !isFailed && !isQueued;

        return (
          <div
            key={notif.id}
            className={`w-full pointer-events-auto bg-discord-secondary border border-discord-border rounded-xl p-3.5 shadow-2xl flex flex-col space-y-2.5 transition-all duration-300 transform ${
              notif.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between space-x-2.5">
              <div className="flex items-center space-x-2 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  isCompleted ? 'bg-discord-success/15 text-discord-success'
                  : isFailed ? 'bg-discord-danger/15 text-discord-danger'
                  : 'bg-discord-accent/15 text-discord-accent'
                }`}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> 
                  : isFailed ? <AlertCircle className="w-4 h-4 animate-pulse" /> 
                  : <DownloadCloud className="w-4 h-4 animate-bounce" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-discord-textMuted">
                    {isCompleted ? '✓ AYNX Successfully Downloaded'
                    : isFailed ? '⚠ Download Failed'
                    : isQueued ? 'Queued'
                    : 'Downloading…'}
                  </p>
                  <p className="text-xs font-bold text-discord-textNormal truncate leading-tight mt-0.5" title={notif.title}>
                    {notif.title}
                  </p>
                </div>
              </div>
              <button onClick={() => handleDismiss(notif.id)}
                className="p-1 rounded hover:bg-discord-hover text-discord-textMuted hover:text-discord-textNormal transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress bar (downloading state) */}
            {isDownloading && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-discord-textMuted font-bold uppercase">
                  <span>Speed: <span className="text-discord-textNormal font-mono">{notif.speed}</span></span>
                  <span className="text-discord-textNormal font-mono font-black">{notif.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-discord-tertiary rounded-full overflow-hidden border border-discord-border/25">
                  <div className="h-full bg-discord-accent rounded-full transition-all duration-300 shadow"
                    style={{ width: `${notif.progress}%` }} />
                </div>
              </div>
            )}

            {/* Completed action buttons */}
            {isCompleted && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => handlePlay(notif.filePath)}
                  className="flex items-center space-x-1 px-2 py-1 bg-discord-accent/15 border border-discord-accent/30 text-discord-accent hover:bg-discord-accent/25 rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
                  <PlayCircle className="w-3 h-3" />
                  <span>Play</span>
                </button>
                <button onClick={() => handleOpenFolder(notif.filePath)}
                  className="flex items-center space-x-1 px-2 py-1 bg-discord-secondary border border-discord-border text-discord-textNormal hover:bg-discord-hover rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
                  <FolderOpen className="w-3 h-3" />
                  <span>Open Folder</span>
                </button>
                <button onClick={() => handleCopyPath(notif.filePath)}
                  className="flex items-center space-x-1 px-2 py-1 bg-discord-secondary border border-discord-border text-discord-textNormal hover:bg-discord-hover rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
                  <Copy className="w-3 h-3" />
                  <span>Copy Path</span>
                </button>
              </div>
            )}

            {/* Failed action buttons */}
            {isFailed && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="text-[10px] text-discord-danger font-bold flex-1">⚠ Extraction error. Please verify the URL and try again.</div>
                <button
                  className="flex items-center space-x-1 px-2 py-1 bg-discord-danger/15 border border-discord-danger/30 text-discord-danger hover:bg-discord-danger/25 rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
