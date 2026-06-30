import { create } from 'zustand';

export interface ScheduledItem {
  id: string;
  url: string;
  title: string;
  platform: string;
  contentType: string;
  quality: string;
  format: string;
  scheduledTime: string;
  repeatMode: 'once' | 'daily' | 'weekly' | 'monthly' | 'idle' | 'ac' | 'wifi';
  status: 'active' | 'paused' | 'completed' | 'failed';
  postAction?: 'none' | 'shutdown' | 'sleep' | 'hibernate' | 'lock' | 'close' | 'sound' | 'folder' | 'player';
  createdAt: string;
}

interface SchedulerState {
  scheduled: ScheduledItem[];
  loading: boolean;
  fetchScheduled: () => Promise<void>;
  saveScheduled: (record: ScheduledItem) => Promise<void>;
  deleteScheduled: (id: string) => Promise<void>;
}

export const useSchedulerStore = create<SchedulerState>((set, get) => ({
  scheduled: [],
  loading: true,

  fetchScheduled: async () => {
    try {
      const data = await window.api.getScheduledDownloads();
      set({ scheduled: data || [], loading: false });
    } catch (e) {
      console.error('Failed to fetch scheduled downloads:', e);
      set({ loading: false });
    }
  },

  saveScheduled: async (record) => {
    try {
      await window.api.saveScheduledDownload(record);
      await get().fetchScheduled();
    } catch (e) {
      console.error('Failed to save scheduled download:', e);
    }
  },

  deleteScheduled: async (id) => {
    try {
      await window.api.deleteScheduledDownload(id);
      await get().fetchScheduled();
    } catch (e) {
      console.error('Failed to delete scheduled download:', e);
    }
  }
}));
export default useSchedulerStore;
