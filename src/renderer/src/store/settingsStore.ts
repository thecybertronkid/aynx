import { create } from 'zustand';

interface SettingsState {
  settings: Record<string, string>;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

const applyThemeAndAccent = (theme: string, accent: string) => {
  const root = document.documentElement;
  const currentTheme = theme || 'dark';
  root.setAttribute('data-theme', currentTheme);
  
  if (currentTheme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  
  if (accent) {
    root.style.setProperty('--color-accent', accent);
  } else {
    root.style.removeProperty('--color-accent');
  }
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  loading: true,
  fetchSettings: async () => {
    try {
      const data = await window.api.getSettings();
      const settings = data || {};
      set({ settings, loading: false });
      
      // Apply theme & accent
      applyThemeAndAccent(settings.theme || 'dark', settings.accentColor || '#5865f2');
    } catch (e) {
      console.error('Failed to fetch settings:', e);
      set({ loading: false });
    }
  },
  updateSetting: async (key: string, value: string) => {
    try {
      await window.api.saveSetting(key, value);
      set((state) => {
        const newSettings = {
          ...state.settings,
          [key]: value
        };
        
        // Apply instantly
        applyThemeAndAccent(
          newSettings.theme || 'dark',
          newSettings.accentColor || '#5865f2'
        );
        
        // Trigger Aesthetic Stylist achievement check
        if (
          (key === 'theme' && !['dark', 'light'].includes(value)) ||
          (key === 'accentColor' && value !== '#5865f2')
        ) {
          window.api.unlockAchievement('aestheticStylist').catch(() => {});
        }
        
        return { settings: newSettings };
      });
    } catch (e) {
      console.error(`Failed to save setting ${key}:`, e);
    }
  }
}));
