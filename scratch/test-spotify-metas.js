const https = require('https');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  }
};

https.get('https://open.spotify.com/track/0RWLe6Dx5cWyPuB1sw6eWf', options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // Write full html to scratch for analysis
    require('fs').writeFileSync('e:/SABLE 2.0/scratch/spotify_dump.html', data);
    console.log('Dumped html size:', data.length);
    
    // Look for all meta tags
    const metas = [];
    const regex = /<meta\s+[^>]*>/gi;
    let match;
    while ((match = regex.exec(data)) !== null) {
      metas.push(match[0]);
    }
    console.log('Metas found:', metas.filter(m => m.includes('og:') || m.includes('twitter:') || m.includes('title') || m.includes('description')));
  });
});
