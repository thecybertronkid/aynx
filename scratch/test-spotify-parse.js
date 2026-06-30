const https = require('https');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get('https://open.spotify.com/embed/track/0RWLe6Dx5cWyPuB1sw6eWf', options, (res) => {
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
        console.log('Artists:', entity.artists.map(a => a.name).join(', '));
        console.log('Duration (sec):', Math.round(entity.duration / 1000));
        
        // Look for image/cover
        console.log('Keys of entity:', Object.keys(entity));
        console.log('VisualIdentity:', entity.visualIdentity);
        console.log('Cover / images:', entity.coverUrl || entity.images);
      } catch (e) {
        console.error('JSON parse fail:', e);
      }
    } else {
      console.log('No script match');
    }
  });
});
