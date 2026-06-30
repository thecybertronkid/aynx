import React, { useEffect, useState } from 'react';
import { Lock, X, Sparkles } from 'lucide-react';

interface UpgradeToastProps {
  message: string;
  requiredPlan: 'Plus' | 'Pro';
  onClose: () => void;
}

export const UpgradeToast: React.FC<UpgradeToastProps> = ({ message, requiredPlan, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const color = requiredPlan === 'Pro' ? 'from-purple-600 to-discord-accent' : 'from-emerald-500 to-teal-500';
  const badgeColor = requiredPlan === 'Pro' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] flex items-start space-x-3 bg-discord-secondary border border-discord-border rounded-2xl px-4 py-3 shadow-2xl max-w-xs transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
    >
      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-md`}>
        <Lock className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-0.5">
          <span className={`text-[9px] font-extrabold uppercase tracking-widest border rounded px-1.5 py-0.5 ${badgeColor}`}>
            {requiredPlan} Required
          </span>
        </div>
        <p className="text-xs font-semibold text-discord-textNormal leading-snug">{message}</p>
        <p className="text-[10px] text-discord-textMuted mt-0.5 font-medium">
          Upgrade to {requiredPlan} to unlock this feature.
        </p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="p-1 rounded-lg hover:bg-discord-hover text-discord-textMuted hover:text-discord-textNormal transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Hook to imperatively show toasts
let _setToast: ((t: { message: string; requiredPlan: 'Plus' | 'Pro' } | null) => void) | null = null;

export const showUpgradeToast = (message: string, requiredPlan: 'Plus' | 'Pro') => {
  if (_setToast) _setToast({ message, requiredPlan });
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; requiredPlan: 'Plus' | 'Pro' } | null>(null);

  useEffect(() => {
    _setToast = setToast;
    return () => { _setToast = null; };
  }, []);

  return (
    <>
      {children}
      {toast && (
        <UpgradeToast
          message={toast.message}
          requiredPlan={toast.requiredPlan}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

// Reusable plan-locked overlay card for dashboard widgets
export const LockedWidgetCard: React.FC<{
  title: string;
  requiredPlan: 'Plus' | 'Pro';
  className?: string;
}> = ({ title, requiredPlan, className = '' }) => {
  const color = requiredPlan === 'Pro' ? 'text-purple-400' : 'text-emerald-400';
  const badgeBg = requiredPlan === 'Pro' ? 'bg-purple-500/15 border-purple-500/25 text-purple-300' : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300';

  return (
    <div
      className={`bg-discord-card border border-discord-border rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center space-y-2.5 min-h-[100px] relative overflow-hidden cursor-pointer select-none group ${className}`}
      onClick={() => showUpgradeToast(`${title} is a ${requiredPlan} feature`, requiredPlan)}
    >
      {/* subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-discord-secondary/30 pointer-events-none rounded-2xl" />
      <div className={`w-9 h-9 rounded-xl bg-discord-secondary border border-discord-border flex items-center justify-center group-hover:scale-110 transition-transform duration-200 ${color}`}>
        <Lock className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-bold text-discord-textNormal">{title}</p>
        <span className={`text-[9px] font-extrabold uppercase tracking-widest border rounded px-1.5 py-0.5 mt-1 inline-block ${badgeBg}`}>
          {requiredPlan} Only
        </span>
      </div>
    </div>
  );
};

// Inline pro-lock overlay for full tab sections
export const ProLockedSection: React.FC<{
  requiredPlan: 'Plus' | 'Pro';
  featureName: string;
}> = ({ requiredPlan, featureName }) => {
  const gradientColor = requiredPlan === 'Pro'
    ? 'from-purple-500/10 via-discord-secondary/80 to-discord-secondary'
    : 'from-emerald-500/10 via-discord-secondary/80 to-discord-secondary';
  const iconColor = requiredPlan === 'Pro' ? 'text-purple-400' : 'text-emerald-400';
  const badgeBg = requiredPlan === 'Pro'
    ? 'bg-purple-500/15 border-purple-500/25 text-purple-300'
    : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300';

  return (
    <div className={`rounded-2xl border border-discord-border bg-gradient-to-br ${gradientColor} p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-md min-h-[280px] animate-scaleIn`}>
      <div className={`w-14 h-14 rounded-2xl bg-discord-secondary border border-discord-border flex items-center justify-center shadow-lg ${iconColor}`}>
        <Lock className="w-7 h-7" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-base font-extrabold text-discord-textNormal">{featureName}</h3>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest border rounded px-2 py-0.5 inline-block ${badgeBg}`}>
          {requiredPlan} Plan Required
        </span>
        <p className="text-xs text-discord-textMuted font-semibold leading-relaxed mt-2">
          This feature is not available on your current plan. Upgrade to <span className="text-discord-textNormal font-bold">{requiredPlan}</span> to unlock access.
        </p>
      </div>
      <div className="flex items-center space-x-1.5 text-[10px] text-discord-textMuted font-semibold">
        <Sparkles className="w-3 h-3 text-discord-accent" />
        <span>Go to Platforms → Plans & Pricing to upgrade</span>
      </div>
    </div>
  );
};
