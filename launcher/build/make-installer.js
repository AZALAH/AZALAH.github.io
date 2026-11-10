// Builds dist/AZALAH-Launcher-Setup.exe from dist/win-unpacked with NSIS (makensis must be on PATH, or set MAKENSIS).
const { execFileSync } = require('child_process'), path = require('path');
const root = path.join(__dirname, '..'), v = require('../package.json').version;
execFileSync(process.env.MAKENSIS || 'makensis', ['-V2', `-DVERSION=${v}`, `-DSRC=${path.join(root, 'dist', 'win-unpacked')}`, `-DOUT=${path.join(root, 'dist', 'AZALAH-Launcher-Setup.exe')}`, path.join(__dirname, 'installer.nsi')], { stdio: 'inherit', cwd: __dirname });
