const { spawn } = require('child_process');
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isDev = true;

// Ensure output dirs exist
fs.mkdirSync(path.join(__dirname, '../dist/main'), { recursive: true });
fs.mkdirSync(path.join(__dirname, '../dist/preload'), { recursive: true });

async function start() {
  console.log('Building Electron main & preload scripts...');

  // Create esbuild context for main process
  const mainCtx = await esbuild.context({
    entryPoints: [path.join(__dirname, '../src/main/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(__dirname, '../dist/main/index.js'),
    external: ['electron', 'better-sqlite3'],
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"development"'
    }
  });

  // Create esbuild context for preload process
  const preloadCtx = await esbuild.context({
    entryPoints: [path.join(__dirname, '../src/preload/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(__dirname, '../dist/preload/index.js'),
    external: ['electron', 'better-sqlite3'],
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"development"'
    }
  });

  // Watch for changes
  await mainCtx.watch();
  await preloadCtx.watch();
  console.log('Watching main and preload processes for changes...');

  // Start Vite Dev Server
  console.log('Starting Vite dev server...');
  const viteProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-Command', 'pnpm vite'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  // Wait for Vite to spin up, then start Electron
  let electronProcess = null;

  function startElectron() {
    if (electronProcess) {
      electronProcess.kill();
    }
    console.log('Starting Electron...');
    electronProcess = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-Command', 'pnpm electron .'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    electronProcess.on('close', () => {
      console.log('Electron closed.');
      mainCtx.dispose();
      preloadCtx.dispose();
      viteProcess.kill();
      process.exit();
    });
  }

  // Delay starting electron by 2 seconds to let Vite server warm up
  setTimeout(startElectron, 2500);
}

start().catch(err => {
  console.error('Failed to start dev environment:', err);
  process.exit(1);
});
