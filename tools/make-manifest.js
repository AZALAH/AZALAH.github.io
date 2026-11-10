#!/usr/bin/env node
// Writes game-manifest.json: the list of game files the desktop launcher keeps in sync.
// Run from the repo root after changing the site:  node tools/make-manifest.js "What changed"
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const include = ['index.html', 'gallery.html', 'assets'];
const files = [];
function walk(rel) {
  const abs = path.join(root, rel), st = fs.statSync(abs);
  if (st.isDirectory()) { for (const n of fs.readdirSync(abs).sort()) if (!n.startsWith('.')) walk(rel + '/' + n); return; }
  files.push({ p: rel, s: st.size, h: crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex') });
}
include.forEach(walk);
const prev = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'game-manifest.json'), 'utf8')); } catch (e) { return {}; } })();
const d = new Date(), pad = n => String(n).padStart(2, '0');
const notes = process.argv.slice(2).length ? process.argv.slice(2) : (prev.notes || []);
const out = { version: `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}.${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`, built: Date.now(), notes, files };
fs.writeFileSync(path.join(root, 'game-manifest.json'), JSON.stringify(out));
console.log(`game-manifest.json: ${files.length} files, ${(files.reduce((n, f) => n + f.s, 0) / 1e6).toFixed(1)} MB, version ${out.version}`);
