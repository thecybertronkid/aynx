const esbuild = require('esbuild');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

async function build() {
  console.log('Building Electron main & preload scripts for production...');
  
  fs.mkdirSync(path.join(__dirname, '../dist/main'), { recursive: true });
  fs.mkdirSync(path.join(__dirname, '../dist/preload'), { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(__dirname, '../src/main/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    minify: true,
    outfile: path.join(__dirname, '../dist/main/index.js'),
    external: ['electron', 'better-sqlite3'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  await esbuild.build({
    entryPoints: [path.join(__dirname, '../src/preload/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    minify: true,
    outfile: path.join(__dirname, '../dist/preload/index.js'),
    external: ['electron'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  console.log('Building React renderer for production...');
  execSync('node node_modules/vite/bin/vite.js build', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });

  console.log('Build completed successfully!');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
