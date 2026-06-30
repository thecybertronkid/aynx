import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, Trash2, Calendar, Play, Pause, 
  Settings, CheckCircle, AlertTriangle, ShieldCheck, 
  Link, Download, FileText, Repeat, RefreshCw
} from 'lucide-react';
import { useSchedulerStore, ScheduledItem } from '../store/schedulerStore';

const Scheduler: React.FC = () => {
  const { scheduled, fetchScheduled, saveScheduled, deleteScheduled } = useSchedulerStore();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('Best Available');
  const [format, setFormat] = useState('MP4');
  const [scheduledTime, setScheduledTime] = useState('');
  const [repeatMode, setRepeatMode] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [postAction, setPostAction] = useState<ScheduledItem['postAction']>('none');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScheduled();
  }, []);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const data = await window.api.analyzeUrl(url.trim());
      setTitle(data.title || 'Untitled Scheduled Download');
      if (data.platform === 'Spotify' || data.platform === 'SoundCloud') {
        setContentType('audio');
        setFormat('MP3');
      } else {
        setContentType('video');
        setFormat('MP4');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse URL.');
      setTitle('Custom Download Link');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !scheduledTime) {
      setError('Please provide a URL and select a scheduled date/time.');
      return;
    }

    const platform = getPlatformFromUrl(url);

    const record: ScheduledItem = {
      id: 'sched_' + Date.now(),
      url: url.trim(),
      title: title || 'Scheduled Download',
      platform,
      contentType,
      quality,
      format,
      scheduledTime: new Date(scheduledTime).toISOString(),
      repeatMode: repeatMode as any,
      status: 'active',
      postAction,
      createdAt: new Date().toISOString()
    };

    await saveScheduled(record);
    
    // Reset state
    setUrl('');
    setTitle('');
    setScheduledTime('');
    setRepeatMode('once');
    setPostAction('none');
    setError(null);
  };

  const getPlatformFromUrl = (url: string) => {
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
    if (u.includes('spotify.com')) return 'Spotify';
    if (u.includes('instagram.com')) return 'Instagram';
    if (u.includes('tiktok.com')) return 'TikTok';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'X (Twitter)';
    if (u.includes('soundcloud.com')) return 'SoundCloud';
    return 'Web';
  };

  const toggleStatus = async (item: ScheduledItem) => {
    const nextStatus = item.status === 'active' ? 'paused' : 'active';
    await saveScheduled({
      ...item,
      status: nextStatus
    });
  };

  const triggerNow = async (item: ScheduledItem) => {
    try {
      await window.api.queueDownload({
        id: item.id + '_' + Date.now(),
        url: item.url,
        title: item.title,
        platform: item.platform,
        contentType: item.contentType as any,
        quality: item.quality,
        format: item.format
      });
      alert(`Manual trigger started for "${item.title}"`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto flex flex-col md:flex-row h-full gap-6 select-none animate-fadeIn py-2">
      {/* Left: Create Schedule Form */}
      <div className="w-full md:w-[420px] bg-discord-card border border-discord-border rounded-2xl p-5 flex flex-col h-fit shrink-0 shadow-sm space-y-4">
        <div className="border-b border-discord-border pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-discord-textNormal flex items-center space-x-2">
            <Clock className="w-4 h-4 text-discord-accent animate-pulse" />
            <span>Create Automated Task</span>
          </h2>
          <p className="text-[11px] text-discord-textMuted mt-1 font-semibold leading-relaxed">
            Configure URL, format qualities, and target execution intervals.
          </p>
        </div>

        <form onSubmit={handleAddSchedule} className="space-y-3.5 text-xs">
          {/* URL Input */}
          <div className="space-y-1">
            <label className="block text-discord-textMuted text-[10px] font-bold uppercase">Target Media URL</label>
            <div className="flex space-x-2">
              <div className="flex-1 flex items-center bg-[#111214] border border-[#1e1f22] rounded px-3 py-1.5 focus-within:border-discord-accent">
                <Link className="w-3.5 h-3.5 text-discord-textMuted mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Paste video/playlist URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="bg-transparent text-xs w-full focus:outline-none text-[#dbdee1]"
                />
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || !url.trim()}
                className="btn-secondary py-1.5 px-3 flex items-center justify-center shrink-0 disabled:opacity-40"
              >
                {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Analyze</span>}
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="block text-discord-textMuted text-[10px] font-bold uppercase">Task Name / Title</label>
            <input
              type="text"
              placeholder="Analysis will autofill title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#111214] border border-[#1e1f22] rounded px-3 py-2 text-[#dbdee1] focus:outline-none focus:border-discord-accent"
            />
          </div>

          {/* Type & Format parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-discord-textMuted text-[10px] font-bold uppercase">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full bg-[#111214] border border-[#1e1f22] rounded px-3 py-2 text-[#dbdee1] focus:outline-none focus:border-discord-accent"
              >
                <option value="video">Video</option>
                <option value="audio">Audio Only</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-discord-textMuted text-[10px] font-bold uppercase">Format Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-[#111214] border border-[#1e1f22] rounded px-3 py-2 text-[#dbdee1] focus:outline-none focus:border-discord-accent"
              >
                {contentType === 'video' ? (
                  <>
                    <option value="Best Available">Best Available</option>
                    <option value="2160p">4K / 2160p</option>
                    <option value="1440p">2K / 1440p</option>
                    <option value="1080p">FHD / 1080p</option>
                    <option value="720p">HD / 720p</option>
                  </>
                ) : (
                  <>
                    <option value="Best Available">320kbps (Pro/Plus)</option>
                    <option value="256">256kbps</option>
                    <option value="192">192kbps (Free Cap)</option>
                    <option value="128">128kbps</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Schedule Datetime picker */}
          <div className="space-y-1">
            <label className="block text-discord-textMuted text-[10px] font-bold uppercase">Scheduled Time</label>
            <div className="flex items-center bg-[#111214] border border-[#1e1f22] rounded px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-discord-textMuted mr-2 shrink-0" />
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="bg-transparent text-xs w-full focus:outline-none text-[#dbdee1] font-medium"
              />
            </div>
          </div>

          {/* Interval Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-discord-textMuted text-[10px] font-bold uppercase">Repeat Mode</label>
              <select
                value={repeatMode}
                onChange={(e) => setRepeatMode(e.target.value as any)}
                className="w-full bg-[#111214] border border-[#1e1f22] rounded px-3 py-2 text-[#dbdee1] focus:outline-none focus:border-discord-accent"
              >
                <option value="once">Run Once</option>
                <option value="daily">Daily Loop</option>
                <option value="weekly">Weekly Loop</option>
                <option value="monthly">Monthly Loop</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-discord-textMuted text-[10px] font-bold uppercase">Post-Action</label>
              <select
                value={postAction}
                onChange={(e) => setPostAction(e.target.value as any)}
                className="w-full bg-[#111214] border border-[#1e1f22] rounded px-3 py-2 text-[#dbdee1] focus:outline-none focus:border-discord-accent"
              >
                <option value="none">Keep PC On</option>
                <option value="shutdown">Shutdown PC</option>
                <option value="sleep">Sleep Mode</option>
                <option value="hibernate">Hibernate</option>
                <option value="lock">Lock Windows</option>
                <option value="close">Close AYNX</option>
                <option value="sound">Play Notification</option>
                <option value="folder">Show File in Folder</option>
                <option value="player">Open in Media Player</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-discord-danger/10 border border-discord-danger/20 rounded-lg text-discord-danger text-[10px] font-semibold leading-relaxed flex items-center space-x-1.5 animate-scaleIn">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-discord-accent hover:bg-[#4752c4] text-white py-2.5 rounded-lg font-bold transition flex items-center justify-center space-x-1.5 shadow-md active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Add Scheduled Task</span>
          </button>
        </form>
      </div>

      {/* Right: Scheduled Queue */}
      <div className="flex-1 bg-discord-card border border-discord-border rounded-2xl p-5 flex flex-col h-full shadow-sm min-h-0">
        <div className="border-b border-discord-border pb-3 shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-discord-textNormal">Automated Tasks Queue</h2>
            <p className="text-[11px] text-discord-textMuted mt-0.5 font-semibold">
              Manage future download checkpoints and custom triggers.
            </p>
          </div>
          <span className="text-[10px] font-bold text-discord-accent bg-discord-accent/15 px-2.5 py-0.5 rounded-full select-none">
            {scheduled.length} Scheduled
          </span>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2.5 min-h-0">
          {scheduled.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 h-full space-y-3">
              <Clock className="w-12 h-12 text-discord-textMuted/20" />
              <div>
                <div className="text-xs font-bold text-discord-textNormal">No scheduled tasks pending</div>
                <div className="text-[10px] text-discord-textMuted max-w-xs mt-0.5 font-semibold">
                  Configure the schedule setup on the left panel to automate media downloads.
                </div>
              </div>
            </div>
          ) : (
            scheduled.map((item) => (
              <div 
                key={item.id}
                className="bg-discord-secondary/20 hover:bg-discord-secondary/40 border border-discord-border p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm transition duration-150"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-[9px] font-extrabold bg-discord-accent/10 border border-discord-accent/20 px-2 py-0.5 rounded text-discord-accent uppercase">
                      {item.platform}
                    </span>
                    <span className="text-[9px] font-bold bg-[#2b2d31]/50 px-2 py-0.5 rounded text-discord-textMuted uppercase">
                      {item.contentType}
                    </span>
                    <span className="text-[9px] font-bold bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded text-amber-500 uppercase flex items-center">
                      <Repeat className="w-2.5 h-2.5 mr-1" /> {item.repeatMode}
                    </span>
                  </div>
                  <h3 className="text-xs font-extrabold text-discord-textNormal truncate mt-1 leading-tight">{item.title}</h3>
                  <div className="flex items-center space-x-1 text-[10px] text-discord-textMuted mt-1 font-semibold">
                    <Calendar className="w-3 h-3 text-discord-accent shrink-0" />
                    <span>Run: {new Date(item.scheduledTime).toLocaleString()}</span>
                    {item.postAction && item.postAction !== 'none' && (
                      <span className="text-discord-success bg-discord-success/10 border border-discord-success/20 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold ml-1.5">
                        Post: {item.postAction}
                      </span>
                    )}
                  </div>
                </div>

                {/* Task controls */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`p-1.5 rounded-lg border transition active:scale-90 cursor-pointer ${
                      item.status === 'active' 
                        ? 'bg-[#23a55a]/10 hover:bg-[#23a55a]/20 border-[#23a55a]/30 text-[#23a55a]' 
                        : 'bg-[#80848e]/10 hover:bg-[#80848e]/20 border-[#80848e]/20 text-[#dbdee1]'
                    }`}
                    title={item.status === 'active' ? 'Pause Automation' : 'Resume Automation'}
                  >
                    {item.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => triggerNow(item)}
                    className="p-1.5 bg-discord-accent/10 border border-discord-accent/20 hover:bg-discord-accent/20 text-discord-accent rounded-lg transition active:scale-95 cursor-pointer"
                    title="Execute Task Instantly"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteScheduled(item.id)}
                    className="p-1.5 bg-discord-danger/10 border border-discord-danger/25 hover:bg-discord-danger/20 text-discord-danger rounded-lg transition active:scale-95 cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
export { Scheduler };
