import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, User, AtSign, Save, X, Key, Info, Upload, Trash2, Globe, Award, 
  Settings, Copy, RefreshCw, LogOut, CheckCircle, Database, Clock, Zap, Download, Sparkles, Layers
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore, getDaysRemaining } from '../store/authStore';

interface AccountsCenterProps {
  onClose: () => void;
}

interface ActivityRecord {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon?: string;
}

interface StorageStats {
  total: number;
  videos: number;
  audio: number;
  images: number;
  other: number;
  totalBytes: number;
  favPlatform: string;
  largestTitle: string;
  largestSize: number;
}

const AccountsCenter: React.FC<AccountsCenterProps> = ({ onClose }) => {
  const { settings, updateSetting } = useSettingsStore();
  const { user, token, isOnline, login, logout } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarColor, setAvatarColor] = useState('#5865f2');
  const [avatarImage, setAvatarImage] = useState('');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'achievements' | 'timeline' | 'license'>('profile');

  // Stats / Timeline states
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [achievements, setAchievements] = useState<Record<string, boolean>>({});
  const [accountsCount, setAccountsCount] = useState(0);

  const currentPlan = user?.plan || settings.plan || 'Free';
  const currentKey = settings.licenseKey || 'No License Key';

  useEffect(() => {
    setDisplayName(user?.name || settings.displayName || 'Local Service');
    setUsername(settings.username || 'local_user');
    setAvatarColor(settings.avatarColor || '#5865f2');
    setAvatarImage(user?.avatar || settings.avatarImage || '');
  }, [settings, user]);

  const loadProfileStats = async () => {
    try {
      const stats = await window.api.getStorageStats();
      setStorageStats(stats);

      const logs = await window.api.getActivity();
      setActivities(logs || []);

      const list = await window.api.getAccounts();
      const count = list ? list.length : 0;
      setAccountsCount(count);

      // Auto-check + unlock achievements based on real stats
      const unlockOps: Promise<void>[] = [];
      if (stats.total >= 1)  unlockOps.push(window.api.unlockAchievement('firstDownload'));
      if (stats.total >= 10) unlockOps.push(window.api.unlockAchievement('downloads10'));
      if (stats.total >= 50) unlockOps.push(window.api.unlockAchievement('downloads50'));
      if (stats.total >= 100) unlockOps.push(window.api.unlockAchievement('downloads100'));
      if (stats.total >= 500) unlockOps.push(window.api.unlockAchievement('downloads500'));
      if (stats.totalBytes >= 1024 * 1024 * 1024) unlockOps.push(window.api.unlockAchievement('storage1gb'));
      if (stats.totalBytes >= 10 * 1024 * 1024 * 1024) unlockOps.push(window.api.unlockAchievement('storage10gb'));
      if (count >= 3) unlockOps.push(window.api.unlockAchievement('platforms3'));

      // Night owl check (current hour 0-4 am)
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 4) unlockOps.push(window.api.unlockAchievement('nightOwl'));

      await Promise.allSettled(unlockOps);

      // Re-fetch achievements AFTER unlocks so UI reflects new state
      const achs = await window.api.getAchievements();
      setAchievements(achs || {});
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProfileStats();
  }, []);

  // Compute profile completion percentage
  const getProfileCompletion = () => {
    let score = 0;
    if (avatarImage || avatarColor !== '#5865f2') score += 20;
    if (displayName && displayName !== 'Local Service') score += 20;
    if (username && username !== 'local_user') score += 20;
    if (accountsCount > 0) score += 20;
    if (settings.theme && settings.theme !== 'dark') score += 20;
    return score;
  };

  // Mask license key for display
  const getMaskedKey = (key: string): string => {
    if (key.length <= 8) return key;
    return key.slice(0, 5) + '••••-••••-' + key.slice(key.length - 4);
  };

  const handleGoogleLogin = async () => {
    try {
      setErrorMsg('');
      const res = await (window.api as any).loginWithGoogle();
      if (res?.success && res.user) {
        login(res.user, res.token);
      } else {
        setErrorMsg(res?.error || 'Google Login failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Login failed.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMsg('');

    try {
      await updateSetting('displayName', displayName.trim() || 'Local Service');
      await updateSetting('username', username.trim().toLowerCase() || 'local_user');
      await updateSetting('avatarColor', avatarColor);
      await updateSetting('avatarImage', avatarImage);

      // License key upgrade logic
      if (licenseKeyInput.trim() && licenseKeyInput.trim() !== currentKey) {
        const inputKey = licenseKeyInput.trim();
        
        try {
          const machineId = settings.machineId || '';
          const email = user?.email || settings.email || '';
          if (!email) {
            setErrorMsg('No email address registered. Please sign in with Google or run installer setup.');
            setSaveStatus('idle');
            return;
          }
          
          const apiBase = 'http://localhost:5000';
          const res = await fetch(`${apiBase}/license/activate`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              key: inputKey,
              machineId,
              email,
              displayName
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            setErrorMsg(errData.error || 'Failed to activate license online.');
            setSaveStatus('idle');
            return;
          }

          const actData = await res.json(); // { success: true, key: "...", plan: "Pro", token: "..." }
          
          await updateSetting('licenseKey', actData.key);
          await updateSetting('plan', actData.plan);
          if (actData.expiresAt) await updateSetting('expiresAt', actData.expiresAt);
          if (actData.token) {
            await updateSetting('authToken', actData.token);
            // update authStore if logged in
            if (user) {
              useAuthStore.getState().setUser({ ...user, plan: actData.plan });
              useAuthStore.getState().setToken(actData.token);
            }
          }
          
          // Log Activity
          await window.api.addActivity({
            id: Math.random().toString(36).substring(7),
            type: 'license',
            description: `Upgraded license level online to ${actData.plan} Plan`,
            timestamp: new Date().toISOString(),
            icon: 'zap'
          });

          // Unlock achievement
          await window.api.unlockAchievement('proUpgrade');

          setLicenseKeyInput('');
        } catch (e) {
          setErrorMsg('License server is unreachable. Please ensure you are online and try again.');
          setSaveStatus('idle');
          return;
        }
      }

      // Log Activity
      await window.api.addActivity({
        id: Math.random().toString(36).substring(7),
        type: 'profile',
        description: 'Updated accounts center profile settings details',
        timestamp: new Date().toISOString(),
        icon: 'user'
      });

      // Check achievements completion
      if (getProfileCompletion() === 100) {
        await window.api.unlockAchievement('profileComplete');
      }

      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update account profiles.');
      setSaveStatus('idle');
    }
  };

  // Profile avatar helpers
  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setAvatarImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const generateRandomGradient = () => {
    const colors = [
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    ];
    const rand = colors[Math.floor(Math.random() * colors.length)];
    setAvatarColor(rand);
    setAvatarImage('');
  };

  const copyLicenseToClipboard = () => {
    navigator.clipboard.writeText(currentKey);
    alert('License Key copied to clipboard!');
  };

  const handleDeactivate = async () => {
    if (confirm('Are you sure you want to deactivate this device license key? AYNX will fallback to Free Plan status.')) {
      await updateSetting('licenseKey', 'TRIAL');
      await updateSetting('plan', 'Free');
      await updateSetting('activatedOnline', 'false');
      loadProfileStats();
    }
  };

  const handleResetSettings = async () => {
    if (confirm('⚠️ DANGER: This will permanently reset all configurations settings to defaults values. Profile and subscriptions status will stay. Proceed?')) {
      await updateSetting('downloadFolder', '');
      await updateSetting('defaultQuality', 'Best Available');
      await updateSetting('defaultFormat', 'MP4');
      await updateSetting('parallelLimit', '3');
      await updateSetting('proxy', '');
      await updateSetting('theme', 'dark');
      await updateSetting('accentColor', '#5865f2');
      alert('Application settings reset to defaults successfully.');
      window.location.reload();
    }
  };

  const handleRestart = () => {
    alert('Application restart requested. Please close and launch AYNX again.');
  };

  const avatarPresets = [
    '#5865f2', // blurple
    '#23a55a', // emerald
    '#f23f43', // red
    '#f5a623', // orange
    '#b620e0', // purple
    '#00b0ff'  // sky blue
  ];

  const achievementList = [
    // Download milestones
    { id: 'firstDownload', title: 'First Steps', desc: 'Complete your very first media download.', icon: <Download className="w-5 h-5" />, category: 'Downloads' },
    { id: 'downloads10', title: 'Collector', desc: 'Successfully download 10 videos or songs.', icon: <CheckCircle className="w-5 h-5" />, category: 'Downloads' },
    { id: 'downloads50', title: 'Enthusiast', desc: 'Reach 50 total successful downloads.', icon: <Zap className="w-5 h-5" />, category: 'Downloads' },
    { id: 'downloads100', title: 'Power User', desc: 'Achieve 100 successful downloads.', icon: <Sparkles className="w-5 h-5" />, category: 'Downloads' },
    { id: 'downloads500', title: 'Power Hoarder', desc: 'Reach an insane 500 total downloads.', icon: <Database className="w-5 h-5" />, category: 'Downloads' },
    // Storage milestones
    { id: 'storage1gb', title: 'Bandwidth Beast', desc: 'Download over 1 GB of media total.', icon: <RefreshCw className="w-5 h-5" />, category: 'Storage' },
    { id: 'storage10gb', title: 'Data Titan', desc: 'Download over 10 GB of media total.', icon: <Globe className="w-5 h-5" />, category: 'Storage' },
    // Platform & feature milestones
    { id: 'platforms3', title: 'Multiplatform Explorer', desc: 'Authenticate sessions for 3+ platforms.', icon: <Settings className="w-5 h-5" />, category: 'Platforms' },
    { id: 'batchDownload', title: 'Batch Master', desc: 'Complete your first batch download job.', icon: <Layers className="w-5 h-5" />, category: 'Features' },
    // Profile milestones
    { id: 'profileComplete', title: 'Perfectionist', desc: 'Reach 100% profile completion score.', icon: <Award className="w-5 h-5" />, category: 'Profile' },
    { id: 'proUpgrade', title: 'Elite Member', desc: 'Upgrade your license to Pro or Plus plan.', icon: <ShieldCheck className="w-5 h-5" />, category: 'Profile' },
    // Special
    { id: 'nightOwl', title: 'Night Owl', desc: 'Open AYNX between midnight and 4:00 AM.', icon: <Clock className="w-5 h-5" />, category: 'Special' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-[600px] h-[550px] bg-discord-primary border border-discord-border rounded-2xl shadow-2xl overflow-hidden animate-scaleIn flex">
        
        {/* Left Side Navigation Sidebar */}
        <div className="w-48 bg-discord-tertiary border-r border-discord-border flex flex-col p-4 space-y-1 justify-between select-none">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 px-2 py-1.5 mb-4 border-b border-discord-border/50">
              <User className="w-4 h-4 text-discord-accent" />
              <span className="text-xs font-black text-discord-textNormal">Accounts Center</span>
            </div>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-left transition-colors cursor-pointer ${
                activeTab === 'profile' ? 'bg-discord-secondary text-discord-textNormal border-l-2 border-discord-accent' : 'text-discord-textMuted hover:bg-discord-hover hover:text-discord-textNormal'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-left transition-colors cursor-pointer ${
                activeTab === 'stats' ? 'bg-discord-secondary text-discord-textNormal border-l-2 border-discord-accent' : 'text-discord-textMuted hover:bg-discord-hover hover:text-discord-textNormal'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Download Stats</span>
            </button>

            <button
              onClick={() => setActiveTab('achievements')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-left transition-colors cursor-pointer ${
                activeTab === 'achievements' ? 'bg-discord-secondary text-discord-textNormal border-l-2 border-discord-accent' : 'text-discord-textMuted hover:bg-discord-hover hover:text-discord-textNormal'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Achievements</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-left transition-colors cursor-pointer ${
                activeTab === 'timeline' ? 'bg-discord-secondary text-discord-textNormal border-l-2 border-discord-accent' : 'text-discord-textMuted hover:bg-discord-hover hover:text-discord-textNormal'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Activity Log</span>
            </button>

            <button
              onClick={() => setActiveTab('license')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-left transition-colors cursor-pointer ${
                activeTab === 'license' ? 'bg-discord-secondary text-discord-textNormal border-l-2 border-discord-accent' : 'text-discord-textMuted hover:bg-discord-hover hover:text-discord-textNormal'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>License Status</span>
            </button>
          </div>

          {/* Quick Actions at bottom */}
          <div className="space-y-1 pt-4 border-t border-discord-border/50 text-[10px]">
            <button
              onClick={handleResetSettings}
              className="w-full text-left px-2 py-1 text-discord-textMuted hover:text-discord-danger hover:bg-discord-danger/5 rounded font-bold transition-colors"
            >
              Reset Settings
            </button>
            <button
              onClick={handleRestart}
              className="w-full text-left px-2 py-1 text-discord-textMuted hover:text-discord-textNormal rounded font-bold transition-colors"
            >
              Restart App
            </button>
            <button
              onClick={onClose}
              className="w-full text-left px-2 py-1 text-discord-textMuted hover:text-discord-textNormal rounded font-bold transition-colors"
            >
              Close Panel
            </button>
          </div>
        </div>

        {/* Right Side Main Content Panel */}
        <div className="flex-1 flex flex-col h-full bg-discord-primary relative">
          
          {/* Header row */}
          <div className="px-6 py-4 bg-discord-secondary/40 border-b border-discord-border flex justify-between items-center select-none shrink-0">
            <div>
              <h2 className="text-sm font-extrabold text-discord-textNormal flex items-center space-x-2">
                <span>Account Manager Dashboard</span>
              </h2>
              <p className="text-[10px] text-discord-textMuted font-semibold mt-0.5">Customize profile details & subscriptions status.</p>
            </div>
            <button 
              onClick={onClose}
              className="text-discord-textMuted hover:text-discord-textNormal transition-colors cursor-pointer p-1 rounded hover:bg-discord-hover"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable form details wrapper */}
          <form onSubmit={handleUpdateProfile} className="flex-1 overflow-y-auto p-6 space-y-5 h-full">

            {/* TAB: PROFILE EDIT */}
            {activeTab === 'profile' && (
              <div className="space-y-5 animate-scaleIn">
                
                {/* Avatar layout */}
                <div className="flex items-center space-x-5 bg-discord-secondary/35 border border-discord-border p-4 rounded-xl">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-xl uppercase transition-all duration-300 border-2 border-discord-border overflow-hidden select-none shrink-0 shadow-md"
                    style={{ 
                      backgroundColor: avatarColor.startsWith('linear') ? undefined : avatarColor,
                      backgroundImage: avatarColor.startsWith('linear') ? avatarColor : undefined 
                    }}
                  >
                    {avatarImage ? (
                      <img src={avatarImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      (displayName || 'LS').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <p className="text-xs font-black text-discord-textNormal">Personalize Profile Picture</p>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        className="bg-discord-secondary border border-discord-border text-[9px] font-bold text-discord-textNormal hover:bg-discord-hover px-2.5 py-1.5 rounded transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload File</span>
                      </button>
                      <button
                        type="button"
                        onClick={generateRandomGradient}
                        className="bg-discord-secondary border border-discord-border text-[9px] font-bold text-discord-textNormal hover:bg-discord-hover px-2.5 py-1.5 rounded transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-discord-accent" />
                        <span>Random Gradient</span>
                      </button>
                      {avatarImage && (
                        <button
                          type="button"
                          onClick={() => setAvatarImage('')}
                          className="bg-discord-secondary border border-discord-border text-[9px] font-bold text-discord-textNormal hover:bg-discord-hover px-2.5 py-1.5 rounded transition-all text-discord-danger hover:border-discord-danger/55 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Avatar Presets Swatches */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-discord-textMuted uppercase tracking-wider">Avatar Color Presets</label>
                  <div className="flex space-x-2 select-none">
                    {avatarPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setAvatarColor(color);
                          setAvatarImage('');
                        }}
                        className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${
                          avatarColor === color ? 'border-discord-textNormal scale-105 shadow-sm' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-discord-textMuted uppercase tracking-wider">Display Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-discord-secondary text-discord-textNormal text-xs pl-9 pr-4 py-2.5 rounded-xl border border-discord-border focus:outline-none focus:border-discord-accent"
                        placeholder="e.g. Ayan Kashyap"
                        required
                      />
                      <User className="absolute left-3 top-3 w-4 h-4 text-discord-textMuted/60" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-discord-textMuted uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-discord-secondary text-discord-textNormal text-xs pl-9 pr-4 py-2.5 rounded-xl border border-discord-border focus:outline-none focus:border-discord-accent"
                        placeholder="e.g. ayankashyap"
                        required
                      />
                      <AtSign className="absolute left-3 top-3 w-4 h-4 text-discord-textMuted/60" />
                    </div>
                  </div>
                </div>

                {/* Google Sync Account connection card */}
                <div className="bg-discord-secondary/35 border border-discord-border p-4 rounded-xl space-y-3 select-none">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-discord-textMuted uppercase tracking-wider">Google Synchronization</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${token ? 'bg-discord-success/10 text-discord-success border border-discord-success/20' : 'bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20'}`}>
                      {token ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {token && user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        {user.avatar ? (
                          <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-discord-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-discord-accent flex items-center justify-center text-white text-xs font-bold uppercase">{user.name.slice(0, 2)}</div>
                        )}
                        <div className="text-[10px] leading-tight">
                          <p className="font-bold text-discord-textNormal">{user.name}</p>
                          <p className="text-discord-textMuted font-medium mt-0.5">{user.email}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={logout}
                        className="text-[9px] font-bold text-discord-danger hover:underline cursor-pointer"
                      >
                        Disconnect Account
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-discord-textMuted font-semibold max-w-[280px] leading-relaxed">
                        Sign in to sync your active plan, theme, favorites, and downloader sessions across multiple PCs automatically.
                      </p>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Connect Google
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile completion percentage bar */}
                <div className="bg-discord-secondary/35 border border-discord-border p-3.5 rounded-xl space-y-2 select-none">
                  <div className="flex justify-between items-center text-[10px] font-bold text-discord-textMuted uppercase">
                    <span>Profile Setup Completion</span>
                    <span className="text-discord-accent font-black">{getProfileCompletion()}%</span>
                  </div>
                  <div className="w-full bg-discord-secondary h-2.5 rounded-full overflow-hidden border border-discord-border/50">
                    <div className="bg-discord-accent h-full transition-all duration-500 rounded-full" style={{ width: `${getProfileCompletion()}%` }} />
                  </div>
                </div>

              </div>
            )}

            {/* TAB: STATS */}
            {activeTab === 'stats' && (
              <div className="space-y-4 animate-scaleIn">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-discord-secondary/35 p-3 rounded-xl border border-discord-border">
                    <span className="text-[9px] font-bold text-discord-textMuted uppercase tracking-wide">Videos Configured</span>
                    <p className="text-xl font-black text-discord-textNormal mt-1">{storageStats?.videos || 0}</p>
                  </div>
                  <div className="bg-discord-secondary/35 p-3 rounded-xl border border-discord-border">
                    <span className="text-[9px] font-bold text-discord-textMuted uppercase tracking-wide">Music Tracks</span>
                    <p className="text-xl font-black text-discord-textNormal mt-1">{storageStats?.audio || 0}</p>
                  </div>
                  <div className="bg-discord-secondary/35 p-3 rounded-xl border border-discord-border">
                    <span className="text-[9px] font-bold text-discord-textMuted uppercase tracking-wide">Image Graphics</span>
                    <p className="text-xl font-black text-discord-textNormal mt-1">{storageStats?.images || 0}</p>
                  </div>
                  <div className="bg-discord-secondary/35 p-3 rounded-xl border border-discord-border">
                    <span className="text-[9px] font-bold text-discord-textMuted uppercase tracking-wide">Total Volume</span>
                    <p className="text-xl font-black text-discord-textNormal mt-1">{(storageStats ? storageStats.totalBytes / (1024 * 1024 * 1024) : 0).toFixed(2)} GB</p>
                  </div>
                </div>

                <div className="bg-discord-secondary/35 p-3.5 rounded-xl border border-discord-border space-y-1.5 text-xs">
                  <p className="font-bold text-discord-textMuted text-[9px] uppercase tracking-wider">Top Extraction platform</p>
                  <p className="text-sm font-black text-discord-accent uppercase tracking-wide">{storageStats?.favPlatform || '—'}</p>
                </div>
              </div>
            )}

            {/* TAB: ACHIEVEMENTS */}
            {activeTab === 'achievements' && (
              <div className="space-y-3 animate-scaleIn select-none">
                {/* Header with total count */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider">Achievements</h3>
                  <span className="text-[10px] font-extrabold text-discord-accent bg-discord-accent/10 border border-discord-accent/20 px-2 py-0.5 rounded-full">
                    {Object.values(achievements).filter(Boolean).length} / {achievementList.length} Unlocked
                  </span>
                </div>

                {/* Grouped by category */}
                {Array.from(new Set(achievementList.map(a => a.category))).map((cat) => (
                  <div key={cat}>
                    <p className="text-[9px] font-extrabold text-discord-textMuted uppercase tracking-widest mb-2 border-b border-discord-border/30 pb-1">{cat}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {achievementList.filter(a => a.category === cat).map((ach) => {
                        const isUnlocked = achievements[ach.id] || false;
                        return (
                          <div 
                            key={ach.id}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                              isUnlocked 
                                ? 'bg-discord-accent/5 border-discord-accent/30 text-discord-textNormal shadow-sm' 
                                : 'bg-discord-secondary/20 border-discord-border/50 opacity-40'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                isUnlocked ? 'bg-discord-accent text-white' : 'bg-discord-secondary text-discord-textMuted'
                              }`}>
                                {ach.icon}
                              </div>
                              <div>
                                <p className="text-xs font-extrabold leading-tight">{ach.title}</p>
                                <p className="text-[9px] text-discord-textMuted font-semibold mt-0.5 leading-relaxed">{ach.desc}</p>
                              </div>
                            </div>
                            <span className={`text-[8px] font-extrabold uppercase tracking-widest shrink-0 ml-2 ${
                              isUnlocked ? 'text-discord-success' : 'text-discord-textMuted'
                            }`}>
                              {isUnlocked ? '✓' : '🔒'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-3 animate-scaleIn select-none">
                <h3 className="text-xs font-bold text-discord-textMuted uppercase tracking-wider">Recent Profile Activity Logs</h3>
                {activities.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-discord-border rounded-xl text-[10px] text-discord-textMuted font-semibold">
                    No active profile logs registered.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {activities.map((log) => (
                      <div key={log.id} className="bg-discord-secondary/35 border border-discord-border p-3 rounded-xl flex items-start space-x-3">
                        <Clock className="w-4 h-4 text-discord-textMuted mt-0.5 shrink-0" />
                        <div className="text-xs space-y-1">
                          <p className="text-discord-textNormal font-bold leading-snug">{log.description}</p>
                          <p className="text-[9px] text-discord-textMuted font-medium">{new Date(log.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: LICENSE */}
            {activeTab === 'license' && (
              <div className="space-y-4 animate-scaleIn">
                <div className="bg-discord-secondary/35 border border-discord-border rounded-xl p-4.5 space-y-3.5 shadow-sm">
                  
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[10px] font-bold text-discord-textMuted uppercase tracking-wider">License Subscription Plan</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${
                      currentPlan === 'Pro' 
                        ? 'bg-discord-accent/15 border-discord-accent text-discord-accent'
                        : currentPlan === 'Plus'
                        ? 'bg-discord-success/15 border-discord-success text-discord-success'
                        : 'bg-discord-textMuted/15 border-discord-textMuted text-discord-textMuted'
                    }`}>
                      {currentPlan} Plan
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-discord-textMuted">
                    <span>License Key:</span>
                    <span className="font-bold font-mono text-discord-textNormal flex items-center space-x-2">
                      <span>{getMaskedKey(currentKey)}</span>
                      <Copy className="w-3.5 h-3.5 cursor-pointer text-discord-textMuted hover:text-discord-textNormal" onClick={copyLicenseToClipboard} />
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-discord-border pt-3.5 text-[9px] text-discord-textMuted select-none font-bold uppercase">
                    <div>
                      <span>Activation Date</span>
                      <p className="text-[10px] text-discord-textNormal mt-1 font-semibold">June 29, 2026</p>
                    </div>
                    <div>
                      <span>License Status</span>
                      <p className="text-[10px] text-discord-success mt-1 font-semibold flex items-center">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Activated
                      </p>
                    </div>
                  </div>

                  {/* License key upgrades */}
                  <div className="space-y-1.5 border-t border-discord-border pt-3.5">
                    <label className="text-[9px] font-bold text-discord-textMuted uppercase tracking-wider block">Upgrade License Key</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={licenseKeyInput}
                        onChange={(e) => setLicenseKeyInput(e.target.value)}
                        className="w-full bg-discord-secondary text-discord-textNormal text-[10px] pl-9 pr-4 py-2.5 rounded-xl border border-discord-border focus:outline-none focus:border-discord-accent font-mono"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                      />
                      <Key className="absolute left-2.5 top-3 w-4 h-4 text-discord-textMuted/60" />
                    </div>
                  </div>

                  <div className="flex space-x-2.5 pt-2 select-none">
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      className="flex-1 btn-secondary text-[10px] py-2 border-discord-danger text-discord-danger bg-discord-danger/5 hover:bg-discord-danger/10"
                    >
                      Deactivate Device
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('License fully registered on local hardware device context.')}
                      className="flex-1 btn-secondary text-[10px] py-2"
                    >
                      Copy Device context
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error notifications */}
            {errorMsg && (
              <div className="text-[10px] text-discord-danger font-bold text-center bg-discord-danger/5 py-1.5 rounded border border-discord-danger/25">
                {errorMsg}
              </div>
            )}

          </form>

          {/* Footer action trigger row */}
          <div className="px-6 py-4 bg-discord-secondary/40 border-t border-discord-border flex justify-between items-center select-none shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-6"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateProfile}
              disabled={saveStatus === 'saving'}
              className="btn-primary text-xs py-2 px-6"
            >
              {saveStatus === 'saving' ? (
                <span>Updating Details...</span>
              ) : saveStatus === 'saved' ? (
                <span>Profile Updated!</span>
              ) : (
                <span className="flex items-center space-x-1">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </span>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AccountsCenter;
