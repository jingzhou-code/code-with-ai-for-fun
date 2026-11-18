import * as THREE from 'three';
import { createSeededRandom } from './noise.js';

const textureCache = new Map();

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function finalizeTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function getTimberTextures(variant = 'hinoki') {
  const key = `timber:${variant}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(variant === 'sumi' ? 1101 : variant === 'engawa' ? 2202 : 3303);
  const w = 512;
  const h = 512;
  const colCanvas = makeCanvas(w, h);
  const bumpCanvas = makeCanvas(w, h);
  const ctx = colCanvas.getContext('2d');
  const bctx = bumpCanvas.getContext('2d');

  const palettes = {
    sumi: { base: '#1e1c1b', dark: '#111010', light: '#312d2a' },
    hinoki: { base: '#4a3323', dark: '#2d1d12', light: '#674933' },
    redwood: { base: '#5d2d20', dark: '#391810', light: '#7a3f2d' },
    engawa: { base: '#6b4c33', dark: '#422d1c', light: '#876345' }
  };
  const pal = palettes[variant] || palettes.hinoki;

  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, w, h);

  // Fine longitudinal wood grain fibers
  for (let i = 0; i < 900; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const len = 40 + rng() * 220;
    const thick = 0.6 + rng() * 2.2;
    const isDark = rng() > 0.45;
    ctx.strokeStyle = isDark ? pal.dark : pal.light;
    ctx.globalAlpha = 0.12 + rng() * 0.22;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + (rng() - 0.5) * 6,
      y + len * 0.33,
      x + (rng() - 0.5) * 6,
      y + len * 0.66,
      x + (rng() - 0.5) * 4,
      y + len
    );
    ctx.stroke();

    bctx.strokeStyle = isDark ? '#585858' : '#a8a8a8';
    bctx.globalAlpha = 0.22;
    bctx.lineWidth = thick;
    ctx.stroke();
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x, y + len);
    bctx.stroke();
  }
  ctx.globalAlpha = 1;
  bctx.globalAlpha = 1;

  if (variant === 'engawa') {
    const planks = 8;
    const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,235,210,0.03)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(i * pw, 0, pw, h);
      ctx.strokeStyle = 'rgba(20,10,5,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i * pw, 0);
      ctx.lineTo(i * pw, h);
      ctx.stroke();

      bctx.strokeStyle = '#181818';
      bctx.lineWidth = 3;
      bctx.beginPath();
      bctx.moveTo(i * pw, 0);
      bctx.lineTo(i * pw, h);
      bctx.stroke();
    }
  }

  const res = {
    map: finalizeTexture(colCanvas, { repeatX: 2, repeatY: 2 }),
    bumpMap: finalizeTexture(bumpCanvas, { repeatX: 2, repeatY: 2, srgb: false })
  };
  textureCache.set(key, res);
  return res;
}

export function getKawaraTileTextures() {
  const key = 'kawara';
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(4404);
  const w = 512;
  const h = 512;
  const col = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const ctx = col.getContext('2d');
  const bctx = bump.getContext('2d');

  ctx.fillStyle = '#2b2f34';
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = '#606060';
  bctx.fillRect(0, 0, w, h);

  const cols = 12;
  const rows = 14;
  const cw = w / cols;
  const rh = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * rh;
      // Flat pan tile (hiragawara)
      const shade = 38 + Math.floor((rng() - 0.5) * 12);
      const grad = ctx.createLinearGradient(x, y, x + cw, y + rh);
      grad.addColorStop(0, `rgb(${shade + 8}, ${shade + 11}, ${shade + 15})`);
      grad.addColorStop(0.6, `rgb(${shade}, ${shade + 3}, ${shade + 6})`);
      grad.addColorStop(1, `rgb(${shade - 10}, ${shade - 8}, ${shade - 5})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, cw, rh);

      // Subtle weathered moss/lichen speck on old Kyoto tiles
      if (rng() > 0.76) {
        ctx.fillStyle = `rgba(76, 98, 52, ${0.12 + rng() * 0.16})`;
        ctx.beginPath();
        ctx.arc(x + cw * (0.2 + rng() * 0.6), y + rh * 0.7, 3 + rng() * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Overlap shadow at bottom of tile row
      ctx.fillStyle = 'rgba(8, 10, 12, 0.55)';
      ctx.fillRect(x, y + rh - 3, cw, 3);

      // Bump height for curved tile valley & ridge
      const bgrad = bctx.createLinearGradient(x, y, x + cw, y);
      bgrad.addColorStop(0, '#c8c8c8');
      bgrad.addColorStop(0.2, '#787878');
      bgrad.addColorStop(0.5, '#585858');
      bgrad.addColorStop(0.8, '#787878');
      bgrad.addColorStop(1, '#c8c8c8');
      bctx.fillStyle = bgrad;
      bctx.fillRect(x, y, cw, rh - 2);
      bctx.fillStyle = '#202020';
      bctx.fillRect(x, y + rh - 3, cw, 3);

      // Round ridge roll (marugawara seam)
      const rgrad = ctx.createLinearGradient(x - 4, y, x + 5, y);
      rgrad.addColorStop(0, '#1c1f23');
      rgrad.addColorStop(0.45, '#535962');
      rgrad.addColorStop(1, '#1e2126');
      ctx.fillStyle = rgrad;
      ctx.fillRect(x - 3, y, 7, rh);
    }
  }

  const res = {
    map: finalizeTexture(col, { repeatX: 4, repeatY: 4 }),
    bumpMap: finalizeTexture(bump, { repeatX: 4, repeatY: 4, srgb: false })
  };
  textureCache.set(key, res);
  return res;
}

