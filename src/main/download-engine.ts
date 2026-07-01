import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { addOrUpdateDownload, getSettings, getAccounts, DownloadRecord } from './database';
import { fetchSpotifyMetadata, parseSpotifyUrl } from './platform/spotify';

// Detect platform name from URL for cookie lookup
function getPlatformFromUrl(url: string): string | null {
  const u = url.toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'Instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'X (Twitter)';
  if (u.includes('tiktok.com')) return 'TikTok';
  return null;
}

// Write cookies to a temp file and return ["--cookies", path] args if found
async function prepareCookiesArgs(platformName: string | null): Promise<string[]> {
  if (!platformName) return [];
  try {
    const accounts = await getAccounts();
    const account = accounts.find(a => a.platform === platformName);
    if (account && account.cookies && account.cookies.trim()) {
      const tempDir = app.getPath('temp');
      const safeName = platformName.replace(/[^a-zA-Z0-9]/g, '_');
      const cookiesFile = path.join(tempDir, `aynx_cookies_${safeName}.txt`);
      fs.writeFileSync(cookiesFile, account.cookies.trim(), 'utf8');
      console.log(`[Cookies] Using saved cookies for ${platformName} at: ${cookiesFile}`);
      return ['--cookies', cookiesFile];
    }
  } catch (err) {
    console.error('[Cookies] Failed to prepare cookies file:', err);
  }
  return [];
}

interface ActiveDownload {
  record: DownloadRecord;
  process: ChildProcess | null;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;
  speed: string;
  eta: string;
  quality?: string;
  format?: string;
}

const activeDownloads = new Map<string, ActiveDownload>();
const downloadQueue: string[] = [];

// Helper to get binary path depending on development or packaged mode
export function getBinaryPath(binaryName: string): string {
  const baseName = process.platform === 'win32' ? `${binaryName}.exe` : binaryName;
  
  if (app.isPackaged) {
    // Packaged path: resources/bin/<name>.exe
    return path.join(process.resourcesPath, 'bin', baseName);
  } else {
    // Dev path: E:/SABLE 2.0/resources/bin/<name>.exe
    return path.join(app.getAppPath(), 'resources', 'bin', baseName);
  }
}

// Global update callback (set by IPC to notify renderer)
let onProgressCallback: (id: string, data: any) => void = () => {};

export function setProgressCallback(cb: (id: string, data: any) => void) {
  onProgressCallback = cb;
}

export function getActiveDownloads() {
  return Array.from(activeDownloads.values()).map(ad => ({
    id: ad.record.id,
    url: ad.record.id,  // the ID is the original URL
    title: ad.record.title,
    platform: ad.record.platform,
    contentType: ad.record.contentType,
    status: ad.status,
    progress: ad.progress,
    speed: ad.speed,
    eta: ad.eta,
    quality: ad.quality,
    format: ad.format
  }));
}

// 1. Analyze URL to fetch details before download
export async function analyzeUrl(url: string): Promise<any> {
  const settings = await getSettings();
  const ytdlpPath = getBinaryPath('yt-dlp');

  // Check binary exists
  if (!fs.existsSync(ytdlpPath)) {
    throw new Error(`yt-dlp binary not found at: ${ytdlpPath}\n\nPlease run "pnpm run download-bin" to install required binaries.`);
  }
  
  // Check if Spotify URL
  const spotifyInfo = parseSpotifyUrl(url);
  if (spotifyInfo) {
    const clientId = settings.spotifyClientId || '';
    const clientSecret = settings.spotifyClientSecret || '';
    const metadata = await fetchSpotifyMetadata(url, clientId, clientSecret);
    return {
      platform: 'Spotify',
      title: metadata.title,
      coverUrl: metadata.coverUrl,
      type: metadata.type,
      tracks: metadata.tracks.map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        thumbnailUrl: t.coverUrl,
        searchString: t.searchString
      }))
    };
  }

  // General URL analysis using yt-dlp --dump-json
  return new Promise(async (resolve, reject) => {
    console.log(`Running yt-dlp --dump-json for: ${url}`);
    
    const args = ['--dump-json', '--no-playlist', '--no-warnings'];
    
    // Add proxy if configured
    if (settings.proxy) {
      args.push('--proxy', settings.proxy);
    }

    // Add cookies if the user has configured them for this platform
    const platformName = getPlatformFromUrl(url);
    const cookieArgs = await prepareCookiesArgs(platformName);
    args.push(...cookieArgs);

    // Bypass YouTube "Sign in to confirm you're not a bot" restriction
    if (platformName === 'YouTube') {
      args.push('--extractor-args', 'youtube:player_client=android,web');
    }

    args.push(url);
    
    const child = spawn(ytdlpPath, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => stdout += data.toString());
    child.stderr.on('data', data => stderr += data.toString());

    child.on('error', (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout);
          
          // Map to uniform structure
          resolve({
            platform: info.extractor_key || 'Unknown',
            id: info.id,
            title: info.title,
            channel: info.uploader || info.channel || '',
            duration: info.duration || 0,
            thumbnailUrl: info.thumbnail || '',
            formats: info.formats ? info.formats.map((f: any) => ({
              formatId: f.format_id,
              extension: f.ext,
              resolution: f.resolution || `${f.width}x${f.height}` || 'audio only',
              vcodec: f.vcodec,
              acodec: f.acodec,
              fileSize: f.filesize || f.filesize_approx || 0
            })).filter((f: any) => f.resolution !== 'audio only' || f.acodec !== 'none') : []
          });
        } catch (e) {
          reject(new Error(`Failed to parse yt-dlp metadata: ${e}`));
        }
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });
  });
}

