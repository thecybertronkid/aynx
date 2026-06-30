const https = require('https');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

https.get('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIG36Ja6B', options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const scriptMatch = data.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      try {
        const json = JSON.parse(scriptMatch[1]);
        console.log('Keys of props:', Object.keys(json.props || {}));
        console.log('Keys of pageProps:', Object.keys(json.props?.pageProps || {}));
        if (json.props?.pageProps?.state) {
          console.log('Keys of state:', Object.keys(json.props.pageProps.state));
        } else {
          console.log('state is undefined. pageProps content:', json.props?.pageProps);
        }
      } catch (e) {
        console.error('JSON parse fail:', e);
      }
    } else {
      console.log('No script match');
    }
  });
});
