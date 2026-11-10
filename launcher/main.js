'use strict';
// AZALAH Launcher: installs, updates and runs The Gallery in its own window.
const { app, BrowserWindow, protocol, ipcMain, shell, net, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const { Readable } = require('stream');

const SITE = (!app.isPackaged && process.env.AZALAH_SITE) || 'https://azalah.github.io/';
const MANIFEST = 'game-manifest.json';
const RELEASES = 'https://github.com/AZALAH/AZALAH.github.io/releases/download/';
const MAX_FILES = 2000, MAX_BYTES = 400 * 1024 * 1024;
const SAFE_PATH = /^[A-Za-z0-9][A-Za-z0-9 _.\-]*(\/[A-Za-z0-9][A-Za-z0-9 _.\-]*)*$/;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };

protocol.registerSchemesAsPrivileged([{ scheme: 'azalah', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();
app.setAppUserModelId('io.github.azalah.launcher');

const bundledDir = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.join(__dirname, 'game');
const uiDir = path.join(__dirname, 'ui');
let userDir, overlayDir, settingsFile;
const DISPLAYS = ['fullscreen', 'borderless', 'windowed'];
let settings = { display: 'fullscreen', skipTitle: false };
let overlay = null;        // manifest of downloaded updates, or null when the bundled copy is current
let bundled = null;        // manifest shipped with the launcher
let launcherWin = null, gameWin = null, updating = false;
let launcherUpdate = null, selfUpdating = false;   // a newer launcher published on the site, if any

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; } }
function writeAtomic(file, data) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, data); fs.renameSync(tmp, file); }
function validManifest(m) {
  if (!m || typeof m !== 'object' || typeof m.version !== 'string' || !Number.isFinite(m.built) || !Array.isArray(m.files)) return false;
  if (m.files.length > MAX_FILES) return false;
  let total = 0;
  for (const f of m.files) {
    if (!f || typeof f.p !== 'string' || f.p.length > 200 || !SAFE_PATH.test(f.p) || f.p.includes('..')) return false;
    if (!Number.isInteger(f.s) || f.s < 0 || typeof f.h !== 'string' || !/^[0-9a-f]{64}$/.test(f.h)) return false;
    total += f.s;
  }
  return total <= MAX_BYTES;
}
function activeManifest() { return overlay || bundled; }
function loadState() {
  userDir = app.getPath('userData'); overlayDir = path.join(userDir, 'game'); settingsFile = path.join(userDir, 'settings.json');
  const s = readJson(settingsFile); if (s && typeof s === 'object') { settings.display = DISPLAYS.includes(s.display) ? s.display : (s.fullscreen === false ? 'windowed' : 'fullscreen'); settings.skipTitle = s.skipTitle === true; }
  bundled = readJson(path.join(bundledDir, MANIFEST)); if (!validManifest(bundled)) bundled = { version: 'dev', built: 0, files: [], notes: [] };
  const o = readJson(path.join(overlayDir, MANIFEST));
  if (validManifest(o) && o.built > bundled.built) overlay = o;
  else { overlay = null; fs.rmSync(overlayDir, { recursive: true, force: true }); }
}
function resolveGameFile(rel) {
  if (!SAFE_PATH.test(rel) || rel.includes('..')) return null;
  if (overlay && overlay.files.some(f => f.p === rel)) { const p = path.join(overlayDir, rel); if (fs.existsSync(p)) return p; }
  const p = path.join(bundledDir, rel); return fs.existsSync(p) ? p : null;
}

/* azalah://game/...            the game (downloaded update first, bundled copy otherwise)
   azalah://game/__launcher/... the launcher's own screens, same origin so they can read the save */
