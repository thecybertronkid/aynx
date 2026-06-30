import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Play, Pause, Volume2, RotateCcw, 
  ZoomIn, ZoomOut, RotateCw, Maximize2, 
  FastForward, Rewind
} from 'lucide-react';

interface MediaViewerProps {
  filePath: string;
  title: string;
  contentType: 'video' | 'audio' | 'image';
  onClose: () => void;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ filePath, title, contentType, onClose }) => {
  // Convert Windows absolute path to safe media:// URL
  // E.g. E:\Downloads\foo.mp4 -> media:///E:/Downloads/foo.mp4
  const normalized = filePath.replace(/\\/g, '/');
  // Ensure leading slash for drive-letter paths like C:/...
  const mediaUrl = normalized.startsWith('/') ? `media://${normalized}` : `media:///${normalized}`;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Play / Pause toggler
  const togglePlay = () => {
    const media = videoRef.current || audioRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play().catch(e => console.error('Playback block:', e));
    }
    setIsPlaying(!isPlaying);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Sync seek bar
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setDuration(e.currentTarget.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const media = videoRef.current || audioRef.current;
    if (media) {
      media.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    const media = videoRef.current || audioRef.current;
    if (media) media.volume = vol;
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sp = parseFloat(e.target.value);
    setSpeed(sp);
    const media = videoRef.current || audioRef.current;
    if (media) media.playbackRate = sp;
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col justify-between select-none animate-fade-in">
      {/* Header toolbar */}
      <div className="h-16 px-6 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between border-b border-white/5">
        <div className="min-w-0 pr-4">
          <div className="text-[10px] text-discord-textMuted uppercase font-bold tracking-wider">Preview Viewer</div>
          <h2 className="text-sm font-bold text-white truncate max-w-2xl">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg text-discord-textMuted hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Media Playback Window Container */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {contentType === 'video' && (
          <div className="w-full max-w-4xl aspect-video bg-black/40 rounded-xl overflow-hidden shadow-2xl relative group">
            <video
              ref={videoRef}
              src={mediaUrl}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {contentType === 'audio' && (
          <div className="bg-discord-secondary/50 border border-white/5 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center space-y-6 text-center">
            {/* spinning CD animation */}
            <div className="w-36 h-36 bg-discord-accent/10 border border-discord-accent/20 rounded-full flex items-center justify-center relative shadow-lg">
              <div 
                className={`w-28 h-28 rounded-full bg-discord-accent/30 flex items-center justify-center border border-discord-accent/40 ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
              >
                <div className="w-6 h-6 rounded-full bg-discord-tertiary"></div>
              </div>
            </div>
            
            <div className="min-w-0 w-full">
              <h3 className="text-sm font-bold text-white truncate leading-tight">{title}</h3>
              <p className="text-[10px] text-discord-textMuted mt-1">Audio Player Mode</p>
            </div>

            <audio
              ref={audioRef}
              src={mediaUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="hidden"
            />
          </div>
        )}

        {contentType === 'image' && (
          <div 
            className="transition-transform duration-200 ease-out max-w-3xl max-h-[70vh] rounded-lg overflow-hidden shadow-2xl bg-black/20"
            style={{ 
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          >
            <img src={mediaUrl} alt={title} className="object-contain w-full h-full" />
          </div>
        )}
      </div>

      {/* Bottom playback / image controls */}
      <div className="bg-gradient-to-t from-black/80 to-transparent p-6 border-t border-white/5 select-none">
        {contentType === 'image' ? (
          // Image zoom/rotation controls
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-discord-textNormal hover:text-white transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.2))}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-discord-textNormal hover:text-white transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRotation(r => r - 90)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-discord-textNormal hover:text-white transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRotation(r => r + 90)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-discord-textNormal hover:text-white transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        ) : (
          // Video/Audio player controls
          <div className="max-w-4xl mx-auto flex flex-col space-y-4">
            {/* Timeline seek bar */}
            <div className="flex items-center space-x-4">
              <span className="text-[10px] text-discord-textMuted font-mono w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-discord-accent focus:outline-none"
              />
              <span className="text-[10px] text-discord-textMuted font-mono w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Panel Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className="p-3 bg-discord-accent hover:bg-discord-accent/90 rounded-xl text-white shadow-lg transition-transform hover:scale-105"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                
                {/* Volume slider */}
                <div className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                  <Volume2 className="w-4 h-4 text-discord-textMuted" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/10 rounded appearance-none cursor-pointer accent-discord-accent"
                  />
                </div>
              </div>

              {/* Playback speed selector */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-discord-textMuted">Speed:</span>
                <select
                  value={speed}
                  onChange={handleSpeedChange}
                  className="bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-white font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="0.5" className="bg-discord-secondary">0.5x</option>
                  <option value="0.75" className="bg-discord-secondary">0.75x</option>
                  <option value="1" className="bg-discord-secondary">1.0x (Normal)</option>
                  <option value="1.25" className="bg-discord-secondary">1.25x</option>
                  <option value="1.5" className="bg-discord-secondary">1.5x</option>
                  <option value="2" className="bg-discord-secondary">2.0x</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewer;
