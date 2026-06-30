// AYNX Auto Release Publisher Script v2.5.1
// Automatically registers new packaged builds onto the online backend server.

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = pkg.version;

const sourcePath = path.join(__dirname, '..', 'release-build', `AYNX Setup ${version}.exe`);
const destDir = path.join(__dirname, '..', 'release');
const destPath = path.join(destDir, `AYNX Setup ${version}.exe`);

// Copy installer from release-build -> release so users always find it in /release
if (fs.existsSync(sourcePath)) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  console.log(`[AYNX Publisher] Copied installer to release/AYNX Setup ${version}.exe`);
} else {
  console.warn(`[AYNX Publisher] WARNING: Built installer not found at: ${sourcePath}`);
}

const downloadUrl = `file:///e:/SABLE 2.0/release/AYNX Setup ${version}.exe`;

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

const req = require('http').request(
  {
    hostname: 'localhost',
    port: 5000,
    path: '/api/version/set',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
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