async function serve(request) {
  let u; try { u = new URL(request.url); } catch (e) { return new Response('Bad request', { status: 400 }); }
  if (u.host !== 'game' || (request.method !== 'GET' && request.method !== 'HEAD')) return new Response('Not found', { status: 404 });
  let rel; try { rel = decodeURIComponent(u.pathname).replace(/^\/+/, ''); } catch (e) { return new Response('Bad request', { status: 400 }); }
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  let file = null;
  if (rel.startsWith('__launcher/')) { const r = rel.slice(11); if (SAFE_PATH.test(r) && !r.includes('..')) { const o = 'launcher/ui/' + r; if (overlay && overlay.files.some(f => f.p === o) && fs.existsSync(path.join(overlayDir, o))) file = path.join(overlayDir, o); else { const p = path.join(uiDir, r); if (fs.existsSync(p)) file = p; } } }
  else file = resolveGameFile(rel);
  if (!file) return new Response('Not found', { status: 404 });
  let st; try { st = await fsp.stat(file); } catch (e) { return new Response('Not found', { status: 404 }); }
  if (!st.isFile()) return new Response('Not found', { status: 404 });
  const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  let start = 0, end = st.size - 1, status = 200;
  if (range && (range[1] || range[2]) && st.size > 0) {
    if (range[1]) { start = +range[1]; if (range[2]) end = Math.min(+range[2], st.size - 1); } else { start = Math.max(0, st.size - +range[2]); }
    if (start > end || start >= st.size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + st.size } });
    status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
  }
  headers['Content-Length'] = String(st.size ? end - start + 1 : 0);
  if (request.method === 'HEAD' || st.size === 0) return new Response(null, { status, headers });
  return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), { status, headers });
}

