import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, Send, Download, Globe, Star, Settings,
  Clock, CreditCard, MousePointer, Keyboard, ToggleLeft,
  ChevronRight, Zap
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

interface GuideStep {
  icon: "click" | "type" | "select" | "navigate";
  instruction: string;
  detail?: string;
  route?: string;
  selector?: string;
  highlightLabel?: string;
}

interface Message {
  id: string;
  role: "assistant" | "user";
  text: string;
  steps?: GuideStep[];
  actions?: { label: string; action: string }[];
}

interface AssistantProps {
  onNavigate: (route: string) => void;
}

function highlightElement(selector: string, label: string) {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  document.querySelectorAll(".aynx-guide-ring").forEach((e) => e.remove());
  const rect = el.getBoundingClientRect();
  const ring = document.createElement("div");
  ring.className = "aynx-guide-ring";
  Object.assign(ring.style, {
    position: "fixed",
    top: `${rect.top - 6}px`,
    left: `${rect.left - 6}px`,
    width: `${rect.width + 12}px`,
    height: `${rect.height + 12}px`,
    borderRadius: "10px",
    border: "2px solid #5865f2",
    boxShadow: "0 0 0 4px rgba(88,101,242,0.25), 0 0 20px 8px rgba(88,101,242,0.35)",
    pointerEvents: "none",
    zIndex: "99999",
    opacity: "0",
    transition: "opacity 0.3s ease",
    animation: "aynxPulseRing 1.6s ease-in-out infinite",
  });
  const tip = document.createElement("div");
  Object.assign(tip.style, {
    position: "absolute",
    top: "-34px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#5865f2",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "7px",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    fontFamily: "Inter, sans-serif",
  });
  tip.innerText = `👆 ${label}`;
  ring.appendChild(tip);
  if (!document.getElementById("aynx-guide-style")) {
    const style = document.createElement("style");
    style.id = "aynx-guide-style";
    style.textContent = `@keyframes aynxPulseRing { 0%,100%{box-shadow:0 0 0 4px rgba(88,101,242,0.25),0 0 20px 8px rgba(88,101,242,0.3)} 50%{box-shadow:0 0 0 8px rgba(88,101,242,0.15),0 0 32px 12px rgba(88,101,242,0.45)} }`;
    document.head.appendChild(style);
  }
  document.body.appendChild(ring);
  setTimeout(() => { ring.style.opacity = "1"; }, 40);
  setTimeout(() => {
    ring.style.opacity = "0";
    setTimeout(() => ring.remove(), 400);
  }, 5000);
}

