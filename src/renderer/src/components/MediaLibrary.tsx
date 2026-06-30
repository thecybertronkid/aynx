import React, { useState } from 'react';
import { 
  FolderDown, Play, FolderOpen, Star, 
  Trash2, Search, ArrowUpDown, 
  Film, Music, Image as ImageIcon, Heart
} from 'lucide-react';
import { useDownloadStore, DownloadItem } from '../store/downloadStore';
import { useSettingsStore } from '../store/settingsStore';

interface MediaLibraryProps {
  favoriteOnly?: boolean;
  onPlay: (item: { filePath: string; title: string; contentType: 'video' | 'audio' | 'image' }) => void;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ favoriteOnly = false, onPlay }) => {
  const downloads = useDownloadStore((state) => state.downloads);
  const deleteDownload = useDownloadStore((state) => state.deleteDownload);
  const toggleFavorite = useDownloadStore((state) => state.toggleFavorite);
  const plan = useSettingsStore((state) => state.settings.plan) || 'Free';

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'title'>('date');

  // Filter and sort downloads list
  const filteredDownloads = downloads
    .filter((item) => {
      // 1. Favorite filter
      if (favoriteOnly && item.favorite !== 1) return false;
      
      // 2. Search query filter
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.channel && item.channel.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;

      // 3. Category filter
      if (categoryFilter === 'all') return true;
      return item.contentType === categoryFilter;
    })
    .sort((a, b) => {
      // Sort logic
      if (sortBy === 'date') {
        return new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime();
      }
      if (sortBy === 'size') {
        return (b.fileSize || 0) - (a.fileSize || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  // Size helper
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleOpenFile = async (filePath?: string) => {
    if (!filePath) return;
    const success = await window.api.openFile(filePath);
    if (!success) {
      alert('Could not open file. It may have been moved or deleted.');
    }
  };

  const handleShowInFolder = (filePath?: string) => {
    if (!filePath) return;
    window.api.showItemInFolder(filePath);
  };

  // Helper to get play/viewer action
  const handlePlayOrOpen = (item: DownloadItem) => {
    if (!item.filePath) return;
    
    // Play with built-in viewer if type matches
    if (item.contentType === 'video' || item.contentType === 'audio' || item.contentType === 'image') {
      if (plan === 'Free') {
        alert('Preview Player is locked on the Free Plan. Please upgrade to a Plus or Pro plan to preview downloaded media directly inside AYNX.');
        return;
      }
      onPlay({
        filePath: item.filePath,
        title: item.title,
        contentType: item.contentType
      });
    } else {
      // Fallback to shell open
      handleOpenFile(item.filePath);
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto space-y-6 select-none relative flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="mb-2 shrink-0">
        <h1 className="text-2xl font-extrabold text-discord-textNormal flex items-center space-x-2.5">
          {favoriteOnly ? (
            <Heart className="w-6 h-6 text-discord-danger fill-discord-danger animate-pulse" />
          ) : (
            <FolderDown className="w-6 h-6 text-discord-accent animate-pulse" />
          )}
          <span>{favoriteOnly ? 'My Favorites' : 'Media Library'}</span>
        </h1>
        <p className="text-sm text-discord-textMuted mt-1.5 font-medium">
          {favoriteOnly 
            ? 'Access your starred download files instantly.' 
            : 'Access, search, filter, and preview all your downloaded files.'}
        </p>
      </div>

      {/* Filter and search toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-2 shrink-0">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search downloads by name, channel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-discord-secondary text-discord-textNormal pl-10 pr-4 py-2.5 rounded-lg border border-discord-border focus:outline-none focus:border-discord-accent text-xs placeholder-discord-textMuted/50 shadow-inner transition-all duration-200"
          />
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-discord-textMuted/50" />
        </div>

        {/* Category Filters */}
        <div className="flex bg-discord-secondary/50 p-1 rounded-lg border border-discord-border self-start">
          {[
            { id: 'all', label: 'All' },
            { id: 'video', label: 'Videos', icon: Film },
            { id: 'audio', label: 'Music', icon: Music },
            { id: 'image', label: 'Images', icon: ImageIcon }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer ${
                categoryFilter === cat.id 
                  ? 'bg-discord-active text-discord-textNormal shadow-sm' 
                  : 'text-discord-textMuted hover:text-discord-textNormal'
              }`}
            >
              {cat.icon && <cat.icon className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Sorting drop down */}
        <div className="flex items-center space-x-2 bg-discord-secondary/50 p-1.5 rounded-lg border border-discord-border self-start">
          <ArrowUpDown className="w-3.5 h-3.5 text-discord-textMuted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-discord-textNormal border-none text-xs font-bold focus:outline-none pr-6 cursor-pointer"
          >
            <option value="date">Sort: Date</option>
            <option value="size">Sort: Size</option>
            <option value="title">Sort: Title</option>
          </select>
        </div>
      </div>

      {/* Grid listing */}
      <div className="flex-1 min-h-0">
        {filteredDownloads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 bg-discord-secondary/10 rounded-2xl border border-discord-border">
            <FolderDown className="w-12 h-12 text-discord-textMuted/30" />
            <div>
              <div className="text-sm font-bold text-discord-textNormal">No downloads found</div>
              <div className="text-xs text-discord-textMuted mt-1 font-semibold">
                Try modifying your search query or category filters.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1 overflow-y-auto h-full pr-2">
            {filteredDownloads.map((item) => (
              <div
                key={item.id}
                className="bg-discord-card border border-discord-border rounded-xl overflow-hidden flex flex-col justify-between shadow-md hover:shadow-lg transition-all duration-300 group"
              >
                {/* Image / Thumbnail Preview */}
                <div className="aspect-video w-full bg-discord-tertiary relative border-b border-discord-border overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-discord-textMuted">
                      {item.contentType === 'video' ? <Film className="w-8 h-8" /> : <Music className="w-8 h-8" />}
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div 
                    onClick={() => handlePlayOrOpen(item)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-200"
                  >
                    <div className="w-12 h-12 rounded-full bg-discord-accent flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-200">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                  </div>

                  {/* Action Badges */}
                  <div className="absolute top-2 left-2 flex flex-col space-y-1">
                    <span className="bg-black/60 backdrop-blur-md text-[9px] font-bold px-2 py-0.5 rounded text-white shadow select-none uppercase tracking-wide">
                      {item.platform}
                    </span>
                  </div>

                  {/* Favorite toggle badge */}
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-discord-textMuted hover:text-white shadow transition-all duration-200 cursor-pointer"
                  >
                    <Star className={`w-3.5 h-3.5 ${item.favorite === 1 ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </button>
                </div>

                {/* Info and Actions */}
                <div className="p-4 flex flex-col space-y-2">
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-discord-textNormal leading-tight truncate" title={item.title}>
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-discord-textMuted truncate mt-0.5 font-semibold">{item.channel || 'Unknown Channel'}</p>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-discord-textMuted pt-1.5 select-none border-t border-discord-border font-semibold">
                    <span>{formatBytes(item.fileSize)}</span>
                    <span>{new Date(item.downloadedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-discord-border justify-between">
                    <button
                      type="button"
                      onClick={() => handlePlayOrOpen(item)}
                      className="flex-1 py-1.5 bg-discord-hover hover:bg-discord-active active:scale-95 rounded text-[10px] font-bold text-discord-textNormal flex items-center justify-center space-x-1.5 transition-all duration-200 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleShowInFolder(item.filePath)}
                      title="Show in File Explorer"
                      className="p-1.5 hover:bg-discord-hover active:scale-95 rounded-lg text-discord-textMuted hover:text-discord-textNormal transition-all duration-200 border border-transparent hover:border-discord-border cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteDownload(item.id)}
                      title="Delete History Record"
                      className="p-1.5 hover:bg-discord-danger/10 active:scale-95 hover:text-discord-danger rounded-lg text-discord-textMuted transition-all duration-200 border border-transparent hover:border-discord-danger/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
