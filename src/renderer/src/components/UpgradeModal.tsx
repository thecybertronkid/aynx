import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, ShieldCheck, Zap, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface UpgradeModalProps {
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { user, isOnline } = useAuthStore();

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
        alert(`Success! You have been upgraded to AYNX ${plan} plan.`);
        // Reload settings & user plan (automatically done by setting update event)
        onClose();
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

  const featureComparison = [
    { name: 'Supported Platforms', free: 'Basic (YouTube, Soundcloud)', plus: 'All Platforms (Spotify, etc.)', pro: 'All Platforms + Session assistance' },
    { name: 'Max Downloads Speed', free: 'Limited (Throttled)', plus: 'High Speed (No throttle)', pro: 'Unlimited Speed' },
    { name: 'Parallel Limit', free: '1 Active Download', plus: '3 Parallel Downloads', pro: 'Unlimited Parallel' },
    { name: 'Batch Downloader', free: '❌ Not Available', plus: '✅ Available', pro: '✅ Premium Batch + Playlist imports' },
    { name: 'Audio Formats Extractor', free: 'MP3 (128kbps)', plus: 'High Quality MP3 / M4A (320kbps)', pro: 'Lossless Audio (FLAC/WAV support)' },
    { name: 'Video Resolution', free: 'up to 720p', plus: 'up to 1080p Full HD', pro: 'up to 4K / 8K Ultra HD' },
    { name: 'Scheduler Engine', free: '❌ Not Available', freePlus: false, plus: '✅ Basic Scheduler', pro: '✅ Advanced Scheduler + Post actions' },
    { name: 'Cross-Device Settings Sync', free: '❌ Local Only', plus: '✅ Cloud Settings Sync', pro: '✅ Full Settings + Favorites Sync' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-[850px] max-h-[90vh] bg-[#1e1f22] border border-[#3f4147] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top bar header */}
        <div className="px-6 py-4 bg-[#2b2d31] border-b border-[#3f4147] flex justify-between items-center select-none shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#5865f2]" />
              <span>Upgrade to AYNX Premium</span>
            </h2>
            <p className="text-[10px] text-[#b5bac1] font-semibold mt-0.5">Unlock supercharged downloading speed & platform integration</p>
          </div>
          <button onClick={onClose} className="text-[#b5bac1] hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-[#35373c]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Toggle billing period */}
          <div className="flex justify-center select-none">
            <div className="bg-[#2b2d31] border border-[#3f4147] p-1 rounded-xl flex space-x-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${billingPeriod === 'monthly' ? 'bg-[#5865f2] text-white' : 'text-[#b5bac1] hover:text-white'}`}
              >
                Monthly Plan
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${billingPeriod === 'yearly' ? 'bg-[#5865f2] text-white' : 'text-[#b5bac1] hover:text-white'}`}
              >
                <span>Yearly Plan</span>
                <span className="text-[9px] bg-[#23a55a] text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95">Save 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* FREE PLAN */}
            <div className="bg-[#2b2d31]/40 border border-[#3f4147] rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-[#6d6f78] uppercase tracking-widest">Base plan</span>
                <h3 className="text-lg font-black text-white">Free Plan</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-white">₹0</span>
                  <span className="text-[10px] font-semibold text-[#b5bac1] ml-1">/ forever</span>
                </div>
                <p className="text-xs text-[#b5bac1] leading-relaxed">Basic downloader with speed limits and parallel restrictions.</p>
              </div>
              <button
                disabled={true}
                className="w-full text-center text-xs font-bold py-2.5 rounded-xl border border-[#3f4147] text-[#6d6f78] bg-transparent"
              >
                Current plan
              </button>
            </div>

            {/* PLUS PLAN */}
            <div className="bg-[#2b2d31] border border-[#23a55a]/60 shadow-lg shadow-[#23a55a]/5 rounded-xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#23a55a] text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">Popular</div>
              <div className="space-y-2">
                <span className="text-[9px] font-black text-[#23a55a] uppercase tracking-widest flex items-center"><Zap className="w-3 h-3 mr-1" />Premium Power</span>
                <h3 className="text-lg font-black text-white">Plus Plan</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-white">₹{pricing.Plus.price}</span>
                  <span className="text-[10px] font-semibold text-[#b5bac1] ml-1">/ {billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p className="text-xs text-[#b5bac1] leading-relaxed">Supercharged speeds, scheduler engines, and multiplatform extraction.</p>
              </div>
              <button
                onClick={() => handleUpgrade('Plus')}
                disabled={loadingPlan !== null}
                className="w-full text-center text-xs font-bold py-2.5 rounded-xl bg-[#23a55a] hover:bg-[#1a8547] text-white transition-colors cursor-pointer shadow-md shadow-[#23a55a]/20 flex items-center justify-center space-x-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {loadingPlan === `plus_${billingPeriod}` ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checkout...</span>
                  </>
                ) : (
                  <span>Upgrade to Plus</span>
                )}
              </button>
            </div>

            {/* PRO PLAN */}
            <div className="bg-[#2b2d31] border border-[#5865f2]/60 shadow-lg shadow-[#5865f2]/5 rounded-xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-[#5865f2] uppercase tracking-widest flex items-center"><Sparkles className="w-3 h-3 mr-1" />Enterprise Level</span>
                <h3 className="text-lg font-black text-white">Pro Plan</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-black text-white">₹{pricing.Pro.price}</span>
                  <span className="text-[10px] font-semibold text-[#b5bac1] ml-1">/ {billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p className="text-xs text-[#b5bac1] leading-relaxed">Lossless audio outputs, maximum 4K/8K resolutions, and premium automation tools.</p>
              </div>
              <button
                onClick={() => handleUpgrade('Pro')}
                disabled={loadingPlan !== null}
                className="w-full text-center text-xs font-bold py-2.5 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white transition-colors cursor-pointer shadow-md shadow-[#5865f2]/20 flex items-center justify-center space-x-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {loadingPlan === `pro_${billingPeriod}` ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checkout...</span>
                  </>
                ) : (
                  <span>Upgrade to Pro</span>
                )}
              </button>
            </div>
          </div>

          {/* Feature matrix */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4147] rounded-xl overflow-hidden select-none">
            <div className="px-4 py-2 border-b border-[#3f4147] bg-[#2b2d31]/60 text-[9px] font-black text-[#b5bac1] uppercase tracking-wider">Plan Feature Comparison</div>
            <div className="divide-y divide-[#3f4147] text-xs">
              {featureComparison.map((f) => (
                <div key={f.name} className="grid grid-cols-12 p-3 gap-2">
                  <div className="col-span-4 font-bold text-[#dbdee1]">{f.name}</div>
                  <div className="col-span-2 text-[#b5bac1] font-semibold">{f.free}</div>
                  <div className="col-span-3 text-[#23a55a] font-bold">{f.plus}</div>
                  <div className="col-span-3 text-[#5865f2] font-black">{f.pro}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info/error row */}
        <div className="px-6 py-4 bg-[#2b2d31] border-t border-[#3f4147] flex flex-col space-y-2 select-none shrink-0">
          {errorMsg && (
            <div className="text-[10px] text-[#f23f43] font-bold text-center bg-[#f23f43]/10 py-2 rounded-lg border border-[#f23f43]/20 flex items-center justify-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#f23f43]" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-[10px] text-[#6d6f78] font-bold">
            <span className="flex items-center space-x-1"><ShieldCheck className="w-3.5 h-3.5" /><span>Secure transactions via Razorpay</span></span>
            <span>All subscriptions valid for 30 days or 365 days respectively</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UpgradeModal;
