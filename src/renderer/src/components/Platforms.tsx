import React, { useState } from 'react';
import { Cloud, CheckCircle2, Lock, Sparkles, Check, X } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
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
  const currentPlan = settings.plan || 'Free';
  const [activeTab, setActiveTab] = useState<'platforms' | 'plans'>('platforms');

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
        <div className="overflow-y-auto h-full pr-2 space-y-6 animate-fadeIn">
          {/* Plan header cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                name: 'Free', price: '$0', period: 'forever',
                badge: null,
                gradient: 'from-discord-secondary to-discord-card',
                border: currentPlan === 'Free' ? 'border-discord-accent' : 'border-discord-border',
                accent: 'text-discord-textMuted',
                desc: 'Essential downloading for personal use.',
                features: ['YouTube downloads', '1080p video cap', '192kbps audio cap', 'Basic themes only']
              },
              {
                name: 'Plus', price: '$4.99', period: '/mo',
                badge: 'Popular',
                gradient: 'from-emerald-900/40 to-discord-card',
                border: currentPlan === 'Plus' ? 'border-emerald-500' : 'border-emerald-500/20',
                accent: 'text-emerald-400',
                desc: 'Everything you need for power users.',
                features: ['YouTube + Spotify + Instagram', '4K video quality', '320kbps audio', 'Accent color styling', 'Built-in Browser', 'Favorites library']
              },
              {
                name: 'Pro', price: '$9.99', period: '/mo',
                badge: 'All Features',
                gradient: 'from-purple-900/40 to-discord-card',
                border: currentPlan === 'Pro' ? 'border-purple-500' : 'border-purple-500/20',
                accent: 'text-purple-400',
                desc: 'Complete media ecosystem unlocked.',
                features: ['All 8 platforms', 'All themes + customizations', 'Download Scheduler', 'Advanced Engine', 'Dashboard widgets', 'Platform Status & Analytics']
              }
            ].map((plan) => (
              <div
                key={plan.name}
                className={`bg-gradient-to-br ${plan.gradient} border-2 ${plan.border} rounded-2xl p-5 flex flex-col space-y-4 shadow-md relative overflow-hidden`}
              >
                {plan.badge && (
                  <span className={`absolute top-3 right-3 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    plan.name === 'Plus' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>{plan.badge}</span>
                )}
                {currentPlan === plan.name && (
                  <span className="absolute top-3 left-3 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-discord-accent/20 text-discord-accent border border-discord-accent/30">
                    Current Plan
                  </span>
                )}

                <div className="pt-3">
                  <h3 className={`text-lg font-extrabold ${plan.accent}`}>{plan.name}</h3>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-black text-discord-textNormal">{plan.price}</span>
                    <span className="text-xs text-discord-textMuted font-semibold">{plan.period}</span>
                  </div>
                  <p className="text-[10px] text-discord-textMuted font-semibold mt-1.5 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="space-y-1.5 border-t border-discord-border/50 pt-3 flex-1">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center space-x-2 text-[10px] text-discord-textNormal font-semibold">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${plan.accent}`} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={currentPlan === plan.name}
                  className={`w-full py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${
                    currentPlan === plan.name
                      ? 'bg-discord-secondary/50 text-discord-textMuted cursor-default'
                      : plan.name === 'Plus'
                      ? 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30'
                      : plan.name === 'Pro'
                      ? 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30'
                      : 'bg-discord-secondary/50 text-discord-textMuted cursor-default'
                  }`}
                  onClick={() => {
                    if (plan.name !== 'Free' && currentPlan !== plan.name) {
                      alert(`To upgrade to ${plan.name}, go to Accounts Center → License Key and enter your ${plan.name} plan key.`);
                    }
                  }}
                >
                  {currentPlan === plan.name ? '✓ Active Plan' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>

          {/* Full feature comparison table */}
          <div className="bg-discord-card border border-discord-border rounded-2xl overflow-hidden shadow-md">
            <div className="px-5 py-3 border-b border-discord-border bg-discord-secondary/30">
              <h3 className="text-xs font-extrabold text-discord-textNormal uppercase tracking-wider">Full Feature Comparison</h3>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px_80px_80px] text-center text-[10px] font-extrabold uppercase tracking-wider border-b border-discord-border bg-discord-secondary/20">
              <div className="px-4 py-2.5 text-left text-discord-textMuted">Feature</div>
              <div className="py-2.5 text-discord-textMuted">Free</div>
              <div className="py-2.5 text-emerald-400">Plus</div>
              <div className="py-2.5 text-purple-400">Pro</div>
            </div>

            {categories.map((cat) => (
              <div key={cat}>
                {/* Category header row */}
                <div className="grid grid-cols-[1fr_80px_80px_80px] bg-discord-secondary/10 border-b border-discord-border/50">
                  <div className="px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-widest text-discord-accent col-span-4">
                    {cat}
                  </div>
                </div>
                {planFeatures
                  .filter(f => f.category === cat)
                  .map((f, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_80px_80px_80px] text-center border-b border-discord-border/20 hover:bg-discord-secondary/15 transition-colors"
                    >
                      <div className="px-4 py-2 text-left text-[10px] font-semibold text-discord-textNormal">{f.feature}</div>
                      <div className="py-2 flex items-center justify-center"><FeatureCell value={f.free} /></div>
                      <div className="py-2 flex items-center justify-center"><FeatureCell value={f.plus} /></div>
                      <div className="py-2 flex items-center justify-center"><FeatureCell value={f.pro} /></div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Platforms;
