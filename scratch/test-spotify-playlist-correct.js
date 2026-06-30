const https = require('https');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIG36Ja6b', options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const scriptMatch = data.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      try {
        const json = JSON.parse(scriptMatch[1]);
        const entity = json.props.pageProps.state.data.entity;
        console.log('Type:', entity.type);
        console.log('Title:', entity.name || entity.title);
        console.log('Cover URL:', entity.visualIdentity?.image?.[0]?.url || entity.images?.[0]?.url);
        
        const trackList = entity.tracks?.items || [];
        console.log('Total tracks found:', trackList.length);
        if (trackList.length > 0) {
          const first = trackList[0];
          console.log('First track details:', {
            id: first.id,
            title: first.name || first.title || first.track?.name,
            artists: first.artists?.map(a => a.name).join(', ') || first.track?.artists?.map(a => a.name).join(', '),
            duration: first.duration || first.track?.duration_ms
          });
        }
      } catch (e) {
        console.error('JSON parse fail:', e);
      }
    } else {
      console.log('No script match');
    }
  });
});
