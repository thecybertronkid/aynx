const https = require('https');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  }
};

https.get('https://open.spotify.com/track/0RWLe6Dx5cWyPuB1sw6eWf', options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    
    // Find og:title
    const titleMatch = data.match(/<meta property="og:title" content="([^"]+)"/i) || data.match(/<meta name="twitter:title" content="([^"]+)"/i);
    const descMatch = data.match(/<meta property="og:description" content="([^"]+)"/i) || data.match(/<meta name="twitter:description" content="([^"]+)"/i);
    const imageMatch = data.match(/<meta property="og:image" content="([^"]+)"/i) || data.match(/<meta name="twitter:image" content="([^"]+)"/i);
    
    console.log('Title Match:', titleMatch ? titleMatch[1] : 'null');
    console.log('Desc Match:', descMatch ? descMatch[1] : 'null');
    console.log('Image Match:', imageMatch ? imageMatch[1] : 'null');
    
    // Let's write the HTML to a file if we want to inspect
    // require('fs').writeFileSync('spotify_page.html', data);
  });
}).on('error', (e) => {
  console.error(e);
});
