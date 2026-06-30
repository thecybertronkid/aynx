import * as https from 'https';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  searchString: string;
}

interface SpotifyResult {
  type: 'track' | 'album' | 'playlist';
  title: string;
  coverUrl: string;
  tracks: SpotifyTrack[];
}

function requestPost(url: string, body: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      method: 'POST',
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`POST ${url} failed with status: ${res.statusCode}. Body: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function requestGet(url: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`GET ${url} failed with status: ${res.statusCode}. Body: ${data}`));
        }
      });
    });
    req.on('error', reject);
  });
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = 'grant_type=client_credentials';
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const resStr = await requestPost('https://accounts.spotify.com/api/token', body, headers);
  const data = JSON.parse(resStr);
  return data.access_token;
}

export function parseSpotifyUrl(url: string): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('spotify.com')) return null;
    
    // Paths are /track/:id, /album/:id, /playlist/:id
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const type = parts[0];
      const id = parts[1];
      if (type === 'track' || type === 'album' || type === 'playlist') {
        return { type, id };
      }
    }
  } catch (e) {}
  return null;
}

export async function fetchSpotifyMetadata(
  url: string,
  clientId?: string,
  clientSecret?: string
): Promise<SpotifyResult> {
  const parsed = parseSpotifyUrl(url);
  if (!parsed) {
    throw new Error('Invalid Spotify URL. Must be a track, album, or playlist link.');
  }

  // 1. Try Official Spotify Web API if credentials are provided
  if (clientId && clientSecret) {
    try {
      const token = await getAccessToken(clientId, clientSecret);
      const authHeader = { 'Authorization': `Bearer ${token}` };

      if (parsed.type === 'track') {
        const resStr = await requestGet(`https://api.spotify.com/v1/tracks/${parsed.id}`, authHeader);
        const track = JSON.parse(resStr);
        
        const spotifyTrack: SpotifyTrack = {
          id: track.id,
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          album: track.album.name,
          duration: Math.round(track.duration_ms / 1000),
          coverUrl: track.album.images[0]?.url || '',
          searchString: `${track.artists[0]?.name} - ${track.name}`
        };

        return {
          type: 'track',
          title: track.name,
          coverUrl: track.album.images[0]?.url || '',
          tracks: [spotifyTrack]
        };
      } else if (parsed.type === 'album') {
        const resStr = await requestGet(`https://api.spotify.com/v1/albums/${parsed.id}`, authHeader);
        const album = JSON.parse(resStr);
        
        const coverUrl = album.images[0]?.url || '';
        const tracks: SpotifyTrack[] = album.tracks.items.map((item: any) => ({
          id: item.id,
          title: item.name,
          artist: item.artists.map((a: any) => a.name).join(', '),
          album: album.name,
          duration: Math.round(item.duration_ms / 1000),
          coverUrl: coverUrl,
          searchString: `${item.artists[0]?.name} - ${item.name}`
        }));

        return {
          type: 'album',
          title: album.name,
          coverUrl,
          tracks
        };
      } else if (parsed.type === 'playlist') {
        const resStr = await requestGet(`https://api.spotify.com/v1/playlists/${parsed.id}`, authHeader);
        const playlist = JSON.parse(resStr);
        
        const coverUrl = playlist.images[0]?.url || '';
        const tracks: SpotifyTrack[] = playlist.tracks.items
          .filter((item: any) => item.track)
          .map((item: any) => {
            const t = item.track;
            return {
              id: t.id,
              title: t.name,
              artist: t.artists.map((a: any) => a.name).join(', '),
              album: t.album?.name || '',
              duration: Math.round(t.duration_ms / 1000),
              coverUrl: t.album?.images[0]?.url || coverUrl,
              searchString: `${t.artists[0]?.name} - ${t.name}`
            };
          });

        return {
          type: 'playlist',
          title: playlist.name,
          coverUrl,
          tracks
        };
      }
    } catch (apiErr: any) {
      console.warn('[Spotify API] Request failed, falling back to public embed scraping:', apiErr.message);
    }
  }

  // 2. Fallback: Public Embed Scraping (No developer credentials / Premium account required)
  if (parsed.type === 'track') {
    try {
      const embedUrl = `https://open.spotify.com/embed/track/${parsed.id}`;
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      
      const html = await requestGet(embedUrl, headers);
      const scriptMatch = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      
      if (scriptMatch) {
        const json = JSON.parse(scriptMatch[1]);
        const entity = json.props?.pageProps?.state?.data?.entity;
        
        if (entity) {
          const title = entity.name || entity.title || 'Unknown Track';
          const artist = entity.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist';
          const duration = Math.round((entity.duration || 180000) / 1000);
          const coverUrl = entity.visualIdentity?.image?.[0]?.url || '';
          
          const spotifyTrack: SpotifyTrack = {
            id: entity.id || parsed.id,
            title,
            artist,
            album: entity.album?.name || '',
            duration,
            coverUrl,
            searchString: `${entity.artists?.[0]?.name || ''} - ${title}`
          };

          return {
            type: 'track',
            title,
            coverUrl,
            tracks: [spotifyTrack]
          };
        }
      }
    } catch (fallbackErr: any) {
      console.error('[Spotify Fallback] Embed scraping failed:', fallbackErr.message);
    }
  }

  // If we reach here, we either couldn't scrape the page or it's an album/playlist that requires credentials
  throw new Error('Spotify API authentication failed or a Spotify Premium subscription is required for the owner of the Developer app. Single track URLs can be parsed without credentials.');
}