const FAQ: {
  patterns: RegExp[];
  text: string;
  steps?: GuideStep[];
  actions?: { label: string; action: string }[];
}[] = [
  {
    patterns: [/^(hi|hey|hello|howdy|sup|yo)[\s!?]*$/i, /who are you/i, /what (can|do) you do/i, /what are you/i],
    text: "Hey there! 👋 I'm AYNX's built-in assistant — think of me as your personal guide for everything inside the app. I can walk you through any feature step-by-step, right here. What do you need help with today?",
  },
  {
    patterns: [/download.*video/i, /how.*download/i, /start.*download/i, /single.*download/i],
    text: "Easy! Here's exactly how to download a video:",
    steps: [
      { icon: "navigate", instruction: "Go to the Home tab", detail: "Click Home in your left sidebar to open the Dashboard.", route: "/", selector: 'a[href="#/"]', highlightLabel: "Click Home here" },
      { icon: "type", instruction: "Paste your link", detail: "Find the URL input bar at the top and paste your video link (YouTube, Instagram, Spotify, etc.).", selector: 'input[placeholder*="Paste media link"]', highlightLabel: "Paste link here" },
      { icon: "click", instruction: "Click Analyze Link", detail: "Hit the blue Analyze button to load the video info and quality options.", route: "/" },
      { icon: "select", instruction: "Choose quality and format", detail: "Select your preferred resolution (e.g. 1080p, 4K) and format (MP4, MP3).", route: "/" },
      { icon: "click", instruction: "Hit Download", detail: "Click the glowing Download button. Your file will appear in the Queue section.", route: "/queue", highlightLabel: "Monitor progress in Queue" },
    ],
    actions: [{ label: "Open Dashboard", action: "/" }],
  },
  {
    patterns: [/playlist/i, /bulk/i, /batch/i, /multiple.*video/i, /download.*all/i],
    text: "Batch downloading playlists is super simple in AYNX! Let me walk you through it:",
    steps: [
      { icon: "navigate", instruction: "Open the Dashboard (Home)", detail: "Click the Home icon in the left sidebar.", route: "/", selector: 'a[href="#/"]', highlightLabel: "Click Home" },
      { icon: "type", instruction: "Paste your playlist URL", detail: "Copy the full playlist link from YouTube, Spotify, etc. and paste it into the URL bar at the top.", selector: 'input[placeholder*="Paste media link"]', highlightLabel: "Paste playlist URL here" },
      { icon: "click", instruction: "Analyze the link", detail: "Click Analyze Link — AYNX will detect it is a playlist automatically and list all items.", route: "/" },
      { icon: "select", instruction: "Select tracks and quality", detail: "Choose which tracks to include (or select all) and pick your quality preference." },
      { icon: "click", instruction: "Click Download All", detail: "Hit the Download All button. Every item queues up and downloads sequentially.", route: "/queue", highlightLabel: "Watch progress here" },
    ],
    actions: [{ label: "Go to Dashboard", action: "/" }, { label: "View Queue", action: "/queue" }],
  },
  {
    patterns: [/spotify/i, /connect.*spotify/i, /spotify.*account/i, /link.*spotify/i],
    text: "Got it! Connecting your Spotify account lets AYNX auto-match metadata and download your playlists seamlessly. Here's how:",
    steps: [
      { icon: "click", instruction: "Open your profile at the bottom of the sidebar", detail: "Click on your name/avatar at the very bottom-left of the app. This opens the Accounts Center.", selector: '.cursor-pointer[title="Open Accounts Center"]', highlightLabel: "Click your profile here" },
      { icon: "click", instruction: "Find Spotify in Accounts Center", detail: "Scroll through the Accounts panel and locate the Spotify card." },
      { icon: "click", instruction: "Click Connect Spotify", detail: "Hit the Connect button. A secure Spotify login window will pop up." },
      { icon: "type", instruction: "Log into Spotify", detail: "Enter your Spotify email and password in the popup window." },
      { icon: "select", instruction: "Authorize AYNX", detail: "Click Agree or Allow to grant AYNX read access to your playlists." },
    ],
    actions: [{ label: "Open Dashboard", action: "/" }],
  },
  {
    patterns: [/schedul/i, /automat/i, /timer/i, /recurring/i, /off.peak/i, /download.*later/i, /later/i],
    text: "Love this feature! The Scheduler lets you queue downloads at any time — perfect for overnight or off-peak downloading. Here's how to set one up:",
    steps: [
      { icon: "navigate", instruction: "Open the Scheduler", detail: "Click Scheduler in your left sidebar.", route: "/scheduler", selector: 'a[href="#/scheduler"]', highlightLabel: "Click Scheduler" },
      { icon: "type", instruction: "Paste your download URL", detail: "Enter the video or playlist link you want to schedule." },
      { icon: "select", instruction: "Set date, time and frequency", detail: "Pick when you want the download to start. You can also set recurring schedules (daily, weekly, etc.)." },
      { icon: "select", instruction: "Choose quality settings", detail: "Select your desired quality and format for this scheduled download." },
      { icon: "click", instruction: "Click Schedule Download", detail: "Hit the Schedule button. AYNX will automatically start the download at your chosen time, even if the app is minimized." },
    ],
    actions: [{ label: "Open Scheduler", action: "/scheduler" }],
  },
  {
    patterns: [/quality/i, /1080p/i, /4k/i, /resolution/i, /format/i, /mp4/i, /mp3/i, /default.*quality/i, /change.*quality/i],
    text: "You can set your default download quality and format from Settings. Here's exactly where to go:",
    steps: [
      { icon: "navigate", instruction: "Open Settings", detail: "Click Settings in the left sidebar.", route: "/settings", selector: 'a[href="#/settings"]', highlightLabel: "Click Settings here" },
      { icon: "click", instruction: "Go to Advanced Engine section", detail: "Scroll down inside Settings to find the Advanced Engine card." },
      { icon: "select", instruction: "Choose your default video quality", detail: "Pick from 720p (Free), 1080p (Plus), or 4K Best Available (Pro). This becomes the default for all new downloads." },
      { icon: "select", instruction: "Set your preferred format", detail: "Choose your default container: MP4 for video, MP3 or FLAC for audio." },
      { icon: "click", instruction: "Save your changes", detail: "Settings save automatically as you change them — no extra button needed." },
    ],
    actions: [{ label: "Open Settings", action: "/settings" }],
  },
  {
    patterns: [/download folder/i, /save location/i, /where.*saved/i, /change.*folder/i, /storage.*path/i, /output.*folder/i],
    text: "Want to change where your files land? No problem — here's how to update your download folder:",
    steps: [
      { icon: "navigate", instruction: "Open Settings", detail: "Click Settings in the left sidebar.", route: "/settings", selector: 'a[href="#/settings"]', highlightLabel: "Open Settings" },
      { icon: "click", instruction: "Find General Preferences", detail: "Scroll to the General Preferences section at the top of Settings." },
      { icon: "click", instruction: "Click Choose Folder", detail: "Click the folder picker button next to the Download Directory field. A file browser will open." },
      { icon: "select", instruction: "Select your target folder", detail: "Navigate to wherever you want your downloads saved and confirm the selection." },
      { icon: "select", instruction: "Done!", detail: "All future downloads will save to your chosen folder. Existing files will not be moved." },
    ],
    actions: [{ label: "Open Settings", action: "/settings" }],
  },
  {
    patterns: [/browser/i, /built.in/i, /download.*watch/i, /watch.*download/i, /browse.*site/i],
    text: "The built-in browser is one of AYNX's coolest features — you can browse any website and download media with a single click while watching. Here's how:",
    steps: [
      { icon: "navigate", instruction: "Open the Built-in Browser", detail: "Click Built-in Browser in the left sidebar.", route: "/browser", selector: 'a[href="#/browser"]', highlightLabel: "Open Built-in Browser" },
      { icon: "type", instruction: "Enter a URL", detail: "Type or paste any supported site URL (e.g. youtube.com, instagram.com) into the address bar at the top." },
      { icon: "click", instruction: "Browse and play a video", detail: "Navigate to a video or media page like you normally would in any browser." },
      { icon: "click", instruction: "Look for the download badge", detail: "When AYNX detects downloadable media, a glowing purple Download Video button appears in the browser toolbar. Click it!" },
      { icon: "select", instruction: "Pick your quality", detail: "A quality picker popover appears — select your format and hit Download." },
    ],
    actions: [{ label: "Open Browser", action: "/browser" }],
  },
  {
    patterns: [/favorite/i, /bookmark/i, /saved.*file/i, /heart/i],
    text: "Favoriting files keeps them easy to find later. Here's how it works:",
    steps: [
      { icon: "navigate", instruction: "Open Downloads or Queue", detail: "Go to the Queue or Media Library section.", route: "/queue", selector: 'a[href="#/queue"]', highlightLabel: "Open Queue" },
      { icon: "click", instruction: "Find the file you want to favorite", detail: "Locate the downloaded file in the list." },
      { icon: "click", instruction: "Click the heart icon", detail: "Every file has a heart icon. Click it to add the file to your Favorites." },
      { icon: "navigate", instruction: "Access your Favorites anytime", detail: "Click Favorites in the sidebar to see all your starred files in one place.", route: "/favorites", selector: 'a[href="#/favorites"]', highlightLabel: "Your Favorites are here" },
    ],
    actions: [{ label: "Open Favorites", action: "/favorites" }],
  },
  {
    patterns: [/upgrade/i, /pro plan/i, /plus plan/i, /pricing/i, /buy/i, /subscri/i, /plans/i, /unlock/i, /premium/i],
    text: "Ready to unlock more power? Here's how to upgrade your plan:",
    steps: [
      { icon: "navigate", instruction: "Go to the Platforms page", detail: "Click Platforms in the left sidebar — that's where all plan details and upgrades live.", route: "/platforms", selector: 'a[href="#/platforms"]', highlightLabel: "Open Platforms" },
      { icon: "click", instruction: "Compare Plus vs Pro", detail: "Review what each plan unlocks — Plus gives 1080p, scheduler, and multi-queue. Pro gives 4K, lossless audio, unlimited parallel downloads, and priority support." },
      { icon: "click", instruction: "Click Upgrade to Plus or Go Pro", detail: "Hit your preferred plan's upgrade button. A secure checkout window will open." },
      { icon: "type", instruction: "Complete checkout", detail: "Enter your payment details in the secure checkout flow and confirm your upgrade." },
      { icon: "select", instruction: "Your plan activates instantly", detail: "Once done, restart the app if prompted. All premium features unlock immediately." },
    ],
    actions: [{ label: "View Plans", action: "/platforms" }],
  },
  {
    patterns: [/error/i, /fail/i, /not work/i, /broken/i, /fix/i, /wrong/i, /crash/i, /stuck/i],
    text: "Hmm, something's not right — let's troubleshoot this! Here are the most common fixes:",
    steps: [
      { icon: "select", instruction: "Check your internet connection", detail: "Make sure you're online. AYNX needs a stable connection to analyze and download media." },
      { icon: "click", instruction: "Re-queue the download", detail: "Go to the Queue, find the failed item, and click Retry.", route: "/queue", selector: 'a[href="#/queue"]', highlightLabel: "Check Queue for errors" },
      { icon: "select", instruction: "Verify the URL is valid", detail: "Copy the link again directly from the source page — sometimes links can expire or have extra characters." },
      { icon: "select", instruction: "Disable VPN or proxy", detail: "If you're using a VPN or proxy, try disabling it temporarily. Some platforms block VPN IPs." },
      { icon: "navigate", instruction: "Check Advanced Engine settings", detail: "In Settings > Advanced Engine, make sure your download engine (yt-dlp) is up to date.", route: "/settings", highlightLabel: "Settings > Advanced" },
    ],
    actions: [{ label: "Open Queue", action: "/queue" }, { label: "Open Settings", action: "/settings" }],
  },
  {
    patterns: [/media library/i, /my.*file/i, /library/i, /completed.*download/i, /find.*download/i],
    text: "Your Media Library is where all your completed downloads live. Here's how to use it:",
    steps: [
      { icon: "navigate", instruction: "Open Media Library", detail: "Click Media Library in the left sidebar.", route: "/library", selector: 'a[href="#/library"]', highlightLabel: "Open Media Library" },
      { icon: "click", instruction: "Browse and filter your files", detail: "Use the filter tabs at the top to sort by type: Video, Audio, or Images." },
      { icon: "click", instruction: "Play any file directly", detail: "Click the play button on any file to open it in AYNX's built-in media player." },
      { icon: "click", instruction: "Open the file location", detail: "Right-click any file and select Open in Explorer to jump directly to where it's saved on your PC." },
    ],
    actions: [{ label: "Open Media Library", action: "/library" }],
  },
];

