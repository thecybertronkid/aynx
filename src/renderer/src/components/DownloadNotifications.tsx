import React, { useEffect, useState } from 'react';
import { useDownloadStore, DownloadItem } from '../store/downloadStore';
import { useSettingsStore } from '../store/settingsStore';
import { PlayCircle, CheckCircle, AlertCircle, X, DownloadCloud } from 'lucide-react';

interface ActiveNotification {
  id: string;
  title: string;
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

  const currentPlan = settings.plan || 'Free';

  useEffect(() => {
    // Process active downloads to create/update notifications
    setNotifications((prev) => {
      const next = { ...prev };
      let changed = false;

      // 1. Process active queue items
      for (const [id, item] of Object.entries(activeDownloads)) {
        const progress = item.progress || 0;
        const speed = item.speed || '0 KB/s';
        const currentNotif = prev[id];

        if (!currentNotif) {
          // New download started notification!
          next[id] = {
            id,
            title: item.title,
            progress,
            speed,
            status: item.status,
            visible: true
          };
          changed = true;
        } else {
          // Update existing download state
          if (
            currentNotif.progress !== progress ||
            currentNotif.speed !== speed ||
            currentNotif.status !== item.status
          ) {
            next[id] = {
              ...currentNotif,
              progress,
              speed,
              status: item.status
            };
            changed = true;
          }
        }
      }

      // 2. Look for completed or failed items that recently left activeDownloads
      for (const id of Object.keys(prev)) {
        if (!activeDownloads[id]) {
          const notif = prev[id];
          // If it was downloading/queued and suddenly disappeared, it probably completed or was cancelled/failed.
          // In standard flow, updateProgress triggers setTimeout before deleting it.
          if (notif.status === 'downloading' || notif.status === 'queued') {
            next[id] = {
              ...notif,
              status: 'completed',
              progress: 100,
              speed: '0 KB/s'
            };
            changed = true;
          }

          // If the item has terminal state (completed, failed, cancelled) and is visible, start fadeout timer
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
                  // delete after fadeout animation completes (300ms)
                  setTimeout(() => {
                    setNotifications((c) => {
                      const final = { ...c };
                      delete final[id];
                      return final;
                    });
                  }, 300);
                }
                return updated;
              });
            }, 4000);

            next[id] = {
              ...next[id],
              fadeOutTimer: timer
            };
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [activeDownloads]);

  const handleDismiss = (id: string) => {
    setNotifications((prev) => {
      const next = { ...prev };
      if (next[id]) {
        if (next[id].fadeOutTimer) clearTimeout(next[id].fadeOutTimer);
        next[id] = { ...next[id], visible: false };
        setTimeout(() => {
          setNotifications((c) => {
            const final = { ...c };
            delete final[id];
            return final;
          });
        }, 300);
      }
      return next;
    });
  };

  // Do not render notifications on Free Plan
  if (currentPlan === 'Free') {
    return null;
  }

  const list = Object.values(notifications);
  if (list.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9990] flex flex-col space-y-3 max-w-sm w-full select-none pointer-events-none">
      {list.map((notif) => {
        const isCompleted = notif.status === 'completed';
        const isFailed = notif.status === 'failed';
        const isQueued = notif.status === 'queued';

        return (
          <div
            key={notif.id}
            className={`w-full pointer-events-auto bg-discord-secondary border border-discord-border rounded-xl p-3.5 shadow-2xl flex flex-col space-y-2.5 transition-all duration-300 transform ${
              notif.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
            }`}
          >
            {/* Header Title bar */}
            <div className="flex items-start justify-between space-x-2.5">
              <div className="flex items-center space-x-2 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  isCompleted 
                    ? 'bg-discord-success/15 text-discord-success' 
                    : isFailed 
                    ? 'bg-discord-danger/15 text-discord-danger' 
                    : 'bg-discord-accent/15 text-discord-accent'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isFailed ? (
                    <AlertCircle className="w-4 h-4 animate-pulse" />
                  ) : (
                    <DownloadCloud className="w-4 h-4 animate-bounce" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-discord-textMuted">
                    {isCompleted ? 'Download Completed' : isFailed ? 'Download Failed' : isQueued ? 'Queued' : 'Downloading'}
                  </p>
                  <p className="text-xs font-bold text-discord-textNormal truncate leading-tight mt-0.5" title={notif.title}>
                    {notif.title}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => handleDismiss(notif.id)}
                className="p-1 rounded hover:bg-discord-hover text-discord-textMuted hover:text-discord-textNormal transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Progress metrics and bar */}
            {!isCompleted && !isFailed && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-discord-textMuted font-bold uppercase">
                  <span>Speed: <span className="text-discord-textNormal font-mono">{notif.speed}</span></span>
                  <span className="text-discord-textNormal font-mono font-black">{notif.progress.toFixed(0)}%</span>
                </div>
                
                {/* Progress bar wrapper */}
                <div className="w-full h-1.5 bg-discord-tertiary rounded-full overflow-hidden border border-discord-border/25">
                  <div
                    className="h-full bg-discord-accent rounded-full transition-all duration-300 shadow"
                    style={{ width: `${notif.progress}%` }}
                  />
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="text-[10px] text-discord-success font-bold flex items-center space-x-1 mt-0.5">
                <span>✓ Media successfully compiled & saved to folder.</span>
              </div>
            )}

            {isFailed && (
              <div className="text-[10px] text-discord-danger font-bold flex items-center space-x-1 mt-0.5">
                <span>⚠ Extraction error occurred. Please verify URL.</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