export function getKayabukiThatchTextures() {
  // Authentic mossy reed thatch for Jōjakkō-ji's 14th-century Niōmon Gate
  const key = 'kayabuki';
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(1345);
  const w = 512;
  const h = 512;
  const col = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const ctx = col.getContext('2d');
  const bctx = bump.getContext('2d');

  ctx.fillStyle = '#5a4c3b';
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = '#707070';
  bctx.fillRect(0, 0, w, h);

  // Horizontal thatch bundle tiers
  const tiers = 18;
  for (let t = 0; t < tiers; t++) {
    const y = (t / tiers) * h;
    ctx.fillStyle = t % 2 === 0 ? 'rgba(30,22,14,0.28)' : 'rgba(120,104,80,0.16)';
    ctx.fillRect(0, y, w, h / tiers);
  }

  // Thousands of dense reed stalks
  for (let i = 0; i < 4200; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const len = 14 + rng() * 34;
    const tone = rng();
    if (tone < 0.35) ctx.strokeStyle = 'rgba(54, 44, 32, 0.65)';
    else if (tone < 0.75) ctx.strokeStyle = 'rgba(112, 96, 73, 0.55)';
    else ctx.strokeStyle = 'rgba(142, 124, 96, 0.42)';

    ctx.lineWidth = 0.8 + rng() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 4, y + len);
    ctx.stroke();

    bctx.strokeStyle = tone > 0.5 ? '#c4c4c4' : '#3a3a3a';
    bctx.lineWidth = 1.1;
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + (rng() - 0.5) * 3, y + len);
    bctx.stroke();
  }

  // Velvety Kyoto moss colonies growing naturally on weathered thatch
  for (let m = 0; m < 55; m++) {
    const mx = rng() * w;
    const my = rng() * h;
    const rx = 14 + rng() * 44;
    const ry = 8 + rng() * 24;
    const g = ctx.createRadialGradient(mx, my, 2, mx, my, rx);
    g.addColorStop(0, `rgba(62, 98, 38, ${0.42 + rng() * 0.32})`);
    g.addColorStop(0.55, `rgba(78, 112, 44, ${0.22 + rng() * 0.2})`);
    g.addColorStop(1, 'rgba(62, 98, 38, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(mx, my, rx, ry, (rng() - 0.5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const res = {
    map: finalizeTexture(col, { repeatX: 3, repeatY: 2 }),
    bumpMap: finalizeTexture(bump, { repeatX: 3, repeatY: 2, srgb: false })
  };
  textureCache.set(key, res);
  return res;
}

