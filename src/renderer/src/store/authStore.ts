import { create } from 'zustand';

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'Free' | 'Plus' | 'Pro';
  trial: boolean;
  trialExpiry: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  hasChecked: boolean;

  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setOnline: (online: boolean) => void;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  refreshUserPlan: () => Promise<void>;
  initialize: () => Promise<void>;
}

// Days remaining helper
export function getDaysRemaining(trialExpiry: string): number {
  if (!trialExpiry) return 0;
  const ms = new Date(trialExpiry).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isOnline: navigator.onLine,
  lastSyncedAt: null,
  hasChecked: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ isLoading: loading }),
  setOnline: (online) => set({ isOnline: online }),

  login: (user, token) => {
    set({ user, token, lastSyncedAt: new Date().toISOString() });
  },

  logout: async () => {
    try {
      await (window.api as any).logout();
    } catch (_) {}
    set({ user: null, token: null });
  },

  refreshUserPlan: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const result = await (window.api as any).verifyToken(token);
      if (result?.valid && result.plan) {
        const { user } = get();
        if (user) {
          set({ user: { ...user, plan: result.plan as any }, lastSyncedAt: new Date().toISOString() });
        }
      }
    } catch (_) {}
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const stored = await (window.api as any).getStoredAuth();
      if (stored?.token && stored?.user) {
        // Try to verify token online
        try {
          const verified = await (window.api as any).verifyToken(stored.token);
          if (verified?.valid) {
            set({
              user: {
                ...stored.user,
                plan: (verified.plan || stored.user.plan) as any,
                name: verified.name || stored.user.name,
                email: verified.email || stored.user.email,
                avatar: verified.avatar_url || stored.user.avatar
              },
              token: stored.token,
              isOnline: true,
              lastSyncedAt: new Date().toISOString()
            });
          } else {
            // Token expired — try refresh
            const newToken = await (window.api as any).refreshToken(stored.refreshToken || '');
            if (newToken) {
              set({ user: stored.user, token: newToken });
            } else {
              set({ user: null, token: null });
            }
          }
        } catch (_) {
          // Offline — use cached data
          set({ user: stored.user, token: stored.token, isOnline: false });
        }
      }
    } catch (_) {}

    set({ isLoading: false, hasChecked: true });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      set({ isOnline: true });
      get().refreshUserPlan();
    });
    window.addEventListener('offline', () => set({ isOnline: false }));
  }
}));
