// AYNX Auto Release Publisher Script v2.5.4
// Automatically registers new packaged builds onto the online backend server.
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version;

const sourcePath = path.join(__dirname, '..', 'release-build', `AYNX ${version}.stable.exe`);
const destDir = path.join(__dirname, '..', 'release');
const destPath = path.join(destDir, `AYNX ${version}.stable.exe`);
const legacyDestPath = path.join(destDir, `AYNX Setup ${version}.exe`);

// Copy installer from release-build -> release so users always find it in /release
if (fs.existsSync(sourcePath)) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  fs.copyFileSync(sourcePath, legacyDestPath);
  console.log(`[AYNX Publisher] Copied installer to release/AYNX ${version}.stable.exe`);
} else {
  console.warn(`[AYNX Publisher] WARNING: Built installer not found at: ${sourcePath}`);
}

const downloadUrl = `file:///e:/SABLE 2.0/release/AYNX ${version}.stable.exe`;

const payload = {
  latestVersion: version,
  downloadUrl,
  changelog: `v${version} Release Notes:
- Silent in-app background updater: click Download Update and the app installs & restarts itself.
- Automatic release publishing: running 'pnpm run package' now auto-registers the build on the backend.
- Admin Portal: upgrade/downgrade user plans with a dropdown in the Live Users table.
- Real-time sync: backend plan changes reflect in the client within 5 seconds via heartbeat.
- Fixed trial activation and registry ordering bugs.`
};

console.log(`[AYNX Publisher] Registering build v${version} on backend...`);

const adminSecret = process.env.ADMIN_SECRET || '12345';
const req = require('http').request(
  {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/version/set',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-secret': adminSecret
    }
  },
  (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[AYNX Publisher] ✅ v${version} is now live on the backend.`);
        console.log(`[AYNX Publisher] Installer: ${destPath}`);
      } else {
        console.error(`[AYNX Publisher] ❌ Backend error (${res.statusCode}): ${body}`);
      }
    });
  }
);

req.on('error', (e) => {
  console.warn('[AYNX Publisher] ⚠️  Backend offline – release metadata not published. Start server and re-run: node scripts/publish-release.js');
});

req.write(JSON.stringify(payload));
req.end();