// 2. Add download job
export async function queueDownload(options: {
  id: string;
  url: string;
  title: string;
  channel?: string;
  platform: string;
  contentType: 'video' | 'audio' | 'image';
  quality?: string;
  format?: string;
  spotifySearchString?: string;
}) {
  const record: DownloadRecord = {
    id: options.id,
    title: options.title,
    channel: options.channel,
    platform: options.platform,
    contentType: options.contentType,
    status: 'queued',
    downloadedAt: new Date().toISOString()
  };

  // Add to db
  await addOrUpdateDownload(record);

  // Add to active map
  activeDownloads.set(options.id, {
    record,
    process: null,
    status: 'queued',
    progress: 0,
    speed: '0 KB/s',
    eta: '--:--',
    quality: options.quality,
    format: options.format
  });

  downloadQueue.push(options.id);
  
  // Trigger queue check
  processQueue();
  
  // Notify
  onProgressCallback(options.id, { status: 'queued', progress: 0 });
}

// Queue runner with concurrency limit
function processQueue() {
  // Use cached settings or defaults to avoid blocking
  const limit = 3; // default concurrency

  let runningCount = 0;
  for (const ad of activeDownloads.values()) {
    if (ad.status === 'downloading') runningCount++;
  }

  while (runningCount < limit && downloadQueue.length > 0) {
    const nextId = downloadQueue.shift();
    if (!nextId) break;

    const ad = activeDownloads.get(nextId);
    if (ad && ad.status === 'queued') {
      startDownloadJob(ad);
      runningCount++;
    }
  }
}

