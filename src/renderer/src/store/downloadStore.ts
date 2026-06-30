import { create } from 'zustand';

export interface DownloadItem {
  id: string;
  title: string;
  channel?: string;
  platform: string;
  contentType: 'video' | 'audio' | 'image';
  filePath?: string;
  fileSize?: number;
  duration?: number;
  thumbnailUrl?: string;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'scheduled';
  downloadedAt: string;
  favorite: number;
  progress?: number;
  speed?: string;
  eta?: string;
  // User-selected download options
  quality?: string;
  format?: string;
  // Codec/stream details from yt-dlp
  vcodec?: string;
  acodec?: string;
  resolution?: string;
  bitrate?: number;
  fps?: number;
  container?: string;
  url?: string;
}

interface DownloadState {
  downloads: DownloadItem[];
  activeDownloads: Record<string, DownloadItem>;
  activeOrder: string[];
  speedHistory: number[];
  selectedDownloadId: string | null;
  loading: boolean;
  fetchDownloads: () => Promise<void>;
  fetchActiveDownloads: () => Promise<void>;
  setSelectedDownloadId: (id: string | null) => void;
  queueDownload: (options: {
    id: string;
    url: string;
    title: string;
    channel?: string;
    platform: string;
    contentType: 'video' | 'audio' | 'image';
    quality?: string;
    format?: string;
  }) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateProgress: (id: string, data: Partial<DownloadItem>) => void;
  
  // Bulk controls
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  cancelAll: () => Promise<void>;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
}