/* ---------- updates ---------- */
function send(ch, data) { if (launcherWin && !launcherWin.isDestroyed()) launcherWin.webContents.send(ch, data); }
async function fetchBuf(url, ms, onChunk) {
  const ac = new AbortController(); let timer = setTimeout(() => ac.abort(), ms);
  try {
    const r = await net.fetch(url, { signal: ac.signal, cache: 'no-store', redirect: 'error', credentials: 'omit' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const chunks = []; const reader = r.body.getReader();
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(Buffer.from(value)); clearTimeout(timer); timer = setTimeout(() => ac.abort(), ms); if (onChunk) onChunk(value.length); }
    return Buffer.concat(chunks);
  } finally { clearTimeout(timer); }
}
async function checkUpdate() {
  if (updating) return; updating = true;
  try {
    send('update', { phase: 'checking' });
    let remote;
    try { remote = JSON.parse((await fetchBuf(SITE + MANIFEST + '?t=' + Date.now(), 8000)).toString('utf8')); }
    catch (e) { send('update', { phase: 'offline', version: activeManifest().version }); return; }
    if (!validManifest(remote)) { send('update', { phase: 'ready', version: activeManifest().version }); return; }
    noteLauncherUpdate(remote.launcher);
    const cur = activeManifest();
    if (remote.built <= cur.built) { send('update', { phase: 'ready', version: cur.version, notes: cur.notes }); return; }
    const have = new Map(); for (const f of bundled.files) have.set(f.p, f.h);
    const haveO = new Map(); if (overlay) for (const f of overlay.files) haveO.set(f.p, f.h);
    const need = remote.files.filter(f => !(have.get(f.p) === f.h) && !(haveO.get(f.p) === f.h && fs.existsSync(path.join(overlayDir, f.p))));
    const total = need.reduce((n, f) => n + f.s, 0); let done = 0;
    send('update', { phase: 'downloading', done, total, version: remote.version });
    const stage = path.join(overlayDir, '.stage'); fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(stage, { recursive: true });
    for (const f of need) {
      const buf = await fetchBuf(SITE + f.p.split('/').map(encodeURIComponent).join('/') + '?h=' + f.h.slice(0, 12), 20000, n => { done += n; send('update', { phase: 'downloading', done: Math.min(done, total), total, version: remote.version }); });
      if (buf.length !== f.s || crypto.createHash('sha256').update(buf).digest('hex') !== f.h) throw new Error('A downloaded file did not match: ' + f.p);
      fs.writeFileSync(path.join(stage, f.h), buf);
    }
    for (const f of need) { const dest = path.join(overlayDir, f.p); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.renameSync(path.join(stage, f.h), dest); }
    fs.rmSync(stage, { recursive: true, force: true });
    // keep only files that are not identical to the bundled copy
    const m = { version: remote.version, built: remote.built, notes: Array.isArray(remote.notes) ? remote.notes.filter(x => typeof x === 'string').slice(0, 12) : [], files: remote.files.filter(f => have.get(f.p) !== f.h) };
    writeAtomic(path.join(overlayDir, MANIFEST), JSON.stringify(m));
    overlay = m;
    send('update', { phase: 'ready', version: m.version, notes: m.notes, updated: true });
  } catch (e) {
    send('update', { phase: 'failed', version: activeManifest().version, message: String(e && e.message || e).slice(0, 160) });
  } finally { updating = false; }
}

/* ---------- updating the launcher itself ---------- */
function newer(a, b) { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; }
function noteLauncherUpdate(l) {
  const okUrl = u => typeof u === 'string' && u.length < 300 && u.endsWith('.exe') && (u.startsWith(RELEASES) || (!app.isPackaged && u.startsWith(SITE)));
  if (!l || typeof l !== 'object' || typeof l.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(l.version) || !okUrl(l.url) || typeof l.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(l.sha256) || !Number.isInteger(l.size) || l.size <= 0 || l.size > MAX_BYTES) return;
  if (!newer(l.version, app.getVersion())) { launcherUpdate = null; return; }
  launcherUpdate = { version: l.version, url: l.url, sha256: l.sha256, size: l.size };
  send('launcher-update', { version: l.version, size: l.size });
}
async function selfUpdate() {
  if (!launcherUpdate || selfUpdating || updating || gameWin) return; selfUpdating = true;
  const u = launcherUpdate, dir = path.join(app.getPath('temp'), 'azalah-launcher-update'), file = path.join(dir, 'AZALAH-Launcher-Setup.exe');
  const ac = new AbortController(); let timer = setTimeout(() => ac.abort(), 30000);
  try {
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    send('self-update', { phase: 'downloading', done: 0, total: u.size });
    const r = await net.fetch(u.url, { signal: ac.signal, cache: 'no-store', credentials: 'omit' });
    if (!r.ok) throw new Error(r.status === 404 ? 'That version is not published yet.' : 'HTTP ' + r.status);
    const hash = crypto.createHash('sha256'), out = fs.createWriteStream(file), reader = r.body.getReader(); let done = 0, told = 0;
    for (;;) { const { done: end, value } = await reader.read(); if (end) break; clearTimeout(timer); timer = setTimeout(() => ac.abort(), 30000);
      const b = Buffer.from(value); hash.update(b); done += b.length; if (done > u.size) throw new Error('The download was larger than expected.');
      if (!out.write(b)) await new Promise(res => out.once('drain', res));
      if (Date.now() - told > 120) { told = Date.now(); send('self-update', { phase: 'downloading', done, total: u.size }); } }
    await new Promise((res, rej) => { out.on('error', rej); out.end(res); });
    if (done !== u.size || hash.digest('hex') !== u.sha256) { fs.rmSync(file, { force: true }); throw new Error('The download did not match its published checksum.'); }
    if (process.platform !== 'win32') { send('self-update', { phase: 'verified' }); return; }
    send('self-update', { phase: 'installing' });
    require('child_process').spawn(file, ['/S'], { detached: true, stdio: 'ignore' }).unref();   // the installer closes this app, replaces it and reopens it
    setTimeout(() => app.quit(), 600);
  } catch (e) { send('self-update', { phase: 'failed', message: String(e && e.message || e).slice(0, 160) }); }
  finally { clearTimeout(timer); selfUpdating = false; }
}

/* ---------- windows ---------- */
function lockDown(win) {
  const wc = win.webContents;
  const external = url => { try { const u = new URL(url); if (u.protocol === 'https:' || u.protocol === 'mailto:') shell.openExternal(u.toString()); } catch (e) {} };
  wc.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  wc.on('will-navigate', (ev, url) => { if (!url.startsWith('azalah://game/')) { ev.preventDefault(); external(url); } });
  wc.session.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === 'fullscreen' || perm === 'pointerLock'));
}
function openLauncher() {
  if (launcherWin && !launcherWin.isDestroyed()) { launcherWin.show(); launcherWin.focus(); return; }
  launcherWin = new BrowserWindow({ width: 1040, height: 640, resizable: false, maximizable: false, fullscreenable: false, frame: false, show: false, backgroundColor: '#0d0e16', title: 'AZALAH Launcher',
    icon: path.join(__dirname, 'ui', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false } });
  lockDown(launcherWin);
  launcherWin.once('ready-to-show', () => launcherWin.show());
  launcherWin.on('closed', () => { launcherWin = null; if (!gameWin) app.quit(); });
  launcherWin.loadURL('azalah://game/__launcher/index.html');
}
function openGame() {
  if (gameWin && !gameWin.isDestroyed()) { gameWin.show(); gameWin.focus(); return; }
  // fullscreen: takes over the screen. borderless: a frameless window the size of the screen, which stays put when you tab out. windowed: a normal resizable window.
  const mode = settings.display, area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds;
  const shape = mode === 'borderless' ? { x: area.x, y: area.y, width: area.width, height: area.height, frame: false, resizable: false, movable: false }
    : { width: Math.min(1280, area.width), height: Math.min(720, area.height), fullscreen: mode === 'fullscreen' };
  gameWin = new BrowserWindow({ ...shape, minWidth: 640, minHeight: 400, show: false, backgroundColor: '#000000', title: 'The Gallery', autoHideMenuBar: true,
    icon: path.join(__dirname, 'ui', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload-game.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } });
  lockDown(gameWin);
  gameWin.once('ready-to-show', () => { gameWin.show(); gameWin.focus(); if (launcherWin) launcherWin.hide(); });
  gameWin.on('closed', () => { gameWin = null; if (launcherWin && !launcherWin.isDestroyed()) { launcherWin.show(); launcherWin.webContents.send('game-closed'); } else app.quit(); });
  gameWin.loadURL('azalah://game/' + (settings.skipTitle ? 'gallery.html#continue' : 'index.html'));
}
const fromLauncher = ev => launcherWin && !launcherWin.isDestroyed() && ev.sender === launcherWin.webContents;
const fromGame = ev => gameWin && !gameWin.isDestroyed() && ev.sender === gameWin.webContents;
ipcMain.handle('launcher:state', ev => fromLauncher(ev) ? { launcher: app.getVersion(), game: activeManifest().version, notes: activeManifest().notes || [], settings } : null);
ipcMain.on('launcher:check', ev => { if (fromLauncher(ev)) checkUpdate(); });
ipcMain.on('launcher:play', ev => { if (fromLauncher(ev) && !updating && !selfUpdating) openGame(); });
ipcMain.on('launcher:self-update', ev => { if (fromLauncher(ev)) selfUpdate(); });
ipcMain.on('launcher:set', (ev, key, value) => { if (!fromLauncher(ev)) return; if (key === 'display' && DISPLAYS.includes(value)) settings.display = value; else if (key === 'skipTitle') settings.skipTitle = value === true; else return; try { writeAtomic(settingsFile, JSON.stringify(settings)); } catch (e) {} });
ipcMain.on('launcher:minimize', ev => { if (fromLauncher(ev)) launcherWin.minimize(); });
ipcMain.on('launcher:close', ev => { if (fromLauncher(ev)) launcherWin.close(); });
ipcMain.on('launcher:site', ev => { if (fromLauncher(ev)) shell.openExternal(SITE); });
ipcMain.on('game:quit', ev => { if (fromGame(ev)) { gameWin.close(); } });
ipcMain.on('game:fullscreen', ev => { if (fromGame(ev)) gameWin.setFullScreen(!gameWin.isFullScreen()); });

app.on('second-instance', () => { const w = gameWin || launcherWin; if (w) { if (w.isMinimized()) w.restore(); w.show(); w.focus(); } });
app.on('window-all-closed', () => app.quit());
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  loadState();
  protocol.handle('azalah', serve);
  openLauncher();
});
