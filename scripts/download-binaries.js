const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '../resources/bin');

// Ensure resources/bin exists
fs.mkdirSync(binDir, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} to ${dest}...`);
    const file = fs.createWriteStream(dest);
    
    // Support redirects
    function get(urlToGet) {
      https.get(urlToGet, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          get(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode} - ${response.statusMessage}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`Finished downloading ${dest}`);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }
    
    get(url);
  });
}

async function main() {
  try {
    // 1. Download yt-dlp.exe
    const ytdlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    const ytdlpDest = path.join(binDir, 'yt-dlp.exe');
    await downloadFile(ytdlpUrl, ytdlpDest);

    // 2. Download ffmpeg release build
    const ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
    const tempZip = path.join(__dirname, '../temp_ffmpeg.zip');
    const tempExtractDir = path.join(__dirname, '../temp_ffmpeg_extract');
    
    await downloadFile(ffmpegUrl, tempZip);
    
    // Clean old extract dir
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempExtractDir, { recursive: true });
    
    console.log('Extracting ffmpeg zip...');
    // Use powershell Expand-Archive to extract
    execSync(`powershell -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtractDir}' -Force"`);
    
    // Find ffmpeg.exe and ffprobe.exe recursively in extract dir
    function findFile(dir, name) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const found = findFile(fullPath, name);
          if (found) return found;
        } else if (file.toLowerCase() === name.toLowerCase()) {
          return fullPath;
        }
      }
      return null;
    }
    
    const ffmpegSrc = findFile(tempExtractDir, 'ffmpeg.exe');
    const ffprobeSrc = findFile(tempExtractDir, 'ffprobe.exe');
    
    if (ffmpegSrc && ffprobeSrc) {
      console.log(`Found ffmpeg at ${ffmpegSrc}`);
      console.log(`Found ffprobe at ${ffprobeSrc}`);
      
      fs.copyFileSync(ffmpegSrc, path.join(binDir, 'ffmpeg.exe'));
      fs.copyFileSync(ffprobeSrc, path.join(binDir, 'ffprobe.exe'));
      console.log('Copied ffmpeg.exe and ffprobe.exe to resources/bin');
    } else {
      throw new Error('Could not find ffmpeg.exe or ffprobe.exe in extracted archive');
    }
    
    // Clean up
    console.log('Cleaning up temporary files...');
    fs.unlinkSync(tempZip);
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    
    console.log('Binaries successfully acquired and configured!');
  } catch (err) {
    console.error('Error during binary acquisition:', err);
    process.exit(1);
  }
}

main();
