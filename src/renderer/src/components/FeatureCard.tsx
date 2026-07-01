/**
 * FeatureCard – A closeable first-visit discovery intro card.
 *
 * Usage:
 *   <FeatureCard storageKey="feature-browser-intro" icon={Globe} title="Built-in Browser" color="cyan">
 *     Browse any site and download media directly...
 *   </FeatureCard>
 */
import React, { useState, useEffect } from 'react';
import { X, Lightbulb } from 'lucide-react';

interface FeatureCardProps {
  /** Unique localStorage key to persist dismissed state */
  storageKey: string;
  icon: React.ElementType;
  title: string;
  /** Tailwind color name base: blue, purple, emerald, amber, cyan, pink */
  color?: 'blue' | 'purple' | 'emerald' | 'amber' | 'cyan' | 'pink';
  children: React.ReactNode;
}

const colorMap: Record<string, { icon: string; bg: string; border: string; tip: string }> = {
  blue:    { icon: 'text-[#5865f2]', bg: 'bg-[#5865f2]/8',  border: 'border-[#5865f2]/25', tip: 'bg-[#5865f2]/15 text-[#818cf8] border-[#5865f2]/30' },
  purple:  { icon: 'text-[#7c3aed]', bg: 'bg-[#7c3aed]/8',  border: 'border-[#7c3aed]/25', tip: 'bg-[#7c3aed]/15 text-[#a78bfa] border-[#7c3aed]/30' },
  emerald: { icon: 'text-[#23a55a]', bg: 'bg-[#23a55a]/8',  border: 'border-[#23a55a]/25', tip: 'bg-[#23a55a]/15 text-[#34d399] border-[#23a55a]/30' },
  amber:   { icon: 'text-[#f5a623]', bg: 'bg-[#f5a623]/8',  border: 'border-[#f5a623]/25', tip: 'bg-[#f5a623]/15 text-[#fbbf24] border-[#f5a623]/30' },
  cyan:    { icon: 'text-[#00b4d8]', bg: 'bg-[#00b4d8]/8',  border: 'border-[#00b4d8]/25', tip: 'bg-[#00b4d8]/15 text-[#22d3ee] border-[#00b4d8]/30' },
  pink:    { icon: 'text-[#eb459e]', bg: 'bg-[#eb459e]/8',  border: 'border-[#eb459e]/25', tip: 'bg-[#eb459e]/15 text-[#f472b6] border-[#eb459e]/30' },
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  storageKey,
  icon: Icon,
  title,
  color = 'blue',
  children
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show card only if not dismissed
    const dismissed = localStorage.getItem(storageKey) === 'true';
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const c = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`w-full rounded-2xl border ${c.bg} ${c.border} p-4 flex items-start space-x-4 mb-5 animate-scaleIn`}>
      <div className={`w-9 h-9 rounded-xl border ${c.border} ${c.bg} flex items-center justify-center shrink-0 ${c.icon}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <span className={`text-[9px] font-extrabold uppercase tracking-widest border rounded px-1.5 py-0.5 ${c.tip}`}>
              <Lightbulb className="w-2.5 h-2.5 inline mr-1" />Feature Tip
            </span>
            <p className="text-xs font-black text-white">{title}</p>
          </div>
          <button onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-[#b5bac1] font-semibold leading-relaxed">{children}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
