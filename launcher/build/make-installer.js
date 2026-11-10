// Builds dist/AZALAH-Launcher-Setup.exe from dist/win-unpacked with NSIS (makensis must be on PATH, or set MAKENSIS).
const { execFileSync } = require('child_process'), path = require('path');
const root = path.join(__dirname, '..'), v = require('../package.json').version;
execFileSync(process.env.MAKENSIS || 'makensis', ['-V2', `-DVERSION=${v}`, `-DSRC=${path.join(root, 'dist', 'win-unpacked')}`, `-DOUT=${path.join(root, 'dist', 'AZALAH-Launcher-Setup.exe')}`, path.join(__dirname, 'installer.nsi')], { stdio: 'inherit', cwd: __dirname });
// Record what was built so the site's manifest can offer it to installed launchers.
const fs = require('fs'), crypto = require('crypto'), exe = path.join(root, 'dist', 'AZALAH-Launcher-Setup.exe'), buf = fs.readFileSync(exe);
fs.writeFileSync(path.join(root, 'release.json'), JSON.stringify({ version: v, url: `https://github.com/AZALAH/AZALAH.github.io/releases/download/launcher-v${v}/AZALAH-Launcher-Setup.exe`, sha256: crypto.createHash('sha256').update(buf).digest('hex'), size: buf.length }, null, 2) + '\n');
