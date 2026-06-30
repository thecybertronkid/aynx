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
    require('fs').writeFileSync('e:/SABLE 2.0/scratch/spotify_embed.html', data);
    console.log('Embed HTML size:', data.length);
    
    // Look for JSON or entity script
    const scriptMatch = data.match(/<script\s+id="initial-state"[^>]*>([\s\S]*?)<\/script>/i) ||
                        data.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i) ||
                        data.match(/<script[^>]*>([\s\S]*?SpotifyPlayer[\s\S]*?)<\/script>/i) ||
                        data.match(/resource["']:\s*(\{[\s\S]*?\})/);
                        
    console.log('Script Match found:', !!scriptMatch);
    if (scriptMatch) {
      console.log('Script Content slice:', scriptMatch[0].slice(0, 1000));
    }
  });
});
