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
        console.log('Keys of props:', Object.keys(json.props || {}));
        console.log('Keys of pageProps:', Object.keys(json.props?.pageProps || {}));
        console.log('pageProps status:', json.props?.pageProps?.status);
        console.log('pageProps state structure:', json.props?.pageProps?.state ? Object.keys(json.props.pageProps.state) : 'no state');
      } catch (e) {
        console.error('JSON parse fail:', e);
      }
    } else {
      console.log('No script match');
    }
  });
});
