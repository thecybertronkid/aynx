import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, FolderDown, Layers, Star, 
  Settings as SettingsIcon, Info, Cloud,
  Sun, Moon, Globe, Clock
} from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore, getDaysRemaining } from '../store/authStore';
import { showUpgradeToast } from './UpgradeToast';

interface SidebarProps {
  onOpenAccountsCenter: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenAccountsCenter }) => {
  const activeCount = Object.keys(useDownloadStore((state) => state.activeDownloads)).length;
  const { settings, updateSetting } = useSettingsStore();
  const { user, isOnline } = useAuthStore();

  // Local feature flags state
  const [flags, setFlags] = useState<Record<string, boolean>>({
    built_in_browser: true,
    scheduler: true,
    clipboard_monitor: true,
    cloud_sync: true,
    themes: true,
    dashboard_widgets: true,
    ai_assistant: true,
    browser_extension: true,
    media_converter: true,
    favorites: true
  });

  useEffect(() => {
    // Initial fetch
    if ((window.api as any).getFeatureFlags) {
      (window.api as any).getFeatureFlags().then((f: any) => {
        if (f) setFlags(f);
      });
    }

    // Listen for heartbeat updates
    if ((window.api as any).onFeatureFlagsUpdated) {
      const unsub = (window.api as any).onFeatureFlagsUpdated((_event: any, updatedFlags: any) => {
        if (updatedFlags) setFlags(updatedFlags);
      });
      return () => unsub();
    }
    return undefined;
  }, []);

  const currentTheme = settings.theme || 'dark';
  
  // Use auth store values with settings fallback
  const displayName = user?.name || settings.displayName || 'Local Service';
  const currentPlan = user?.plan || settings.plan || 'Free';
  const avatarColor = settings.avatarColor || '#5865f2';
  const avatarImage = user?.avatar || settings.avatarImage || '';

  const trialDaysLeft = user?.trialExpiry ? getDaysRemaining(user.trialExpiry) : 0;
  const isTrial = user?.trial || false;

  const rawMenuItems = [
    { to: '/', icon: Home, label: 'Home', locked: false, requiredPlan: null as any },
    { to: '#', icon: Globe, label: 'Built-in Browser', onClick: () => {
        if (currentPlan === 'Free') { showUpgradeToast('Built-in Browser requires Plus or Pro', 'Plus'); }
        else { window.api.openBrowser(); }
      }, locked: currentPlan === 'Free', requiredPlan: 'Plus' as const, flagKey: 'built_in_browser'
    },
    { to: '/downloads', icon: FolderDown, label: 'Media Library', locked: false, requiredPlan: null as any },
    { to: '/queue', icon: Layers, label: 'Download Queue', badge: activeCount > 0 ? activeCount : undefined, locked: false, requiredPlan: null as any },
    { to: '/scheduler', icon: Clock, label: 'Scheduler', locked: currentPlan !== 'Pro', requiredPlan: 'Pro' as const, flagKey: 'scheduler' },
    { to: '/favorites', icon: Star, label: 'Favorites', locked: currentPlan === 'Free', requiredPlan: 'Plus' as const, flagKey: 'favorites' },
    { to: '/platforms', icon: Cloud, label: 'Platforms', locked: false, requiredPlan: null as any },
    { to: '/settings', icon: SettingsIcon, label: 'Settings', locked: false, requiredPlan: null as any },
    { to: '/about', icon: Info, label: 'About', locked: false, requiredPlan: null as any },
  ];

  const menuItems = rawMenuItems.filter(item => {
    if (item.flagKey && flags[item.flagKey] === false) {
      return false;
    }
    return true;
  });

  // Helper to extract name initials
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const toggleTheme = async () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await updateSetting('theme', newTheme);
  };

  return (
    <div className="w-64 bg-discord-tertiary flex flex-col h-full border-r border-discord-border select-none animate-slideInLeft transition-all duration-300">
      {/* App Header */}
      <div className="h-14 border-b border-discord-border flex items-center justify-between px-4">
        <div className="flex items-center space-x-2.5">
          {/* Futuristic SVG Logo representation of AYNX */}
          <div className="w-8 h-8 shrink-0 hover:scale-105 hover:rotate-3 transition-transform duration-300 select-none">
            <svg 
              viewBox="0 0 32 32" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_2px_8px_rgba(88,101,242,0.35)]"
            >
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#5865f2" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#312e81" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {/* Outer hexagon frame */}
              <path 
                d="M16 2L28 9V23L16 30L4 23V9L16 2Z" 
                fill="url(#glowGrad)" 
                stroke="url(#logoGrad)" 
                strokeWidth="1.5" 
                strokeLinejoin="round" 
              />
              {/* Inner stylized media play arrow + download line */}
              <path 
                d="M13 11L21 16L13 21V11Z" 
                fill="white" 
                stroke="white" 
                strokeWidth="0.5" 
                strokeLinejoin="round" 
              />
              <path 
                d="M10 24H22" 
                stroke="white" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>
          <div>
            <div className="font-extrabold text-discord-textNormal text-sm tracking-wide leading-tight">AYNX</div>
            <div className={`text-[10px] flex items-center space-x-1 font-semibold ${isOnline ? 'text-discord-success' : 'text-discord-textMuted'}`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block animate-pulse ${isOnline ? 'bg-discord-success' : 'bg-neutral-500'}`}></span>
              <span>{isOnline ? 'Cloud Sync' : 'Offline Mode'}</span>
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-discord-textMuted hover:text-discord-textNormal hover:bg-discord-hover/50 transition-all duration-200 cursor-pointer active:scale-90"
          title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-500 animate-spinSmooth" style={{ animationDuration: '6s' }} />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if ('onClick' in item) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group select-none focus:outline-none ${
                  item.locked
                    ? 'text-discord-textMuted/60 hover:bg-discord-hover/30'
                    : 'text-discord-textMuted hover:bg-discord-hover/60 hover:text-discord-textNormal'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
                  <span>{item.label}</span>
                </div>
                {item.locked && (
                  <span className={`text-[8px] font-extrabold uppercase border rounded px-1 py-0.5 ${
                    item.requiredPlan === 'Pro'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                  }`}>{item.requiredPlan}</span>
                )}
              </button>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.locked ? '#' : item.to}
              onClick={item.locked ? (e) => { e.preventDefault(); showUpgradeToast(`${item.label} requires ${item.requiredPlan}`, item.requiredPlan); } : undefined}
              className={({ isActive }) => 
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                  item.locked
                    ? 'text-discord-textMuted/60 hover:bg-discord-hover/30 cursor-pointer'
                    : isActive 
                    ? 'bg-discord-active text-discord-textNormal font-semibold shadow-sm border-l-[3px] border-discord-accent pl-2.5' 
                    : 'text-discord-textMuted hover:bg-discord-hover/60 hover:text-discord-textNormal'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
                <span>{item.label}</span>
              </div>
              {item.locked ? (
                <span className={`text-[8px] font-extrabold uppercase border rounded px-1 py-0.5 ${
                  item.requiredPlan === 'Pro'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                }`}>{item.requiredPlan}</span>
              ) : item.badge !== undefined ? (
                <span className="bg-discord-accent text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow glow-active animate-pulse">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Info (Clicking triggers Accounts Center overlay) */}
      <div 
        onClick={onOpenAccountsCenter}
        className="p-3 bg-discord-secondary/30 border-t border-discord-border flex items-center space-x-3 cursor-pointer hover:bg-discord-secondary/60 transition-colors duration-200"
        title="Open Accounts Center"
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs border border-white/10 uppercase select-none transition-transform hover:scale-105 overflow-hidden"
          style={{ 
            backgroundColor: avatarColor.startsWith('linear') ? undefined : avatarColor,
            backgroundImage: avatarColor.startsWith('linear') ? avatarColor : undefined 
          }}
        >
          {avatarImage ? (
            <img src={avatarImage} alt="Profile" className="w-full h-full object-cover animate-fadeIn" />
          ) : (
            getInitials(displayName)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-discord-textNormal truncate leading-tight">{displayName}</div>
          <div className="text-[10px] text-discord-textMuted font-bold truncate mt-0.5 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                currentPlan === 'Pro' ? 'bg-discord-accent' : currentPlan === 'Plus' ? 'bg-discord-success' : 'bg-discord-textMuted'
              }`}></span>
              <span>{currentPlan} {isTrial && '(Trial)'}</span>
            </div>
            {isTrial && trialDaysLeft > 0 && (
              <span className="text-[8px] bg-discord-accent/15 text-discord-accent px-1.5 py-0.5 rounded border border-discord-accent/20 font-black tracking-wide ml-1 shrink-0">
                {trialDaysLeft}d left
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
