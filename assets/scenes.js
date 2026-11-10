/* Animated pixel-art backdrops for the title screen and the launcher.
   Every scene is drawn in code on a 384x216 canvas: a static layer painted once, then a few moving parts each frame. */
(function () {
'use strict';
const W = 384, H = 216;
function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(x, y) { let h = (x | 0) * 374761393 + (y | 0) * 668265263; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function layer(w, h) { const c = document.createElement('canvas'); c.width = w || W; c.height = h || H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function sky(g, cols, y0, y1) {
  const h = y1 - y0, im = g.createImageData(W, h), d = im.data, C = cols.map(hex), n = C.length - 1;
  for (let y = 0; y < h; y++) { const t = y / (h - 1) * n, i = Math.min(n - 1, Math.floor(t)), f = t - i;
    for (let x = 0; x < W; x++) { const c = f > (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16 ? C[i + 1] : C[i], o = (y * W + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; } }
  g.putImageData(im, 0, y0);
}
function disc(g, cx, cy, r, c) { g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy); for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } }
function ell(g, cx, cy, rx, ry, c) { g.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy); for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + .5)) ** 2))); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); } }
function ridge(g, rand, base, amp, col, o) {
  o = o || {}; const p = [rand() * 6, rand() * 6, rand() * 6], f = [.012 + rand() * .01, .03 + rand() * .02, .085 + rand() * .05], hs = [];
  for (let x = 0; x < W; x++) { let h = base - amp * (.55 * Math.sin(x * f[0] + p[0]) + .3 * Math.sin(x * f[1] + p[1]) + .15 * Math.sin(x * f[2] + p[2])) - (o.jag || 0) * hash(x, base | 0); if (o.step) h = Math.round(h / o.step) * o.step; hs.push(Math.round(h)); }
  for (let x = 0; x < W; x++) {
    R(g, x, hs[x], 1, H - hs[x], col);
    if (o.shade) { const d = o.depth || 10, k = .5 + .5 * Math.sin(x * (o.sf || .05) + (o.sp || 0)); for (let y = 0; y < d; y++) if ((BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16 < k * (1 - y / d)) R(g, x, hs[x] + 1 + y, 1, 1, o.shade); }
    if (o.lit && x > 0 && hs[x] < hs[x - 1]) R(g, x, hs[x], 1, 2, o.lit);
    if (o.snow && hs[x] < o.line) { const th = Math.max(1, (o.line - hs[x]) * (.5 + .22 * Math.sin(x * .31) + .14 * Math.sin(x * .83 + 1))); R(g, x, hs[x], 1, th, o.snow); if (o.snow2) R(g, x, hs[x] + th * .55, 1, Math.max(1, th * .45), (x + Math.round(hs[x] + th)) % 2 ? o.snow2 : o.snow); }
  }
  return hs;
}
function stars(g, rand, n, yMax, cols) { for (let i = 0; i < n; i++) R(g, rand() * W, rand() * yMax, 1, 1, cols[Math.floor(rand() * cols.length)]); }
function cloudSprite(rand, w, col, shade) {
  const h = Math.max(8, Math.round(w * .34)), g = layer(w + 8, h + 6), n = Math.max(3, Math.round(w / 9));
  for (let i = 0; i < n; i++) { const r = Math.round(h * (.32 + rand() * .22)), x = 4 + r + (w - r * 2) * (i / (n - 1)); disc(g, x, h - r + 1 + rand() * 2, r, shade); }
  for (let i = 0; i < n; i++) { const r = Math.round(h * (.28 + rand() * .2)), x = 4 + r + (w - r * 2) * (i / (n - 1)); disc(g, x, h - r - 2 + rand() * 2, r, col); }
  g.clearRect(0, h + 1, w + 8, 6); return g.canvas;
}
function clouds(rand, n, y0, y1, col, shade, wMin, wMax) { const l = []; for (let i = 0; i < n; i++) { const w = Math.round(wMin + rand() * (wMax - wMin)); l.push({ s: cloudSprite(rand, w, col, shade), x: rand() * (W + 120), y: y0 + rand() * (y1 - y0), v: 1.2 + rand() * 2.4 }); } return l; }
function drawClouds(g, l, t, a) { if (a != null) g.globalAlpha = a; for (const c of l) { const span = W + c.s.width + 40, x = ((c.x + t * c.v) % span + span) % span - c.s.width - 20; g.drawImage(c.s, Math.round(x), Math.round(c.y)); } g.globalAlpha = 1; }
function pine(g, x, y, h, c, snow) { for (let i = 0; i < h; i++) { const w = 1 + Math.floor((i % 6) * .8 + i / 4.5); R(g, x - w, y - h + i, w * 2 + 1, 1, c); if (snow && i % 6 === 1 && i > 2) R(g, x - w, y - h + i, w + 1, 1, snow); } R(g, x, y, 1, 3, '#241810'); }
function birds(g, t, n, y0, col, seed) { g.fillStyle = col; for (let i = 0; i < n; i++) { const span = W + 120, x = Math.round(((t * (9 + hash(i, seed) * 6) + hash(i, seed + 1) * span) % span) - 60), y = Math.round(y0 + hash(i, seed + 2) * 34 + Math.sin(t * .7 + i * 2) * 3), up = Math.floor(t * 4 + i * 1.7) % 2;
    if (up) { g.fillRect(x - 2, y - 1, 1, 1); g.fillRect(x - 1, y, 1, 1); g.fillRect(x, y + 1, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x + 2, y - 1, 1, 1); } else { g.fillRect(x - 2, y, 2, 1); g.fillRect(x, y + 1, 1, 1); g.fillRect(x + 1, y, 2, 1); } } }
function shimmer(g, t, x0, x1, y0, y1, col, dens, a) { g.fillStyle = col; g.globalAlpha = a == null ? .5 : a; for (let y = y0; y < y1; y++) { const n = Math.ceil((x1 - x0) * dens), len = 2 + Math.round((y - y0) / (y1 - y0) * 5);
    for (let k = 0; k < n; k++) { const ph = hash(k, y); if (hash(k + 31, y + Math.floor(t * 1.4 + ph * 9)) > .42) continue; const x = x0 + ph * (x1 - x0) + Math.sin(t * .6 + k + y) * 2; if (x + len <= x1) g.fillRect(Math.round(x), y, len, 1); } } g.globalAlpha = 1; }
function glow(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }

const SCENES = {
  /* 1. waterfall valley */
  waterfall(rand) {
    let g = layer(); sky(g, ['#3f7fd0', '#6aa8e6', '#a6d3f2', '#dff0f4'], 0, 130);
    ridge(g, rand, 104, 20, '#8fb4d6', { jag: 2 }); ridge(g, rand, 118, 16, '#6f98b8', { jag: 2 });
    const cl = clouds(rand, 5, 8, 60, '#ffffff', '#cfe3f2', 34, 80), sk = g; g = layer();
    // cliffs either side of the falls
    const L = [], Rr = []; for (let y = 0; y < H; y++) { L.push(150 + Math.round(Math.sin(y * .07) * 5 + hash(y, 3) * 3)); Rr.push(234 + Math.round(Math.sin(y * .06 + 2) * 5 - hash(y, 4) * 3)); }
    const top = ridge(g, rand, 78, 9, '#4f8a3c', { jag: 2, lit: '#7fbf52' });
    for (let x = 0; x < W; x++) { R(g, x, top[x] + 5, 1, H, '#6d726f'); for (let y = top[x] + 5; y < 176; y += 1) { const v = hash(x >> 1, y >> 2); if (v > .78) R(g, x, y, 1, 1, '#7f8582'); else if (v < .16) R(g, x, y, 1, 1, '#555a58'); } }
    for (let y = 70; y < 176; y++) R(g, L[y], y, Rr[y] - L[y], 1, '#3d4443');
    for (let i = 0; i < 46; i++) { const x = rand() * W; if (x > 140 && x < 244) continue; pine(g, x, top[Math.floor(x)] + 2, 9 + rand() * 12, rand() > .5 ? '#2f6a35' : '#255a30'); }
    for (let i = 0; i < 60; i++) { const x = rand() * W, y = 96 + rand() * 70; if (x > 142 && x < 242) continue; ell(g, x, y, 3 + rand() * 6, 1 + rand() * 2, rand() > .5 ? '#4f8a3c' : '#3f7a34'); }
    // pool and banks
    sky(g, ['#3a8fb8', '#2a6f98', '#1f5a80'], 176, H);
    const bank = (x0, x1, c, c2) => { for (let x = x0; x < x1; x++) { const h = Math.round(8 + Math.sin(x * .05) * 4 + hash(x, 9) * 2 + Math.abs(x - (x0 + x1) / 2) * .0); R(g, x, 176 - 2, 1, h, c); R(g, x, 174, 1, 2, c2); } };
    bank(0, 132, '#3f7a34', '#6fb84a'); bank(252, W, '#3f7a34', '#6fb84a');
    for (let i = 0; i < 9; i++) { const x = i < 5 ? rand() * 120 : 262 + rand() * 116; pine(g, x, 178, 16 + rand() * 14, '#1f4a28'); }
    return { bg: sk.canvas, mid: g.canvas, back(c, t) { drawClouds(c, cl, t); birds(c, t, 4, 30, '#2a3a4a', 3); }, draw(c, t) {
      for (let y = 70; y < 178; y++) { const x0 = L[y] + 6, x1 = Rr[y] - 6; R(c, x0, y, x1 - x0, 1, '#bfe6f5');
        for (let x = x0; x < x1; x++) { const v = hash(x, Math.floor((y - t * (46 + hash(x, 1) * 30)) / 7)); if (v > .62) R(c, x, y, 1, 1, '#ffffff'); else if (v < .2) R(c, x, y, 1, 1, '#8fcbe6'); } }
      // rainbow in the spray
      const cols = ['#ff6b6b', '#ffb84d', '#fff06b', '#7be07b', '#6bb8ff', '#b98bff']; c.globalAlpha = .2 + .05 * Math.sin(t * .5);
      cols.forEach((col, i) => { c.fillStyle = col; for (let a = 3.5; a < 5.1; a += .012) c.fillRect(Math.round(270 + Math.cos(a) * (60 - i * 2)), Math.round(188 + Math.sin(a) * (60 - i * 2)), 2, 2); }); c.globalAlpha = 1;
      for (let i = 0; i < 26; i++) { const ph = (t * (.25 + hash(i, 5) * .2) + hash(i, 6)) % 1, x = 160 + hash(i, 7) * 64 + Math.sin(t + i) * 3, y = 178 - ph * 22; c.globalAlpha = (1 - ph) * .55; ell(c, x, y, 3 + ph * 7, 2 + ph * 3, '#ffffff'); } c.globalAlpha = 1;
      shimmer(c, t, 0, W, 182, H, '#bfe6f5', .05);
    } };
  },

  /* 2. city at night in the rain */
  city(rand) {
    let g = layer(); sky(g, ['#0a0d1f', '#131a36', '#22294d', '#3a3560'], 0, 150); disc(g, 300, 40, 13, '#c9cfe6'); disc(g, 295, 37, 3, '#aeb5d0'); disc(g, 304, 45, 2, '#aeb5d0');
    const cl = clouds(rand, 7, 4, 70, '#2a3154', '#1d2342', 50, 120), wins = [], reds = [], sk = g; g = layer();
    const row = (base, hMin, hMax, wMin, wMax, col, wcol, dens, far) => { let x = -rand() * 20; while (x < W) { const w = Math.round(wMin + rand() * (wMax - wMin)), h = Math.round(hMin + rand() * (hMax - hMin)), y = base - h; R(g, x, y, w, H - y, col); R(g, x, y, 1, H - y, far ? col : '#00000033');
        if (rand() > .6) { R(g, x + w / 2, y - 6 - rand() * 8, 1, 14, col); reds.push([Math.round(x + w / 2), Math.round(y - 12)]); }
        for (let wy = y + 4; wy < base - 4; wy += far ? 5 : 6) for (let wx = x + 3; wx < x + w - 3; wx += far ? 4 : 5) { if (rand() < dens) { const c = rand() > .85 ? '#9fd0ff' : wcol; R(g, wx, wy, 2, far ? 2 : 3, c); if (!far && rand() > .93) wins.push([Math.round(wx), Math.round(wy), c]); } }
        x += w + (rand() > .7 ? 2 : 0); } };
    row(150, 30, 80, 14, 30, '#1a2040', '#5a5a86', .28, true); row(168, 40, 110, 18, 38, '#12162c', '#f2c86b', .34); row(186, 20, 60, 22, 50, '#0a0c1a', '#ffd98a', .3);
    R(g, 0, 186, W, 30, '#0d1020'); R(g, 0, 186, W, 1, '#2a3050');
    for (let x = 20; x < W; x += 90) { R(g, x, 164, 1, 22, '#05060c'); R(g, x - 3, 164, 7, 1, '#05060c'); R(g, x - 3, 165, 2, 1, '#ffe2a8'); }
    const refl = layer(W, 30); refl.save(); refl.translate(0, 30); refl.scale(1, -1); refl.drawImage(g.canvas, 0, 156, W, 30, 0, 0, W, 30); refl.restore();
    return { bg: sk.canvas, mid: g.canvas, back(c, t) { drawClouds(c, cl, t * .6, .9); }, draw(c, t) {
      c.globalAlpha = .28; for (let y = 0; y < 30; y++) c.drawImage(refl.canvas, 0, y, W, 1, Math.round(Math.sin(t * 2 + y * .9) * 1.5), 186 + y, W, 1); c.globalAlpha = 1;
      for (const w of wins) if (hash(w[0] * 7 + w[1], Math.floor(t * .35 + w[0])) > .8) R(c, w[0], w[1], 2, 3, '#12162c');
      for (const r of reds) if (Math.floor(t * 1.2 + r[0] * .1) % 2) { R(c, r[0], r[1], 1, 1, '#ff4a4a'); glow(c, r[0], r[1], 5, 'rgba(255,60,60,.8)', .5); }
      for (let x = 20; x < W; x += 90) glow(c, x - 2, 168, 16, 'rgba(255,220,150,.9)', .28);
      c.fillStyle = '#9fb4e6'; for (let i = 0; i < 150; i++) { const sp = 150 + hash(i, 2) * 90, y = ((hash(i, 1) * H + t * sp) % (H + 20)) - 10, x = ((hash(i, 3) * (W + 60) - y * .28) % (W + 60) + W + 60) % (W + 60) - 30; c.globalAlpha = .25 + hash(i, 4) * .35; c.fillRect(Math.round(x), Math.round(y), 1, 4); c.fillRect(Math.round(x - 1), Math.round(y + 4), 1, 2); }
      c.globalAlpha = .7; c.fillStyle = '#cfe0ff'; for (let i = 0; i < 14; i++) { const ph = (t * 2.2 + hash(i, 8) * 5) % 1, x = Math.round(hash(i, 9 + Math.floor(t * 2.2 + hash(i, 8) * 5)) * W), y = 190 + Math.round(hash(i, 10) * 24); c.fillRect(x - Math.round(ph * 3), y, 1, 1); c.fillRect(x + Math.round(ph * 3), y, 1, 1); } c.globalAlpha = 1;
    } };
  },

  /* 3. desert at sunset */
  desert(rand) {
    const g = layer(); sky(g, ['#2a1f52', '#6a2f6a', '#c0485a', '#f08a4b', '#ffcf7a', '#ffcf7a'], 0, 180); stars(g, rand, 50, 50, ['#ffe9c9', '#c9b8ff']);
    disc(g, 192, 132, 34, '#fff1b8'); disc(g, 192, 132, 30, '#ffe08a');
    const cl = clouds(rand, 5, 30, 96, '#f6a06a', '#c8605a', 40, 100);
    ridge(g, rand, 140, 16, '#8a3a56', { step: 6 }); ridge(g, rand, 156, 18, '#6a2a48', { step: 9 });
    const d1 = ridge(g, rand, 172, 7, '#c8703a', { shade: '#a85a30', depth: 16, sf: .045 }); ridge(g, rand, 190, 8, '#a85a30', { shade: '#7a3f28', depth: 18, sf: .06, sp: 2 });
    const cactus = (x, y, h, c) => { R(g, x, y - h, 3, h, c); R(g, x - 4, y - h * .6, 2, h * .3, c); R(g, x - 4, y - h * .35, 5, 2, c); R(g, x + 5, y - h * .8, 2, h * .35, c); R(g, x + 2, y - h * .5, 5, 2, c); };
    for (let i = 0; i < 7; i++) { const x = 20 + rand() * (W - 40); cactus(x, d1[Math.floor(x)] + 4, 10 + rand() * 8, '#3a2440'); }
    cactus(58, 206, 34, '#1f1228'); cactus(330, 210, 26, '#1f1228');
    for (let i = 0; i < 30; i++) { const x = rand() * W, y = 196 + rand() * 18; R(g, x, y, 2 + rand() * 3, 1, '#7a3f28'); }
    return { bg: g.canvas, draw(c, t) {
      drawClouds(c, cl, t * .7);
      birds(c, t, 5, 70, '#3a1830', 11);
      c.globalAlpha = .1 + .03 * Math.sin(t * .8); glow(c, 192, 132, 90, 'rgba(255,220,140,1)', c.globalAlpha);
      c.fillStyle = '#ffd9a0'; for (let i = 0; i < 40; i++) { const x = ((hash(i, 1) * W + t * (10 + hash(i, 2) * 22)) % (W + 10)) - 5, y = 150 + hash(i, 3) * 60 + Math.sin(t * 1.3 + i) * 3; c.globalAlpha = .18 + hash(i, 4) * .3; c.fillRect(Math.round(x), Math.round(y), hash(i, 5) > .7 ? 2 : 1, 1); } c.globalAlpha = 1;
      const tx = ((t * 16) % (W + 200)) - 60, ty = 200 - Math.abs(Math.sin(t * 3.2)) * 5, a = t * 4; disc(c, tx, ty, 4, '#5a3424'); c.fillStyle = '#8a5a3a'; for (let k = 0; k < 5; k++) c.fillRect(Math.round(tx + Math.cos(a + k * 1.26) * 3), Math.round(ty + Math.sin(a + k * 1.26) * 3), 1, 1);
    } };
  },

  /* 4. snowy mountains */
  snow(rand) {
    const g = layer(); sky(g, ['#101a3a', '#1f2f5a', '#3b4f80', '#7f8fb8', '#c9c6d6', '#c9c6d6'], 0, 184); stars(g, rand, 90, 80, ['#ffffff', '#b8c8ff', '#8fa0d8']);
    ridge(g, rand, 108, 30, '#5a6a98', { jag: 2, snow: '#e8eefc', snow2: '#b8c4e6', line: 106 });
    ridge(g, rand, 132, 26, '#3f4f7c', { jag: 2, snow: '#dfe8fb', snow2: '#a8b6dc', line: 128 });
    const hill = ridge(g, rand, 168, 8, '#dfe8fb', { shade: '#b8c8ea', depth: 22, sf: .04 });
    for (let i = 0; i < 70; i++) { const x = rand() * W; if (x > 236 && x < 286) continue; pine(g, x, hill[Math.floor(x)] + 1 + rand() * 4, 10 + rand() * 14, '#1c2c44', '#e8eefc'); }
    ridge(g, rand, 196, 5, '#f2f6ff', { shade: '#c8d4ee', depth: 16, sf: .07, sp: 1 });
    // cabin
    const cx = 250, cy = 178; R(g, cx, cy, 26, 14, '#4a2e22'); for (let i = 0; i < 4; i++) R(g, cx, cy + 2 + i * 3, 26, 1, '#3a2218'); for (let i = 0; i < 9; i++) R(g, cx - 3 + i, cy - 1 - i, 32 - i * 2, 1, i < 2 ? '#f2f6ff' : '#e0e8fa'); R(g, cx + 19, cy - 12, 4, 8, '#5a3a2c'); R(g, cx + 18, cy - 13, 6, 2, '#f2f6ff'); R(g, cx + 11, cy + 5, 5, 9, '#2a1810');
    for (let i = 0; i < 6; i++) pine(g, 20 + i * 70 + rand() * 20, 214, 30 + rand() * 16, '#0f1a2c', '#dfe8fb');
    return { bg: g.canvas, draw(c, t) {
      // aurora
      for (let x = 0; x < W; x += 2) { const y = 34 + Math.sin(x * .03 + t * .25) * 10 + Math.sin(x * .011 - t * .13) * 12, h = 16 + Math.sin(x * .07 + t * .6) * 8; c.globalAlpha = .1 + .07 * Math.sin(x * .05 + t * .4); c.fillStyle = '#6dffb0'; c.fillRect(x, Math.round(y), 2, Math.round(h)); c.globalAlpha *= .6; c.fillStyle = '#7fb8ff'; c.fillRect(x, Math.round(y + h), 2, 6); } c.globalAlpha = 1;
      const fl = hash(Math.floor(t * 7), 3) > .7 ? .85 : 1; R(c, 254, 183, 5, 5, '#ffcf6a'); R(c, 256, 183, 1, 5, '#7a4a20'); glow(c, 256, 186, 20, 'rgba(255,200,110,1)', .32 * fl);
      for (let i = 0; i < 7; i++) { const ph = (t * .22 + i / 7) % 1; c.globalAlpha = (1 - ph) * .5; ell(c, 271 + Math.sin(ph * 5 + i) * 3 + ph * 12, 164 - ph * 40, 2 + ph * 4, 1 + ph * 3, '#c8d0e6'); } c.globalAlpha = 1;
      c.fillStyle = '#ffffff'; for (let i = 0; i < 170; i++) { const big = i % 4 === 0, sp = big ? 22 + hash(i, 2) * 12 : 10 + hash(i, 2) * 8, y = (hash(i, 1) * H + t * sp) % H, x = ((hash(i, 3) * W + Math.sin(t * .8 + i) * (big ? 7 : 4) + t * 5) % W + W) % W; c.globalAlpha = big ? .9 : .55; c.fillRect(Math.round(x), Math.round(y), big ? 2 : 1, big ? 2 : 1); } c.globalAlpha = 1;
    } };
  },

  /* 5. ocean cliff and lighthouse */
  ocean(rand) {
    let g = layer(); const hz = 128; sky(g, ['#141a3c', '#2a2f62', '#5a4680', '#a8607e', '#f09a78'], 0, hz); stars(g, rand, 70, 60, ['#ffffff', '#c8c0ff']);
    disc(g, 96, 44, 12, '#fff3d0'); disc(g, 91, 40, 3, '#e6d8b0');
    const cl = clouds(rand, 5, 40, 100, '#7a5a8a', '#4a3a6a', 40, 110);
    sky(g, ['#3a4a86', '#243566', '#162448', '#0c1630'], hz, H); const sk = g; g = layer();
    // headland
    const top = []; for (let x = 0; x < W; x++) top.push(x < 236 ? H : Math.round(118 - Math.min(26, (x - 236) * .7) - Math.sin(x * .05) * 3 + hash(x, 2) * 2));
    for (let x = 228; x < W; x++) { for (let y = top[Math.max(236, x)]; y < H; y++) { const cut = 236 + Math.round(Math.sin(y * .09) * 6 + (H - y) * .12 + hash(y, 5) * 2) - (y > 150 ? 0 : 0); if (x < cut - (y < 120 ? 0 : 10)) continue; R(g, x, y, 1, 1, hash(x >> 1, y >> 1) > .8 ? '#3a3350' : hash(x >> 2, y >> 2) < .12 ? '#221c30' : '#2a2438'); } if (x >= 236) R(g, x, top[x], 1, 3, x % 5 ? '#3f6a3a' : '#5a8a4a'); }
    const lx = 318, ly = 46; R(g, lx - 6, 90, 12, 6, '#d8d0c8'); for (let y = ly + 10; y < 92; y++) { const w = 4 + (y - ly) * .07; R(g, lx - w, y, w * 2, 1, Math.floor((y - ly) / 9) % 2 ? '#c8424a' : '#f0ebe4'); R(g, lx + w - 2, y, 2, 1, '#00000030'); }
    R(g, lx - 6, ly + 8, 12, 2, '#2a2438'); R(g, lx - 4, ly, 8, 8, '#3a3350'); R(g, lx - 3, ly + 1, 6, 6, '#ffe9a0'); R(g, lx - 5, ly - 2, 10, 2, '#2a2438'); R(g, lx - 2, ly - 5, 4, 3, '#2a2438');
    R(g, 276, 84, 16, 9, '#e6dfd6'); for (let i = 0; i < 6; i++) R(g, 274 + i, 84 - i, 20 - i * 2, 1, '#8a3a3a'); R(g, 281, 87, 3, 3, '#ffd98a');
    return { bg: sk.canvas, mid: g.canvas, back(c, t) { drawClouds(c, cl, t * .6); }, draw(c, t) {
      const a = t * .55, cx = Math.cos(a), sx = Math.sin(a);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const d of [1, -1]) { const k = cx * d, len = 260 * Math.abs(k), sp = 5 + 26 * Math.abs(k); if (len < 12) continue; const gr = c.createLinearGradient(lx, 0, lx + Math.sign(k) * len, 0); gr.addColorStop(0, 'rgba(255,236,170,.34)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(lx, ly + 3); c.lineTo(lx + Math.sign(k) * len, ly + 4 - sp); c.lineTo(lx + Math.sign(k) * len, ly + 4 + sp); c.fill(); }
      glow(c, lx, ly + 4, 10 + Math.abs(sx) * 16, 'rgba(255,240,180,1)', .35 + Math.abs(sx) * .4); c.restore();
      for (let y = hz + 2; y < H; y += 1) { const w = 3 + (y - hz) * .14; if (hash(y, Math.floor(t * 2 + y * .3)) > .35) { c.globalAlpha = .5 - (y - hz) * .003; R(c, 96 - w + Math.sin(t * 1.5 + y * .7) * 2, y, w * 2, 1, '#ffe9c0'); } } c.globalAlpha = 1;
      shimmer(c, t, 0, 236, hz + 1, H, '#8fa8e6', .035, .45);
      for (let i = 0; i < 4; i++) { const ph = (t * .12 + i * .25) % 1, y = hz + 8 + ph * 78; c.globalAlpha = Math.sin(ph * Math.PI) * .5; for (let x = 0; x < 232; x += 3) { const yy = y + Math.sin(x * .05 + t + i * 2) * 2; c.fillStyle = '#dfe8ff'; c.fillRect(x, Math.round(yy), 2, 1); } } c.globalAlpha = 1;
      for (let y = 132; y < H; y += 3) { const cut = 226 + Math.round(Math.sin(y * .09) * 6 + (H - y) * .12), s = Math.sin(t * 1.6 + y * .4); c.globalAlpha = .5 + s * .3; R(c, cut - 5 - s * 3, y, 5 + s * 3, 2, '#f2f6ff'); } c.globalAlpha = 1;
      birds(c, t, 3, 70, '#f0ebe4', 21);
    } };
  },

  /* 6. forest with fireflies */
  forest(rand) {
    const g = layer(); sky(g, ['#061018', '#0c2028', '#143838', '#1f5048'], 0, 170); R(g, 0, 170, W, 46, '#0c2a22'); stars(g, rand, 40, 60, ['#d8ffe8', '#9fd8c0']);
    disc(g, 250, 52, 16, '#eaffdc'); disc(g, 244, 47, 4, '#cfe8c0');
    const trees = (n, col, wMin, wMax, canopy) => { for (let i = 0; i < n; i++) { const x = (i + rand() * .8) * (W / n), w = wMin + rand() * (wMax - wMin); R(g, x, 0, w, H, col); R(g, x + w, 60 + rand() * 60, 8 + rand() * 12, 2, col); R(g, x - 10 - rand() * 8, 40 + rand() * 70, 12 + rand() * 8, 2, col); for (let k = 0; k < canopy; k++) ell(g, x + w / 2 + (rand() - .5) * 60, rand() * 46, 12 + rand() * 18, 6 + rand() * 9, col); } };
    trees(11, '#103030', 3, 6, 5); const shafts = [200, 232, 268, 300].map(x => [x, 10 + rand() * 12]);
    trees(7, '#0a2020', 6, 11, 6);
    const gr = ridge(g, rand, 182, 5, '#0c2a22', { lit: '#1f4a38' });
    // pond
    ell(g, 150, 198, 70, 9, '#143c48'); ell(g, 150, 197, 64, 7, '#1c5060'); ell(g, 164, 196, 14, 2, '#c8e8c8');
    for (let i = 0; i < 50; i++) { const x = rand() * W, y = 184 + rand() * 30; if (Math.abs(x - 150) < 72 && Math.abs(y - 198) < 10) continue; ell(g, x, y, 3 + rand() * 5, 1 + rand() * 2, rand() > .5 ? '#123a2a' : '#0a2a1e'); }
    for (let i = 0; i < 12; i++) { const x = rand() * W, y = 186 + rand() * 26; R(g, x, y - 3, 1, 3, '#2a5a3a'); R(g, x - 1, y - 4, 3, 2, rand() > .5 ? '#e87a9a' : '#f0e08a'); }
    const fg = layer(); for (const x of [-6, 70, 356]) { const w = 22 + rand() * 10; R(fg, x, 0, w, H, '#040c0c'); for (let y = 0; y < H; y += 5) R(fg, x + 3 + hash(y, x) * (w - 8), y, 2, 4, '#0a1818'); ell(fg, x + w / 2, 0, 60, 26, '#040c0c'); }
    for (let x = 0; x < W; x += 2) { const h = 4 + hash(x, 3) * 9; R(fg, x, H - h, 1, h, '#061410'); }
    const owl = [86, 74]; R(g, owl[0] - 3, owl[1] - 4, 7, 9, '#1a2a2a'); R(g, owl[0] - 3, owl[1] - 5, 2, 1, '#1a2a2a'); R(g, owl[0] + 2, owl[1] - 5, 2, 1, '#1a2a2a');
    return { bg: g.canvas, fg: fg.canvas, draw(c, t) {
      c.save(); c.globalCompositeOperation = 'lighter'; for (const s of shafts) { c.globalAlpha = .05 + .025 * Math.sin(t * .4 + s[0]); c.fillStyle = '#d8ffd0'; c.beginPath(); c.moveTo(s[0], 0); c.lineTo(s[0] + s[1], 0); c.lineTo(s[0] - 70 + s[1] * 2, 190); c.lineTo(s[0] - 96, 190); c.fill(); } c.restore(); c.globalAlpha = 1;
      if ((t % 6) > .18) { R(c, owl[0] - 2, owl[1] - 2, 2, 2, '#ffe36b'); R(c, owl[0] + 1, owl[1] - 2, 2, 2, '#ffe36b'); R(c, owl[0] - 1 + Math.round(Math.sin(t * .5)), owl[1] - 2, 1, 2, '#1a1a10'); R(c, owl[0] + 2 + Math.round(Math.sin(t * .5)), owl[1] - 2, 1, 2, '#1a1a10'); }
      shimmer(c, t, 88, 212, 192, 204, '#c8e8c8', .04, .4);
      for (let i = 0; i < 3; i++) { const ph = (t * .2 + i * .33) % 1; c.globalAlpha = (1 - ph) * .4; c.strokeStyle = '#9fd8c0'; c.lineWidth = 1; c.beginPath(); c.ellipse(120 + i * 30, 198, 4 + ph * 14, 1 + ph * 3, 0, 0, 6.3); c.stroke(); } c.globalAlpha = 1;
      for (let i = 0; i < 46; i++) { const x = 20 + hash(i, 1) * (W - 40) + Math.sin(t * .31 + i * 1.7) * 18 + Math.sin(t * .13 + i) * 22, y = 90 + hash(i, 2) * 110 + Math.sin(t * .27 + i * 2.3) * 12 + Math.cos(t * .17 + i) * 8, a = Math.max(0, Math.sin(t * (1 + hash(i, 3)) + i * 2.1)); if (a < .05) continue;
        glow(c, x, y, 5, 'rgba(210,255,120,1)', a * .55); c.globalAlpha = a; R(c, x, y, 1, 1, '#f4ffb0'); c.globalAlpha = 1; }
    } };
  },

  /* 7. cherry blossom garden */
  cherry(rand) {
    const g = layer(); sky(g, ['#7fb0e0', '#b8c8ee', '#f0c8dc', '#ffe0d0', '#fff0e0'], 0, 140);
    const cl = clouds(rand, 4, 10, 56, '#ffffff', '#f6d8e4', 40, 90);
    // far mountain with a snow cap
    for (let x = 60; x < 250; x++) { const d = Math.abs(x - 155), y = Math.round(58 + Math.pow(d, 1.25) * .32 + hash(x, 3) * 1.5); R(g, x, y, 1, 140 - y, '#8f9fd0'); if (y < 82) R(g, x, y, 1, Math.max(1, (82 - y) * (.5 + .4 * hash(x, 8))), '#ffffff'); }
    ridge(g, rand, 126, 8, '#a8c8b0', { jag: 1 }); const hill = ridge(g, rand, 142, 7, '#7fb87a', { lit: '#a8d890' });
    const blossom = (cx, cy, rx, ry, n, cols) => { for (let i = 0; i < n; i++) { const a = rand() * 6.28, d = Math.sqrt(rand()); ell(g, cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, 4 + rand() * 6, 3 + rand() * 4, cols[i < n * .35 ? 0 : i < n * .75 ? 1 : 2]); } for (let i = 0; i < n * 1.5; i++) { const a = rand() * 6.28, d = Math.sqrt(rand()); R(g, cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry - 2, 2, 1, cols[3]); } };
    const PINK = ['#d86a9a', '#f29ac0', '#ffc4dc', '#ffeaf2'];
    for (let i = 0; i < 9; i++) { const x = 10 + i * 44 + rand() * 20, y = hill[Math.floor(Math.min(W - 1, x))] + 2; R(g, x, y - 12, 2, 12, '#5a3a40'); blossom(x, y - 16, 12, 7, 10, PINK); }
    // lawn and pond
    sky(g, ['#7fb87a', '#6aa868', '#4f8f56'], 150, H); for (let i = 0; i < 260; i++) R(g, rand() * W, 152 + rand() * 62, 1, 1, rand() > .5 ? '#8fc888' : '#3f7f4a');
    const pond = (y) => { const k = (y - 172) / 30; return [Math.round(96 - Math.sin(k * 3.1) * 20 - k * 26), Math.round(292 + Math.sin(k * 3.1) * 16 + k * 30)]; };
    for (let y = 172; y < 204; y++) { const [a, b] = pond(y); R(g, a - 2, y, b - a + 4, 1, '#c8b890'); R(g, a, y, b - a, 1, y < 178 ? '#8fc0d8' : y < 190 ? '#78aecc' : '#6a9ec0'); }
    for (let i = 0; i < 16; i++) { const y = 172 + Math.floor(rand() * 30), [a, b] = pond(y), x = rand() > .5 ? a - 4 : b + 1; ell(g, x + 1, y, 3, 2, rand() > .5 ? '#8a8a90' : '#a0a0a6'); }
    // arched bridge
    for (let x = 150; x <= 236; x++) { const k = (x - 193) / 43, y = Math.round(180 - (1 - k * k) * 14); R(g, x, y, 1, 4, '#c0343c'); R(g, x, y, 1, 1, '#e85a5a'); R(g, x, y - 7, 1, 1, '#a82830'); if ((x - 150) % 9 === 0) R(g, x, y - 7, 1, 7, '#a82830'); R(g, x, y + 4, 1, 1, '#7a2028'); }
    R(g, 150, 170, 2, 14, '#8a2028'); R(g, 235, 170, 2, 14, '#8a2028');
    // stone lantern
    const lx = 62, ly = 186; R(g, lx - 4, ly, 9, 2, '#8a8a90'); R(g, lx - 1, ly - 9, 3, 9, '#9a9aa0'); R(g, lx - 4, ly - 15, 9, 6, '#8a8a90'); R(g, lx - 2, ly - 13, 5, 3, '#ffd98a'); for (let i = 0; i < 4; i++) R(g, lx - 6 + i, ly - 16 - i, 13 - i * 2, 1, '#6f6f76'); R(g, lx, ly - 21, 1, 2, '#6f6f76');
    // foreground trees
    const fg = layer(), trunk = (x, y, h, lean) => { for (let i = 0; i < h; i++) { const w = 3 + (h - i) * .09, xx = x + Math.sin(i * .05) * lean - w / 2 + i * lean * .02; R(g, xx, y - i, w, 1, i % 7 < 2 ? '#4a2a34' : '#3a2028'); R(g, xx, y - i, 1, 1, '#6a4048'); } };
    const big = [[40, 212, 78, 6], [338, 214, 84, -7], [262, 168, 34, 3]]; for (const [x, y, h, l] of big) { trunk(x, y, h, l); const tx = x + Math.sin(h * .05) * l + h * l * .02; R(g, tx - 14, y - h + 8, 16, 2, '#3a2028'); R(g, tx + 2, y - h + 14, 18, 2, '#3a2028'); blossom(tx, y - h - 2, h * .62, h * .3, Math.round(h * .9), PINK); blossom(tx - h * .4, y - h + 12, h * .3, h * .16, Math.round(h * .3), PINK); blossom(tx + h * .45, y - h + 16, h * .3, h * .16, Math.round(h * .3), PINK); }
    const floaters = []; for (let i = 0; i < 26; i++) { const y = 174 + Math.floor(rand() * 28), [a, b] = pond(y); floaters.push([a + 4 + rand() * (b - a - 8), y, rand() * 6]); }
    return { bg: g.canvas, draw(c, t) {
      drawClouds(c, cl, t * .8);
      birds(c, t, 3, 40, '#5a5a80', 31);
      for (let y = 172; y < 204; y += 1) { const [a, b] = pond(y); shimmer(c, t, a + 2, b - 2, y, y + 1, '#ffffff', .03, .45); }
      for (const f of floaters) R(c, f[0] + Math.sin(t * .4 + f[2]) * 2, f[1], 2, 1, '#ffc4dc');
      for (let i = 0; i < 2; i++) { const ph = (t * .08 + i * .5) % 1, kx = 130 + i * 90 + Math.sin(t * .3 + i * 2) * 26, ky = 190 + Math.cos(t * .23 + i) * 6; R(c, kx, ky, 5, 2, i ? '#f08a3a' : '#f2f2f2'); R(c, kx + (Math.cos(t * .3 + i * 2) > 0 ? -2 : 5), ky, 2, 1 + Math.floor(t * 3 + i) % 2, i ? '#c86a2a' : '#e85a4a'); }
      glow(c, 62, 174, 12, 'rgba(255,217,138,1)', .3 + .05 * Math.sin(t * 3));
      for (let i = 0; i < 90; i++) { const sp = 9 + hash(i, 2) * 12, y = (hash(i, 1) * (H + 20) + t * sp) % (H + 20) - 10, x = ((hash(i, 3) * (W + 40) + Math.sin(t * .9 + i * 1.3) * 12 + t * (6 + hash(i, 5) * 8)) % (W + 40)) - 20, fl = Math.floor(t * 3 + i) % 3;
        c.fillStyle = PINK[1 + i % 3]; c.globalAlpha = .9; if (fl === 0) c.fillRect(Math.round(x), Math.round(y), 2, 1); else if (fl === 1) c.fillRect(Math.round(x), Math.round(y), 1, 2); else { c.fillRect(Math.round(x), Math.round(y), 1, 1); c.fillRect(Math.round(x + 1), Math.round(y + 1), 1, 1); } } c.globalAlpha = 1;
    } };
  }
};

const NAMES = Object.keys(SCENES);
const TITLES = { waterfall: 'Waterfall valley', city: 'City rain', desert: 'Desert sunset', snow: 'Snowy mountains', ocean: 'Lighthouse', forest: 'Firefly forest', cherry: 'Cherry blossom garden' };
function pick(want) {
  if (want && SCENES[want]) return want;
  let last = null; try { last = localStorage.getItem('azalah-scene'); } catch (e) {}
  const pool = NAMES.filter(n => n !== last), name = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem('azalah-scene', name); } catch (e) {}
  return name;
}
function start(canvas, opts) {
  opts = opts || {}; canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
  const still = opts.still || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let name = pick(opts.scene), sc = SCENES[name](rng(NAMES.indexOf(name) * 977 + 13)), raf = 0, last = 0, t0 = performance.now(), stopped = false;
  function frame(now) {
    if (stopped) return; raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 33) return; last = now; paint((now - t0) / 1000);
  }
  function paint(t) { g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(sc.bg, 0, 0); if (sc.back) sc.back(g, t); if (sc.mid) g.drawImage(sc.mid, 0, 0); sc.draw(g, t); if (sc.fg) g.drawImage(sc.fg, 0, 0); }
  paint(still ? 7 : 0); if (!still) raf = requestAnimationFrame(frame);
  return { get name() { return name; }, get title() { return TITLES[name]; },
    set(n) { if (!SCENES[n]) return; name = n; sc = SCENES[n](rng(NAMES.indexOf(n) * 977 + 13)); paint(still ? 7 : (performance.now() - t0) / 1000); },
    stop() { stopped = true; cancelAnimationFrame(raf); } };
}
window.AZScenes = { names: NAMES, titles: TITLES, start };
})();