const THINKING_PHRASES = [
  "Let me think about that...",
  "Great question — let me look that up...",
  "On it! One sec...",
  "I've got you covered!",
  "Let me walk you through this...",
  "Sure thing, here's how:",
];

function getResponse(query: string): { text: string; steps?: GuideStep[]; actions?: { label: string; action: string }[] } {
  for (const entry of FAQ) {
    if (entry.patterns.some((p) => p.test(query))) {
      return { text: entry.text, steps: entry.steps, actions: entry.actions };
    }
  }
  return {
    text: "Hmm, I don't have a specific guide for that yet — but I can help! Try asking me about downloading videos, playlists, connecting Spotify, changing quality, using the browser, the scheduler, or upgrading your plan.",
    actions: [
      { label: "View Features", action: "/" },
      { label: "Check Settings", action: "/settings" },
    ],
  };
}

const QUICK_PROMPTS = [
  { icon: Download, text: "How do I download a playlist?" },
  { icon: Globe, text: "How does the built-in browser work?" },
  { icon: Clock, text: "How do I schedule a download?" },
  { icon: CreditCard, text: "What comes with Plus and Pro plan?" },
  { icon: Settings, text: "How do I change download quality?" },
  { icon: Star, text: "How do I find my downloaded files?" },
];

const StepIconMap = {
  click: { icon: MousePointer, color: "#5865f2", label: "Click" },
  type: { icon: Keyboard, color: "#23a55a", label: "Type" },
  select: { icon: ToggleLeft, color: "#f0a232", label: "Set" },
  navigate: { icon: ChevronRight, color: "#818cf8", label: "Go to" },
};

