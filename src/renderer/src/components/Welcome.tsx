import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, Key, ArrowRight, Sparkles, Shield, Download, Zap, CheckCircle, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface WelcomeProps {
  onComplete: () => void;
}

const pageVariants = {
  initial: { opacity: 0, x: 60, scale: 0.96 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -60, scale: 0.96 }
};

const pageTransition = { type: 'spring', stiffness: 280, damping: 28 };

// Floating particles background
const Particles: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: Math.random() * 4 + 2,
          height: Math.random() * 4 + 2,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: i % 3 === 0 ? '#5865f2' : i % 3 === 1 ? '#23a55a' : '#f5a623',
          opacity: 0.3
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.15, 0.4, 0.15]
        }}
        transition={{
          duration: 3 + Math.random() * 4,
          repeat: Infinity,
          delay: Math.random() * 3,
          ease: 'easeInOut'
        }}
      />
    ))}
  </div>
);

// Screen 1: Hero welcome
const HeroScreen: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    className="flex flex-col items-center justify-center h-full text-center px-12 space-y-10"
  >
    {/* Logo */}
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
      className="relative"
    >
      <div className="w-24 h-24 bg-gradient-to-br from-[#5865f2] to-[#7c3aed] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#5865f2]/40">
        <span className="text-white text-4xl font-black tracking-tight">AY</span>
      </div>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-2 rounded-[28px] border-2 border-[#5865f2]/40"
      />
    </motion.div>

    {/* Title */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <h1 className="text-5xl font-black text-white tracking-tight">
        Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5865f2] to-[#7c3aed]">AYNX</span>
      </h1>
      <p className="text-lg font-semibold text-[#b5bac1]">Universal Media Downloader</p>
    </motion.div>

    {/* Tagline */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="space-y-2"
    >
      <p className="text-2xl font-bold text-[#dbdee1]">Download Anything.</p>
      <p className="text-2xl font-bold text-[#dbdee1]">Manage Everything.</p>
    </motion.div>

    {/* Feature pills */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex flex-wrap justify-center gap-2"
    >
      {['YouTube', 'Spotify', 'Instagram', 'Twitter', 'TikTok', 'And More'].map((p, i) => (
        <span key={p} className="px-3 py-1 bg-[#2b2d31] border border-[#3f4147] text-[#b5bac1] text-xs font-bold rounded-full">
          {p}
        </span>
      ))}
    </motion.div>

    {/* CTA */}
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      onClick={onNext}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center space-x-3 bg-gradient-to-r from-[#5865f2] to-[#7c3aed] text-white font-bold px-10 py-4 rounded-2xl shadow-xl shadow-[#5865f2]/30 text-base hover:shadow-2xl hover:shadow-[#5865f2]/40 transition-shadow cursor-pointer"
    >
      <span>Get Started</span>
      <ArrowRight className="w-5 h-5" />
    </motion.button>
  </motion.div>
);

// Screen 2: Auth selection
const AuthScreen: React.FC<{
  onGoogle: () => void;
  onFree: () => void;
  googleLoading: boolean;
}> = ({ onGoogle, onFree, googleLoading }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    className="flex flex-col items-center justify-center h-full px-12 space-y-8"
  >
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-2"
    >
      <h2 className="text-3xl font-black text-white">Choose how to begin</h2>
      <p className="text-[#b5bac1] font-semibold">Sign in to unlock your free 30-day Plus trial</p>
    </motion.div>

    <div className="w-full max-w-sm space-y-4">
      {/* Google Sign In */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={onGoogle}
        disabled={googleLoading}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center space-x-4 bg-white text-[#1e1f22] font-bold px-6 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer disabled:opacity-70 disabled:cursor-wait group relative overflow-hidden"
      >
        <motion.div
          animate={googleLoading ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          {googleLoading ? <Loader2 className="w-6 h-6 text-[#5865f2]" /> : <Chrome className="w-6 h-6" />}
        </motion.div>
        <div className="flex-1 text-left">
          <p className="font-black text-sm">Continue with Google</p>
          <p className="text-xs font-semibold text-[#4e5058] mt-0.5">
            {googleLoading ? 'Connecting to Google...' : '🎉 Get 30-day Plus trial free'}
          </p>
        </div>
        <Sparkles className="w-4 h-4 text-[#f5a623]" />
      </motion.button>

      {/* Divider */}
      <div className="flex items-center space-x-3">
        <div className="flex-1 h-px bg-[#3f4147]" />
        <span className="text-[#6d6f78] text-xs font-bold">OR</span>
        <div className="flex-1 h-px bg-[#3f4147]" />
      </div>

      {/* Continue Free */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={onFree}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full text-center text-[#b5bac1] hover:text-white font-semibold text-sm py-2 cursor-pointer transition-colors"
      >
        Continue with Free Plan →
      </motion.button>
    </div>

    {/* Trust badges */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="flex items-center space-x-6 text-[10px] text-[#6d6f78] font-semibold"
    >
      <span className="flex items-center space-x-1.5"><Shield className="w-3 h-3" /><span>Secure OAuth</span></span>
      <span className="flex items-center space-x-1.5"><Download className="w-3 h-3" /><span>No Data Stored</span></span>
      <span className="flex items-center space-x-1.5"><Zap className="w-3 h-3" /><span>Instant Sync</span></span>
    </motion.div>
  </motion.div>
);

// Screen 3a: Google Success
const GoogleSuccessScreen: React.FC<{
  user: { name: string; email: string; avatar: string; plan: string; trial: boolean; trialExpiry: string };
  onComplete: () => void;
}> = ({ user, onComplete }) => {
  const expiryDate = user.trialExpiry ? new Date(user.trialExpiry).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : '30 days from now';

  const isPaidPlan = !user.trial && user.plan !== 'Free';

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="flex flex-col items-center justify-center h-full px-12 space-y-8 text-center"
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative"
      >
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-[#5865f2] shadow-xl shadow-[#5865f2]/30" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5865f2] to-[#7c3aed] flex items-center justify-center text-white text-3xl font-black border-4 border-[#5865f2]/40">
            {user.name?.slice(0, 2).toUpperCase() || 'AY'}
          </div>
        )}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#23a55a] rounded-full flex items-center justify-center border-2 border-[#1e1f22]"
        >
          <CheckCircle className="w-4 h-4 text-white" />
        </motion.div>
      </motion.div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h2 className="text-4xl font-black text-white">
          {user.trial ? '🎉' : '✅'} Welcome, {user.name?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-[#b5bac1] font-semibold">{user.email}</p>
      </motion.div>

      {/* Trial/Plan card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35 }}
        className={`w-full max-w-sm p-5 rounded-2xl border ${
          user.plan === 'Pro'
            ? 'bg-[#5865f2]/10 border-[#5865f2]/40'
            : user.plan === 'Plus'
            ? 'bg-[#23a55a]/10 border-[#23a55a]/40'
            : 'bg-[#2b2d31] border-[#3f4147]'
        } space-y-3`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className={`w-5 h-5 ${user.plan === 'Pro' ? 'text-[#5865f2]' : user.plan === 'Plus' ? 'text-[#23a55a]' : 'text-[#6d6f78]'}`} />
            <span className="font-black text-white text-sm">
              {user.trial ? 'AYNX Plus Trial Activated!' : `AYNX ${user.plan} Plan`}
            </span>
          </div>
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
            user.plan === 'Pro' ? 'bg-[#5865f2] text-white' :
            user.plan === 'Plus' ? 'bg-[#23a55a] text-white' :
            'bg-[#4e5058] text-white'
          }`}>{user.plan.toUpperCase()}</span>
        </div>

        {user.trial && (
          <>
            <p className="text-[#dbdee1] text-sm font-semibold">
              Your 30-day Plus trial is now active. Enjoy all premium features — no credit card required.
            </p>
            <div className="flex items-center space-x-2 bg-[#23a55a]/10 border border-[#23a55a]/30 rounded-xl px-3 py-2">
              <CheckCircle className="w-4 h-4 text-[#23a55a] shrink-0" />
              <span className="text-xs font-bold text-[#23a55a]">Trial ends: {expiryDate}</span>
            </div>
          </>
        )}

        {isPaidPlan && (
          <p className="text-[#dbdee1] text-sm font-semibold">
            Your {user.plan} plan is active and synced to your account.
          </p>
        )}

        {user.plan === 'Free' && !user.trial && (
          <p className="text-[#b5bac1] text-sm font-semibold">
            You're on the Free plan. Upgrade anytime for unlimited downloads.
          </p>
        )}
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onComplete}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center space-x-3 bg-gradient-to-r from-[#5865f2] to-[#7c3aed] text-white font-bold px-10 py-4 rounded-2xl shadow-xl shadow-[#5865f2]/30 cursor-pointer"
      >
        <span>Go to Dashboard</span>
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
};

// ─── Main Welcome Component ───────────────────────────────────────────────────
const Welcome: React.FC<WelcomeProps> = ({ onComplete }) => {
  const [screen, setScreen] = useState<'hero' | 'auth' | 'success'>('hero');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successUser, setSuccessUser] = useState<any>(null);
  const { login } = useAuthStore();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await (window.api as any).loginWithGoogle();
      if (result?.success && result.user) {
        login(result.user, result.token);
        setSuccessUser(result.user);
        setScreen('success');
      } else {
        setGoogleLoading(false);
      }
    } catch (_) {
      setGoogleLoading(false);
    }
  };

  const handleFreeMode = async () => {
    // Just proceed without login
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#111214] flex items-center justify-center overflow-hidden">
      <Particles />

      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#5865f2]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="relative w-[580px] h-[640px] bg-[#1e1f22]/90 backdrop-blur-xl border border-[#3f4147]/60 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5865f2] via-[#7c3aed] to-[#23a55a]" />

        {/* Step indicator */}
        <div className="absolute top-5 right-6 flex space-x-1.5">
          {(['hero', 'auth', 'success'] as const).map((s, i) => (
            <div key={s} className={`h-1 rounded-full transition-all duration-300 ${
              screen === s
                ? 'w-6 bg-[#5865f2]'
                : i < (['hero', 'auth', 'success'].indexOf(screen))
                ? 'w-4 bg-[#23a55a]'
                : 'w-4 bg-[#3f4147]'
            }`} />
          ))}
        </div>

        {/* Screen content */}
        <AnimatePresence mode="wait">
          {screen === 'hero' && (
            <HeroScreen key="hero" onNext={() => setScreen('auth')} />
          )}
          {screen === 'auth' && (
            <AuthScreen
              key="auth"
              onGoogle={handleGoogleLogin}
              onFree={handleFreeMode}
              googleLoading={googleLoading}
            />
          )}
          {screen === 'success' && successUser && (
            <GoogleSuccessScreen
              key="success"
              user={successUser}
              onComplete={onComplete}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Version watermark */}
      <p className="absolute bottom-4 text-center text-[10px] text-[#4e5058] font-bold">
        AYNX v2.5.4 — Universal Media Downloader
      </p>
    </div>
  );
};

export default Welcome;
