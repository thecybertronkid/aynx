import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, HelpCircle, Download, Globe, Star, Settings, Clock, CreditCard, ChevronRight } from 'lucide-react';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  actions?: { label: string; action: string }[];
}

interface AssistantProps {
  onNavigate: (route: string) => void;
}

// ─── Predefined QA Knowledge Base ────────────────────────────────────────────
const FAQ: { patterns: RegExp[]; answer: string; actions?: { label: string; action: string }[] }[] = [
  {
    patterns: [/download.*playlist/i, /playlist/i, /bulk/i, /batch/i],
    answer: "To download a playlist, paste the playlist URL in the Quick Download bar on the Dashboard. AYNX will detect it automatically and queue all videos. Plus & Pro users can set per-item quality.",
    actions: [{ label: 'Go to Dashboard', action: '/' }]
  },
  {
    patterns: [/spotify/i, /connect.*spotify/i, /spotify.*account/i],
    answer: "To connect Spotify, go to Accounts Center from your profile, then add a Spotify account. This lets AYNX match tracks and download audio in your preferred format.",
    actions: [{ label: 'Open Accounts', action: '/accounts' }]
  },
  {
    patterns: [/upgrade/i, /pro plan/i, /plus plan/i, /pricing/i, /buy/i, /subscribe/i],
    answer: "You can upgrade to Plus or Pro from the Platforms page. Plus unlocks higher quality, scheduled downloads, and more. Pro unlocks all features including unlimited parallel downloads.",
    actions: [{ label: 'View Plans & Pricing', action: '/platforms' }]
  },
  {
    patterns: [/schedule/i, /automat/i, /timer/i, /recurring/i],
    answer: "The Scheduler lets you set a date & time for downloads to start automatically. Great for off-peak downloading! Available on Plus and Pro plans.",
    actions: [{ label: 'Open Scheduler', action: '/scheduler' }]
  },
  {
    patterns: [/quality/i, /1080p/i, /4k/i, /resolution/i, /format/i, /mp4/i, /mp3/i],
    answer: "You can set the default quality and format in Settings. Free users get up to 720p, Plus up to 1080p, and Pro users get 4K and lossless audio.",
    actions: [{ label: 'Open Settings', action: '/settings' }]
  },
  {
    patterns: [/browser/i, /built.in/i, /youtube.*download/i, /download.*watching/i],
    answer: "The Built-in Browser lets you browse any site and download media with one click. Look for the download badge in the browser toolbar when watching a video.",
    actions: [{ label: 'Open Browser', action: '/browser' }]
  },
  {
    patterns: [/favorite/i, /bookmark/i, /saved/i],
    answer: "You can favorite any downloaded file by clicking the heart icon in the Downloads or Queue section. Access all your favorites from the Favorites tab.",
    actions: [{ label: 'Open Favorites', action: '/favorites' }]
  },
  {
    patterns: [/download folder/i, /save location/i, /where.*saved/i, /storage/i],
    answer: "You can change your download folder in Settings → General. All future downloads will be saved there. Existing files won't be moved.",
    actions: [{ label: 'Open Settings', action: '/settings' }]
  },
  {
    patterns: [/error/i, /failed/i, /not working/i, /broken/i, /fix/i],
    answer: "If a download failed, try re-queueing it. Make sure the URL is valid and the platform is supported. Check your internet connection and try disabling VPN or proxy if active.",
    actions: [{ label: 'View Queue', action: '/queue' }]
  },
  {
    patterns: [/hi|hello|hey|what.*you|who.*are.*you/i],
    answer: "Hey! I'm the AYNX Assistant 👋 I can help you with downloads, settings, plans, and more. Just ask me anything!",
  }
];

function getResponse(query: string): { answer: string; actions?: { label: string; action: string }[] } {
  for (const entry of FAQ) {
    if (entry.patterns.some(p => p.test(query))) {
      return { answer: entry.answer, actions: entry.actions };
    }
  }
  return {
    answer: "I'm not sure about that yet! Try asking about downloading playlists, quality settings, the scheduler, connecting accounts, or upgrading your plan.",
    actions: [{ label: 'View Settings', action: '/settings' }, { label: 'View Plans', action: '/platforms' }]
  };
}

