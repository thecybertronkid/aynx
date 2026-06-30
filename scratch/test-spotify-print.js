const https = require('https');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  }
};

https.get('https://open.spotify.com/track/0RWLe6Dx5cWyPuB1sw6eWf', options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // print first 2000 chars of HTML
    console.log(data.slice(0, 3000));
  });
});