// 3. Start download process
async function startDownloadJob(ad: ActiveDownload) {
  const settings = await getSettings();
  const ytdlpPath = getBinaryPath('yt-dlp');
  const ffmpegPath = getBinaryPath('ffmpeg');
  
  ad.status = 'downloading';
  onProgressCallback(ad.record.id, { status: 'downloading', progress: 0 });

  // Resolve download folders structure
  const baseDir = settings.downloadFolder || path.join(process.env.USERPROFILE || '', 'Downloads');
  const platformDir = path.join(baseDir, ad.record.platform);
  fs.mkdirSync(platformDir, { recursive: true });

  const outputPattern = path.join(platformDir, '%(title)s.%(ext)s');

  const args: string[] = [];
  

  // Configure FFmpeg path for merging/post-processing
  if (fs.existsSync(ffmpegPath)) {
    args.push('--ffmpeg-location', ffmpegPath);
  }

  // Add proxy
  if (settings.proxy) {
    args.push('--proxy', settings.proxy);
  }

  // Add cookies if the user has configured them for this platform
  const cookieArgs = await prepareCookiesArgs(ad.record.platform);
  args.push(...cookieArgs);

  // Bypass YouTube "Sign in to confirm you're not a bot" restriction for YouTube and Spotify search downloads
  if (ad.record.platform === 'YouTube' || ad.record.platform === 'Spotify' || ad.record.platform === 'YouTube Music') {
    args.push('--extractor-args', 'youtube:player_client=android,web');
  }

  // Format selection
  const resolvedFormat = ad.format || settings.defaultFormat || 'MP4';
  const resolvedQuality = ad.quality || settings.defaultQuality || 'Best Available';

  // Handle Spotify downloads (requires YT search string)
  let targetUrl = ad.record.id; // Usually the track URL
  if (ad.record.platform === 'Spotify') {
    const searchStr = ad.record.title;
    args.push('ytsearch:' + searchStr);
    args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '320k');
  } else {
    // General platforms
    args.push(targetUrl);

    if (ad.record.contentType === 'audio') {
      args.push('--extract-audio');
      const fmtLower = resolvedFormat.toLowerCase();
      const isVideoFmt = ['mp4', 'mkv', 'webm'].includes(fmtLower);
      const audioFormat = isVideoFmt ? 'mp3' : (fmtLower === 'm4a' ? 'm4a' : fmtLower);
      args.push('--audio-format', audioFormat);
      
      const audioQuality = (resolvedQuality && !isNaN(Number(resolvedQuality))) ? `${resolvedQuality}k` : '320k';
      args.push('--audio-quality', audioQuality);
    } else if (ad.record.contentType === 'video') {
      if (resolvedQuality === 'Best Available') {
        args.push('-f', 'bestvideo+bestaudio/best');
      } else {
        const height = resolvedQuality.replace('p', '');
        args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`);
      }
      
      const videoExt = resolvedFormat.toLowerCase();
      args.push('--merge-output-format', videoExt);
    }
  }

  args.push('-o', outputPattern);

  console.log(`Spawning yt-dlp with args:`, args.join(' '));
  const child = spawn(ytdlpPath, args);
  ad.process = child;

  let stdoutBuffer = '';

  child.stdout.on('data', (data) => {
    const chunk = data.toString();
    stdoutBuffer += chunk;

    // Split by carriage return (\r) or newline (\n) to capture terminal in-place updates
    const lines = stdoutBuffer.split(/[\r\n]+/);
    stdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      // Strip ANSI escape codes
      const cleanLine = line.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();

      const progMatch = cleanLine.match(/\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?\s*([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
      if (progMatch) {
        ad.progress = parseFloat(progMatch[1]);
        ad.speed = progMatch[3];
        ad.eta = progMatch[4];
        
        onProgressCallback(ad.record.id, {
          status: 'downloading',
          progress: ad.progress,
          speed: ad.speed,
          eta: ad.eta
        });
      }

      const destMatch = cleanLine.match(/\[download\] Destination: (.*)/);
      if (destMatch) {
        const filePath = destMatch[1].trim();
        ad.record.filePath = filePath;
      }
    }
  });

  child.stderr.on('data', (data) => {
    console.error(`[yt-dlp error]`, data.toString());
  });

  child.on('close', async (code) => {
    ad.process = null;
    
    if (code === 0) {
      ad.status = 'completed';
      ad.progress = 100;
      ad.speed = '0 KB/s';
      ad.eta = '00:00';
      ad.record.status = 'completed';

      if (!ad.record.filePath || !fs.existsSync(ad.record.filePath)) {
        try {
          const files = fs.readdirSync(platformDir);
          const titleSafe = ad.record.title.replace(/[\\/:*?"<>|]/g, '_');
          const matched = files.find(f => f.startsWith(titleSafe) || f.toLowerCase().includes(titleSafe.toLowerCase().substring(0, 10)));
          if (matched) {
            ad.record.filePath = path.join(platformDir, matched);
            const stats = fs.statSync(ad.record.filePath);
            ad.record.fileSize = stats.size;
          }
        } catch (err) {}
      } else {
        try {
          const stats = fs.statSync(ad.record.filePath);
          ad.record.fileSize = stats.size;
        } catch (err) {}
      }

      await addOrUpdateDownload(ad.record);
      
      // Send telemetry completed report online
      try {
        const settings = await getSettings();
        const machineId = settings.machineId || 'Unknown';
        const apiBase = process.env.API_BASE_URL || 'https://aynx-api.onrender.com';
        fetch(`${apiBase}/telemetry/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            machineId,
            platform: ad.record.platform,
            contentType: ad.record.contentType,
            title: ad.record.title,
            status: 'completed',
            sizeBytes: ad.record.fileSize || 0
          })
        }).catch(() => {});
      } catch (telErr) {}

      onProgressCallback(ad.record.id, { status: 'completed', progress: 100, filePath: ad.record.filePath });
    } else {
      if (ad.status !== 'paused') {
        ad.status = 'failed';
        ad.record.status = 'failed';
        await addOrUpdateDownload(ad.record);

        // Send telemetry failed report online
        try {
          const settings = await getSettings();
          const machineId = settings.machineId || 'Unknown';
          const apiBase = process.env.API_BASE_URL || 'https://aynx-api.onrender.com';
          fetch(`${apiBase}/telemetry/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              machineId,
              platform: ad.record.platform,
              contentType: ad.record.contentType,
              title: ad.record.title,
              status: 'failed',
              sizeBytes: 0
            })
          }).catch(() => {});
        } catch (telErr) {}

        onProgressCallback(ad.record.id, { status: 'failed', progress: ad.progress });
      }
    }

    processQueue();
  });
}

// 4. Pause / Resume / Cancel methods
export function pauseDownload(id: string) {
  const ad = activeDownloads.get(id);
  if (ad && ad.status === 'downloading' && ad.process) {
    ad.status = 'paused';
    ad.process.kill();
    ad.process = null;
    
    onProgressCallback(id, { status: 'paused', progress: ad.progress });
    processQueue();
  }
}

export function resumeDownload(id: string) {
  const ad = activeDownloads.get(id);
  if (ad && ad.status === 'paused') {
    ad.status = 'queued';
    downloadQueue.push(id);
    onProgressCallback(id, { status: 'queued', progress: ad.progress });
    processQueue();
  }
}

export function cancelDownload(id: string) {
  const ad = activeDownloads.get(id);
  if (ad) {
    if (ad.process) {
      ad.process.kill();
    }
    
    const index = downloadQueue.indexOf(id);
    if (index > -1) {
      downloadQueue.splice(index, 1);
    }
    
    activeDownloads.delete(id);
    onProgressCallback(id, { status: 'cancelled' });
    processQueue();
  }
}