// Utility to parse speed strings (e.g. 2.5 MB/s, 950 KB/s) to KBs
function parseSpeedStringToKb(speedStr?: string): number {
  if (!speedStr) return 0;
  const match = speedStr.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z/]+)/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.includes('gb') || unit.includes('g/s')) return val * 1024 * 1024;
  if (unit.includes('mb') || unit.includes('m/s')) return val * 1024;
  if (unit.includes('kb') || unit.includes('k/s')) return val;
  return val / 1024;
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: [],
  activeDownloads: {},
  activeOrder: [],
  speedHistory: Array(30).fill(0),
  selectedDownloadId: null,
  loading: true,

  setSelectedDownloadId: (id) => set({ selectedDownloadId: id }),

  // Internal helper to push a speed sample into the sliding window graph
  _pushSpeedSample: (kbps: number) => {
    set((state) => ({
      speedHistory: [...state.speedHistory.slice(1), kbps]
    }));
  },

  fetchDownloads: async () => {
    try {
      const data = await window.api.getDownloads();
      set({ downloads: data || [], loading: false });
    } catch (e) {
      console.error('Failed to fetch downloads history:', e);
      set({ loading: false });
    }
  },

  fetchActiveDownloads: async () => {
    try {
      const active = await window.api.getActiveDownloads();
      const activeMap: Record<string, DownloadItem> = {};
      let totalSpeed = 0;
      const activeIds: string[] = [];

      // Preserve quality/format fields from prior state when polling refreshes
      const priorState = get().activeDownloads;

      for (const item of active) {
        const prior = priorState[item.id];
        activeMap[item.id] = {
          id: item.id,
          title: item.title,
          platform: item.platform,
          contentType: item.contentType as any,
          status: item.status as any,
          downloadedAt: new Date().toISOString(),
          favorite: 0,
          progress: item.progress,
          speed: item.speed,
          eta: item.eta,
          url: item.url || item.id,
          quality: item.quality || prior?.quality,
          format: item.format || prior?.format,
          resolution: item.resolution || prior?.resolution,
          fileSize: item.fileSize || prior?.fileSize
        };
        activeIds.push(item.id);
        if (item.status === 'downloading') {
          totalSpeed += parseSpeedStringToKb(item.speed);
        }
      }

      set((state) => {
        // Maintain custom ordering, adding new items to bottom and filtering out removed items
        const currentOrder = state.activeOrder.filter(id => activeMap[id]);
        const newIds = activeIds.filter(id => !currentOrder.includes(id));
        const nextOrder = [...currentOrder, ...newIds];

        // Maintain speed history (sliding window of 30 ticks)
        const nextHistory = [...state.speedHistory.slice(1), totalSpeed];

        return {
          activeDownloads: activeMap,
          activeOrder: nextOrder,
          speedHistory: nextHistory
        };
      });
    } catch (e) {
      console.error('Failed to fetch active downloads:', e);
    }
  },

  queueDownload: async (options) => {
    try {
      await window.api.queueDownload(options);
      
      const newItem: DownloadItem = {
        id: options.id,
        title: options.title,
        channel: options.channel,
        platform: options.platform,
        contentType: options.contentType,
        status: 'queued',
        downloadedAt: new Date().toISOString(),
        favorite: 0,
        progress: 0,
        speed: '0 KB/s',
        eta: '--:--',
        url: options.url,
        quality: options.quality,
        format: options.format
      };

      set((state) => ({
        activeDownloads: {
          ...state.activeDownloads,
          [options.id]: newItem
        },
        activeOrder: [...state.activeOrder, options.id]
      }));
    } catch (e) {
      console.error('Failed to queue download:', e);
    }
  },

  pauseDownload: async (id) => {
    try {
      await window.api.pauseDownload(id);
      get().updateProgress(id, { status: 'paused' });
    } catch (e) {
      console.error(`Failed to pause download ${id}:`, e);
    }
  },

  resumeDownload: async (id) => {
    try {
      await window.api.resumeDownload(id);
      get().updateProgress(id, { status: 'queued' });
    } catch (e) {
      console.error(`Failed to resume download ${id}:`, e);
    }
  },

  cancelDownload: async (id) => {
    try {
      await window.api.cancelDownload(id);
      set((state) => {
        const nextActive = { ...state.activeDownloads };
        delete nextActive[id];
        return {
          activeDownloads: nextActive,
          activeOrder: state.activeOrder.filter(orderId => orderId !== id),
          selectedDownloadId: state.selectedDownloadId === id ? null : state.selectedDownloadId
        };
      });
    } catch (e) {
      console.error(`Failed to cancel download ${id}:`, e);
    }
  },

  deleteDownload: async (id) => {
    try {
      await window.api.deleteDownload(id);
      set((state) => ({
        downloads: state.downloads.filter((d) => d.id !== id)
      }));
    } catch (e) {
      console.error(`Failed to delete download ${id}:`, e);
    }
  },

  toggleFavorite: async (id) => {
    try {
      await window.api.toggleFavorite(id);
      set((state) => ({
        downloads: state.downloads.map((d) =>
          d.id === id ? { ...d, favorite: d.favorite === 1 ? 0 : 1 } : d
        )
      }));
    } catch (e) {
      console.error(`Failed to toggle favorite ${id}:`, e);
    }
  },

  updateProgress: (id, data) => {
    set((state) => {
      const active = state.activeDownloads[id];
      if (!active) {
        if (data.status === 'completed') {
          get().fetchDownloads();
        }
        return {};
      }

      const updated = { ...active, ...data };
      
      const nextActive = { ...state.activeDownloads };
      let nextOrder = state.activeOrder;
      let nextSelectedId = state.selectedDownloadId;

      // Update speed history graph in real-time from IPC events
      let nextHistory = state.speedHistory;
      if (data.speed !== undefined) {
        const kbps = parseSpeedStringToKb(data.speed as string);
        // Sum speed across all currently-downloading items + this update
        let totalKbps = kbps;
        for (const [oid, od] of Object.entries(state.activeDownloads)) {
          if (oid !== id && od.status === 'downloading') {
            totalKbps += parseSpeedStringToKb(od.speed);
          }
        }
        nextHistory = [...state.speedHistory.slice(1), totalKbps];
      }

      if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
        if (updated.status !== 'failed') {
          delete nextActive[id];
          nextOrder = state.activeOrder.filter(orderId => orderId !== id);
          if (nextSelectedId === id) nextSelectedId = null;
        } else {
          nextActive[id] = updated;
        }
        // Push 0 speed on terminal state
        nextHistory = [...state.speedHistory.slice(1), 0];
        setTimeout(() => get().fetchDownloads(), 100);
      } else {
        nextActive[id] = updated;
      }

      return {
        activeDownloads: nextActive,
        activeOrder: nextOrder,
        selectedDownloadId: nextSelectedId,
        speedHistory: nextHistory
      };
    });
  },

  // Bulk operations
  pauseAll: async () => {
    const active = get().activeDownloads;
    for (const item of Object.values(active)) {
      if (item.status === 'downloading') {
        await get().pauseDownload(item.id);
      }
    }
  },

  resumeAll: async () => {
    const active = get().activeDownloads;
    for (const item of Object.values(active)) {
      if (item.status === 'paused' || item.status === 'failed') {
        await get().resumeDownload(item.id);
      }
    }
  },

  cancelAll: async () => {
    const active = get().activeDownloads;
    for (const item of Object.values(active)) {
      await get().cancelDownload(item.id);
    }
  },

  clearQueue: () => {
    get().cancelAll();
  },

  reorderQueue: (startIndex, endIndex) => {
    set((state) => {
      const nextOrder = [...state.activeOrder];
      const [removed] = nextOrder.splice(startIndex, 1);
      nextOrder.splice(endIndex, 0, removed);
      return { activeOrder: nextOrder };
    });
  }
}));

// Initialize preload listener
window.api?.onProgress((_, data) => {
  if (data && data.id) {
    useDownloadStore.getState().updateProgress(data.id, data);
  }
});