const Assistant: React.FC<AssistantProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const plan = user?.plan || "Free";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      text:
        plan === "Plus"
          ? "Hey! 👋 I'm your AYNX assistant — exclusive to Plus and Pro members. I can guide you through any feature step-by-step. What would you like help with?"
          : "Hey there! 👋 I'm your AYNX Pro assistant. Ask me anything and I'll walk you through it — step by step, right inside the app.",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState("Thinking...");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (plan === "Free") return null;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = (query?: string) => {
    const text = (query ?? input).trim();
    if (!text) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);
    setThinkingText(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
    setTimeout(() => {
      const response = getResponse(text);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", ...response };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    }, 700 + Math.random() * 600);
  };

  const handleStepAction = (step: GuideStep) => {
    if (step.route) { onNavigate(step.route); setOpen(false); }
    if (step.selector && step.highlightLabel) {
      setTimeout(() => highlightElement(step.selector!, step.highlightLabel!), step.route ? 450 : 0);
    }
  };

  const showQuickPrompts = messages.length <= 1;

  return (
    <>
      <motion.button
        id="aynx-assistant-btn"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-6 right-6 z-[200] w-12 h-12 bg-gradient-to-br from-[#5865f2] to-[#7c3aed] rounded-2xl shadow-2xl shadow-[#5865f2]/40 flex items-center justify-center text-white transition-all ${open ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        title="AYNX Assistant"
      >
        <Sparkles className="w-5 h-5" />
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-[#23a55a] rounded-full border-2 border-[#1e1f22]"
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="aynx-assistant-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-[201] w-[390px] h-[580px] bg-[#1e1f22] border border-[#3f4147] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center space-x-3 px-4 py-3.5 border-b border-[#3f4147] bg-[#2b2d31] flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-[#5865f2] to-[#7c3aed] rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">AYNX Assistant</p>
                <div className="flex items-center space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-[#23a55a] rounded-full animate-pulse" />
                  <p className="text-[10px] text-[#6d6f78] font-semibold">
                    {plan === "Pro" ? "Pro Member · Step-by-step guide" : "Plus Member · Step-by-step guide"}
                  </p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border flex-shrink-0 flex items-center gap-0.5 ${plan === "Pro" ? "bg-purple-500/15 text-purple-300 border-purple-500/25" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"}`}>
                {plan === "Pro" && <Zap className="w-2 h-2" />}
                {plan}
              </span>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[#3f4147] text-[#6d6f78] hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`space-y-2 ${msg.role === "user" ? "max-w-[80%]" : "w-full"}`}>
                    <div className={`px-3 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${msg.role === "user" ? "bg-[#5865f2] text-white rounded-tr-sm" : "bg-[#2b2d31] border border-[#3f4147] text-[#dbdee1] rounded-tl-sm"}`}>
                      {msg.text}
                    </div>

                    {/* Step-by-step guide cards */}
                    {msg.steps && msg.role === "assistant" && (
                      <div className="space-y-2 mt-1">
                        {msg.steps.map((step, i) => {
                          const { icon: Icon, color, label } = StepIconMap[step.icon];
                          const hasAction = step.route || step.selector;
                          return (
                            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="bg-[#232428] border border-[#3f4147] rounded-xl overflow-hidden">
                              <div className="flex items-start gap-2.5 p-2.5">
                                <div className="w-5 h-5 rounded-full bg-[#2b2d31] border border-[#3f4147] flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-[9px] font-black text-[#b5bac1]">{i + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                                      <Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color }} />
                                      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
                                    </div>
                                    <span className="text-[11px] font-bold text-white">{step.instruction}</span>
                                  </div>
                                  {step.detail && <p className="text-[10px] text-[#8e9297] leading-relaxed">{step.detail}</p>}
                                </div>
                              </div>
                              {hasAction && (
                                <button onClick={() => handleStepAction(step)} className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#5865f2]/10 hover:bg-[#5865f2]/20 border-t border-[#3f4147] transition-colors cursor-pointer group">
                                  <span className="text-[10px] font-bold text-[#818cf8] group-hover:text-[#a5b4fc]">
                                    {step.route ? "→ Take me there" : "→ Highlight on screen"}
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-[#818cf8]" />
                                </button>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* Action buttons */}
                    {msg.actions && msg.role === "assistant" && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {msg.actions.map((a) => (
                          <button key={a.action} onClick={() => { onNavigate(a.action); setOpen(false); }} className="flex items-center space-x-1 px-2.5 py-1 bg-[#5865f2]/15 border border-[#5865f2]/30 text-[#818cf8] hover:bg-[#5865f2]/25 hover:text-[#a5b4fc] rounded-lg text-[10px] font-bold transition-colors cursor-pointer">
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
                  <div className="bg-[#2b2d31] border border-[#3f4147] px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center space-x-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 bg-[#5865f2] rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                    <span className="text-[10px] text-[#6d6f78] font-semibold ml-1">{thinkingText}</span>
                  </div>
                </div>
              )}

              {/* Quick prompts */}
              {showQuickPrompts && (
                <div className="grid grid-cols-1 gap-1.5 mt-2">
                  <p className="text-[10px] text-[#4e5058] font-bold uppercase tracking-wider px-1 mb-0.5">Common questions</p>
                  {QUICK_PROMPTS.map((q) => (
                    <button key={q.text} onClick={() => handleSend(q.text)} className="flex items-center space-x-2.5 px-3 py-2 bg-[#2b2d31] border border-[#3f4147] hover:border-[#5865f2]/50 hover:bg-[#313338] rounded-xl text-left transition-colors cursor-pointer group">
                      <q.icon className="w-3.5 h-3.5 text-[#5865f2] flex-shrink-0" />
                      <span className="text-[11px] text-[#b5bac1] group-hover:text-white font-semibold">{q.text}</span>
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-[#3f4147] bg-[#2b2d31] flex-shrink-0">
              <div className="flex items-center space-x-2 bg-[#1e1f22] border border-[#3f4147] focus-within:border-[#5865f2] rounded-xl px-3 py-2 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask me anything about AYNX..."
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#4e5058] font-semibold"
                />
                <button onClick={() => handleSend()} disabled={!input.trim() || typing} className="w-7 h-7 bg-[#5865f2] disabled:bg-[#3f4147] rounded-lg flex items-center justify-center text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#4752c4]">
                  <Send className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[9px] text-[#3f4147] font-semibold text-center mt-1.5">
                Exclusive to Plus and Pro members · {plan} plan active
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Assistant;