export function getHiwadabukiTextures() {
  // Authentic layered cypress-bark roof (檜皮葺) for Important Cultural Property Tahōtō
  const key = 'hiwadabuki';
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(1620);
  const w = 512;
  const h = 512;
  const col = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const ctx = col.getContext('2d');
  const bctx = bump.getContext('2d');

  ctx.fillStyle = '#4c3629';
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, w, h);

  // Fine horizontal bark laminations + subtle vertical fiber grain
  const layers = 64;
  const lh = h / layers;
  for (let i = 0; i < layers; i++) {
    const y = i * lh;
    const v = Math.floor((rng() - 0.5) * 14);
    ctx.fillStyle = `rgb(${76 + v}, ${54 + v}, ${41 + v})`;
    ctx.fillRect(0, y, w, lh - 1);
    ctx.fillStyle = 'rgba(24, 14, 9, 0.55)';
    ctx.fillRect(0, y + lh - 1.4, w, 1.4);

    bctx.fillStyle = i % 2 === 0 ? '#9c9c9c' : '#747474';
    bctx.fillRect(0, y, w, lh - 1);
    bctx.fillStyle = '#303030';
    bctx.fillRect(0, y + lh - 1.5, w, 1.5);
  }

  for (let i = 0; i < 1600; i++) {
    const x = rng() * w;
    const y = rng() * h;
    ctx.strokeStyle = rng() > 0.5 ? 'rgba(110,82,62,0.18)' : 'rgba(32,20,14,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 8 + rng() * 18);
    ctx.stroke();
  }

  const res = {
    map: finalizeTexture(col, { repeatX: 3, repeatY: 3 }),
    bumpMap: finalizeTexture(bump, { repeatX: 3, repeatY: 3, srgb: false })
  };
  textureCache.set(key, res);
  return res;
}