// ─── Quick prompts shown on first open ───────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: Download, text: 'How do I download a playlist?' },
  { icon: Globe, text: 'How does the built-in browser work?' },
  { icon: Clock, text: 'How do I schedule a download?' },
  { icon: CreditCard, text: 'What comes with Pro plan?' },
  { icon: Settings, text: 'How do I change download quality?' },
  { icon: Star, text: 'How do I favorite a file?' },
];

// ─── Component ────────────────────────────────────────────────────────────────
const Assistant: React.FC<AssistantProps> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: "Hi! I'm your AYNX Assistant 👋 Ask me anything about downloading, settings, plans, or features.",
    }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = (query?: string) => {
    const text = (query ?? input).trim();
    if (!text) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);

    // Simulate short typing delay for premium feel
    setTimeout(() => {
      const { answer, actions } = getResponse(text);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: answer, actions };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, 600 + Math.random() * 400);
  };

  const showQuickPrompts = messages.length <= 1;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        id="aynx-assistant-btn"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-[200] w-12 h-12 bg-gradient-to-br from-[#5865f2] to-[#7c3aed] rounded-2xl shadow-2xl shadow-[#5865f2]/40 flex items-center justify-center text-white transition-all ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        title="AYNX Assistant"
      >
        <HelpCircle className="w-5 h-5" />
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-[#23a55a] rounded-full border-2 border-[#1e1f22]"
        />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="aynx-assistant-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-[201] w-[360px] h-[520px] bg-[#1e1f22] border border-[#3f4147] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center space-x-3 px-4 py-3.5 border-b border-[#3f4147] bg-[#2b2d31] shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-[#5865f2] to-[#7c3aed] rounded-xl flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">AYNX Assistant</p>
                <p className="text-[10px] text-[#6d6f78] font-semibold">Always here to help</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#3f4147] text-[#6d6f78] hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? '' : ''}`}>
                    <div className={`px-3 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#5865f2] text-white rounded-tr-sm'
                        : 'bg-[#2b2d31] border border-[#3f4147] text-[#dbdee1] rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.actions && msg.role === 'assistant' && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.actions.map(a => (
                          <button key={a.action} onClick={() => { onNavigate(a.action); setOpen(false); }}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-[#5865f2]/15 border border-[#5865f2]/30 text-[#818cf8] hover:bg-[#5865f2]/25 hover:text-[#a5b4fc] rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
                            <span>{a.label}</span>
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-[#2b2d31] border border-[#3f4147] px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center space-x-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 bg-[#5865f2] rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick prompts */}
              {showQuickPrompts && (
                <div className="grid grid-cols-1 gap-1.5 mt-2">
                  {QUICK_PROMPTS.map(q => (
                    <button key={q.text} onClick={() => handleSend(q.text)}
                      className="flex items-center space-x-2.5 px-3 py-2 bg-[#2b2d31] border border-[#3f4147] hover:border-[#5865f2]/50 hover:bg-[#313338] rounded-xl text-left transition-colors cursor-pointer group">
                      <q.icon className="w-3.5 h-3.5 text-[#5865f2] shrink-0" />
                      <span className="text-[11px] text-[#b5bac1] group-hover:text-white font-semibold">{q.text}</span>
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-[#3f4147] bg-[#2b2d31] shrink-0">
              <div className="flex items-center space-x-2 bg-[#1e1f22] border border-[#3f4147] focus-within:border-[#5865f2] rounded-xl px-3 py-2 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#4e5058] font-semibold"
                />
                <button onClick={() => handleSend()}
                  disabled={!input.trim() || typing}
                  className="w-7 h-7 bg-[#5865f2] disabled:bg-[#3f4147] rounded-lg flex items-center justify-center text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#4752c4]">
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Assistant;
