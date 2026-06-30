import React, { useState } from 'react';
import { Cloud, CheckCircle2, Lock, Sparkles, Check, X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import UpgradeModal from './UpgradeModal';
import { showUpgradeToast } from './UpgradeToast';

interface PlatformInfo {
  name: string;
  color: string;
  type: string[];
  description: string;
  features: string[];
  requiredPlan: 'Free' | 'Plus' | 'Pro';
}

const Platforms: React.FC = () => {
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const currentPlan = user?.plan || settings.plan || 'Free';
  const [activeTab, setActiveTab] = useState<'platforms' | 'plans'>('platforms');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { isOnline } = useAuthStore();

  const handleUpgrade = async (plan: 'Plus' | 'Pro') => {
    if (!isOnline) {
      setErrorMsg('You must be online to purchase a subscription.');
      return;
    }
    if (!user) {
      setErrorMsg('Please sign in with Google first in the Welcome/Accounts center.');
      return;
    }

    const planId = `${plan.toLowerCase()}_${billingPeriod}`;
    setLoadingPlan(planId);
    setErrorMsg('');

    try {
      // 1. Create Razorpay order on our backend via IPC
      const order = await (window.api as any).createPaymentOrder({ planId });
      if (!order || order.error) {
        setErrorMsg(order?.error || 'Failed to initialize payment order.');
        setLoadingPlan(null);
        return;
      }

      // 2. Open Electron Razorpay Checkout window
      const paymentResult = await (window.api as any).openPaymentCheckout({
        ...order,
        planId
      });

      if (!paymentResult || !paymentResult.success) {
        setErrorMsg(paymentResult?.error || 'Payment cancelled or failed.');
        setLoadingPlan(null);
        return;
      }

      // 3. Verify payment signature on backend
      const verification = await (window.api as any).verifyPayment(paymentResult);
      if (verification && verification.success) {
        // Update Zustand auth store directly to reflect the paid plan instantly
        const { login } = useAuthStore.getState();
        if (user && verification.token) {
          login(
            {
              ...user,
              plan: (verification.plan || plan) as any
            },
            verification.token
          );
        }
        alert(`Success! You have been upgraded to AYNX ${plan} plan.`);
      } else {
        setErrorMsg(verification?.error || 'Payment verification failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processor failed to load.');
    }
    setLoadingPlan(null);
  };

  const pricing = {
    Plus: billingPeriod === 'monthly' ? { price: '79', raw: 7900 } : { price: '699', raw: 69900 },
    Pro: billingPeriod === 'monthly' ? { price: '99', raw: 9900 } : { price: '899', raw: 89900 }
  };

  const featureComparisonList = [
    { name: 'Supported Platforms', free: 'Basic (YouTube, Soundcloud)', plus: 'All Platforms (Spotify, etc.)', pro: 'All Platforms + Session assistance' },
    { name: 'Max Downloads Speed', free: 'Limited (Throttled)', plus: 'High Speed (No throttle)', pro: 'Unlimited Speed' },
    { name: 'Parallel Limit', free: '1 Active Download', plus: '3 Parallel Downloads', pro: 'Unlimited Parallel' },
    { name: 'Batch Downloader', free: '❌ Not Available', plus: '✅ Available', pro: '✅ Premium Batch + Playlist imports' },
    { name: 'Audio Formats Extractor', free: 'MP3 (128kbps)', plus: 'High Quality MP3 / M4A (320kbps)', pro: 'Lossless Audio (FLAC/WAV support)' },
    { name: 'Video Resolution', free: 'up to 720p', plus: 'up to 1080p Full HD', pro: 'up to 4K / 8K Ultra HD' },
    { name: 'Scheduler Engine', free: '❌ Not Available', plus: '✅ Basic Scheduler', pro: '✅ Advanced Scheduler + Post actions' },
    { name: 'Cross-Device Settings Sync', free: '❌ Local Only', plus: '✅ Cloud Settings Sync', pro: '✅ Full Settings + Favorites Sync' }
  ];

  const platformsList: PlatformInfo[] = [
    {
      name: 'YouTube',
      color: 'from-red-600 to-red-700',
      type: ['Video', 'Audio'],
      description: 'Download standard videos, Shorts, channels, and full playlists up to 4K resolution.',
      features: ['Up to 4K 60fps', 'Subtitles/Captions', 'Audio extracting (MP3/FLAC)', 'Playlists/Channels'],
      requiredPlan: 'Free'
    },
    {
      name: 'Spotify',
      color: 'from-emerald-500 to-emerald-600',
      type: ['Audio'],
      description: 'Import track, album, or playlist metadata and match with YouTube audio tracks at 320kbps.',
      features: ['Tracks & Playlists', 'Full Albums', 'ID3 Metadata tagging', 'Album cover artwork'],
      requiredPlan: 'Plus'
    },
    {
      name: 'Instagram',
      color: 'from-pink-500 via-red-500 to-yellow-500',
      type: ['Video', 'Image'],
      description: 'Download reels, single image posts, video posts, and carousel multiple image sheets.',
      features: ['HD Reels download', 'Carousel photos extraction', 'IGTV & Videos', 'No compression losses'],
      requiredPlan: 'Plus'
    },
    {
      name: 'X (Twitter)',
      color: 'from-sky-500 to-sky-600',
      type: ['Video', 'Image'],
      description: 'Grab full-resolution video posts, images, and loopable GIFs from tweet links.',
      features: ['Video MP4 files', 'HD original images', 'GIF converting', 'Fast thread extraction'],
      requiredPlan: 'Pro'
    },
    {
      name: 'TikTok',
      color: 'from-zinc-900 via-slate-800 to-zinc-900',
      type: ['Video'],
      description: 'Extract standard videos, slideshow frames, and loop music from posts.',
      features: ['Watermark-free downloads', 'Original audio tracks', 'Multi-slideshow image sets', 'Ultra-fast extraction'],
      requiredPlan: 'Pro'
    },
    {
      name: 'SoundCloud',
      color: 'from-orange-500 to-orange-600',
      type: ['Audio'],
      description: 'Download tracks, albums, sets, and user playlists at maximum audio quality.',
      features: ['High-bitrate MP3/FLAC', 'Album art injection', 'Artist profile tagging', 'Full sets downloader'],
      requiredPlan: 'Pro'
    },
    {
      name: 'Twitch Clips',
      color: 'from-purple-600 to-purple-700',
      type: ['Video'],
      description: 'Extract gaming stream clips and highlights directly from clip sharing links.',
      features: ['1080p 60fps support', 'Stream details metadata', 'Instant clip downloading', 'Low latency'],
      requiredPlan: 'Pro'
    },
    {
      name: 'Reddit',
      color: 'from-orange-600 to-orange-500',
      type: ['Video', 'Image'],
      description: 'Download posts containing video frames, multi-image sets, and external links.',
      features: ['Muxed video/audio matching', 'Subreddit tagging', 'Gallery image downloads', 'GIF extracts'],
      requiredPlan: 'Pro'
    }
  ];

  const isPlatformLocked = (requiredPlan: 'Free' | 'Plus' | 'Pro'): boolean => {
    if (currentPlan === 'Pro') return false;
    if (currentPlan === 'Plus') return requiredPlan === 'Pro';
    // Free: only Free platforms available
    return requiredPlan !== 'Free';
  };

  // Plans comparison data
  const planFeatures = [
    { category: 'Dashboard', feature: 'Recent Downloads Widget', free: true, plus: true, pro: true },
    { category: 'Dashboard', feature: 'Platform Usage Chart', free: false, plus: true, pro: true },
    { category: 'Dashboard', feature: 'Activity Log Widget', free: false, plus: true, pro: true },
    { category: 'Dashboard', feature: 'Download Metrics Widget', free: false, plus: false, pro: true },
    { category: 'Dashboard', feature: 'Disk Storage Gauge Widget', free: false, plus: false, pro: true },
    { category: 'Dashboard', feature: 'System Specs Widget', free: false, plus: false, pro: true },
    { category: 'Dashboard', feature: 'Customize Dashboard Layout', free: false, plus: false, pro: true },
    { category: 'Themes', feature: 'Discord Dark Theme', free: true, plus: true, pro: true },
    { category: 'Themes', feature: 'Light Mode', free: true, plus: true, pro: true },
    { category: 'Themes', feature: 'All 8 Premium Themes', free: false, plus: false, pro: true },
    { category: 'Customization', feature: 'Accent Color Styling', free: false, plus: true, pro: true },
    { category: 'Customization', feature: 'Full Theme Customization', free: false, plus: false, pro: true },
    { category: 'Features', feature: 'Download Queue Manager', free: true, plus: true, pro: true },
    { category: 'Features', feature: 'Media Library', free: true, plus: true, pro: true },
    { category: 'Features', feature: 'Favorites Library', free: false, plus: true, pro: true },
    { category: 'Features', feature: 'Built-in Browser', free: false, plus: true, pro: true },
    { category: 'Features', feature: 'Download Scheduler', free: false, plus: false, pro: true },
    { category: 'Settings', feature: 'General Preferences', free: true, plus: true, pro: true },
    { category: 'Settings', feature: 'Advanced Engine Controls', free: false, plus: false, pro: true },
    { category: 'Settings', feature: 'Platform Status Panel', free: false, plus: false, pro: true },
    { category: 'Settings', feature: 'System & Analytics Panel', free: false, plus: false, pro: true },
    { category: 'Platforms', feature: 'YouTube', free: true, plus: true, pro: true },
    { category: 'Platforms', feature: 'Spotify', free: false, plus: true, pro: true },
    { category: 'Platforms', feature: 'Instagram', free: false, plus: true, pro: true },
    { category: 'Platforms', feature: 'X (Twitter)', free: false, plus: false, pro: true },
    { category: 'Platforms', feature: 'TikTok', free: false, plus: false, pro: true },
    { category: 'Platforms', feature: 'SoundCloud', free: false, plus: false, pro: true },
    { category: 'Platforms', feature: 'Twitch Clips', free: false, plus: false, pro: true },
    { category: 'Platforms', feature: 'Reddit', free: false, plus: false, pro: true },
    { category: 'Quality', feature: 'Max Video Resolution 1080p', free: true, plus: true, pro: true },
    { category: 'Quality', feature: 'Max Video Resolution 4K', free: false, plus: true, pro: true },
    { category: 'Quality', feature: 'Max Audio Bitrate 192kbps', free: true, plus: true, pro: true },
    { category: 'Quality', feature: 'Max Audio Bitrate 320kbps', free: false, plus: true, pro: true },
  ];

  const categories = Array.from(new Set(planFeatures.map(f => f.category)));

  const FeatureCell: React.FC<{ value: boolean }> = ({ value }) =>
    value
      ? <Check className="w-4 h-4 text-discord-success mx-auto" />
      : <X className="w-3.5 h-3.5 text-discord-textMuted/40 mx-auto" />;

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto space-y-6 select-none relative flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="mb-2 shrink-0">
        <h1 className="text-2xl font-extrabold text-discord-textNormal flex items-center space-x-2.5">
          <Cloud className="w-6 h-6 text-discord-accent animate-pulse" />
          <span>Platforms & Plans</span>
        </h1>
        <p className="text-sm text-discord-textMuted mt-1.5 font-medium">
          Explore platform capabilities and compare available plans.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center space-x-1 bg-discord-secondary/40 p-1 rounded-xl border border-discord-border shrink-0 w-fit">
        <button
          onClick={() => setActiveTab('platforms')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'platforms'
              ? 'bg-discord-accent text-white shadow-md'
              : 'text-discord-textMuted hover:text-discord-textNormal'
          }`}
        >
          Supported Platforms
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center space-x-1.5 ${
            activeTab === 'plans'
              ? 'bg-discord-accent text-white shadow-md'
              : 'text-discord-textMuted hover:text-discord-textNormal'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Plans & Pricing</span>
        </button>
      </div>

      {/* TAB 1: Platform Cards */}
      {activeTab === 'platforms' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto h-full pr-2 animate-fadeIn">
          {platformsList.map((plat) => {
            const locked = isPlatformLocked(plat.requiredPlan);
            return (
              <div
                key={plat.name}
                onClick={locked ? () => showUpgradeToast(`${plat.name} requires ${plat.requiredPlan}`, plat.requiredPlan as 'Plus' | 'Pro') : undefined}
                className={`bg-discord-card border border-discord-border rounded-2xl overflow-hidden shadow-md flex flex-col justify-between transition-all duration-300 ${
                  locked
                    ? 'opacity-60 cursor-pointer hover:opacity-75 hover:border-discord-textMuted/40'
                    : 'hover:scale-[1.02] hover:shadow-lg'
                }`}
              >
                {/* Gradient Header Banner */}
                <div className={`h-24 bg-gradient-to-br ${plat.color} p-4 flex flex-col justify-between text-white relative shadow-inner`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded uppercase select-none tracking-wider">
                      {plat.type.join(' + ')}
                    </span>
                    {locked && (
                      <div className="flex items-center space-x-1 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <Lock className="w-3 h-3 text-white" />
                        <span className="text-[8px] font-extrabold text-white uppercase">{plat.requiredPlan}</span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-base font-extrabold tracking-wide drop-shadow-md">{plat.name}</h2>
                </div>

                {/* Info details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-discord-textMuted leading-relaxed font-semibold">
                    {plat.description}
                  </p>

                  {/* Bullet Features list */}
                  <div className="space-y-1.5 pt-2 border-t border-discord-border">
                    {plat.features.map((feat, idx) => (
                      <div key={idx} className={`flex items-center space-x-2 text-[10px] font-bold ${locked ? 'text-discord-textMuted' : 'text-discord-textNormal'}`}>
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${locked ? 'text-discord-textMuted/50' : 'text-discord-success'}`} />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Plans & Pricing */}
      {activeTab === 'plans' && (
        <div className="overflow-y-auto h-full pr-2 space-y-6 animate-fadeIn pb-6 select-none">
          {/* Toggle billing period */}
          <div className="flex justify-center select-none shrink-0">
            <div className="bg-discord-secondary border border-discord-border p-1 rounded-xl flex space-x-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${billingPeriod === 'monthly' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textMuted hover:text-discord-textNormal'}`}
              >
                Monthly Plan
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${billingPeriod === 'yearly' ? 'bg-discord-accent text-white shadow-md' : 'text-discord-textMuted hover:text-discord-textNormal'}`}
              >
                <span>Yearly Plan</span>
                <span className="text-[9px] bg-discord-success text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95">Save 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FREE PLAN */}
            <div className="bg-discord-card border border-discord-border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-md relative overflow-hidden">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-discord-textMuted uppercase tracking-widest">Base plan</span>
                <h3 className="text-lg font-black text-discord-textNormal">Free Plan</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-discord-textNormal">₹0</span>
                  <span className="text-[10px] font-semibold text-discord-textMuted ml-1">/ forever</span>
                </div>
                <p className="text-xs text-discord-textMuted leading-relaxed">Basic downloader with speed limits and parallel restrictions.</p>
              </div>
              <button
                disabled={true}
                className="w-full text-center text-xs font-bold py-2.5 rounded-xl border border-discord-border text-discord-textMuted bg-transparent"
              >
                Current plan
              </button>
            </div>

            {/* PLUS PLAN */}
            <div className="bg-discord-card border border-emerald-500/60 shadow-lg shadow-emerald-500/5 rounded-2xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">Popular</div>
              <div className="space-y-2">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center">Premium Power</span>
                <h3 className="text-lg font-black text-discord-textNormal">Plus Plan</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-discord-textNormal">₹{pricing.Plus.price}</span>
                  <span className="text-[10px] font-semibold text-discord-textMuted ml-1">/ {billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p className="text-xs text-discord-textMuted leading-relaxed">Supercharged speeds, scheduler engines, and multiplatform extraction.</p>
              </div>
              <button
                onClick={() => handleUpgrade('Plus')}
                disabled={loadingPlan !== null || currentPlan === 'Plus'}
                className="w-full text-center text-xs font-bold py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 disabled:opacity-60 disabled:cursor-default"
              >
                {currentPlan === 'Plus' ? '✓ Active Plan' : loadingPlan === `plus_${billingPeriod}` ? 'Checkout...' : 'Upgrade to Plus'}
              </button>
            </div>

            {/* PRO PLAN */}
            <div className="bg-discord-card border border-purple-500/60 shadow-lg shadow-purple-500/5 rounded-2xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center">Enterprise Level</span>
                <h3 className="text-lg font-black text-discord-textNormal">Pro Plan</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-discord-textNormal">₹{pricing.Pro.price}</span>
                  <span className="text-[10px] font-semibold text-discord-textMuted ml-1">/ {billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p className="text-xs text-discord-textMuted leading-relaxed">Lossless audio outputs, maximum 4K/8K resolutions, and premium automation tools.</p>
              </div>
              <button
                onClick={() => handleUpgrade('Pro')}
                disabled={loadingPlan !== null || currentPlan === 'Pro'}
                className="w-full text-center text-xs font-bold py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer shadow-md shadow-purple-600/20 flex items-center justify-center space-x-1.5 disabled:opacity-60 disabled:cursor-default"
              >
                {currentPlan === 'Pro' ? '✓ Active Plan' : loadingPlan === `pro_${billingPeriod}` ? 'Checkout...' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>

          {/* Feature Matrix Table */}
          <div className="bg-discord-card border border-discord-border rounded-2xl overflow-hidden shadow-md">
            <div className="px-5 py-3 border-b border-discord-border bg-discord-secondary/30">
              <h3 className="text-xs font-extrabold text-discord-textNormal uppercase tracking-wider">Plan Feature Comparison</h3>
            </div>
            <div className="divide-y divide-discord-border/50 text-xs">
              {featureComparisonList.map((f) => (
                <div key={f.name} className="grid grid-cols-12 p-3 gap-2 hover:bg-discord-secondary/15 transition-colors">
                  <div className="col-span-4 font-bold text-discord-textNormal">{f.name}</div>
                  <div className="col-span-2 text-discord-textMuted font-semibold">{f.free}</div>
                  <div className="col-span-3 text-emerald-400 font-bold">{f.plus}</div>
                  <div className="col-span-3 text-purple-400 font-black">{f.pro}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Billing Details */}
          {errorMsg && (
            <div className="text-[10px] text-discord-danger font-bold text-center bg-discord-danger/10 py-2 rounded-lg border border-discord-danger/20">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      {upgradeModalOpen && (
        <UpgradeModal onClose={() => setUpgradeModalOpen(false)} />
      )}
    </div>
  );
};

export default Platforms;