export function getStoneWallTextures(repeatX = 3, repeatY = 1.5) {
  const key = `stonewall:${repeatX}:${repeatY}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(5505);
  const w = 512;
  const h = 512;
  const col = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const ctx = col.getContext('2d');
  const bctx = bump.getContext('2d');

  // Deep mossy mortar background
  ctx.fillStyle = '#2d3327';
  ctx.fillRect(0, 0, w, h);
  bctx.fillStyle = '#1e1e1e';
  bctx.fillRect(0, 0, w, h);

  const rows = 7;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * -32;
    while (x < w) {
      const sw = 54 + rng() * 58;
      const sh = rh - 6;
      const cx = x + sw * 0.5;
      const cy = r * rh + rh * 0.5;

      // Irregular polygonal fieldstone (Nozura-zumi)
      const pts = [];
      const sides = 7;
      for (let s = 0; s < sides; s++) {
        const ang = (s / sides) * Math.PI * 2;
        const radX = sw * (0.42 + rng() * 0.12);
        const radY = sh * (0.42 + rng() * 0.14);
        pts.push([cx + Math.cos(ang) * radX, cy + Math.sin(ang) * radY]);
      }

      const baseGray = 88 + Math.floor(rng() * 38);
      const warm = Math.floor((rng() - 0.4) * 12);
      const g = ctx.createRadialGradient(cx - sw * 0.12, cy - sh * 0.15, 4, cx, cy, sw * 0.6);
      g.addColorStop(0, `rgb(${baseGray + 18 + warm}, ${baseGray + 17}, ${baseGray + 12})`);
      g.addColorStop(1, `rgb(${baseGray - 18 + warm}, ${baseGray - 16}, ${baseGray - 18})`);

      ctx.beginPath();
      pts.forEach(([px, py], idx) => (idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(26, 32, 20, 0.8)';
      ctx.stroke();

      // Moss hugging stone edges
      if (rng() > 0.35) {
        ctx.fillStyle = `rgba(62, 96, 40, ${0.22 + rng() * 0.28})`;
        ctx.fill();
      }

      const bg = bctx.createRadialGradient(cx, cy, 4, cx, cy, sw * 0.55);
      bg.addColorStop(0, '#e2e2e2');
      bg.addColorStop(0.75, '#a8a8a8');
      bg.addColorStop(1, '#383838');
      bctx.beginPath();
      pts.forEach(([px, py], idx) => (idx === 0 ? bctx.moveTo(px, py) : bctx.lineTo(px, py)));
      bctx.closePath();
      bctx.fillStyle = bg;
      bctx.fill();

      x += sw + 3;
    }
  }

  const res = {
    map: finalizeTexture(col, { repeatX, repeatY }),
    bumpMap: finalizeTexture(bump, { repeatX, repeatY, srgb: false })
  };
  textureCache.set(key, res);
  return res;
}

export function getShikkuiPlasterTexture() {
  const key = 'shikkui';
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(6606);
  const w = 256;
  const h = 256;
  const col = makeCanvas(w, h);
  const ctx = col.getContext('2d');
  ctx.fillStyle = '#ece6da';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 400; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 8 + rng() * 28;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(220,210,194,0.16)' : 'rgba(250,247,240,0.16)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = finalizeTexture(col, { repeatX: 2, repeatY: 2 });
  textureCache.set(key, tex);
  return tex;
}

export function getShojiTextures() {
  const key = 'shoji';
  if (textureCache.has(key)) return textureCache.get(key);

  const w = 256;
  const h = 256;
  const col = makeCanvas(w, h);
  const emi = makeCanvas(w, h);
  const ctx = col.getContext('2d');
  const ectx = emi.getContext('2d');

  // Warm washi paper
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#efe7d6');
  g.addColorStop(0.5, '#e8dec8');
  g.addColorStop(1, '#dfd2b7');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const eg = ectx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, w * 0.65);
  eg.addColorStop(0, '#ffcf86');
  eg.addColorStop(1, '#8a5824');
  ectx.fillStyle = eg;
  ectx.fillRect(0, 0, w, h);

  // Kumiko wooden lattice grid
  const cols = 6;
  const rows = 10;
  ctx.fillStyle = '#3f2a1b';
  ectx.fillStyle = '#000000';
  for (let c = 0; c <= cols; c++) {
    const x = (c / cols) * w;
    const barW = c === 0 || c === cols ? 8 : 3.5;
    ctx.fillRect(x - barW * 0.5, 0, barW, h);
    ectx.fillRect(x - barW * 0.5, 0, barW, h);
  }
  for (let r = 0; r <= rows; r++) {
    const y = (r / rows) * h;
    const barH = r === 0 || r === rows ? 8 : 3;
    ctx.fillRect(0, y - barH * 0.5, w, barH);
    ectx.fillRect(0, y - barH * 0.5, w, barH);
  }
  // Bottom kickboard (koshi-ita)
  ctx.fillStyle = '#3b2719';
  ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, h * 0.78, w, h * 0.22);

  const res = {
    map: finalizeTexture(col, { repeatX: 2, repeatY: 1 }),
    emissiveMap: finalizeTexture(emi, { repeatX: 2, repeatY: 1 })
  };
  textureCache.set(key, res);
  return res;
}

function drawMomijiLeaf(ctx, cx, cy, size, rot, shade = 1.0) {
  // Authentic 7-lobed Japanese Iroha-Momiji palmate leaf silhouette!
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(size, size);

  const lobeAngles = [-2.25, -1.52, -0.76, 0, 0.76, 1.52, 2.25];
  const lobeLengths = [0.48, 0.74, 0.94, 1.08, 0.94, 0.74, 0.48];

  ctx.beginPath();
  ctx.moveTo(0, 0.16);
  for (let i = 0; i < lobeAngles.length; i++) {
    const a = lobeAngles[i] - Math.PI * 0.5;
    const len = lobeLengths[i];
    const sideW = 0.15 * len;
    const lx = Math.cos(a - 0.18) * (len * 0.58);
    const ly = Math.sin(a - 0.18) * (len * 0.58);
    const tx = Math.cos(a) * len;
    const ty = Math.sin(a) * len;
    const rx = Math.cos(a + 0.18) * (len * 0.58);
    const ry = Math.sin(a + 0.18) * (len * 0.58);

    ctx.quadraticCurveTo(lx - sideW * 0.2, ly, tx, ty);
    if (i < lobeAngles.length - 1) {
      const midA = (lobeAngles[i] + lobeAngles[i + 1]) * 0.5 - Math.PI * 0.5;
      const valley = 0.28 * Math.min(len, lobeLengths[i + 1]);
      ctx.quadraticCurveTo(rx, ry, Math.cos(midA) * valley, Math.sin(midA) * valley);
    } else {
      ctx.quadraticCurveTo(rx, ry, 0, 0.16);
    }
  }
  ctx.closePath();

  const v = Math.max(130, Math.min(255, Math.round(238 * shade)));
  const grad = ctx.createRadialGradient(0, -0.25, 0.05, 0, -0.25, 1.05);
  grad.addColorStop(0, `rgb(${v}, ${Math.round(v * 0.96)}, ${Math.round(v * 0.92)})`);
  grad.addColorStop(1, `rgb(${Math.round(v * 0.84)}, ${Math.round(v * 0.78)}, ${Math.round(v * 0.74)})`);
  ctx.fillStyle = grad;
  ctx.fill();

  // Delicate central leaf veins
  ctx.strokeStyle = `rgba(90, 55, 35, 0.28)`;
  ctx.lineWidth = 0.035;
  for (let i = 1; i < lobeAngles.length - 1; i++) {
    const a = lobeAngles[i] - Math.PI * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 0.08);
    ctx.lineTo(Math.cos(a) * lobeLengths[i] * 0.78, Math.sin(a) * lobeLengths[i] * 0.78);
    ctx.stroke();
  }

  ctx.restore();
}

export function getMomijiClusterTexture() {
  const key = 'momijiCluster';
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(7707);
  const w = 512;
  const h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  // Subtle dark twiglets radiating from center
  ctx.strokeStyle = 'rgba(58, 38, 26, 0.75)';
  ctx.lineWidth = 3;
  for (let b = 0; b < 7; b++) {
    const a = (b / 7) * Math.PI * 2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.quadraticCurveTo(
      w * 0.5 + Math.cos(a + 0.2) * 95,
      h * 0.5 + Math.sin(a + 0.2) * 95,
      w * 0.5 + Math.cos(a) * 185,
      h * 0.5 + Math.sin(a) * 185
    );
    ctx.stroke();
  }

  // Draw 68 overlapping 7-lobed Japanese maple leaves in an airy branchlet spray
  for (let i = 0; i < 68; i++) {
    const r = Math.pow(rng(), 0.62) * 198;
    const a = rng() * Math.PI * 2;
    const cx = w * 0.5 + Math.cos(a) * r;
    const cy = h * 0.5 + Math.sin(a) * r;
    const size = 26 + rng() * 26;
    const rot = rng() * Math.PI * 2;
    const shade = 0.74 + rng() * 0.34;
    drawMomijiLeaf(ctx, cx, cy, size, rot, shade);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function getSingleMomijiLeafTexture() {
  const key = 'singleMomiji';
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = makeCanvas(128, 128);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  drawMomijiLeaf(ctx, 64, 70, 52, 0, 1.0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function getBambooLeafSprayTexture() {
  const key = 'bambooSpray';
  if (textureCache.has(key)) return textureCache.get(key);

  const rng = createSeededRandom(8808);
  const w = 256;
  const h = 256;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  // Slender lance-shaped Mōsō bamboo leaves
  for (let i = 0; i < 42; i++) {
    const cx = w * (0.2 + rng() * 0.6);
    const cy = h * (0.2 + rng() * 0.6);
    const ang = rng() * Math.PI * 2;
    const len = 42 + rng() * 44;
    const wid = 6 + rng() * 4.5;
    const v = 185 + Math.floor(rng() * 65);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.fillStyle = `rgb(${Math.round(v * 0.85)}, ${v}, ${Math.round(v * 0.72)})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.42, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.42, wid, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

export function createCalligraphyPlaqueTexture(title, {
  subtitle = '',
  vertical = false,
  bg = '#171311',
  border = '#b89246',
  ink = '#ebd394'
} = {}) {
  const key = `plaque:${title}:${subtitle}:${vertical}:${bg}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const w = vertical ? 192 : 512;
  const h = vertical ? 512 : 220;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Lacquered or carved plaque background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle wood grain
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (i / 40) * h);
    ctx.lineTo(w, (i / 40) * h + 4);
    ctx.stroke();
  }

  // Ornate double frame
  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontStack = '"Shippori Mincho", "Noto Serif JP", "Noto Serif SC", "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif';

  if (vertical) {
    const chars = [...title];
    const step = (h - 90) / Math.max(chars.length, 1);
    const fontSize = Math.min(72, Math.floor(step * 0.84));
    ctx.font = `700 ${fontSize}px ${fontStack}`;
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, w * 0.5, 52 + step * (idx + 0.5));
    });
  } else {
    ctx.font = `700 ${title.length > 4 ? 64 : 82}px ${fontStack}`;
    ctx.fillText(title, w * 0.5, subtitle ? h * 0.44 : h * 0.52);
    if (subtitle) {
      ctx.font = `500 24px ${fontStack}`;
      ctx.globalAlpha = 0.82;
      ctx.fillText(subtitle, w * 0.5, h * 0.77);
      ctx.globalAlpha = 1;
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}
